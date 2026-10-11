import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const external = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (!request.url().startsWith(`http://127.0.0.1:${port}`)) external.push(request.url());
});
let passed = 0;
async function check(name, test) {
  await test();
  passed++;
  console.log(`✓ ${name}`);
}

try {
  await page.goto(`http://127.0.0.1:${port}`);
  await check('Standalone library has 28 unique games and expanded vocabulary', async () => {
    const info = await page.evaluate(() => ({
      games: games.length,
      ids: games.map((g) => g[0]),
      vocabulary: builtInCount,
      names: items.map((i) => norm(i.name)),
      cards: document.querySelectorAll('.gamecard').length,
    }));
    assert.equal(info.games, 28);
    assert.equal(new Set(info.ids).size, 28);
    assert.equal(info.cards, 28);
    assert.ok(info.vocabulary >= 218, `Vocabulary: ${info.vocabulary}`);
    assert.equal(new Set(info.names).size, info.names.length, 'Vocabulary contains duplicates');
  });
  await check('Every game opens and starts through its visible start button', async () => {
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
    });
    const ids = await page.evaluate(() => games.map((g) => g[0]));
    for (const id of ids) {
      await page.evaluate((id) => setup(id), id);
      assert.equal(await page.evaluate(() => screen), 'setup', `${id}: setup`);
      const start = page.locator('#app button[onclick]').filter({ hasText: /./ });
      const actions = await start.evaluateAll((buttons) =>
        buttons.map((b) => b.getAttribute('onclick')),
      );
      const startAction = actions.find((value) => /\bstart\w*\(/.test(value));
      assert.ok(startAction, `${id}: missing start control`);
      await page
        .locator('#app button')
        .filter({ visible: true })
        .evaluateAll((buttons, action) => {
          buttons.find((button) => button.getAttribute('onclick') === action)?.click();
        }, startAction);
      await page.waitForTimeout(25);
      assert.equal(await page.evaluate(() => screen), id, `${id}: start`);
      assert.ok(await page.locator('#app').innerText(), `${id}: empty game`);
      assert.deepEqual(errors, [], `${id}: runtime exception`);
      await page.evaluate(() => home());
    }
  });
  await check('Arabic integers, duplicate code feedback and tactical board AI', async () => {
    const values = await page.evaluate(() => {
      const b = Array(42).fill(0);
      b[35] = 2;
      b[28] = 2;
      b[21] = 2;
      return {
        arabic: integer('−١٢٣٬٤٥٦').toString(),
        big: integer('999999999999999999999999999999').toString(),
        feedback: codeFeedback([1, 1, 2, 3], [1, 2, 1, 1]),
        ttt: tttBest([2, 2, 0, 1, 1, 0, 0, 0, 0], 2),
        connect: connectBest(b, 3),
      };
    });
    assert.equal(values.arabic, '-123456');
    assert.equal(values.big, '999999999999999999999999999999');
    assert.deepEqual(values.feedback, { exact: 1, misplaced: 2 });
    assert.equal(values.ttt, 2);
    assert.equal(values.connect, 0);
  });
  await check('Sudoku puzzles have one solution at every difficulty', async () => {
    const counts = await page.evaluate(() =>
      ['easy', 'normal', 'hard'].map((level) => {
        const { puzzle, solution } = generateSudoku(level);
        return {
          count: sudokuCount(puzzle),
          complete: solution.every((n, i) => !sudokuConflicts(solution, i)),
        };
      }),
    );
    assert.ok(counts.every((v) => v.count === 1 && v.complete));
  });
  await check('2048 merges once per move and does not add pieces on a no-op', async () => {
    const merged = await page.evaluate(() => {
      const board = Array(16).fill(0);
      board.splice(0, 4, 2, 2, 2, 2);
      const left = mergeSlide(board, 'left');
      const reverse = mergeSlide(board, 'right');
      setup('merge');
      startArcade('merge');
      state.board = [2, 0, 0, 0, ...Array(12).fill(0)];
      mergeMove('left');
      return { left, reverse, board: state.board, moves: state.moves };
    });
    assert.deepEqual(merged.left.board.slice(0, 4), [4, 4, 0, 0]);
    assert.deepEqual(merged.reverse.board.slice(0, 4), [0, 0, 4, 4]);
    assert.equal(merged.left.gained, 8);
    assert.equal(merged.moves, 0);
    assert.equal(merged.board.filter(Boolean).length, 1);
  });
  await check('Mines are excluded from first reveal and adjacent cells', async () => {
    const safe = await page.evaluate(() =>
      [8, 12, 16].map((size) => {
        setup('mines');
        $('arcadeSize').value = String(size);
        startArcade('mines');
        const first = Math.floor((size * size) / 2);
        mineTap(first);
        return {
          safe: [first, ...mineNeighbours(first, size)].every((i) => !state.mines.has(i)),
          flood: [...state.revealed].every((i) => !state.mines.has(i)),
          count: state.mines.size,
          expected: state.mineCount,
          numbers: state.board.every(
            (v, i) =>
              v === -1 || v === mineNeighbours(i, size).filter((j) => state.mines.has(j)).length,
          ),
        };
      }),
    );
    assert.ok(safe.every((v) => v.safe && v.flood && v.numbers && v.count === v.expected));
  });
  await check('All maze sizes contain connected passages and reachable exits', async () => {
    const valid = await page.evaluate(() =>
      [7, 10, 15].map((size) => {
        const { width, grid } = mazeGenerate(size),
          start = width + 1;
        const exit = (width - 2) * width + width - 2;
        return (
          mazePath(grid, width, start, exit).length > 0 &&
          grid.every((wall, i) => wall || mazePath(grid, width, start, i).length > 0)
        );
      }),
    );
    assert.ok(valid.every(Boolean));
  });
  await check(
    'Knowledge questions and the Arabic word dictionaries are internally valid',
    async () => {
      const info = await page.evaluate(() => ({
        questions: triviaBank.length,
        validQuestions: triviaBank.every(
          (q) =>
            q.question &&
            q.explanation &&
            q.choices.length === 4 &&
            new Set(q.choices).size === 4 &&
            q.choices.includes(q.answer),
        ),
        validWords: wordsLexicon.every(
          (w) => w.hint && [...w.key].every((letter) => arabicKeyboard.includes(letter)),
        ),
        dictionary: wordguessDictionary.size,
        originalNormalizer: Array.isArray(wordLetters('أرنب')),
      }));
      assert.equal(info.questions, 100);
      assert.ok(info.validQuestions && info.validWords && info.originalNormalizer);
      assert.ok(info.dictionary >= 300);
    },
  );
  await check('Repeated Arabic letters receive correct Wordle feedback', async () => {
    const feedback = await page.evaluate(() => ({
      repeated: wordguessFeedback('مممم', 'ماما'),
      misplaced: wordguessFeedback('اااب', 'ابجد'),
    }));
    assert.deepEqual(feedback.repeated, ['correct', 'absent', 'correct', 'absent']);
    assert.deepEqual(feedback.misplaced, ['correct', 'absent', 'absent', 'present']);
  });
  await check('A full correct trivia round saves one result and stops its clock', async () => {
    const outcome = await page.evaluate(() => {
      home();
      const before = totalRounds();
      setup('trivia');
      $('triviaTimer').value = '0';
      startWordsGame('trivia');
      while (!state.done) {
        const q = state.questions[state.index];
        answerTrivia(q.choices.indexOf(q.answer));
        nextTrivia();
      }
      nextTrivia();
      return {
        rounds: totalRounds() - before,
        best: store.extra.best.trivia,
        timers: timers.length,
      };
    });
    assert.deepEqual(outcome, { rounds: 1, best: 100, timers: 0 });
  });
  await check('Hangman and both Wordle sizes finish and record once', async () => {
    const outcomes = await page.evaluate(() => {
      home();
      const results = [];
      let before = totalRounds();
      setup('hangman');
      $('hangCount').value = '1';
      startWordsGame('hangman');
      for (const letter of [...new Set(state.item.key)]) guessHangman(letter);
      nextHangman();
      nextHangman();
      results.push(totalRounds() - before);
      for (const size of [4, 5]) {
        before = totalRounds();
        setup('wordguess');
        $('wordguessLength').value = String(size);
        startWordsGame('wordguess');
        state.entry = state.item.key;
        submitWordguess();
        finishWordguess();
        finishWordguess();
        results.push(totalRounds() - before);
      }
      return results;
    });
    assert.deepEqual(outcomes, [1, 1, 1]);
  });
  await check('Target scoring consumes a hit once and freezes during a modal', async () => {
    await page.evaluate(() => {
      home();
      setup('target');
      startWordsGame('target');
      const { slot, token } = state;
      hitTarget(slot, token);
      hitTarget(slot, token);
      hitTarget(slot, token);
      openSettings();
    });
    const snapshot = await page.evaluate(() => ({
      hits: state.hits,
      points: state.points,
      elapsed: targetElapsed(),
    }));
    await page.waitForTimeout(250);
    const frozen = await page.evaluate(() => ({
      hits: state.hits,
      points: state.points,
      elapsed: targetElapsed(),
    }));
    assert.deepEqual(frozen, snapshot);
    assert.equal(snapshot.hits, 1);
    assert.equal(snapshot.points, 10);
    await page.evaluate(() => home());
  });
  await check('Memory and quiz input stops while a modal is open', async () => {
    await page.evaluate(() => {
      setup('memory');
      startMemory();
    });
    await page.evaluate(() => {
      openSettings();
      flipCard(0);
    });
    assert.equal(await page.evaluate(() => state.up.length), 0);
    await page.evaluate(() => {
      closeModal();
      flipCard(0);
    });
    assert.equal(await page.evaluate(() => state.up.length), 1);
    await page.evaluate(() => {
      setup('math');
      startExtra('math');
      openSettings();
      answerQuiz(0);
    });
    assert.equal(await page.evaluate(() => state.answers.length), 0);
    const remaining = await page.evaluate(() => secondsLeft(state));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => secondsLeft(state)), remaining);
    await page.evaluate(() => home());
  });
  await check('Fullscreen works from a click and modals release focus/scroll locks', async () => {
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'), 'true');
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.locator('header button[onclick="openSettings()"]').click();
    assert.ok(await page.evaluate(() => document.querySelector('.shell').inert));
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden');
    await page.keyboard.press('Escape');
    assert.ok(
      await page.evaluate(() => !document.querySelector('.shell').inert && $('modalback').hidden),
    );
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden');
  });
  await check('Keyboard activation of header buttons cannot finish a guessing round', async () => {
    await page.evaluate(() => {
      setup('finder');
      startNumber('finder');
    });
    await page.locator('header button[onclick="openSettings()"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => state.done), false);
    assert.equal(await page.evaluate(() => $('modalback').hidden), false);
    await page.evaluate(() => home());
  });
  await check(
    'Updating learned words preserves the active guessing candidate indexes',
    async () => {
      await page.evaluate(() => {
        store.extra.learned.push({
          name: 'كلمة اختبار مؤقتة',
          cat: 'object',
          tags: ['electric'],
          hints: ['تلميح أ', 'تلميح ب', 'تلميح ج'],
          aliases: [],
        });
        syncLearned();
        setup('mind');
        startMind();
        openKnowledge();
        deleteLearned(store.extra.learned.length - 1);
        closeModal();
        if (state.q !== null) mindAnswer('yes');
      });
      assert.deepEqual(errors, []);
      await page.evaluate(() => home());
      assert.ok(await page.evaluate(() => !items.some((i) => i.name === 'كلمة اختبار مؤقتة')));
    },
  );
  await check('Bot turns wait for pause and resume without freezing the board', async () => {
    await page.evaluate(() => {
      setup('ttt');
      $('first').value = '1';
      startExtra('ttt');
      openSettings();
    });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => state.moves), 0);
    await page.evaluate(() => closeModal());
    await page.waitForFunction(() => state.moves === 1);
    assert.equal(await page.evaluate(() => state.waiting), false);
    await page.evaluate(() => home());
  });
  await check('Names render safely and saved progress survives a reload', async () => {
    await page.evaluate(() => {
      store.players = ['<img src=x onerror=alert(1)>'.slice(0, 24), 'ليلى', 'سالم'];
      save();
      openPeople();
    });
    assert.equal(await page.locator('#modal img').count(), 0);
    await page.reload();
    assert.equal(await page.evaluate(() => store.players.length), 3);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      save();
      home();
    });
  });
  await check('Desktop and small mobile layouts have no horizontal overflow', async () => {
    for (const width of [1920, 1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate(() => home());
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `home at ${width}`,
      );
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
      }
      for (const id of ['sudoku', 'connect', 'mines', 'merge', 'wordguess', 'maze']) {
        await page.evaluate((id) => setup(id), id);
        const action = await page
          .locator('#app button[onclick]')
          .evaluateAll((buttons) =>
            buttons
              .map((b) => b.getAttribute('onclick'))
              .find((action) => /\bstart\w*\(/.test(action)),
          );
        await page.evaluate((action) => Function(action)(), action);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${id} at ${width}`,
        );
      }
    }
  });
  await check('All content loads without external requests or old spelling', async () => {
    await page.evaluate(() => home());
    assert.deepEqual(external, []);
    assert.ok(!/يديد|يديدة/.test(html));
    assert.deepEqual(errors, []);
  });
  await check('All 28 games also start with network access disabled', async () => {
    const offline = await browser.newContext();
    await offline.setOffline(true);
    const offlinePage = await offline.newPage();
    const offlineErrors = [];
    offlinePage.on('pageerror', (error) => offlineErrors.push(error.message));
    await offlinePage.setContent(html);
    await offlinePage.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
    });
    for (const id of await offlinePage.evaluate(() => games.map((g) => g[0]))) {
      await offlinePage.evaluate((id) => setup(id), id);
      const action = await offlinePage
        .locator('#app button[onclick]')
        .evaluateAll((buttons) =>
          buttons.map((b) => b.getAttribute('onclick')).find((a) => /\bstart\w*\(/.test(a)),
        );
      await offlinePage.evaluate((action) => Function(action)(), action);
      assert.equal(await offlinePage.evaluate(() => screen), id);
      await offlinePage.evaluate(() => home());
    }
    assert.deepEqual(offlineErrors, []);
    await offline.close();
  });
  console.log(`\n${passed} integration checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
