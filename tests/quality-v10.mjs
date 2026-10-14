import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) => {
    const match = build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    assert.ok(match, `Missing ${name} build manifest`);
    return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  };
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
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, fn) {
  if (process.env.QUALITY_CHECK && !name.includes(process.env.QUALITY_CHECK)) return;
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
      save();
      home();
    });
    await fn(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    console.log(`✓ ${name}`);
    passed++;
  } finally {
    await context.close();
  }
}
async function start(page, id, options = {}) {
  await page.evaluate(
    ({ id, options }) => {
      setup(id);
      for (const [name, value] of Object.entries(options)) {
        assertControl(name).value = String(value);
      }
      if (['snake', 'merge', 'mines', 'maze'].includes(id)) startArcade(id);
      else startExtra(id);
      clearTimers();
      function assertControl(name) {
        const control = $(name);
        if (!control) throw Error(`Missing control ${name}`);
        return control;
      }
    },
    { id, options },
  );
}

try {
  await check(
    'Sudoku rejects an impossible blank before charging or suggesting another singleton',
    async (page) => {
      await start(page, 'sudoku');
      const result = await page.evaluate(() => {
        const solution = Array.from(
          { length: 81 },
          (_, i) => ((Math.floor(i / 9) * 3 + Math.floor(Math.floor(i / 9) / 3) + (i % 9)) % 9) + 1,
        );
        state.solution = [...solution];
        state.board = [...solution];
        state.board[1] = state.board[27] = state.board[80] = 0;
        state.board[0] = 2;
        state.given = state.board.map((n, i) => !!n && i !== 0);
        state.selected = 80;
        state.logical = { i: 80, n: 8, signature: state.board.join(''), reason: 'stale' };
        renderSudoku();
        const noDuplicates = !state.board.some((_, i) => sudokuConflicts(state.board, i));
        const contradiction = sudokuCount(state.board) === 0;
        const deduction = sudokuDeduction(state.board, 80);
        explainSudokuStep();
        const refused = {
          checks: state.checks,
          hints: state.hints,
          hasStep: !!state.logical,
          selected: state.selected,
          message: document.querySelector('.panel').textContent,
        };
        state.selected = 0;
        putSudoku(1);
        explainSudokuStep();
        const step = state.logical;
        applySudokuLogic();
        return {
          noDuplicates,
          contradiction,
          deduction,
          refused,
          repaired: {
            checks: state.checks,
            hints: state.hints,
            index: step.i,
            value: state.board[step.i],
          },
        };
      });
      assert.equal(result.noDuplicates, true);
      assert.equal(result.contradiction, true);
      assert.equal(result.deduction, null);
      assert.deepEqual(
        { ...result.refused, message: undefined },
        { checks: 0, hints: 0, hasStep: false, selected: 1, message: undefined },
      );
      assert.match(result.refused.message, /ليس لها أي رقم ممكن/);
      assert.deepEqual(result.repaired, { checks: 1, hints: 1, index: 1, value: 2 });
    },
  );

  await check(
    'Sudoku ignores IME composition and all editable descendants while Arabic shortcuts still work',
    async (page) => {
      await start(page, 'sudoku');
      const result = await page.evaluate(() => {
        const selected = state.selected,
          digit = state.solution[selected];
        const key = '٠١٢٣٤٥٦٧٨٩'[digit];
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true }),
        );
        const composed = state.board[selected];
        const edited = [];
        for (const mode of ['true', 'plaintext-only', '']) {
          const editor = document.createElement('div');
          editor.setAttribute('contenteditable', mode);
          editor.innerHTML = '<span>نص قابل للتحرير</span>';
          document.body.append(editor);
          editor.firstChild.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          edited.push(state.board[selected]);
          editor.remove();
        }
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        return {
          composed,
          edited,
          value: state.board[selected],
          digit,
          history: state.history.length,
        };
      });
      assert.equal(result.composed, 0);
      assert.deepEqual(result.edited, [0, 0, 0]);
      assert.equal(result.value, result.digit);
      assert.equal(result.history, 1);
    },
  );

  await check(
    'Snake movement ignores nested editable and plaintext editor keystrokes',
    async (page) => {
      await start(page, 'snake', { arcadeDrive: 'step' });
      const result = await page.evaluate(() => {
        const initial = state.snake.map((p) => ({ ...p }));
        for (const mode of ['true', 'plaintext-only', '']) {
          const editor = document.createElement('div');
          editor.setAttribute('contenteditable', mode);
          editor.innerHTML = '<span>تحرير</span>';
          document.body.append(editor);
          editor.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
          );
          editor.remove();
        }
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'w', isComposing: true, bubbles: true }),
        );
        const protectedState = {
          initial,
          snake: state.snake.map((p) => ({ ...p })),
          steps: state.steps,
          direction: state.direction,
        };
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
        );
        return {
          protectedState,
          final: { steps: state.steps, head: state.snake[0], direction: state.direction },
        };
      });
      assert.deepEqual(result.protectedState.snake, result.protectedState.initial);
      assert.equal(result.protectedState.steps, 0);
      assert.equal(result.protectedState.direction, 'right');
      assert.deepEqual(result.final, { steps: 1, head: { x: 5, y: 9 }, direction: 'up' });
    },
  );

  await check(
    'Missing-square math accepts the negative root typed with Arabic numerals and records it once',
    async (page) => {
      await start(page, 'math', { level: 'hard', mathmode: 'missing', quizcount: 30 });
      const question = await page.evaluate(() => {
        state.index = state.questions.findIndex((q) => /^□²/.test(q.text));
        if (state.index < 0) throw Error('No square question generated');
        renderQuiz();
        return state.questions[state.index];
      });
      const negative = -question.answer;
      const arabic = String(negative)
        .replace('-', '−')
        .replace(/\d/g, (n) => '٠١٢٣٤٥٦٧٨٩'[n]);
      await page.locator('#mathanswer').fill(arabic);
      await page.locator('#mathanswer').press('Enter');
      assert.deepEqual(
        await page.evaluate(() => [state.correct, state.lastCorrect, state.answers.at(-1).choice]),
        [1, true, negative],
      );
      assert.match(await page.locator('.hintpanel').innerText(), /كلا الجذرين صحيح/);
      await page.evaluate(() => quizEnd());
      const recorded = await page.evaluate(() => JSON.stringify(store.scores));
      await page.evaluate(() => quizEnd());
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), recorded);
      await page.locator('.history summary').click();
      assert.match(
        await page.locator('.history').innerText(),
        new RegExp(`الصحيح: ${question.answer} أو ${negative}`),
      );
    },
  );

  await check(
    'Square-choice feedback marks both valid roots and unrelated answers remain wrong',
    async (page) => {
      await start(page, 'math', { level: 'hard', mathmode: 'missing', quizcount: 30 });
      const square = await page.evaluate(() => {
        state.index = state.questions.findIndex((q) => /^□²/.test(q.text));
        const q = state.questions[state.index];
        q.choices = [q.answer, -q.answer, q.answer + 1, q.answer + 2];
        renderQuiz();
        return q.answer;
      });
      await page.locator('.quizanswers button').nth(1).click();
      assert.equal(await page.evaluate(() => state.lastCorrect), true);
      assert.equal(await page.locator('.quizanswers .correct').count(), 2);
      assert.deepEqual(await page.evaluate(() => state.answers.map((a) => a.choice)), [-square]);
      await start(page, 'math', { level: 'normal', mathmode: 'missing' });
      await page.evaluate(() => answerQuiz(-1, -state.questions[state.index].answer));
      assert.equal(await page.evaluate(() => state.lastCorrect), false);
    },
  );
  console.log(`Quality v10: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
