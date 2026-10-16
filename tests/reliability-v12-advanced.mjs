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
  if (process.env.ADVANCED_V12_CHECK && !name.includes(process.env.ADVANCED_V12_CHECK)) return;
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
    'Both board games offer a two-move sandbox and keyboard navigation without changing the match',
    async (page) => {
      for (const id of ['ttt', 'connect']) {
        await start(page, id, { opponent: 'friend', second: 1, first: 0 });
        const before = await page.evaluate(() => ({
          board: [...state.board],
          turn: state.turn,
          moves: state.moves,
          scores: JSON.stringify(store.scores),
        }));
        await page.locator('[data-board-pos="0"]').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '1');
        await page.evaluate(() => {
          toggleBoardPreview();
          previewBoardMove(0, state.run);
          previewBoardReply(1, state.run);
        });
        const preview = await page.evaluate(() => ({
          board: [...state.board],
          turn: state.turn,
          moves: state.moves,
          scores: JSON.stringify(store.scores),
          trial: state.preview.board.filter(Boolean),
          reply: state.preview.reply,
        }));
        assert.deepEqual(
          {
            board: preview.board,
            turn: preview.turn,
            moves: preview.moves,
            scores: preview.scores,
          },
          before,
        );
        assert.deepEqual(preview.trial, [1, 2]);
        assert.equal(preview.reply, 1);
        await page.evaluate(() => {
          applyBoardPreview(state.run);
          applyBoardPreview(state.run);
        });
        assert.deepEqual(
          await page.evaluate(() => [state.board.filter(Boolean), state.moves, state.turn]),
          [[1], 1, 1],
        );
      }
    },
  );

  await check('Board sandbox identifies forks and rejects stale reply attempts', async (page) => {
    await start(page, 'ttt', { opponent: 'friend', second: 1, first: 0 });
    const result = await page.evaluate(() => {
      state.board = [1, 0, 0, 0, 2, 0, 0, 0, 1];
      state.turn = 0;
      toggleBoardPreview();
      previewBoardMove(2, state.run);
      const threats = boardImmediateThreats(state.preview.board, 'ttt', 1);
      const message = state.preview.message;
      previewBoardReply(3, state.run - 1);
      const stale = state.preview.reply;
      previewBoardReply(3, state.run);
      return {
        threats,
        message,
        stale: stale ?? null,
        reply: state.preview.reply,
        moves: state.moves,
      };
    });
    assert.deepEqual(result.threats, [1, 5]);
    assert.match(result.message, /تهديدين/);
    assert.equal(result.stale, null);
    assert.equal(result.reply, 3);
    assert.equal(result.moves, 0);
  });

  await check(
    'Code reveals replace conflicting handwritten exclusions without consuming guesses',
    async (page) => {
      await start(page, 'code', { codelength: 3 });
      const result = await page.evaluate(() => {
        state.secret = [7, 8, 9];
        state.slotExclusions[0] = [7];
        codeHint();
        analyzeCode();
        return {
          excluded: state.slotExclusions[0],
          revealed: state.revealed[0],
          attempts: state.attempts.length,
          hints: state.hints,
          count: state.analysis,
        };
      });
      assert.deepEqual(result, { excluded: [], revealed: 7, attempts: 0, hints: 1, count: 72 });
    },
  );

  await check('Simon result review shows the actual reverse response order', async (page) => {
    await start(page, 'simon', { simonmode: 'reverse' });
    await page.evaluate(() => {
      state.sequence = [0, 1, 2];
      state.phase = 'input';
      state.input = 0;
      simonTap(0);
    });
    assert.deepEqual(await page.locator('.simon-review-steps b').allTextContents(), [
      '■ 3',
      '▲ 2',
      '● 1',
    ]);
    assert.equal(await page.evaluate(() => state.done), true);
  });

  await check(
    'Word draft undo restores typed and clicked letters and never undoes a locked hint',
    async (page) => {
      await start(page, 'word');
      const result = await page.evaluate(() => {
        state.item = { name: 'أسد', cat: 'animals', hints: ['حيوان', 'مفترس'] };
        state.scrambled = ['د', 'س', 'أ'];
        state.wordDraft = '';
        state.usedLetters = [];
        renderWord();
        $('wordanswer').value = 'أس';
        updateWordDraft('أس');
        tapWordLetter(0);
        const built = state.wordDraft;
        clearWordDraft();
        undoWordDraft();
        const restored = state.wordDraft;
        undoWordDraft();
        const typed = state.wordDraft;
        revealWordPrefix(state.run);
        const locked = state.wordDraft;
        tapWordLetter(0);
        undoWordDraft();
        undoWordDraft();
        return {
          built,
          restored,
          typed,
          locked,
          final: state.wordDraft,
          tries: state.tries,
          hints: state.prefixHints,
        };
      });
      assert.deepEqual(result, {
        built: 'أسد',
        restored: 'أسد',
        typed: 'أس',
        locked: 'أ',
        final: 'أ',
        tries: 0,
        hints: 1,
      });
      await page.locator('#wordanswer').fill('أس');
      assert.equal(await page.locator('[data-word-undo]').isEnabled(), true);
    },
  );

  await check(
    'Sudoku groups explain current progress and flag duplicates without revealing hidden cells',
    async (page) => {
      await start(page, 'sudoku');
      const result = await page.evaluate(() => {
        state.board = Array(81).fill(0);
        state.board[1] = 1;
        state.board[2] = 1;
        state.board[9] = 2;
        state.given = Array(81).fill(false);
        state.selected = 0;
        renderSudoku();
        const first = document.querySelector('.sudoku-group-progress').textContent;
        const blanks = state.board.filter((n) => !n).length;
        state.solution = Array(81).fill(9);
        renderSudoku();
        return {
          first,
          second: document.querySelector('.sudoku-group-progress').textContent,
          blanks,
          digits: [...document.querySelectorAll('.numberpad small')].map((n) => n.textContent),
        };
      });
      assert.match(result.first, /الصف فيه تكرار/);
      assert.equal(result.first, result.second);
      assert.equal(result.blanks, 78);
      assert.deepEqual(result.digits.slice(0, 3), ['2/9', '1/9', '0/9']);
    },
  );

  await check(
    'Pattern accepts written Arabic numbers and retains the draft when opening reasoning tools',
    async (page) => {
      await start(page, 'pattern');
      const answer = await page.evaluate(() => state.questions[0].answer);
      const arabic = String(answer).replace(/\d/g, (n) => '٠١٢٣٤٥٦٧٨٩'[n]);
      await page.locator('#mathanswer').fill(arabic);
      await page.evaluate(() => openPatternWorkpad(state.run, state.index));
      assert.equal(await page.locator('#mathanswer').inputValue(), String(answer));
      await page.evaluate(() => {
        answerMathText();
        answerMathText();
      });
      assert.deepEqual(
        await page.evaluate(() => [state.correct, state.answers.length, state.lastTyped]),
        [1, 1, answer],
      );
      await page.evaluate(() => nextQuiz());
      assert.equal(await page.locator('#mathanswer').inputValue(), '');
    },
  );

  await check(
    'Color review preserves each question rule and its original ink cue',
    async (page) => {
      await start(page, 'color', { colormode: 'mixed' });
      await page.evaluate(() => quizEnd());
      const review = await page.locator('.history').innerHTML();
      assert.match(review, /المطلوب: معنى الكلمة/);
      assert.match(review, /المطلوب: لون الحروف/);
      assert.match(review, /style="color:/);
    },
  );

  await check(
    'Taboo discards detached stale card buttons across scoring, undo, and new games',
    async (page) => {
      await start(page, 'taboo');
      await page.evaluate(() => {
        window.staleReady = document.querySelector('[onclick="tabooReady()"]');
        staleReady.click();
        window.staleCorrect = document.querySelector('[onclick="tabooAnswer(\'correct\')"]');
        staleCorrect.click();
      });
      assert.equal(await page.evaluate(() => state.score), 10);
      await page.evaluate(() => staleCorrect.click());
      assert.equal(await page.evaluate(() => state.score), 10);
      await page.evaluate(() => {
        undoTaboo();
        staleCorrect.click();
      });
      assert.equal(await page.evaluate(() => state.score), 0);
      await start(page, 'taboo');
      await page.evaluate(() => staleReady.click());
      assert.equal(await page.evaluate(() => state.stage), 'handoff');
      await page.locator('[onclick="tabooReady()"]').click();
      assert.equal(await page.evaluate(() => state.stage), 'active');
    },
  );

  await check('Advanced game controls fit a narrow phone viewport', async (page) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const id of [
      'ttt',
      'connect',
      'code',
      'simon',
      'slide',
      'sudoku',
      'word',
      'math',
      'color',
      'pattern',
      'taboo',
    ]) {
      await start(page, id);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${id}: ${overflow}px horizontal overflow`);
    }
  });
  console.log(`Advanced v12: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
