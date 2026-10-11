import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Assemble the release sources without changing generated artifacts. An external
// standalone build can also be checked with LAMMA_TEST_HTML=/path/to/file.html.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) => {
    const match = build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    assert.ok(match, `Missing ${name} build manifest`);
    return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  };
  const scriptNames = manifest('scripts'),
    styleNames = manifest('styles');
  if (!styleNames.includes('advanced')) styleNames.push('advanced');
  const scripts = (await Promise.all(scriptNames.map((name) => read(`src/${name}.js`)))).join('\n');
  const styles = (
    await Promise.all(
      styleNames.map((name) =>
        read(`src/${name}.css`).catch((error) => {
          if (error.code === 'ENOENT' && name !== 'styles' && name !== 'advanced') return '';
          throw error;
        }),
      ),
    )
  ).join('\n');
  const html = (await read('src/template.html'))
    .replace('/* BUILD_SCRIPTS */', () => scripts)
    .replace('/* BUILD_STYLES */', () => styles);
  await writeFile('/tmp/lamma-advanced-v7.html', html);
  const fingerprint = createHash('sha256').update(html).digest('hex').slice(0, 16);
  const advancedFingerprint = createHash('sha256')
    .update(await read('src/advanced.js'))
    .digest('hex')
    .slice(0, 16);
  console.log(`Source HTML ${fingerprint}; advanced.js ${advancedFingerprint}`);
  return html;
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
async function check(name, test, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport }),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      store.sound = false;
      save();
      home();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exception`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function start(page, id, options = {}) {
  await page.evaluate(
    ({ id, options }) => {
      setup(id);
      for (const [key, value] of Object.entries(options)) {
        const control = $(key);
        if (!control) throw new Error(`Missing setup control: ${key}`);
        control.value = String(value);
      }
      startExtra(id);
    },
    { id, options },
  );
}
async function pressDigit(page, digit, alphabet = '٠١٢٣٤٥٦٧٨٩') {
  await page.evaluate((key) => {
    (document.activeElement || document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  }, alphabet[digit]);
}

try {
  await check(
    'Bot-first undo preserves the opening and reverses a complete human turn',
    async (page) => {
      await start(page, 'ttt', { opponent: 'bot', first: '1', level: 'easy' });
      await page.waitForFunction(() => !state.waiting && state.moves === 1);
      const opening = await page.evaluate(() => [...state.board]);
      assert.equal(await page.locator('[onclick="undoBoard()"]').isDisabled(), true);
      await page.evaluate(() => undoBoard());
      assert.deepEqual(await page.evaluate(() => state.board), opening);
      assert.equal(await page.evaluate(() => state.moves), 1);
      await page.locator('.ttt [data-board-pos]:not(:disabled)').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !state.waiting && state.moves === 3);
      assert.equal(await page.locator('[onclick="undoBoard()"]').isDisabled(), false);
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('[data-board-pos]')),
        true,
      );
      await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(() => state.board), opening);
      assert.deepEqual(
        await page.evaluate(() => [state.moves, state.turn, state.history.length]),
        [1, 0, 1],
      );
      assert.equal(await page.locator('[onclick="undoBoard()"]').isDisabled(), true);
    },
  );

  await check(
    'Arabic and Persian shortcuts preserve board focus, gravity, and Simon sequence rules',
    async (page) => {
      await start(page, 'ttt', { opponent: 'friend', second: '1', first: '0' });
      await page.locator('[data-board-pos="0"]').focus();
      await pressDigit(page, 1);
      await pressDigit(page, 2, '۰۱۲۳۴۵۶۷۸۹');
      assert.deepEqual(await page.evaluate(() => state.board.slice(0, 3)), [1, 2, 0]);
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.matches('[data-board-pos]:not(:disabled)'),
        ),
        true,
      );
      await start(page, 'connect', { opponent: 'friend', second: '1', first: '0' });
      await page.locator('[data-board-pos="3"]').focus();
      await pressDigit(page, 4);
      await pressDigit(page, 4, '۰۱۲۳۴۵۶۷۸۹');
      const board = await page.evaluate(() => state.board);
      assert.equal(board[38], 1);
      assert.equal(board[31], 2);
      assert.equal(board.filter(Boolean).length, 2);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '3');
      assert.equal(await page.locator('.connect').getAttribute('dir'), 'ltr');
      await start(page, 'simon', { level: 'easy' });
      await page.evaluate(() => {
        state.sequence = [0, 1];
        state.phase = 'input';
        renderSimon();
      });
      await pressDigit(page, 1);
      await pressDigit(page, 2, '۰۱۲۳۴۵۶۷۸۹');
      assert.deepEqual(await page.evaluate(() => [state.completed, state.input, state.phase]), [
        1,
        2,
        'between',
      ]);
      await page.evaluate(() => {
        clearTimers();
        state.sequence = [1, 2];
        state.input = 0;
        state.phase = 'input';
        renderSimon();
      });
      await pressDigit(page, 4);
      assert.deepEqual(
        await page.evaluate(() => [
          state.done,
          state.lives,
          state.mistakes,
          state.input,
          state.phase,
        ]),
        [false, 1, 1, 0, 'idle'],
      );
      await pressDigit(page, 2);
      assert.equal(
        await page.evaluate(() => state.input),
        0,
        'pads must ignore keys until replay begins',
      );
    },
  );

  await check(
    'Sudoku has one tab stop and preserves the selected cell through keys and undo',
    async (page) => {
      await start(page, 'sudoku', { level: 'easy' });
      await page.evaluate(() => {
        state.board = [...state.solution];
        for (const i of [0, 1, 2, 10, 11]) state.board[i] = 0;
        state.given = state.board.map(Boolean);
        state.selected = 0;
        state.history = [];
        renderSudoku();
      });
      assert.equal(await page.locator('.sudoku button[tabindex="0"]').count(), 1);
      await page.locator('#sudoku-cell-0').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sudoku-cell-1');
      const digit = await page.evaluate(() => state.solution[1]);
      await pressDigit(page, digit);
      assert.equal(await page.evaluate(() => state.board[1]), digit);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sudoku-cell-1');
      await page.keyboard.press('Control+z');
      assert.equal(await page.evaluate(() => state.board[1]), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sudoku-cell-1');
      await pressDigit(page, digit, '۰۱۲۳۴۵۶۷۸۹');
      assert.equal(await page.evaluate(() => state.board[1]), digit);
      assert.equal(await page.locator('.sudoku button[tabindex="0"]').count(), 1);
    },
  );

  await check(
    'Sudoku candidate notes are free, idempotent, and restore exactly on undo',
    async (page) => {
      await start(page, 'sudoku', { level: 'easy' });
      const before = await page.evaluate(() => {
        state.selected = state.board.findIndex(
          (v, i) => !v && sudokuCandidates(state.board, i).length > 0,
        );
        state.notes[state.selected] = [];
        renderSudoku();
        return {
          i: state.selected,
          board: [...state.board],
          candidates: sudokuCandidates(state.board, state.selected),
        };
      });
      await page.locator(`#sudoku-cell-${before.i}`).focus();
      await page.evaluate(() => fillSudokuNotes());
      assert.deepEqual(await page.evaluate(() => state.notes[state.selected]), before.candidates);
      assert.deepEqual(
        await page.evaluate(() => [state.hints, state.checks, state.history.length]),
        [0, 0, 1],
      );
      await page.evaluate(() => fillSudokuNotes());
      assert.equal(await page.evaluate(() => state.history.length), 1);
      await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(() => state.notes[state.selected]), []);
      assert.deepEqual(await page.evaluate(() => state.board), before.board);
      assert.equal(await page.evaluate(() => document.activeElement.id), `sudoku-cell-${before.i}`);
      assert.deepEqual(await page.evaluate(() => [state.hints, state.checks]), [0, 0]);
    },
  );

  await check(
    'Every quiz holds answer and skip explanations until Next with the clock frozen',
    async (page) => {
      for (const id of ['math', 'color', 'pattern']) {
        await start(page, id);
        await page.evaluate(() => {
          state.endAt = Date.now() + 10000;
        });
        await page.locator('.quizanswers button').first().focus();
        const correct = await page.evaluate(() =>
          state.questions[0].choices.indexOf(state.questions[0].answer),
        );
        await pressDigit(page, correct + 1);
        const remaining = await page.evaluate(() => secondsLeft());
        await page.waitForTimeout(1100);
        assert.deepEqual(
          await page.evaluate(() => [state.index, state.correct, state.locked, secondsLeft()]),
          [0, 1, true, remaining],
          id,
        );
        assert.equal(await page.locator('#quiznext').isVisible(), true);
        assert.equal(
          await page.evaluate(() =>
            [...document.querySelectorAll('.quizanswers button')].every(
              (button) => getComputedStyle(button).opacity === '1',
            ),
          ),
          true,
          `${id} locked choices must remain readable`,
        );
        await page.locator('#quiznext').click();
        assert.deepEqual(
          await page.evaluate(() => [state.index, state.locked, state.answers.length]),
          [1, false, 1],
        );
        assert.equal(
          await page.evaluate(() => document.activeElement.matches('.quizanswers button')),
          true,
        );
        await page.locator('[onclick="skipQuiz()"]').click();
        const skippedRemaining = await page.evaluate(() => secondsLeft());
        await page.waitForTimeout(250);
        assert.deepEqual(
          await page.evaluate(() => [
            state.index,
            state.locked,
            state.answers[1].skipped,
            secondsLeft(),
          ]),
          [1, true, true, skippedRemaining],
        );
        assert.match(await page.locator('.hintpanel').last().innerText(), /تجاوزت السؤال/);
        await page.locator('#quiznext').click();
        assert.deepEqual(
          await page.evaluate(() => [state.index, state.locked, state.answers.length]),
          [2, false, 2],
        );
      }
    },
  );

  await check(
    'Code quick input accepts Arabic leading zero and rejects invalid or changed revealed digits',
    async (page) => {
      await start(page, 'code', { codelength: '4', repeatdigits: 'no' });
      await page.evaluate(() => {
        state.secret = [8, 9, 6, 7];
        renderCode();
      });
      await page.locator('#codequick').fill('٠١٢٣');
      assert.deepEqual(await page.evaluate(() => state.draft), [0, 1, 2, 3]);
      await page.locator('#codequick').press('Enter');
      assert.equal(await page.evaluate(() => state.attempts.length), 1);
      assert.deepEqual(await page.evaluate(() => state.attempts[0].guess), [0, 1, 2, 3]);
      await page.evaluate(() => {
        state.revealed = { 0: 0 };
        state.draft = [0, 1, 2, 3];
        renderCode();
      });
      await page.locator('#codequick').fill('۹۱۲۳');
      await page.locator('#codequick').press('Enter');
      assert.deepEqual(
        await page.evaluate(() => [state.draft, state.attempts.length, state.hints]),
        [[0, 1, 2, 3], 1, 0],
      );
      await page.locator('#codequick').fill('۰۱۱۲');
      await page.locator('#codequick').press('Enter');
      assert.equal(
        await page.evaluate(() => state.attempts.length),
        1,
        'duplicate digits must not spend an attempt',
      );
      await page.locator('#codequick').fill('۰۱۲');
      await page.locator('#codequick').press('Enter');
      assert.equal(
        await page.evaluate(() => state.attempts.length),
        1,
        'incomplete input must not spend an attempt',
      );
      assert.equal(await page.locator('#digit0').isDisabled(), true);
    },
  );

  await check(
    'Code suggestions use candidate evidence, ignore the secret, and spend no resources',
    async (page) => {
      await start(page, 'code', { codelength: '3', repeatdigits: 'yes' });
      const data = await page.evaluate(() => {
        const attempt = { guess: [0, 1, 2], exact: 1, misplaced: 1 };
        const plain = codeCandidates(3, true, [attempt], { 0: 0 });
        const sampled = codeCandidates(3, true, [attempt], { 0: 0 }, 7);
        const compatible = sampled.samples.every((sample) => {
          const feedback = codeFeedback(sample, attempt.guess);
          return sample[0] === 0 && feedback.exact === 1 && feedback.misplaced === 1;
        });
        state.attempts = [attempt];
        state.revealed = { 0: 0 };
        state.secret = [0, 2, 3];
        state.draft = [0, 4, 5];
        renderCode();
        suggestCode();
        const first = [...state.draft];
        state.secret = [0, 3, 1];
        renderCode();
        suggestCode();
        const feedback = codeFeedback(state.draft, attempt.guess);
        return {
          plain,
          sampled,
          compatible,
          first,
          second: [...state.draft],
          feedback,
          resources: [state.attempts.length, state.hints],
          reused: state.draft.join('') === attempt.guess.join(''),
        };
      });
      assert.equal('samples' in data.plain, false);
      assert.equal(data.sampled.count, data.plain.count);
      assert.deepEqual(data.sampled.possible, data.plain.possible);
      assert.equal(data.sampled.samples.length, Math.min(7, data.plain.count));
      assert.equal(data.compatible, true);
      assert.deepEqual(data.first, data.second);
      assert.deepEqual(data.feedback, { exact: 1, misplaced: 1 });
      assert.deepEqual(data.resources, [1, 0]);
      assert.equal(data.reused, false);
    },
  );

  await check(
    'Slide keyboard focus and undo stay usable; all advanced games fit narrow mobile widths',
    async (page) => {
      await start(page, 'slide', { size: '3' });
      const before = await page.evaluate(() => [...state.board]);
      await page.locator('[data-slide-pos]:not(:disabled)').first().focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.moves), 1);
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.matches('[data-slide-pos]:not(:disabled)'),
        ),
        true,
      );
      await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(() => state.board), before);
      assert.equal(await page.evaluate(() => state.moves), 0);
      for (const width of [320, 360, 390]) {
        await page.setViewportSize({ width, height: 780 });
        for (const id of [
          'ttt',
          'connect',
          'code',
          'simon',
          'slide',
          'sudoku',
          'math',
          'color',
          'pattern',
        ]) {
          const options = id === 'slide' ? { size: '5' } : id === 'code' ? { codelength: '5' } : {};
          await start(page, id, options);
          const overflow = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            page: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            app: $('app').getBoundingClientRect().width,
          }));
          assert.ok(
            overflow.page <= overflow.viewport + 1 && overflow.body <= overflow.viewport + 1,
            `${id} at ${width}px overflows: ${JSON.stringify(overflow)}`,
          );
          assert.ok(overflow.app <= width + 1, `${id} app exceeds ${width}px`);
          const fractions = await page.evaluate(() =>
            [...document.querySelectorAll('.stats .stat b')]
              .filter((stat) => /^\d+\s*\/\s*\d+$/.test(stat.textContent.trim()))
              .map((stat) => ({
                text: stat.textContent,
                dir: stat.getAttribute('dir'),
                direction: getComputedStyle(stat).direction,
              })),
          );
          if (['code', 'simon', 'slide', 'sudoku', 'math', 'color', 'pattern'].includes(id)) {
            assert.ok(fractions.length > 0, `${id} should expose a progress fraction`);
            assert.ok(
              fractions.every((stat) => stat.dir === 'ltr' && stat.direction === 'ltr'),
              `${id} fractions reverse at ${width}px: ${JSON.stringify(fractions)}`,
            );
          }
          if (id === 'sudoku') {
            const targets = await page.evaluate(() =>
              [...document.querySelectorAll('.numberpad button')].map((button) => {
                const rect = button.getBoundingClientRect();
                return { digit: button.textContent, width: rect.width, height: rect.height };
              }),
            );
            assert.equal(targets.length, 9);
            assert.ok(
              targets.every((target) => target.width >= 44 && target.height >= 44),
              `Sudoku digit targets are too small at ${width}px: ${JSON.stringify(targets)}`,
            );
          }
        }
      }
      for (const id of ['code', 'sudoku', 'math']) {
        await start(page, id);
        if (id === 'math') await page.locator('.quizanswers button').first().click();
        await page.screenshot({ path: `/tmp/advanced-v7-${id}.png`, fullPage: true });
      }
    },
    { width: 390, height: 844 },
  );
  console.log(`Advanced v7: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
