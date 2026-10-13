import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(
  process.env.LAMMA_TEST_HTML || new URL('../lamma_universe.html', import.meta.url),
  'utf8',
);
if (process.env.WORDS_SOURCE === '1') {
  const [source, css] = await Promise.all([
    readFile(new URL('../src/words.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/words.css', import.meta.url), 'utf8'),
  ]);
  html = html
    .replace(
      /\/\/ Source: src\/words\.js[\s\S]*?(?=\/\/ Source: src\/party\.js)/,
      () => source + '\n',
    )
    .replace('</style>', () => css + '\n</style>');
}
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => {
    store.extra.motion = false;
  });
  await page.context().setOffline(true);

  const setupGuard = await page.evaluate(() =>
    ['trivia', 'hangman', 'wordguess', 'target'].map((id) => {
      setup(id);
      const startButton = document.querySelector('.panel .actions .primary');
      openGuide(id);
      startButton.click();
      const blocked = screen === 'setup' && state.id === id && timers.length === 0;
      closeModal(true);
      return blocked;
    }),
  );
  assert.deepEqual(setupGuard, [true, true, true, true]);

  const trivia = await page.evaluate(() => {
    setup('trivia');
    $('triviaTimer').value = '0';
    $('triviaMode').value = 'strategy';
    startWordsGame('trivia');
    state.questions = state.questions.slice(0, 3);
    const q = state.questions[0],
      correctIndex = q.choices.indexOf(q.answer);
    const stale = document.querySelectorAll('.trivia-choice')[correctIndex];
    triviaConfidence('confident');
    triviaHalfChoices();
    const aids = state.aidsRemaining;
    triviaHalfChoices();
    answerTrivia(state.hiddenChoices[0]);
    const hiddenIgnored = !state.locked;
    const visibleChoices = [...document.querySelectorAll('.trivia-choice')].filter(
      (choice) => !choice.hidden,
    ).length;
    answerTrivia(correctIndex);
    const gained = state.answers[0].gain;
    answerTrivia(correctIndex);
    const duplicate = state.answers.length === 1;
    nextTrivia();
    stale.click();
    const staleIgnored = !state.locked;
    showPause();
    triviaHalfChoices();
    triviaConfidence('confident');
    const pausedSafe = state.aidsRemaining === aids && state.confidence === 'normal';
    resumeGame();
    while (!state.done) {
      triviaConfidence('confident');
      answerTrivia(
        state.questions[state.index].choices.indexOf(state.questions[state.index].answer),
      );
      nextTrivia();
    }
    const saved = JSON.stringify([store.scores, store.extra.history]);
    nextTrivia();
    answerTrivia(0);
    const scoreOnce = saved === JSON.stringify([store.scores, store.extra.history]);
    return {
      aids,
      hiddenIgnored,
      visibleChoices,
      gained,
      duplicate,
      staleIgnored,
      pausedSafe,
      total: state.knowledgePoints,
      correct: state.correct,
      scoreOnce,
      points: store.extra.history[0].points,
      timers: timers.length,
    };
  });
  assert.deepEqual(trivia, {
    aids: 1,
    hiddenIgnored: true,
    visibleChoices: 2,
    gained: 12,
    duplicate: true,
    staleIgnored: true,
    pausedSafe: true,
    total: 42,
    correct: 3,
    scoreOnce: true,
    points: 93,
    timers: 0,
  });
  console.log(
    '✓ Knowledge strategy prices confidence and assistance, rejects hidden/stale answers and records once',
  );

  const timeout = await page.evaluate(() => {
    setup('trivia');
    startWordsGame('trivia');
    state.endAt = Date.now() - 10;
    triviaHalfChoices();
    return {
      timeout: state.locked && state.choice === -1,
      aids: state.aidsRemaining,
      points: state.knowledgePoints,
    };
  });
  assert.deepEqual(timeout, { timeout: true, aids: 2, points: 0 });

  const risky = await page.evaluate(() => {
    setup('trivia');
    $('triviaMode').value = 'strategy';
    $('triviaTimer').value = '0';
    startWordsGame('trivia');
    state.questions = state.questions.slice(0, 1);
    const q = state.questions[0];
    triviaConfidence('confident');
    answerTrivia(q.choices.findIndex((choice) => choice !== q.answer));
    nextTrivia();
    return { knowledge: state.knowledgePoints, points: store.extra.history[0].points };
  });
  assert.deepEqual(risky, { knowledge: -5, points: 0 });

  const hangman = await page.evaluate(() => {
    setup('hangman');
    $('hangCount').value = '10';
    $('hangMode').value = 'rescue';
    startWordsGame('hangman');
    state.queue = ['كتاب', 'مكتب', 'منزل', 'صخرة', 'مزرعة', 'حقيبة'].map((key) =>
      wordsLexicon.find((item) => item.key === key),
    );
    prepareHangman();
    renderHangman();
    const old = document.querySelector('.letter-key[aria-label="الحرف ك"]');
    guessHangman('ك');
    guessHangman('ظ');
    const possible = hangmanCandidates(state);
    const notebookValid =
      possible.some((item) => item.key === 'كتاب') &&
      possible.every((item) => item.key[0] === 'ك' && !item.key.includes('ظ'));
    const lose = () => {
      const absent = arabicKeyboard.filter((letter) => !state.item.key.includes(letter));
      absent.forEach(guessHangman);
      nextHangman();
    };
    lose();
    old.click();
    const staleIgnored = !state.guessed.length;
    const afterLoss = state.shields;
    readHangmanDraft(state.item.key);
    submitHangmanWord();
    const cleanRestores = state.shields;
    nextHangman();
    readHangmanDraft(state.item.key);
    submitHangmanWord();
    const bonus = state.rescueBonus;
    nextHangman();
    lose();
    lose();
    lose();
    const saved = JSON.stringify([store.scores, store.extra.history, store.extra.daily]);
    startHangmanPractice(state.run);
    const stalePractice = $('hangmanPractice').querySelector('.letter-key');
    startHangmanPractice(state.run);
    stalePractice.click();
    const practiceStaleIgnored = !state.hangPractice.guessed.length;
    const count = state.hangPractice.items.length;
    while (state.hangPractice.index < count) {
      const p = state.hangPractice;
      const item = p.items[p.index];
      answerHangmanPracticeWord(item.word, state.run, p.index);
      nextHangmanPractice(state.run, p.index);
    }
    return {
      notebookValid,
      practiceStaleIgnored,
      staleIgnored,
      afterLoss,
      cleanRestores,
      bonus,
      shields: state.shields,
      total: state.total,
      count,
      practiceDone: $('hangmanPractice').textContent.includes('استرجعت كلمات الجولة'),
      unchanged: saved === JSON.stringify([store.scores, store.extra.history, store.extra.daily]),
      timers: timers.length,
    };
  });
  assert.deepEqual(hangman, {
    notebookValid: true,
    practiceStaleIgnored: true,
    staleIgnored: true,
    afterLoss: 2,
    cleanRestores: 3,
    bonus: 2,
    shields: 0,
    total: 42,
    count: 4,
    practiceDone: true,
    unchanged: true,
    timers: 0,
  });
  console.log(
    '✓ Rescue words consume/restore shields, reward real streaks and train missed words without score changes',
  );

  await page.evaluate(() => {
    setup('wordguess');
    $('wordguessLength').value = '4';
    startWordsGame('wordguess');
    state.item = wordsLexicon.find((item) => item.key === 'مكتب');
    state.entry = 'كتاب';
    renderWordguess();
  });
  await page.locator('.wordguess-row.current .wordguess-cell').first().click();
  await page.locator('.letter-key[aria-label="الحرف م"]').click();
  assert.equal(await page.evaluate(() => state.entry), 'متاب');
  assert.equal(await page.evaluate(() => state.entry.length), 4);
  await page.locator('.wordguess-row.current .wordguess-cell').first().click();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => state.entryCursor), 1);
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() =>
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ك', bubbles: true })),
  );
  assert.equal(await page.evaluate(() => state.entry), 'كتاب');
  await page.evaluate(() => {
    typeWordguess('clear');
    window.wordsV8OldCell = document.querySelector('.wordguess-row.current .wordguess-cell');
  });
  await page.locator('#wordguessInput').fill('كِتَاب');
  await page.locator('#wordguessInput').press('Enter');
  const candidates = await page.evaluate(() => {
    wordsV8OldCell.click();
    const staleIgnored = state.entryCursor === null;
    const correctItem = state.item;
    const first = wordguessCandidates(state);
    state.item = wordsLexicon.find((item) => item.key === 'منزل');
    const second = wordguessCandidates(state);
    state.item = correctItem;
    showPause();
    showWordguessCandidates();
    const pauseSafe = !state.candidatesShown;
    resumeGame();
    showWordguessCandidates();
    showWordguessCandidates();
    return {
      staleIgnored,
      sameEvidence: JSON.stringify(first) === JSON.stringify(second),
      containsAnswer: first.includes('مكتب'),
      consistent: first.every((word) =>
        wordguessFeedback('كتاب', word).every((mark, i) => mark === state.attempts[0].marks[i]),
      ),
      pauseSafe,
      penalty: state.helperPenalty,
    };
  });
  assert.deepEqual(candidates, {
    staleIgnored: true,
    sameEvidence: true,
    containsAnswer: true,
    consistent: true,
    pauseSafe: true,
    penalty: 15,
  });
  await page.locator('.wordguess-candidates button', { hasText: 'مكتب' }).click();
  assert.equal(await page.evaluate(() => state.entry), 'مكتب');
  assert.equal(await page.evaluate(() => state.attempts.length), 1);
  await page.locator('.wordguess-native button').click();
  const solved = await page.evaluate(() => {
    finishWordguess();
    const saved = JSON.stringify([store.scores, store.extra.history]);
    finishWordguess();
    return {
      won: state.won,
      attempts: state.attempts.length,
      done: state.done,
      scoreOnce: saved === JSON.stringify([store.scores, store.extra.history]),
      points: store.extra.history[0].points,
      rows: document.querySelectorAll('.wordguess-review-row').length,
    };
  });
  assert.deepEqual(solved, {
    won: true,
    attempts: 2,
    done: true,
    scoreOnce: true,
    points: 71,
    rows: 2,
  });
  console.log(
    '✓ Letter editing preserves word length; paid candidates use observable evidence and require explicit confirmation',
  );

  await page.evaluate(() => {
    setup('target');
    $('targetMode').value = 'memory';
    startWordsGame('target');
    window.wordsV8PreviewCell = document.querySelector(`.target-cell[data-index="${state.slot}"]`);
    hitTarget(state.slot, state.token);
    state.memoryPreviewUntil = targetElapsed(state) - 1;
  });
  await page.waitForFunction(() => !state.memoryPreview);
  assert.equal(await page.locator('.target-cell.memory-preview').count(), 0);
  assert.equal(await page.locator('.target-cell.active').count(), 0);
  const memory = await page.evaluate(() => {
    wordsV8PreviewCell.click();
    const previewIgnored = state.hits === 0;
    const oldRun = state.run,
      path = [...state.sequence];
    showPause();
    hitTarget(path[0], state.token, oldRun);
    const pausedSafe = !state.hits;
    finishTarget();
    const pausedFinishSafe = !state.done;
    resumeGame();
    for (const cell of path) {
      state.lastInput = 0;
      hitTarget(cell, state.token, oldRun);
    }
    const score = state.points;
    const completed = state.completedPaths;
    const hits = state.hits;
    spawnTarget();
    state.memoryPreview = false;
    const wrongCell = (state.slot + 1) % (state.size * state.size);
    state.lastInput = 0;
    hitTarget(wrongCell, state.token, oldRun);
    const wrongCancels = state.slot === -1 && state.memoryErrors === 1;
    finishTarget();
    const saved = JSON.stringify([store.scores, store.extra.history]);
    finishTarget();
    setup('target');
    $('targetMode').value = 'memory';
    startWordsGame('target');
    state.memoryPreview = false;
    state.lastInput = 0;
    hitTarget(state.slot, state.token, oldRun);
    const previousRunIgnored = !state.hits;
    clearTimers();
    return {
      previewIgnored,
      pausedSafe,
      pausedFinishSafe,
      score,
      completed,
      hits,
      wrongCancels,
      previousRunIgnored,
      scoreOnce: saved === JSON.stringify([store.scores, store.extra.history]),
    };
  });
  assert.deepEqual(memory, {
    previewIgnored: true,
    pausedSafe: true,
    pausedFinishSafe: true,
    score: 35,
    completed: 1,
    hits: 3,
    wrongCancels: true,
    previousRunIgnored: true,
    scoreOnce: true,
  });
  console.log(
    '✓ Memory paths have a protected preview, conceal every destination, enforce recall order and isolate previous runs',
  );

  const fairness = await page.evaluate(() => {
    const sample = () => {
      const snapshots = [];
      for (const id of ['trivia', 'hangman', 'wordguess', 'target']) {
        setup(id);
        seededRandom = makeSeed('words-v8-' + id);
        if (id === 'target') $('targetMode').value = 'memory';
        startWordsGame(id);
        if (id === 'trivia') snapshots.push(state.questions.map((q) => [q.id, q.choices]));
        if (id === 'hangman') {
          snapshots.push(state.queue.map((item) => item.key));
          hintHangman();
          snapshots.push(state.guessed);
        }
        if (id === 'wordguess') snapshots.push(state.item.key);
        if (id === 'target') {
          snapshots.push([...state.sequence]);
          spawnTarget();
          snapshots.push([...state.sequence]);
        }
        clearTimers();
      }
      seededRandom = null;
      return JSON.stringify(snapshots);
    };
    return sample() === sample();
  });
  assert.equal(fairness, true);
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ['trivia', 'hangman', 'wordguess', 'target']) {
      await page.evaluate((id) => {
        setup(id);
        if (id === 'trivia') $('triviaMode').value = 'strategy';
        if (id === 'hangman') $('hangMode').value = 'rescue';
        if (id === 'target') $('targetMode').value = 'memory';
        startWordsGame(id);
        clearTimers();
      }, id);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        `${id} must fit ${width}px`,
      );
    }
  }
  console.log(
    '✓ Seeded replay produces identical content in every words game; all new modes fit phone and desktop layouts offline',
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
