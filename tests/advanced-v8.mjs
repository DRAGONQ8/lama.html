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
  await writeFile('/tmp/lamma-advanced-v8.html', html);
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
    'Duel series alternate openings, stop at majority, and review cannot reward twice',
    async (page) => {
      for (const id of ['ttt', 'connect']) {
        await start(page, id, { opponent: 'friend', second: 1, first: 0, boardseries: 3 });
        const moves = id === 'ttt' ? [0, 3, 1, 4, 2] : [0, 6, 1, 6, 2, 5, 3];
        await page.evaluate((moves) => {
          for (const pos of moves) boardMove(pos);
        }, moves);
        assert.deepEqual(
          await page.evaluate(() => [state.done, state.series.wins, boardSeriesOver()]),
          [true, [1, 0], false],
        );
        const scored = await page.evaluate(() => JSON.stringify(store.scores));
        await page.locator('[onclick="nextBoardRound()"]').click();
        assert.deepEqual(
          await page.evaluate(() => [state.series.round, state.turn, state.moves, state.done]),
          [2, 1, 0, false],
        );
        const secondMoves = id === 'ttt' ? [3, 0, 4, 1, 8, 2] : [6, 0, 6, 1, 5, 2, 5, 3];
        await page.evaluate((moves) => {
          for (const pos of moves) boardMove(pos);
        }, secondMoves);
        assert.deepEqual(await page.evaluate(() => [state.series.wins, boardSeriesOver()]), [
          [2, 0],
          true,
        ]);
        const finalBoard = await page.evaluate(() => [...state.board]);
        const beforeReview = await page.evaluate(() => JSON.stringify(store.scores));
        await page.evaluate(() => reviewBoardMove(0));
        assert.deepEqual(await page.evaluate(() => state.board), finalBoard);
        assert.equal(await page.evaluate(() => state.replayIndex), 0);
        assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), beforeReview);
        await page.evaluate(() => {
          nextBoardRound();
          showBoardResult();
          showBoardResult();
        });
        assert.equal(await page.evaluate(() => state.series.round), 2);
        assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), beforeReview);
        assert.notEqual(scored, beforeReview);
      }
    },
  );
  await check(
    'Code notebook and evidence checks use clues without leaking or spending guesses',
    async (page) => {
      await start(page, 'code', { codelength: 3, repeatdigits: 'no' });
      await page.evaluate(() => {
        state.secret = [7, 8, 9];
        state.attempts = [{ guess: [0, 1, 2], exact: 0, misplaced: 0 }];
        state.draft = [0, 3, 4];
        renderCode();
        inspectCodeDraft();
      });
      assert.match(await page.locator('.code-response').innerText(), /يتعارض/);
      assert.deepEqual(await page.evaluate(() => [state.attempts.length, state.hints]), [1, 0]);
      await page.evaluate(() => {
        markCodeDigit(0);
        markCodeDigit(0);
      });
      assert.equal(await page.evaluate(() => state.digitNotes[0]), 2);
      await page.evaluate(() => {
        state.draft = [3, 4, 5];
        renderCode();
        inspectCodeDraft();
      });
      assert.match(await page.locator('.code-response').innerText(), /يطابق/);
      assert.deepEqual(await page.evaluate(() => [state.attempts.length, state.hints]), [1, 0]);
      await page.evaluate(() => submitCode());
      assert.equal(await page.evaluate(() => state.attempts.length), 2);
      assert.equal(await page.evaluate(() => state.analysis), 24);
    },
  );
  await check(
    'Simon reverse mode enforces reverse input and ignores paused and stale calls',
    async (page) => {
      await start(page, 'simon', { simonmode: 'reverse', level: 'easy' });
      await page.evaluate(() => {
        state.sequence = [0, 1, 2];
        state.phase = 'input';
        renderSimon();
      });
      assert.match(await page.locator('#seqstatus').innerText(), /الأخير/);
      await page.locator('#pad2').click();
      assert.equal(await page.evaluate(() => state.input), 1);
      assert.equal(await page.locator('#seqtrace span').count(), 1);
      await page.evaluate(() => {
        pauseClock();
        simonTap(1);
      });
      assert.equal(await page.evaluate(() => state.input), 1);
      await page.evaluate(() => resumeClock());
      await page.locator('#pad1').click();
      await page.locator('#pad0').click();
      assert.equal(await page.evaluate(() => state.completed), 1);
      await page.evaluate(() => {
        home();
        simonTap(0);
      });
      assert.equal(await page.evaluate(() => screen), 'home');
    },
  );
  await check(
    'Slide pushes entire lines as one undo transaction and swipes consume the follow-up click',
    async (page) => {
      await start(page, 'slide', { size: 3 });
      const before = await page.evaluate(() => {
        state.board = [1, 2, 3, 4, 5, 6, 0, 7, 8];
        state.empty = 6;
        state.path = [8, 7];
        state.moves = 0;
        state.history = [];
        renderSlide();
        return [...state.board];
      });
      await page.locator('[onclick="toggleSlideLine()"]').click();
      await page.locator('[data-slide-pos="8"]').click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => state.moves), 2);
      await start(page, 'slide', { size: 3 });
      await page.evaluate(() => {
        state.board = [1, 2, 3, 4, 5, 6, 0, 8, 7];
        state.empty = 6;
        state.path = [8, 7];
        state.history = [];
        state.moves = 0;
        state.lineMode = true;
        renderSlide();
        slideMove(8);
      });
      assert.equal(await page.evaluate(() => state.history.length), 1);
      assert.equal(await page.evaluate(() => state.moves), 2);
      await page.evaluate(() => undoSlide());
      assert.deepEqual(await page.evaluate(() => state.board), [1, 2, 3, 4, 5, 6, 0, 8, 7]);
      assert.equal(await page.evaluate(() => state.moves), 0);
      await page.evaluate(() => {
        const puzzle = document.querySelector('.puzzle');
        puzzle.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 1,
            clientX: 10,
            clientY: 10,
            bubbles: true,
          }),
        );
        puzzle.dispatchEvent(
          new PointerEvent('pointerup', { pointerId: 1, clientX: 65, clientY: 10, bubbles: true }),
        );
        document.querySelector('[data-slide-pos="6"]').click();
      });
      assert.deepEqual(await page.evaluate(() => [state.empty, state.moves]), [7, 1]);
      assert.deepEqual(before, [1, 2, 3, 4, 5, 6, 0, 7, 8]);
    },
  );
  await check(
    'Sudoku bulk notes restore exactly and logical explanations are idempotent and stale-safe',
    async (page) => {
      await start(page, 'sudoku', { level: 'easy' });
      await page.evaluate(() => {
        state.board = [...state.solution];
        for (const i of [0, 1, 10, 20]) state.board[i] = 0;
        state.given = state.board.map(Boolean);
        state.selected = 0;
        state.notes = Array.from({ length: 81 }, () => []);
        state.history = [];
        renderSudoku();
      });
      await page.locator('[onclick="fillAllSudokuNotes()"]').click();
      const notes = await page.evaluate(() => state.notes.map((a) => [...a]));
      assert.ok(notes[0].length > 0);
      await page.evaluate(() => fillAllSudokuNotes());
      assert.equal(await page.evaluate(() => state.history.length), 1);
      await page.evaluate(() => undoSudoku());
      assert.equal(await page.evaluate(() => state.notes.flat().length), 0);
      await page.evaluate(() => {
        explainSudokuStep();
        explainSudokuStep();
      });
      assert.deepEqual(
        await page.evaluate(() => [state.checks, state.hints, state.board[state.selected]]),
        [1, 0, 0],
      );
      const step = await page.evaluate(() => ({ ...state.logical }));
      await page.locator('[onclick="applySudokuLogic()"]').click();
      assert.deepEqual(
        await page.evaluate((i) => [state.board[i], state.hints, !!state.logical], step.i),
        [step.n, 1, false],
      );
      await page.evaluate(() => applySudokuLogic());
      assert.equal(await page.evaluate(() => state.hints), 1);
    },
  );
  await check(
    'Word letter slots reorder and remove duplicate occurrences; reading never uses play time',
    async (page) => {
      await start(page, 'word');
      await page.evaluate(() => {
        state.item = { name: 'باب', cat: 'objects', hints: ['أداة منزلية', 'يفتح ويغلق'] };
        state.scrambled = ['ا', 'ب', 'ب'];
        state.wordDraft = 'ابب';
        state.usedLetters = usedWordLetters(state.wordDraft, state.scrambled);
        renderWord();
      });
      await page.locator('[onclick="selectWordSlot(0)"]').click();
      await page.locator('[onclick="moveWordSlot(1)"]').click();
      assert.equal(await page.evaluate(() => state.wordDraft), 'باب');
      await page.locator('[onclick="removeWordSlot()"]').click();
      assert.equal(await page.evaluate(() => state.wordDraft), 'بب');
      assert.deepEqual(await page.evaluate(() => state.usedLetters), [1, 2]);
      await page.locator('[onclick="tapWordLetter(0)"]').click();
      assert.equal(await page.evaluate(() => state.wordDraft), 'ببا');
      await page.locator('#wordanswer').fill('باب');
      await page.evaluate(() => {
        state.endAt = Date.now() + 5000;
        guessWord();
      });
      const left = await page.evaluate(() => secondsLeft());
      await page.waitForTimeout(1150);
      assert.equal(await page.evaluate(() => secondsLeft()), left);
      assert.equal(await page.evaluate(() => state.roundOver), true);
      await page.locator('[onclick="nextWord()"]').click();
      assert.equal(await page.evaluate(() => state.roundOver), false);
      assert.ok((await page.evaluate(() => state.endAt - Date.now())) > 3000);
    },
  );
  await check(
    'Math, color and pattern review training never add scores; mixed Stroop switches its actual answer',
    async (page) => {
      for (const id of ['math', 'color', 'pattern']) {
        await start(page, id, id === 'color' ? { colormode: 'mixed' } : {});
        if (id === 'color') {
          const q = await page.evaluate(() => state.questions[1]);
          assert.equal(q.rule, 'word');
          assert.equal(q.answer, q.word);
          assert.notEqual(q.ink, q.word);
        }
        await page.evaluate(() => {
          skipQuiz();
          quizEnd();
        });
        const before = await page.evaluate(() => JSON.stringify(store.scores));
        await page.locator('[onclick="startQuizPractice()"]').click();
        await page.evaluate(() => {
          for (let i = 0; i < state.questions.length; i++) {
            answerQuiz(
              state.questions[state.index].choices.indexOf(state.questions[state.index].answer),
            );
            nextQuiz();
          }
        });
        assert.equal(await page.evaluate(() => state.done), true);
        assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), before);
        assert.match(await page.locator('.success h2').innerText(), /التدريب/);
        await page.evaluate(() => {
          quizEnd();
          startQuizPractice();
        });
        assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), before);
      }
    },
  );
  await check(
    'Direct arithmetic accepts Arabic signed input and missing-middle patterns grade the gap',
    async (page) => {
      await start(page, 'math');
      await page.evaluate(() => {
        state.questions[0] = {
          text: '3 − 8',
          answer: -5,
          choices: [-5, 5, 11, -3],
          explain: '3 − 8 = -5',
        };
        renderQuiz();
      });
      await page.locator('#mathanswer').fill('−٥');
      await page.locator('#mathanswer').press('Enter');
      assert.deepEqual(
        await page.evaluate(() => [state.correct, state.answers[0].choice, state.lastTyped]),
        [1, -5, -5],
      );
      await page.locator('#quiznext').click();
      await page.locator('#mathanswer').fill('invalid');
      await page.locator('#mathanswer').press('Enter');
      assert.equal(await page.evaluate(() => state.answers.length), 1);
      await start(page, 'pattern', { patternmode: 'missing' });
      const question = await page.evaluate(() => state.questions[0]);
      assert.ok(question.gap >= 1 && question.gap <= 4);
      assert.equal(question.seq.length, 6);
      assert.equal(question.seq[question.gap], null);
      assert.equal(await page.locator('.chain .missing').count(), 1);
      await page.evaluate(() =>
        answerQuiz(state.questions[0].choices.indexOf(state.questions[0].answer)),
      );
      assert.equal(await page.evaluate(() => state.correct), 1);
    },
  );
  await check(
    'Spy questions let players choose each asker and target and preserve a public discussion log',
    async (page) => {
      await start(page, 'spy');
      await page.evaluate(() => {
        for (let i = 0; i < state.players.length; i++) {
          spyReveal();
          spyHide();
        }
        spyDiscuss();
      });
      const first = await page.evaluate(() => state.asker);
      const target = (first + 2) % 3;
      await page.locator('#spytarget').selectOption(String(target));
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.deepEqual(
        await page.evaluate(() => [
          state.asker,
          state.questionHistory[0].target,
          state.questionHistory[0].asker,
        ]),
        [null, target, first],
      );
      await page.evaluate(() => {
        pauseClock();
        nextSpyPrompt();
      });
      assert.equal(await page.evaluate(() => state.questionHistory.length), 1);
      await page.evaluate(() => {
        resumeClock();
        startSpyVote();
      });
      await page.evaluate(() => {
        for (let i = 0; i < state.players.length; i++) {
          spyVoteReveal();
          castSpyVote((i + 1) % state.players.length);
        }
      });
      assert.equal(await page.evaluate(() => state.done), false);
      assert.equal(await page.evaluate(() => state.stage), 'vote-result');
      await page.evaluate(() => {
        spyGuessHandoff();
        spyGuess();
        $('spyguess').value = state.location;
        submitSpyGuess(state.run);
      });
      assert.equal(await page.evaluate(() => state.done), true);
      assert.match(await page.locator('.history summary').innerText(), /سجل النقاش/);
    },
  );
  await check(
    'Taboo hiding and pausing remove the secret, gate scoring, and record each turn once',
    async (page) => {
      await start(page, 'taboo');
      assert.match(await page.locator('.panel').innerText(), /المراقب/);
      await page.locator('[onclick="tabooReady()"]').click();
      const word = await page.evaluate(() => state.card[0]);
      await page.locator('[onclick="toggleTabooCard()"]').click();
      assert.equal(await page.locator('.forbidden span').count(), 0);
      assert.ok(!(await page.locator('.secret').innerText()).includes(word));
      await page.evaluate(() => tabooAnswer('correct'));
      assert.equal(await page.evaluate(() => state.correct), 0);
      await page.locator('[onclick="toggleTabooCard()"]').click();
      await page.evaluate(() => {
        pauseClock();
        tabooAnswer('correct');
      });
      assert.equal(await page.evaluate(() => state.cardHidden), true);
      assert.equal(await page.locator('.forbidden span').count(), 0);
      await page.evaluate(() => resumeClock());
      await page.locator('[onclick="toggleTabooCard()"]').click();
      await page.evaluate(() => {
        tabooAnswer('correct');
        tabooAnswer('correct');
        undoTaboo();
      });
      assert.equal(await page.evaluate(() => state.correct), 1);
      await page.evaluate(() => endTaboo());
      const score = await page.evaluate(() => JSON.stringify(store.scores));
      await page.evaluate(() => endTaboo());
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), score);
      assert.equal(await page.evaluate(() => state.turnSummaries.length), 1);
    },
  );
  await check(
    'New advanced interactions fit phone widths and paused or stale handlers cannot mutate games',
    async (page) => {
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
        'spy',
        'taboo',
      ]) {
        const options =
          id === 'ttt' || id === 'connect'
            ? { opponent: 'friend', second: 1, boardseries: 3 }
            : id === 'simon'
              ? { simonmode: 'reverse' }
              : id === 'color'
                ? { colormode: 'mixed' }
                : {};
        await start(page, id, options);
        if (id === 'taboo') await page.evaluate(() => tabooReady());
        if (id === 'spy')
          await page.evaluate(() => {
            for (let i = 0; i < state.players.length; i++) {
              spyReveal();
              spyHide();
            }
            spyDiscuss();
          });
        if (id === 'word')
          await page.evaluate(() => {
            state.wordDraft = 'كتاب';
            renderWord();
          });
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 844 });
          const dims = await page.evaluate(() => [
            document.documentElement.scrollWidth,
            document.documentElement.clientWidth,
          ]);
          assert.ok(dims[0] <= dims[1] + 1, `${id} overflows at ${width}: ${dims}`);
        }
        await page.evaluate(() => {
          home();
          undoBoard();
          reviewBoardMove(0);
          nextBoardRound();
          markCodeDigit(0);
          inspectCodeDraft();
          simonTap(0);
          toggleSlideLine();
          slideMove(0);
          fillAllSudokuNotes();
          applySudokuLogic();
          selectWordSlot(0);
          moveWordSlot(1);
          removeWordSlot();
          startQuizPractice();
          setSpyTarget(0);
          toggleTabooCard();
        });
        assert.equal(await page.evaluate(() => screen), 'home');
      }
    },
    { width: 390, height: 844 },
  );
  await check(
    'Fixed challenge seeds preserve baseline rules despite custom mode controls',
    async (page) => {
      for (const id of ['ttt', 'simon', 'color', 'pattern']) {
        const snapshots = [];
        for (const custom of [false, true]) {
          snapshots.push(
            await page.evaluate(
              ({ id, custom }) => {
                setup(id);
                if (custom) {
                  const control = {
                    ttt: ['boardseries', '5'],
                    simon: ['simonmode', 'reverse'],
                    color: ['colormode', 'mixed'],
                    pattern: ['patternmode', 'missing'],
                  }[id];
                  $(control[0]).value = control[1];
                }
                dailyRun = { id, date: '2026-10-13' };
                startExtra(id);
                return JSON.stringify({
                  series: state.series?.limit,
                  mode: state.mode,
                  colorMode: state.colorMode,
                  patternMode: state.patternMode,
                  board: state.board,
                  sequence: state.sequenceBank,
                  questions: state.questions,
                });
              },
              { id, custom },
            ),
          );
        }
        assert.equal(snapshots[0], snapshots[1], id);
      }
    },
  );
  console.log(`Advanced v8: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
