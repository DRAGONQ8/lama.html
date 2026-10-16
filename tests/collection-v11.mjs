import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) =>
    [
      ...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((m) => m[1]);
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
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, fn) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى'];
      store.sound = false;
      store.extra.motion = false;
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
      startExtra(id);
    },
    { id, fields },
  );
}
try {
  await check(
    'Banks include 35 famous countries, six Gulf states, valid local flags and unique explained content',
    async (page) => {
      const value = await page.evaluate(() => ({
        countries: collectionCountries.length,
        gulf: collectionCountries
          .filter((v) => v.gulf)
          .map((v) => v.code)
          .sort(),
        countriesUnique:
          new Set(collectionCountries.map((v) => v.code)).size === collectionCountries.length,
        svg: collectionCountries.every((v) => {
          const template = document.createElement('template');
          template.innerHTML = collectionFlagSVG(v.code, 'علم السؤال');
          return (
            template.content.querySelector('svg')?.childElementCount > 0 &&
            !template.content.querySelector('parsererror')
          );
        }),
        regions: collectionRegions
          .slice(2)
          .map(([id]) => collectionCountries.filter((v) => v.region === id).length),
        facts: collectionFacts.length,
        factUnique: new Set(collectionFacts.map((v) => v.text)).size === collectionFacts.length,
        balanced: collectionFactCategories.every(([cat]) =>
          ['easy', 'normal'].every((level) => {
            const bank = collectionFacts.filter((q) => q.cat === cat && q.level === level);
            return (
              bank.length === 8 &&
              bank.filter((q) => q.truth).length === 4 &&
              bank.every((q) => q.reason.length > 20)
            );
          }),
        ),
        decks: collectionOrderDecks.length,
        validDecks: collectionOrderDecks.every(
          (q) =>
            q.items.length >= 4 &&
            q.items.length <= 8 &&
            new Set(q.items).size === q.items.length &&
            q.prompt !== q.reverse &&
            q.reason.length > 20,
        ),
      }));
      assert.deepEqual(value, {
        countries: 35,
        gulf: ['AE', 'BH', 'KW', 'OM', 'QA', 'SA'],
        countriesUnique: true,
        svg: true,
        regions: [10, 10, 6, 3, 4, 2],
        facts: 64,
        factUnique: true,
        balanced: true,
        decks: 25,
        validDecks: true,
      });
    },
  );
  await check(
    'Flag regions constrain targets, choices are unique and correct answer positions vary',
    async (page) => {
      const value = await page.evaluate(() => {
        const positions = new Set();
        for (const [region] of collectionRegions)
          for (const size of [2, 4, 6]) {
            setup('flags');
            $('flagsRegion').value = region;
            $('flagsChoices').value = String(size);
            $('flagsCount').value = '20';
            startCollection('flags');
            if (
              state.questions.some(
                (q) =>
                  (region !== 'all' && (region === 'gulf' ? !q.gulf : q.region !== region)) ||
                  q.choices.length !== size ||
                  new Set(q.choices.map((v) => v.code)).size !== size ||
                  q.choices.filter((v) => v.code === q.code).length !== 1,
              )
            )
              return { valid: false };
            if (new Set(state.questions.map((v) => v.code)).size !== state.questions.length)
              return { valid: false };
            for (const q of state.questions)
              positions.add(q.choices.findIndex((v) => v.code === q.code));
          }
        return { valid: true, positions: positions.size };
      });
      assert.equal(value.valid, true);
      assert.ok(value.positions >= 4);
    },
  );
  await check(
    'Flag questions hide answer names in SVG accessible labels and reverse choices; result awards once',
    async (page) => {
      await start(page, 'flags', { flagsRegion: 'gulf', flagsMode: 'flag', flagsCount: '5' });
      const result = await page.evaluate(() => {
        const labelsSafe = [...document.querySelectorAll('.collection-choice svg')].every((v) =>
            /^الخيار رقم \d$/.test(v.getAttribute('aria-label')),
          ),
          namesHidden = ![...document.querySelectorAll('.collection-choice')].some((v) =>
            collectionCountries.some((c) => v.textContent.includes(c.name)),
          ),
          stale = document.querySelector('.collection-choice'),
          run = state.run;
        while (!state.done) {
          const q = state.questions[state.index];
          answerCollection(q.choices.findIndex((v) => v.code === q.code));
          nextCollection();
        }
        const before = JSON.stringify(store.scores);
        finishCollection(run);
        nextCollection(run, 0);
        stale.click();
        return {
          labelsSafe,
          namesHidden,
          points: store.scores['أحمد'].points,
          rounds: store.scores['أحمد'].rounds,
          log: store.extra.history.filter((v) => v.id === 'flags').length,
          unchanged: JSON.stringify(store.scores) === before,
          reviews: document.querySelectorAll('.collection-review li').length,
        };
      });
      assert.deepEqual(result, {
        labelsSafe: true,
        namesHidden: true,
        points: 100,
        rounds: 1,
        log: 1,
        unchanged: true,
        reviews: 5,
      });
    },
  );
  await check(
    'Truth category and level filters cap without repetition, explanations appear and zero result records once',
    async (page) => {
      await start(page, 'truefalse', {
        factCategory: 'animals',
        factLevel: 'normal',
        factCount: '20',
      });
      const result = await page.evaluate(() => {
        const poolValid =
            state.questions.length === 8 &&
            state.questions.every((q) => q.cat === 'animals' && q.level === 'normal'),
          oldRun = state.run;
        while (!state.done) {
          const q = state.questions[state.index];
          answerCollection(q.truth ? 1 : 0);
          answerCollection(q.truth ? 0 : 1);
          if (!document.querySelector('.collection-feedback').textContent.includes(q.reason))
            throw Error('Explanation missing');
          nextCollection();
        }
        finishCollection(oldRun);
        return {
          poolValid,
          points: store.scores['أحمد'].points,
          rounds: store.scores['أحمد'].rounds,
          logs: store.extra.history.filter((v) => v.id === 'truefalse').length,
        };
      });
      assert.deepEqual(result, { poolValid: true, points: 0, rounds: 1, logs: 1 });
    },
  );
  await check(
    'Detached question, replay and abandoned-round actions cannot mutate new rounds',
    async (page) => {
      await start(page, 'truefalse');
      const result = await page.evaluate(() => {
        const staleAnswer = document.querySelector('.collection-choice');
        answerCollection(0);
        const staleNext = $('collectionNext');
        nextCollection();
        staleAnswer.click();
        staleNext.click();
        const questionSafe = state.index === 1 && !state.locked;
        const run = state.run;
        home();
        setup('truefalse');
        startCollection('truefalse');
        staleAnswer.click();
        answerCollection(0, run, 0);
        nextCollection(run, 0);
        const replaySafe = state.run !== run && state.index === 0 && !state.locked;
        home();
        const before = JSON.stringify(store.scores);
        answerCollection(0);
        submitCollectionOrder();
        finishCollection(run);
        return {
          questionSafe,
          replaySafe,
          leaveSafe: screen === 'home' && JSON.stringify(store.scores) === before,
        };
      });
      assert.deepEqual(result, { questionSafe: true, replaySafe: true, leaveSafe: true });
    },
  );
  await check(
    'Ordering uses actual move controls, reverse prompts, partial credit, and one-shot confirmation',
    async (page) => {
      await start(page, 'order', {
        orderCategory: 'space',
        orderDirection: 'mixed',
        orderCount: '3',
      });
      const result = await page.evaluate(() => {
        const shuffled = state.questions.every((q) =>
          q.arranged.some((v, i) => v !== q.solution[i]),
        );
        const q = state.questions[0],
          before = [...q.arranged],
          run = state.run,
          index = state.index;
        const stale = document.querySelector('[data-order-move="0-down"]');
        stale.click();
        const moved = q.arranged[1] === before[0] && q.arranged[0] === before[1];
        q.arranged = [...q.solution];
        [q.arranged[0], q.arranged[1]] = [q.arranged[1], q.arranged[0]];
        renderCollection();
        submitCollectionOrder();
        const credit = state.credit;
        submitCollectionOrder();
        moveCollectionOrder(0, 1);
        const partial =
          credit === (q.solution.length - 2) / q.solution.length &&
          state.credit === credit &&
          state.answers.length === 1;
        nextCollection();
        const second = [...state.questions[1].arranged];
        stale.click();
        moveCollectionOrder(0, 1, run, index);
        const staleSafe = JSON.stringify(second) === JSON.stringify(state.questions[1].arranged);
        while (!state.done) {
          const item = state.questions[state.index];
          item.arranged = [...item.solution];
          submitCollectionOrder();
          nextCollection();
        }
        return {
          shuffled,
          moved,
          partial,
          staleSafe,
          rounds: store.scores['أحمد'].rounds,
          points: store.scores['أحمد'].points,
          max: store.extra.best.order <= 100,
          log: store.extra.history.filter((v) => v.id === 'order').length,
        };
      });
      assert.equal(result.shuffled, true);
      assert.equal(result.moved, true);
      assert.equal(result.partial, true);
      assert.equal(result.staleSafe, true);
      assert.equal(result.rounds, 1);
      assert.equal(result.log, 1);
      assert.ok(result.points > 0 && result.points < 100);
      assert.equal(result.max, true);
    },
  );
  await check(
    'Pause and guide modal block all mutations; keyboard answers and ordering controls work',
    async (page) => {
      await start(page, 'truefalse');
      await page.evaluate(() => {
        showPause();
        answerCollection(0);
      });
      assert.equal(await page.evaluate(() => state.locked), false);
      await page.evaluate(() => {
        resumeGame();
        openGuide('truefalse');
        answerCollection(0);
      });
      assert.equal(await page.evaluate(() => state.locked), false);
      await page.evaluate(() => closeModal());
      await page.keyboard.press('1');
      assert.equal(await page.evaluate(() => state.locked), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.index), 1);
      await start(page, 'order');
      const before = await page.evaluate(() => state.questions[0].arranged);
      await page.keyboard.press('1');
      await page.keyboard.press('ArrowDown');
      const after = await page.evaluate(() => state.questions[0].arranged);
      assert.equal(after[1], before[0]);
    },
  );
  await check(
    'Setup preferences, escaped names, offline play and enlarged text fit 320px',
    async (page, context) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await context.setOffline(true);
      await page.evaluate(() => {
        store.players = ['<img src=x onerror=alert(1)>'];
        store.scores = {};
        save();
      });
      for (const id of ['flags', 'truefalse', 'order']) {
        await page.evaluate((id) => {
          setup(id);
          document.documentElement.style.fontSize = '130%';
        }, id);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `${id}: setup overflow`,
        );
        await page.evaluate((id) => startExtra(id), id);
        assert.equal(
          await page.evaluate(() => document.querySelectorAll('.collection-top img').length),
          0,
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `${id}: gameplay overflow`,
        );
        await page.evaluate(() => {
          if (state.id === 'order') submitCollectionOrder();
          else answerCollection(0);
        });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `${id}: explanation overflow`,
        );
      }
      await page.evaluate(() => {
        setup('flags');
        $('flagsRegion').value = 'gulf';
        $('flagsChoices').value = '6';
        rememberSetup();
        home();
        setup('flags');
      });
      assert.equal(await page.inputValue('#flagsRegion'), 'gulf');
      assert.equal(await page.inputValue('#flagsChoices'), '6');
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Collection v11: ${passed} browser checks passed.`);
