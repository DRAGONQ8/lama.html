import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(
  process.env.LAMMA_TEST_HTML || new URL('../lamma_universe.html', import.meta.url),
  'utf8',
);
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
async function check(name, test) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exception`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}

try {
  await check('Board tactics find both colours without mutating the board', async (page) => {
    const value = await page.evaluate(() => {
      const ttt = [1, 1, 0, 2, 0, 0, 0, 2, 0],
        board = Array(42).fill(0);
      board[35] = board[28] = board[21] = 1;
      const original = [...board];
      return {
        ttt: boardWinningMove(ttt, 'ttt', 1),
        connect: connectBest(board, 3, 1),
        unchanged: board.every((n, i) => n === original[i]),
      };
    });
    assert.deepEqual(value, { ttt: 2, connect: 0, unchanged: true });
  });
  await check(
    'Board coaching blocks a real threat and records one cost per suggestion',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('ttt');
        startExtra('ttt');
        clearTimers();
        state.waiting = false;
        state.turn = 0;
        state.board = [2, 2, 0, 1, 0, 0, 0, 1, 0];
        hintBoard();
        hintBoard();
        return {
          suggested: state.suggested,
          costs: state.coachHints,
          text: state.coachMessage,
          highlighted: !!document.querySelector('.ttt button[style]'),
        };
      });
      assert.equal(value.suggested, 2);
      assert.deepEqual(value.costs, [1, 0]);
      assert.match(value.text, /تمنع فوز/);
      assert.equal(value.highlighted, true);
    },
  );
  await check(
    'Pruned code analysis matches exhaustive feedback for repeated and distinct digits',
    async (page) => {
      const value = await page.evaluate(() => {
        const cases = [
          {
            secret: [1, 1, 2],
            duplicates: true,
            guesses: [
              [1, 2, 1],
              [0, 1, 1],
            ],
            revealed: {},
          },
          {
            secret: [0, 7, 4],
            duplicates: false,
            guesses: [
              [1, 7, 3],
              [4, 0, 7],
            ],
            revealed: { 1: 7 },
          },
          { secret: [0, 0, 0], duplicates: true, guesses: [[0, 1, 2]], revealed: {} },
        ];
        return cases.map(({ secret, duplicates, guesses, revealed }) => {
          const attempts = guesses.map((guess) => ({ guess, ...codeFeedback(secret, guess) })),
            possible = [new Set(), new Set(), new Set()];
          let count = 0;
          for (let n = 0; n < 1000; n++) {
            const candidate = String(n).padStart(3, '0').split('').map(Number);
            if (!duplicates && new Set(candidate).size !== 3) continue;
            if (Object.entries(revealed).some(([i, v]) => candidate[i] !== v)) continue;
            if (
              !attempts.every((a) => {
                const f = codeFeedback(candidate, a.guess);
                return f.exact === a.exact && f.misplaced === a.misplaced;
              })
            )
              continue;
            count++;
            candidate.forEach((n, i) => possible[i].add(n));
          }
          return {
            actual: codeCandidates(3, duplicates, attempts, revealed),
            expected: { count, possible: possible.map((a) => [...a].sort((a, b) => a - b)) },
          };
        });
      });
      for (const test of value) assert.deepEqual(test.actual, test.expected);
    },
  );
  await check(
    'Revealing a code digit keeps a distinct valid draft and locks that digit',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('code');
        startExtra('code');
        state.secret = [1, 0, 2, 3];
        state.draft = [0, 1, 2, 3];
        renderCode();
        codeHint();
        const draft = [...state.draft];
        $('digit0').value = '9';
        const locked = readCodeDraft()[0];
        return { draft, locked, attempts: state.attempts.length, hints: state.hints };
      });
      assert.equal(new Set(value.draft).size, 4);
      assert.equal(value.draft[0], 1);
      assert.equal(value.locked, 1);
      assert.equal(value.attempts, 0);
      assert.equal(value.hints, 1);
    },
  );
  await check(
    '3×3 slide solver finds a shortest route for simple and 31-move positions',
    async (page) => {
      const values = await page.evaluate(() => {
        return [
          [1, 2, 3, 4, 5, 6, 7, 0, 8],
          [8, 6, 7, 2, 5, 4, 3, 0, 1],
        ].map((board) => {
          const route = solveSlide(board),
            copy = [...board];
          if (!route) return { length: null, solved: false };
          let empty = copy.indexOf(0);
          for (const i of route) {
            if (!slideNeighbors(empty, 3).includes(i)) return { invalid: true };
            [copy[i], copy[empty]] = [copy[empty], copy[i]];
            empty = i;
          }
          return { length: route.length, solved: slideSolved(copy) };
        });
      });
      assert.deepEqual(values, [
        { length: 1, solved: true },
        { length: 31, solved: true },
      ]);
    },
  );
  await check(
    'Logical Sudoku hints identify singles, remain undoable, and keep their cost',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('sudoku');
        startExtra('sudoku');
        const solution = [...state.solution];
        const deductionBoard = [...solution];
        deductionBoard[0] = 0;
        const deduction = sudokuDeduction(deductionBoard, 0);
        const before = [...state.board];
        sudokuHint();
        const hints = state.hints,
          text = $('app').innerText;
        undoSudoku();
        return {
          deduction,
          expected: solution[0],
          restored: state.board.every((n, i) => n === before[i]),
          hints,
          afterUndo: state.hints,
          text,
        };
      });
      assert.equal(value.deduction.i, 0);
      assert.equal(value.deduction.n, value.expected);
      assert.match(value.deduction.reason, /الوحيد/);
      assert.equal(value.restored, true);
      assert.equal(value.hints, 1);
      assert.equal(value.afterUndo, 1);
      assert.match(value.text, /التلميح/);
    },
  );
  await check(
    'Easy Simon offers one scored retry rather than ending on the first mistake',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('simon');
        $('level').value = 'easy';
        startExtra('simon');
        state.phase = 'input';
        simonTap((state.sequence[0] + 1) % 4);
        return {
          done: state.done,
          phase: state.phase,
          lives: state.lives,
          mistakes: state.mistakes,
          text: $('app').innerText,
        };
      });
      assert.equal(value.done, false);
      assert.equal(value.phase, 'idle');
      assert.equal(value.lives, 1);
      assert.equal(value.mistakes, 1);
      assert.match(value.text, /10 نقاط/);
    },
  );
  await check(
    'Pattern feedback freezes its countdown through reading and modal pauses',
    async (page) => {
      await page.evaluate(() => {
        setup('pattern');
        startExtra('pattern');
        state.endAt = Date.now() + 4000;
        answerQuiz(state.questions[0].choices.indexOf(state.questions[0].answer));
      });
      const before = await page.evaluate(() => secondsLeft());
      await page.waitForTimeout(1150);
      assert.equal(await page.evaluate(() => secondsLeft()), before);
      await page.evaluate(() =>
        openModal('<h2 id="modaltitle">استراحة</h2><button onclick="closeModal()">نكمل</button>'),
      );
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        closeModal();
        nextQuiz();
      });
      const next = await page.evaluate(() => ({
        index: state.index,
        seconds: secondsLeft(),
        done: state.done,
      }));
      assert.equal(next.index, 1);
      assert.equal(next.seconds, before);
      assert.equal(next.done, false);
    },
  );
  await check('Typed scrambled letters consume tiles and erasing restores them', async (page) => {
    await page.evaluate(() => {
      setup('word');
      startExtra('word');
    });
    const letter = await page.evaluate(() => state.scrambled[0]);
    await page.locator('#wordanswer').fill(letter);
    const value = await page.evaluate(() => {
      const used = [...state.usedLetters],
        before = state.wordDraft;
      tapWordLetter(used[0]);
      const reused = state.wordDraft;
      eraseWordLetter();
      return { used, before, reused, after: state.wordDraft, afterUsed: state.usedLetters };
    });
    assert.equal(value.used.length, 1);
    assert.equal(value.reused, value.before);
    assert.equal(value.after, '');
    assert.deepEqual(value.afterUsed, []);
  });
  await check(
    'Memory consecutive matches reset on mismatch and expose accurate efficiency',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('memory');
        startMemory();
        state.deck = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];
        state.pairs = 4;
        flipCard(0);
        flipCard(1);
        flipCard(2);
        flipCard(3);
        const streak = state.streak;
        flipCard(4);
        flipCard(6);
        return {
          streak,
          current: state.streak,
          best: state.bestStreak,
          moves: state.moves,
          matched: state.matched.length,
          text: $('app').innerText,
        };
      });
      assert.deepEqual(
        {
          streak: value.streak,
          current: value.current,
          best: value.best,
          moves: value.moves,
          matched: value.matched,
        },
        { streak: 2, current: 0, best: 2, moves: 3, matched: 4 },
      );
      assert.match(value.text, /67%/);
    },
  );
  await check('Mime and taboo bonuses and undo use the exact same score history', async (page) => {
    const values = await page.evaluate(() => {
      setup('mime');
      startMime();
      mimeReady();
      mimeAnswer(true);
      mimeAnswer(true);
      mimeAnswer(true);
      const mimeBonus = state.score;
      undoMime();
      const mimeUndo = state.score;
      mimeAnswer(false);
      const mimeStreak = state.streak;
      setup('taboo');
      startExtra('taboo');
      tabooReady();
      tabooAnswer('correct');
      tabooAnswer('correct');
      tabooAnswer('correct');
      const tabooBonus = state.score;
      undoTaboo();
      const tabooUndo = state.score;
      tabooAnswer('violation');
      return {
        mimeBonus,
        mimeUndo,
        mimeStreak,
        tabooBonus,
        tabooUndo,
        tabooStreak: state.streak,
        tabooScore: state.score,
      };
    });
    assert.deepEqual(values, {
      mimeBonus: 35,
      mimeUndo: 20,
      mimeStreak: 0,
      tabooBonus: 35,
      tabooUndo: 20,
      tabooStreak: 0,
      tabooScore: 15,
    });
  });
  await check(
    'Secret question evidence and undo preserve escaped text and answer limits',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        hideSecret();
        secretReady();
        $('secretQuestionText').value = '<img src=x onerror=bad()> هل يطير؟';
        secretQuestion('yes');
        const text = state.questionTexts[0],
          answer = state.questionLog[0],
          injected = !!document.querySelector('#app img');
        undoSecretQuestion();
        return {
          text,
          answer,
          injected,
          count: state.questions,
          draft: $('secretQuestionText').value,
          logLength: state.questionTexts.length,
        };
      });
      assert.equal(value.answer, 'yes');
      assert.equal(value.injected, false);
      assert.equal(value.count, 0);
      assert.equal(value.logLength, 0);
      assert.equal(value.draft, value.text);
    },
  );
  await check(
    'Reaction anticipations receive an early-start penalty and valid trials stay valid',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('reaction');
        startReaction();
        state.stage = 'ready';
        state.readyAt = performance.now() - 30;
        reactionTap();
        const first = state.records[reactionName()][0];
        advanceReaction();
        state.stage = 'ready';
        state.readyAt = performance.now() - 200;
        reactionTap();
        const second = state.records[reactionName()][1];
        return { first, second };
      });
      assert.equal(value.first.time, 1500);
      assert.equal(value.first.falseStart, true);
      assert.equal(value.first.anticipated, true);
      assert.equal(value.second.falseStart, false);
      assert.equal(value.second.anticipated, false);
      assert.ok(value.second.time >= 195 && value.second.time < 500);
    },
  );
  await check(
    'Finder endpoint contradictions are disabled and undo restores search progress',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('finder');
        $('min').value = '1';
        $('max').value = '2';
        startNumber('finder');
        const lowerDisabled = document.querySelector(
          'button[onclick="finderAnswer(\'lower\')"]',
        ).disabled;
        finderAnswer('higher');
        const range = [state.l.toString(), state.h.toString()];
        const text = $('app').innerText;
        undoFinder();
        return {
          lowerDisabled,
          range,
          text,
          restored: [state.l.toString(), state.h.toString()],
          attempt: state.attempt,
        };
      });
      assert.equal(value.lowerDisabled, true);
      assert.deepEqual(value.range, ['2', '2']);
      assert.match(value.text, /رقم واحد مؤكد/);
      assert.deepEqual(value.restored, ['1', '2']);
      assert.equal(value.attempt, 1);
    },
  );
  await check(
    'Mind evidence preserves uncertain answers and rolls back exact candidate sets',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mind');
        startMind();
        const initial = [...state.candidates];
        mindAnswer('unknown');
        const unknown = [...state.candidates],
          evidence = [...state.evidence];
        mindAnswer('yes');
        const reduced = state.candidates.length;
        undoMind();
        return {
          initial,
          unknown,
          evidence,
          reduced,
          restored: state.candidates,
          remainingEvidence: state.evidence,
          text: $('app').innerText,
        };
      });
      assert.deepEqual(value.unknown, value.initial);
      assert.equal(value.evidence[0].answer, 'unknown');
      assert.ok(value.reduced < value.initial.length);
      assert.deepEqual(value.restored, value.initial);
      assert.deepEqual(value.remainingEvidence, value.evidence);
      assert.match(value.text, /الأدلة التي/);
    },
  );
  console.log(`\n${passed} core and advanced upgrade checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
