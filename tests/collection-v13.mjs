import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) =>
    [
      ...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((entry) => entry[1]);
  const [scripts, styles, template] = await Promise.all([
    Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`))),
    Promise.all(manifest('styles').map((name) => read(`src/${name}.css`))),
    read('src/template.html'),
  ]);
  return template
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n'));
}
const html = process.env.LAMMA_TEST_HTML
  ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
  : await assemble();
const server = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, fn) {
  if (process.env.COLLECTION_CHECK && !name.includes(process.env.COLLECTION_CHECK)) return;
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى'];
      store.sound = false;
      store.extra.motion = false;
      applySettings();
      save();
      home();
    });
    await fn(page, context);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(`✓ ${name}`);
    passed++;
  } finally {
    await context.close();
  }
}
async function start(page, id, fields = {}) {
  await page.evaluate(
    ({ id, fields }) => {
      setup(id);
      for (const [key, value] of Object.entries(fields)) $(key).value = value;
      startCollection(id);
    },
    { id, fields },
  );
}
async function finish(page, missFirst = false) {
  await page.evaluate((missFirst) => {
    while (!state.done) {
      const q = state.questions[state.index];
      if (state.id === 'order') {
        q.arranged = [...q.solution];
        submitCollectionOrder();
      } else {
        const correct =
          state.id === 'flags' ? q.choices.findIndex((v) => v.code === q.code) : q.truth ? 0 : 1;
        answerCollection(missFirst && state.index === 0 ? (correct + 1) % 2 : correct);
      }
      nextCollection();
    }
  }, missFirst);
}

try {
  await check('Keyboard focus follows each question, feedback and final result', async (page) => {
    for (const id of ['flags', 'truefalse', 'order']) {
      await start(page, id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'collectionQuestion');
      assert.match(await page.locator('#collectionQuestionProgress').textContent(), /السؤال 1/);
      if (id === 'order') await page.locator('.collection-confirm').click();
      else await page.keyboard.press('1');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'collectionNext');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'collectionQuestion');
      assert.equal(await page.evaluate(() => state.index), 1);
      assert.match(await page.locator('#collectionQuestionProgress').textContent(), /السؤال 2/);
      await finish(page);
      assert.equal(await page.evaluate(() => document.activeElement.matches('.success h2')), true);
    }
  });

  await check('Collection shortcuts leave every native editable mode alone', async (page) => {
    await start(page, 'truefalse');
    for (const mode of ['', 'true', 'plaintext-only', 'TRUE']) {
      assert.equal(
        await page.evaluate((mode) => {
          const editor = document.createElement('div');
          editor.setAttribute('contenteditable', mode);
          editor.innerHTML = '<span>نص قابل للتحرير</span>';
          document.body.append(editor);
          editor.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', { key: '١', bubbles: true }),
          );
          editor.remove();
          return state.locked;
        }, mode),
        false,
        `contenteditable=${mode}`,
      );
    }
    await page.evaluate(() =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '١', bubbles: true })),
    );
    assert.equal(await page.evaluate(() => state.locked), true);
    await start(page, 'order');
    const before = await page.evaluate(() => [...state.questions[0].arranged]);
    await page.keyboard.press('1');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => state.questions[0].arranged[1]), before[0]);
    await page.getByRole('button', { name: '↶ تراجع عن آخر حركة' }).click();
    assert.deepEqual(await page.evaluate(() => state.questions[0].arranged), before);
  });

  await check('Category feedback identifies weaker topics using actual answers', async (page) => {
    await start(page, 'truefalse');
    await page.evaluate(() => {
      state.questions = [
        collectionFacts.find((q) => q.cat === 'general'),
        ...collectionFacts.filter((q) => q.cat === 'science').slice(0, 2),
      ].map((q) => ({ ...q }));
      renderCollection();
      while (!state.done) {
        const q = state.questions[state.index];
        answerCollection(state.index === 0 ? (q.truth ? 0 : 1) : q.truth ? 1 : 0);
        nextCollection();
      }
    });
    const rows = await page.locator('.collection-breakdown-item').evaluateAll((items) =>
      items.map((item) => ({
        title: item.querySelector('b').textContent,
        score: Number(item.querySelector('progress').value),
      })),
    );
    assert.deepEqual(rows, [
      { title: 'معلومات عامة', score: 100 },
      { title: 'العلوم', score: 0 },
    ]);
    assert.match(
      await page.locator('.collection-breakdown > .note').textContent(),
      /العلوم.*2 من 2/,
    );
    assert.equal(await page.evaluate(() => store.scores['أحمد'].points), 33);
  });

  await check(
    'Missed-question practice and replay preserve settings without extra awards',
    async (page) => {
      await start(page, 'flags', {
        flagsRegion: 'gulf',
        flagsMode: 'flag',
        flagsChoices: '6',
        flagsCount: '5',
        player: '1',
      });
      const missedCode = await page.evaluate(() => state.questions[0].code);
      await finish(page, true);
      const original = await page.evaluate(() => ({
        run: state.run,
        scores: JSON.stringify(store.scores),
        history: JSON.stringify(store.extra.history),
      }));
      await page.getByRole('button', { name: /تدرب على/ }).click();
      const practice = await page.evaluate(() => ({
        practice: state.practice,
        codes: state.questions.map((q) => q.code),
        focus: document.activeElement.id,
      }));
      assert.deepEqual(practice, {
        practice: true,
        codes: [missedCode],
        focus: 'collectionQuestion',
      });
      await page.evaluate((run) => {
        collectionReplay(run);
        collectionPractice(run);
      }, original.run);
      assert.equal(await page.evaluate(() => state.practice), true);
      await finish(page);
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), original.scores);
      assert.equal(
        await page.evaluate(() => JSON.stringify(store.extra.history)),
        original.history,
      );
      await page.getByRole('button', { name: /جولة جديدة بنفس الخيارات/ }).click();
      assert.deepEqual(
        await page.evaluate(() => ({
          practice: state.practice,
          name: state.name,
          mode: state.flagMode,
          count: state.questions.length,
          choices: state.questions.every((q) => q.choices.length === 6),
          gulf: state.questions.every((q) => q.gulf),
          focus: document.activeElement.id,
        })),
        {
          practice: false,
          name: 'ليلى',
          mode: 'flag',
          count: 5,
          choices: true,
          gulf: true,
          focus: 'collectionQuestion',
        },
      );
    },
  );

  await check(
    'Order breakdown includes partial credit and correct sequences remain numbered',
    async (page) => {
      await start(page, 'order', { orderCategory: 'space' });
      await page.evaluate(() => {
        const q = state.questions.find((q) => q.solution.length === 4) || state.questions[0];
        state.questions = [q];
        q.arranged = [...q.solution];
        [q.arranged[0], q.arranged[1]] = [q.arranged[1], q.arranged[0]];
        renderCollection();
        submitCollectionOrder();
        nextCollection();
      });
      const expected = await page.evaluate(() =>
        Math.round(
          ((state.questions[0].solution.length - 2) * 100) / state.questions[0].solution.length,
        ),
      );
      assert.equal(
        await page.locator('.collection-breakdown progress').evaluate((el) => el.value),
        expected,
      );
      await page.locator('.collection-review summary').click();
      assert.equal(
        await page
          .locator('.collection-review-order')
          .first()
          .evaluate((el) => getComputedStyle(el).listStyleType),
        'decimal',
      );
      assert.equal(
        await page
          .locator('.collection-review-order li')
          .first()
          .evaluate((el) => getComputedStyle(el).display),
        'list-item',
      );
    },
  );

  await check(
    'Actual large-text preference, review and 44px controls fit a 320px offline phone',
    async (page, context) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await context.setOffline(true);
      await page.evaluate(() => home());
      const targets = await page.locator('.topactions .iconbtn').evaluateAll((buttons) =>
        buttons.map((button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        })),
      );
      assert.ok(targets.every((target) => target.width >= 44 && target.height >= 44));
      for (const id of ['flags', 'truefalse', 'order']) {
        await start(page, id, id === 'flags' ? { flagsChoices: '6' } : {});
        const readingSelector = id === 'order' ? '.collection-order-label' : '.collection-choice';
        const normal = await page
          .locator(readingSelector)
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        const question = await page
          .locator('.collection-question')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        await page.evaluate(() => {
          store.extra.textScale = 130;
          applySettings();
        });
        const scaled = await page
          .locator(readingSelector)
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        const scaledQuestion = await page
          .locator('.collection-question')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        assert.ok(Math.abs(scaled - normal * 1.3) < 0.1, `${id}: answer text scales`);
        assert.ok(Math.abs(scaledQuestion - question * 1.3) < 0.1, `${id}: question scales`);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
        await finish(page);
        await page.locator('.collection-review summary').click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
        await page.evaluate(() => {
          store.extra.textScale = 100;
          applySettings();
        });
      }
    },
  );

  await check('Home and collection feedback pass WCAG A/AA in both themes', async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const theme of ['dark', 'light']) {
      await page.evaluate((theme) => {
        store.extra.theme = theme;
        applySettings();
        home();
      }, theme);
      for (const id of ['home', 'flags', 'truefalse', 'order']) {
        if (id !== 'home') {
          await start(page, id);
          await finish(page, true);
          await page.locator('.collection-review summary').click();
        }
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        assert.deepEqual(
          audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          [],
          `${theme}/${id}: accessibility`,
        );
      }
    }
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Collection v13: ${passed} browser checks passed.`);
