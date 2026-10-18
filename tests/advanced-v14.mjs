import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
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
  const scripts = (await Promise.all(scriptNames.map((name) => read(`src/${name}.js`)))).join('\n');
  const styles = (await Promise.all(styleNames.map((name) => read(`src/${name}.css`)))).join('\n');
  const html = (await read('src/template.html'))
    .replace('/* BUILD_SCRIPTS */', () => scripts)
    .replace('/* BUILD_STYLES */', () => styles);
  await writeFile('/tmp/lamma-advanced-v14.html', html);
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
const artifacts = fileURLToPath(new URL('../test-results/advanced-v14/', import.meta.url));
await mkdir(artifacts, { recursive: true });
let passed = 0;
async function check(name, test, viewport = { width: 1280, height: 900 }) {
  if (process.env.ADVANCED_CHECK && !name.includes(process.env.ADVANCED_CHECK)) return;
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
    await page.screenshot({
      path: `${artifacts}/${name.split(' ')[0]}.png`,
      fullPage: true,
      animations: 'disabled',
    });
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
const arabic = (value) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[digit]);
async function answerCurrent(page, correct = true, typed = false) {
  const question = await page.evaluate(() => state.questions[state.index]);
  if (typed) {
    await page.locator('#mathanswer').fill(arabic(question.answer));
    await page.locator('#mathanswer').press('Enter');
  } else {
    const index = question.choices.findIndex((value) => (value === question.answer) === correct);
    await page.locator(`.quizanswers button`).nth(index).click();
  }
}
async function finishQuestions(page, typed = false) {
  while (!(await page.evaluate(() => state.done))) {
    if (!(await page.evaluate(() => state.locked))) await answerCurrent(page, true, typed);
    await page.locator('#quiznext').click();
  }
}
try {
  await check('ttt coordinates, legal keyboard navigation, win and single score', async (page) => {
    await start(page, 'ttt', { opponent: 'friend', second: 1, first: 0 });
    await page.locator('[data-board-pos="0"]').click();
    assert.match(await page.locator('.board-last-action').innerText(), /صف 1، عمود 1/);
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '8');
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '1');
    assert.match(
      await page.locator('[data-board-pos="1"]').getAttribute('aria-label'),
      /صف 1 عمود 2/,
    );
    for (const position of [3, 1, 4, 2])
      await page.locator(`[data-board-pos="${position}"]`).click();
    assert.deepEqual(await page.evaluate(() => [state.done, state.winner, state.moves]), [
      true,
      1,
      5,
    ]);
    const scores = await page.evaluate(() => JSON.stringify(store.scores));
    await page.locator('[onclick="showBoardResult()"]').click();
    await page.evaluate(() => showBoardResult());
    assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), scores);
  });

  await check('connect gravity, full-column exclusion and horizontal win', async (page) => {
    await start(page, 'connect', { opponent: 'friend', second: 1, first: 0 });
    assert.match(await page.locator('[data-board-pos="0"]').getAttribute('aria-label'), /الصف 6/);
    for (let move = 0; move < 6; move++) await page.locator('[data-board-pos="0"]').click();
    assert.equal(await page.locator('[data-board-pos="0"]').isDisabled(), true);
    await page.locator('[data-board-pos="4"]').focus();
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '1');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.boardPos), '6');
    for (const column of [1, 6, 2, 6, 3])
      await page.locator(`[data-board-pos="${column}"]`).click();
    assert.deepEqual(await page.evaluate(() => [state.done, state.winner, state.moves]), [
      true,
      1,
      11,
    ]);
    assert.equal(await page.locator('.disc.win').count(), 4);
    assert.match(await page.locator('.board-last-action').innerText(), /صف 6، عمود 4/);
  });

  await check(
    'code Arabic quick entry retains focus, rejects repeats and opens safe',
    async (page) => {
      await start(page, 'code', { codelength: 4, repeatdigits: 'no' });
      await page.evaluate(() => {
        state.secret = [0, 1, 2, 3];
      });
      await page.locator('#codequick').fill('٠١٢٤');
      await page.locator('#codequick').press('Enter');
      assert.equal(await page.evaluate(() => state.attempts.length), 1);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'codequick');
      assert.deepEqual(
        await page.evaluate(() => [$('codequick').selectionStart, $('codequick').selectionEnd]),
        [0, 4],
      );
      await page.locator('#codequick').fill('٠٠١٢');
      await page.locator('#codequick').press('Enter');
      assert.equal(await page.evaluate(() => state.attempts.length), 1);
      await page.locator('#codequick').fill('٠١٢٣');
      await page.locator('#codequick').press('Enter');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.match(await page.locator('.success').innerText(), /الخزنة انفتحت/);
      assert.deepEqual(await page.evaluate(() => codeFeedback([1, 1, 2, 3], [1, 2, 1, 1])), {
        exact: 1,
        misplaced: 2,
      });
    },
  );

  await check(
    'simon transitions refresh controls and counters before the next sequence',
    async (page) => {
      await start(page, 'simon', { level: 'easy' });
      await page.evaluate(() => {
        state.speed = 10;
        state.sequence = [0];
        state.sequenceBank = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2];
        renderSimon();
      });
      await page.locator('[onclick="playSimon()"]').click();
      await page.waitForFunction(() => state.phase === 'input');
      await page.locator('#pad0').click();
      await page.evaluate(() => clearTimers());
      assert.equal(await page.locator('.sequencepad button:enabled').count(), 0);
      assert.equal(await page.locator('.stats .stat b').nth(1).innerText(), '1');
      assert.equal(await page.locator('.stats .stat b').nth(2).innerText(), '0 / 2');
      assert.equal(await page.locator('#seqtrace span').count(), 0);
      await page.evaluate(() => pauseClock());
      assert.equal(await page.evaluate(() => state.phase), 'idle');
      await page.evaluate(() => resumeClock());
      await page.locator('[onclick="playSimon()"]').click();
      await page.waitForFunction(() => state.phase === 'input');
      await page.locator('#pad0').click();
      await page.locator('#pad1').click();
      assert.equal(await page.evaluate(() => state.completed), 2);
      await page.evaluate(() => {
        clearTimers();
        state.completed = 14;
        state.sequence = [3];
        state.input = 0;
        state.phase = 'input';
        renderSimon();
      });
      await page.locator('#pad3').click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.locator('.simon-review').count(), 1);
    },
  );

  await check(
    'slide primary touch survives a second finger, undo and keyboard solve',
    async (page) => {
      await start(page, 'slide', { size: 3 });
      await page.evaluate(() => {
        Object.assign(state, {
          board: [1, 2, 3, 4, 5, 6, 0, 7, 8],
          empty: 6,
          path: [8, 7],
          moves: 0,
          history: [],
        });
        renderSlide();
        const puzzle = document.querySelector('.puzzle');
        const pointer = (type, pointerId, x, primary) =>
          puzzle.dispatchEvent(
            new PointerEvent(type, {
              pointerId,
              pointerType: 'touch',
              isPrimary: primary,
              clientX: x,
              clientY: 20,
              bubbles: true,
            }),
          );
        pointer('pointerdown', 1, 20, true);
        pointer('pointerdown', 2, 30, false);
        pointer('pointerup', 2, 100, false);
      });
      assert.equal(await page.evaluate(() => state.moves), 0);
      await page.evaluate(() => {
        document.querySelector('.puzzle').dispatchEvent(
          new PointerEvent('pointerup', {
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
            clientX: 90,
            clientY: 20,
            bubbles: true,
          }),
        );
        document.querySelector('[data-slide-pos="6"]').click();
      });
      assert.deepEqual(await page.evaluate(() => [state.empty, state.moves]), [7, 1]);
      await page.locator('[onclick="undoSlide()"]').click();
      assert.deepEqual(await page.evaluate(() => [state.empty, state.moves]), [6, 0]);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.match(await page.locator('.success').innerText(), /ترتبت اللوحة/);
    },
  );

  await check(
    'sudoku empty checks are free, givens immutable and generated puzzle finishes',
    async (page) => {
      await start(page, 'sudoku', { level: 'easy' });
      await page.locator('[onclick="checkSudoku()"]').click();
      assert.equal(await page.evaluate(() => state.checks), 0);
      assert.match(await page.locator('.panel p[role="status"]').first().innerText(), /لم تُخصم/);
      const given = await page.evaluate(() => state.given.findIndex(Boolean));
      await page.locator(`#sudoku-cell-${given}`).click();
      const original = await page.evaluate((index) => state.board[index], given);
      await page
        .locator('.numberpad button')
        .nth(original % 9)
        .click();
      assert.equal(await page.evaluate((index) => state.board[index], given), original);
      await page.evaluate(() => {
        const empty = state.board.findIndex((value) => !value);
        selectSudoku(empty);
        putSudoku(state.solution[empty]);
      });
      await page.locator('[onclick="checkSudoku()"]').click();
      await page.locator('[onclick="checkSudoku()"]').click();
      assert.equal(await page.evaluate(() => state.checks), 1);
      await page.locator('[onclick="fillAllSudokuNotes()"]').click();
      assert.ok(await page.evaluate(() => state.notes.some((notes) => notes.length)));
      await page.locator('[onclick="undoSudoku()"]').click();
      assert.equal(await page.evaluate(() => state.notes.flat().length), 0);
      const last = await page.evaluate(() => {
        const empty = state.board
          .map((value, index) => (!value ? index : -1))
          .filter((index) => index >= 0);
        const last = empty.pop();
        for (const index of empty) {
          selectSudoku(index);
          putSudoku(state.solution[index]);
        }
        selectSudoku(last);
        return state.solution[last];
      });
      await pressDigit(page, last);
      assert.equal(await page.evaluate(() => state.done), true);
      assert.match(await page.locator('.success').innerText(), /حلّيت السودوكو/);
    },
  );

  await check(
    'word locked Arabic article cannot be replaced and three words finish',
    async (page) => {
      await start(page, 'word', { wordcount: 3 });
      await page.evaluate(() => {
        state.queue = ['القمر', 'كتاب', 'زهرة'].map((name) => ({
          name,
          cat: 'objects',
          hints: ['تلميح أول', 'تلميح ثان'],
          aliases: [],
        }));
        state.scrambleBank = state.queue.map((item) => scrambleWord(item.name));
        prepareWord();
        renderWord();
      });
      await page.locator('[onclick^="revealWordPrefix("]').click();
      await page.locator('[onclick^="revealWordPrefix("]').click();
      assert.equal(await page.evaluate(() => state.wordPrefix), 'ال');
      await page.locator('#wordanswer').fill('بحر');
      assert.equal(await page.locator('#wordanswer').inputValue(), 'ال');
      assert.equal(await page.evaluate(() => state.tries), 0);
      for (const word of ['القمر', 'كتاب', 'زهرة']) {
        await page.locator('#wordanswer').fill(word);
        await page.locator('#wordanswer').press('Enter');
        assert.equal(await page.evaluate(() => state.roundOver), true);
        await page.locator('[onclick="nextWord()"]').click();
      }
      assert.deepEqual(await page.evaluate(() => [state.done, state.correct]), [true, 3]);
    },
  );

  await check(
    'math unique seeded question bank, Arabic typed focus and independent practice',
    async (page) => {
      await start(page, 'math', { quizcount: 5, mathmode: 'missing' });
      await answerCurrent(page, false);
      await page.locator('#quiznext').click();
      await answerCurrent(page, true, true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'quiznext');
      const time = await page.evaluate(() => secondsLeft());
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => secondsLeft()), time);
      await finishQuestions(page, true);
      const scores = await page.evaluate(() => JSON.stringify(store.scores));
      await page.locator('[onclick="startQuizPractice()"]').click();
      await finishQuestions(page, true);
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), scores);
      assert.equal(await page.evaluate(() => state.correct), 1);
    },
  );

  await check('color mixed word, ink and symbol rules complete all questions', async (page) => {
    await start(page, 'color', { quizcount: 15, colormode: 'mixed', colorrule: 'shape' });
    const rules = await page.evaluate(() =>
      [...new Set(state.questions.map((question) => question.rule || 'ink'))].sort(),
    );
    assert.deepEqual(rules, ['ink', 'shape', 'word']);
    await finishQuestions(page);
    assert.deepEqual(await page.evaluate(() => [state.done, state.correct, state.answers.length]), [
      true,
      15,
      15,
    ]);
    assert.equal(await page.evaluate(() => store.scores[state.name].points), 100);
  });

  await check(
    'pattern missing-value workpad hides gaps, charges once and typed solve finishes',
    async (page) => {
      await start(page, 'pattern', { quizcount: 8, level: 'hard', patternmode: 'missing' });
      assert.equal(await page.locator('.chain .missing').count(), 1);
      await page.locator('[onclick^="openPatternWorkpad("]').click();
      await page.evaluate(() => openPatternWorkpad(state.run, state.index));
      assert.equal(await page.evaluate(() => state.reasoningPenalty), 3);
      const visibleGaps = await page.evaluate(
        () =>
          patternDifferences(state.questions[0].seq)
            .flat()
            .filter((value) => value === null).length,
      );
      assert.ok(visibleGaps >= 2);
      await answerCurrent(page, true, true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'quiznext');
      await finishQuestions(page, true);
      assert.deepEqual(
        await page.evaluate(() => [state.correct, store.scores[state.name].points]),
        [8, 97],
      );
    },
  );

  await check(
    'spy roster consistency, private voting, selected word focus and final scores',
    async (page) => {
      await page.evaluate(() => {
        store.players = ['أحمد', 'ليلى', 'سالم', 'نور', 'علي'];
        // The participant provider is the integration boundary used by all party games.
        selectedGameParticipants = (id) => (id === 'spy' ? ['ليلى', 'سالم', 'نور'] : null);
      });
      await start(page, 'spy');
      assert.deepEqual(await page.evaluate(() => state.players), ['ليلى', 'سالم', 'نور']);
      assert.equal(await page.evaluate(() => state.spyCount), 1);
      for (let index = 0; index < 3; index++) {
        await page.locator('[onclick^="spyReveal("]').click();
        if (index === 0) {
          await page.evaluate(() => pauseClock());
          assert.equal(await page.evaluate(() => state.stage), 'handoff');
          await page.evaluate(() => resumeClock());
          await page.locator('[onclick^="spyReveal("]').click();
        }
        await page.locator('[onclick^="spyHide("]').click();
      }
      await page.locator('[onclick="spyDiscuss()"]').click();
      await page.locator('[onclick="startSpyVote()"]').click();
      for (let voter = 0; voter < 3; voter++) {
        await page.locator('[onclick^="spyVoteReveal("]').click();
        await page
          .locator(
            `[onclick="castSpyVote(${(voter + 1) % 3},${voter},${await page.evaluate(() => state.run)})"]`,
          )
          .click();
      }
      assert.equal(await page.evaluate(() => state.stage), 'vote-result');
      assert.equal(await page.evaluate(() => state.votes.length), 3);
      await page.locator('[onclick="spyGuessHandoff()"]').click();
      await page.locator('[onclick="spyGuess()"]').click();
      const location = await page.evaluate(() => state.location);
      await page.locator('#spyguess').fill(location);
      await page
        .locator('#spyguessresults')
        .getByRole('button', { name: location, exact: true })
        .click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'spyguesssubmit');
      await page.keyboard.press('Enter');
      assert.deepEqual(
        await page.evaluate(() => [
          state.done,
          state.guessCorrect,
          Object.keys(state.results).length,
        ]),
        [true, true, 3],
      );
      assert.deepEqual(
        await page.evaluate(() => Object.keys(store.scores).sort()),
        ['ليلى', 'سالم', 'نور'].sort(),
      );
    },
  );

  await check(
    'taboo exact streak feedback, retained button focus, undo and all turns',
    async (page) => {
      await start(page, 'taboo', { rounds: 1, tabooskips: 3 });
      await page.locator('[onclick="tabooReady()"]').click();
      for (let answer = 0; answer < 3; answer++)
        await page.locator('[data-taboo-action="correct"]').click();
      assert.equal(await page.evaluate(() => state.score), 35);
      assert.match(await page.locator('.taboo-feedback').innerText(), /\+15.*\+5/);
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.tabooAction),
        'correct',
      );
      await page.locator('[data-taboo-action="undo"]').click();
      assert.deepEqual(
        await page.evaluate(() => [state.score, state.correct, state.streak]),
        [20, 2, 2],
      );
      assert.match(await page.locator('.taboo-feedback').innerText(), /ألغينا/);
      await page.locator('[onclick="endTaboo()"]').click();
      await page.locator('[onclick="advanceTaboo()"]').click();
      for (let turn = 1; turn < 3; turn++) {
        await page.locator('[onclick="tabooReady()"]').click();
        await page.locator('[data-taboo-action="correct"]').click();
        await page.locator('[onclick="endTaboo()"]').click();
        await page.locator('[onclick="advanceTaboo()"]').click();
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.deepEqual(await page.evaluate(() => Object.values(state.results)), [20, 10, 10]);
    },
  );

  await check(
    'variety deterministic quiz banks reduce repeats and retain valid answers',
    async (page) => {
      const proof = await page.evaluate(() => {
        const summary = [];
        for (const id of ['math', 'color', 'pattern']) {
          const runs = [];
          for (let run = 0; run < 2; run++) {
            seededRandom = makeSeed('advanced-v14:' + id);
            const count = id === 'color' ? 15 : 30;
            const questions = buildQuizQuestions(
              id,
              'hard',
              count,
              Array.from({ length: id === 'pattern' ? 14 : 10 }, (_, index) => index),
            );
            runs.push(JSON.stringify(questions));
            if (!run)
              summary.push({
                id,
                count: questions.length,
                unique: new Set(questions.map((question) => quizQuestionKey(question, id))).size,
                valid: questions.every(
                  (question) =>
                    question.choices.includes(question.answer) &&
                    new Set(question.choices).size === question.choices.length,
                ),
              });
            seededRandom = null;
          }
          if (runs[0] !== runs[1]) throw Error('Non-reproducible bank: ' + id);
        }
        return summary;
      });
      for (const game of proof) {
        assert.equal(game.unique, game.count, game.id);
        assert.equal(game.valid, true, game.id);
      }
    },
  );

  await check(
    'mobile every advanced game fits 320px and exposes usable controls',
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
        await start(
          page,
          id,
          ['ttt', 'connect'].includes(id) ? { opponent: 'friend', second: 1 } : {},
        );
        if (id === 'taboo') await page.locator('[onclick="tabooReady()"]').click();
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(layout.scroll <= layout.width + 1, `${id}: ${JSON.stringify(layout)}`);
        assert.ok(await page.locator('.play button:visible').count(), id);
        await page.screenshot({
          path: `${artifacts}/mobile-${id}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
    },
    { width: 320, height: 780 },
  );
  console.log(`Advanced v14: ${passed} browser checks passed; screenshots: ${artifacts}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
