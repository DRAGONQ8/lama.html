import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Read the manifest and sources so regressions can run before building the release.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const manifest = (name) =>
  [...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const scripts = (await Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`)))).join(
  '\n',
);
const styles = (
  await Promise.all(
    manifest('styles').map((name) =>
      read(`src/${name}.css`).catch((error) => {
        if (error.code === 'ENOENT' && name !== 'styles') return '';
        throw error;
      }),
    ),
  )
).join('\n');
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => scripts)
  .replace('/* BUILD_STYLES */', () => styles);
const server = createServer((_, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['ليلى'];
      store.extra.motion = false;
      save();
      home();
    });
    await run(page);
    assert.deepEqual(errors, [], name + ': browser exception');
    passed++;
    console.log('✓ ' + name);
  } finally {
    await context.close();
  }
}

try {
  await check('Old laboratory controls cannot mutate a new puzzle or its history', async (page) => {
    const results = await page.evaluate(() => {
      const results = [];
      for (const id of ['nonogram', 'lights', 'pipes']) {
        setup(id);
        $('labLevel').value = 'easy';
        startLab(id);
        const cell = $('labBoard').querySelector('button:not([aria-disabled="true"])'),
          hint = $('labHint'),
          mode = document.querySelector('.lab-mode button');
        setup(id);
        $('labLevel').value = 'easy';
        startLab(id);
        const snapshot = () =>
          JSON.stringify([
            state.board,
            state.selected,
            state.moves,
            state.hints,
            state.history,
            state.mode,
          ]);
        const before = snapshot();
        cell.click();
        cell.dispatchEvent(new FocusEvent('focus'));
        cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        hint.click();
        mode.click();
        results.push({ id, unchanged: snapshot() === before });
      }
      return results;
    });
    assert.deepEqual(results, [
      { id: 'nonogram', unchanged: true },
      { id: 'lights', unchanged: true },
      { id: 'pipes', unchanged: true },
    ]);
  });

  await check('Replaced lens and flow controls keep their own rendered state', async (page) => {
    const result = await page.evaluate(() => {
      setup('lights');
      $('labLevel').value = 'easy';
      startLab('lights');
      labToggleLens();
      const oldLens = $('labLensApply');
      labSelect(1);
      const before = JSON.stringify([state.board, state.moves]);
      oldLens.click();
      const oldLensSafe = before === JSON.stringify([state.board, state.moves]);
      $('labLensApply').click();
      const currentLensWorks = state.moves === 1;

      setup('pipes');
      $('labLevel').value = 'easy';
      startLab('pipes');
      labStartPipeTest();
      const oldFlowClose = $('labFlowClose');
      labRefreshPipeTest();
      oldFlowClose.click();
      const oldFlowSafe = !!state.pipeTest;
      $('labFlowClose').click();
      return { oldLensSafe, currentLensWorks, oldFlowSafe, currentFlowWorks: !state.pipeTest };
    });
    assert.deepEqual(result, {
      oldLensSafe: true,
      currentLensWorks: true,
      oldFlowSafe: true,
      currentFlowWorks: true,
    });
  });

  await check('Fact selection and answers retain keyboard focus across redraws', async (page) => {
    await page.evaluate(() => {
      setup('trivia');
      $('triviaMode').value = 'facts';
      $('triviaTimer').value = '0';
      startWordsGame('trivia');
    });
    const truth = await page.evaluate(() =>
      state.questions[0].statements.map((item, i) => (item.truth ? i : -1)).filter((i) => i >= 0),
    );
    await page.locator('.trivia-choice').nth(truth[0]).focus();
    await page.keyboard.press('Enter');
    assert.equal(
      await page.evaluate(() => document.activeElement.classList.contains('trivia-choice')),
      true,
    );
    assert.deepEqual(await page.evaluate(() => state.evidenceSelected), [truth[0]]);
    await page.keyboard.press(String(truth[1] + 1));
    assert.deepEqual(await page.evaluate(() => state.evidenceSelected), truth);
    await page.locator('#triviaConfirm').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => state.locked && state.answers[0].correct), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'triviaNext');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => state.index), 1);
    assert.equal(
      await page.evaluate(() => document.activeElement.classList.contains('trivia-choice')),
      true,
    );

    await page.evaluate(() => {
      setup('trivia');
      $('triviaTimer').value = '0';
      startWordsGame('trivia');
    });
    await page.locator('.trivia-choice').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'triviaNext');
  });

  await check('Input composition cannot paint, rotate, or undo laboratory cells', async (page) => {
    const results = await page.evaluate(() => {
      const results = [];
      for (const id of ['nonogram', 'pipes']) {
        setup(id);
        $('labLevel').value = 'easy';
        startLab(id);
        const cell = $('labBoard').querySelector('button:not([aria-disabled="true"])');
        cell.focus();
        const before = JSON.stringify([state.board, state.moves, state.history, state.selected]);
        for (const key of id === 'nonogram' ? ['f', 'x', 'c'] : ['r', 'l'])
          cell.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true, isComposing: true }),
          );
        cell.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'z',
            ctrlKey: true,
            bubbles: true,
            isComposing: true,
          }),
        );
        results.push(
          before === JSON.stringify([state.board, state.moves, state.history, state.selected]),
        );
      }
      return results;
    });
    assert.deepEqual(results, [true, true]);
  });
  await check(
    'Nested and plaintext editors keep typing out of puzzle and trivia shortcuts',
    async (page) => {
      const result = await page.evaluate(() => {
        const editor = (value) => {
          const element = document.createElement('div');
          element.setAttribute('contenteditable', value);
          element.innerHTML = '<span>ملاحظة أثناء اللعب</span>';
          return element;
        };
        const send = (element, key, ctrlKey = false) =>
          element.firstElementChild.dispatchEvent(
            new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true }),
          );
        setup('nonogram');
        $('labLevel').value = 'easy';
        startLab('nonogram');
        Object.assign(state, {
          size: 3,
          answer: [1, 1, 1, 0, 1, 0, 0, 1, 0],
          rowClues: [[3], [1], [1]],
          colClues: [[1], [3], [1]],
          board: Array(9).fill(0),
          fixed: Array(9).fill(false),
          linePatterns: null,
        });
        renderLab();
        labNonogramTap(0);
        const snapshot = () =>
          JSON.stringify([state.board, state.history, state.moves, state.selected]);
        const before = snapshot(),
          lab = [];
        for (const value of ['', 'true', 'plaintext-only']) {
          const element = editor(value);
          $('labBoard').append(element);
          for (const key of ['f', 'x', 'c', 'ArrowRight']) send(element, key);
          send(element, 'z', true);
          lab.push(snapshot() === before);
          element.remove();
        }
        setup('trivia');
        $('triviaTimer').value = '0';
        startWordsGame('trivia');
        const trivia = [];
        for (const value of ['', 'true', 'plaintext-only']) {
          const element = editor(value);
          document.querySelector('#app .panel').append(element);
          send(element, '1');
          send(element, 'Enter');
          trivia.push(!state.locked && state.choice === null && state.index === 0);
          element.remove();
        }
        return { lab, trivia };
      });
      assert.deepEqual(result, { lab: [true, true, true], trivia: [true, true, true] });
    },
  );
  console.log(`Gameplay v10: ${passed} browser regressions passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
