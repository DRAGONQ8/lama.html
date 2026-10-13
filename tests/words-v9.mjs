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
  const banks = await page.evaluate(() => ({
    facts: triviaFactsBank.length,
    twoTrue: triviaFactsBank.every(
      (q) =>
        q.statements.length === 4 &&
        q.statements.filter((item) => item.truth).length === 2 &&
        q.statements.every((item) => item.reason.length > 10),
    ),
    topics: new Set(triviaFactsBank.map((q) => q.cat)).size,
    missions: hangmanMissionBank.length,
    categories: new Set(hangmanMissionBank.map((item) => item.cat)).size,
    phrases: hangmanMissionBank.every(
      (item) =>
        item.display.includes(' ') &&
        item.key === wordsNormalizeKey(item.display) &&
        item.cues.length === 2,
    ),
    unique: new Set(hangmanMissionBank.map((item) => item.key)).size === hangmanMissionBank.length,
  }));
  assert.deepEqual(banks, {
    facts: 20,
    twoTrue: true,
    topics: 5,
    missions: 24,
    categories: 6,
    phrases: true,
    unique: true,
  });

  const facts = await page.evaluate(() => {
    setup('trivia');
    $('triviaMode').value = 'facts';
    $('triviaTimer').value = '0';
    updateTriviaAvailability();
    const availability = $('triviaAvailable').textContent.includes('20');
    startWordsGame('trivia');
    state.questions = state.questions.slice(0, 3);
    renderTrivia();
    const q = state.questions[0],
      truth = q.statements.map((item, i) => (item.truth ? i : -1)).filter((i) => i >= 0),
      wrong = q.statements.findIndex((item) => !item.truth);
    const stale = document.querySelectorAll('.trivia-choice')[truth[0]];
    toggleTriviaFact(truth[0]);
    toggleTriviaFact(truth[1]);
    const beforeConfirm = state.knowledgePoints === 0 && !state.locked;
    toggleTriviaFact(wrong);
    const limit = state.evidenceSelected.length === 2;
    toggleTriviaFact(truth[0]);
    toggleTriviaFact(wrong);
    submitTriviaFacts();
    submitTriviaFacts();
    const partial = state.answers[0].gain;
    nextTrivia();
    stale.click();
    const staleSafe = !state.evidenceSelected.length;
    showPause();
    toggleTriviaFact(0);
    submitTriviaFacts();
    const pauseSafe = !state.evidenceSelected.length && !state.locked;
    resumeGame();
    state.duration = 30;
    state.endAt = Date.now() - 1;
    toggleTriviaFact(0);
    const timeout = state.choice === -1 && state.answers[1].gain === 0;
    nextTrivia();
    const correct = state.questions[2].statements
      .map((item, i) => (item.truth ? i : -1))
      .filter((i) => i >= 0);
    for (const index of correct)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: String(index + 1), bubbles: true }),
      );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const keyboardConfirms = state.locked && state.answers[2].correct;
    nextTrivia();
    const points = store.extra.history[0].points,
      saved = JSON.stringify([store.scores, store.extra.history, store.extra.daily]);
    startTriviaPractice();
    const practiceCount = state.practice.questions.length;
    while (state.practice.index < practiceCount) {
      const p = state.practice,
        answer = p.questions[p.index];
      answer.statements.forEach((item, i) => {
        if (item.truth) toggleTriviaPracticeFact(i, state.run, p.serial, p.index);
      });
      submitTriviaPracticeFacts(state.run, p.serial, p.index);
      submitTriviaPracticeFacts(state.run, p.serial, p.index);
      nextTriviaPractice();
    }
    return {
      availability,
      beforeConfirm,
      limit,
      partial,
      staleSafe,
      pauseSafe,
      timeout,
      keyboardConfirms,
      correct: state.correct,
      points,
      practiceCount,
      practiceCorrect: state.practice.correct,
      practiceNoScore:
        saved === JSON.stringify([store.scores, store.extra.history, store.extra.daily]),
      timers: timers.length,
    };
  });
  assert.deepEqual(facts, {
    availability: true,
    beforeConfirm: true,
    limit: true,
    partial: 5,
    staleSafe: true,
    pauseSafe: true,
    timeout: true,
    keyboardConfirms: true,
    correct: 1,
    points: 50,
    practiceCount: 2,
    practiceCorrect: 2,
    practiceNoScore: true,
    timers: 0,
  });
  console.log(
    '✓ Fact-check rounds require two selections and confirmation, price partial knowledge correctly and support protected learning review',
  );

  await page.evaluate(() => {
    setup('hangman');
    $('hangMode').value = 'mission';
    $('hangCount').value = '1';
    startWordsGame('hangman');
    state.queue = [hangmanMissionBank.find((item) => item.word === 'قوس قزح')];
    prepareHangman();
    renderHangman();
  });
  assert.equal(await page.locator('.hangman-phrase-word').count(), 2);
  await page.locator('#hangmanInput').fill('قوس ');
  assert.equal(await page.evaluate(() => state.wordDraft.endsWith(' ')), true);
  const mission = await page.evaluate(() => {
    guessHangman('ق');
    const repeated = document.querySelectorAll('.hangman-cell.revealed').length;
    guessHangman('ظ');
    revealHangmanMissionClue();
    revealHangmanMissionClue();
    revealHangmanMissionClue();
    const cues = state.missionCueCount,
      cueCost = state.missionCueCost;
    const candidates = hangmanCandidates(state);
    const possible = candidates.some((item) => item.key === 'قوسقزح');
    showPause();
    hintHangman();
    revealHangmanMissionClue();
    const pausedSafe = state.hints === 0 && state.missionCueCost === cueCost;
    resumeGame();
    hintHangman();
    return { repeated, cues, cueCost, possible, pausedSafe, hints: state.hints };
  });
  assert.deepEqual(mission, {
    repeated: 2,
    cues: 2,
    cueCost: 4,
    possible: true,
    pausedSafe: true,
    hints: 1,
  });
  await page.locator('#hangmanInput').fill('قَوْس قُزَح');
  await page.locator('#hangmanInput').press('Enter');
  assert.equal(await page.evaluate(() => state.wordPoints), 21);
  await page.evaluate(() => nextHangman());
  assert.equal(await page.evaluate(() => store.extra.history[0].points), 21);
  const phrasePractice = await page.evaluate(() => {
    setup('hangman');
    $('hangMode').value = 'mission';
    $('hangCount').value = '1';
    startWordsGame('hangman');
    state.queue = [hangmanMissionBank.find((item) => item.word === 'مفتاح الباب')];
    prepareHangman();
    renderHangman();
    arabicKeyboard.filter((letter) => !state.item.key.includes(letter)).forEach(guessHangman);
    nextHangman();
    const saved = JSON.stringify([store.scores, store.extra.history]);
    startHangmanPractice();
    const groups = $('hangmanPractice').querySelectorAll('.hangman-phrase-word').length;
    answerHangmanPracticeWord('مفتاح الباب', state.run, 0);
    nextHangmanPractice(state.run, 0);
    return {
      groups,
      complete: state.hangPractice.index === 1,
      noScore: saved === JSON.stringify([store.scores, store.extra.history]),
    };
  });
  assert.deepEqual(phrasePractice, { groups: 2, complete: true, noScore: true });
  console.log(
    '✓ Semantic phrase missions preserve word boundaries and pasted spaces, reveal repeated letters, and account for every clue cost',
  );

  await page.evaluate(() => {
    setup('wordguess');
    $('wordguessMode').value = 'lab';
    $('wordguessLength').value = '4';
    startWordsGame('wordguess');
    state.item = wordsLexicon.find((item) => item.key === 'مكتب');
    renderWordguess();
    chooseWordguessHypothesis(0);
  });
  await page.locator('#wordguessHypothesis0').fill('مَنْزِل');
  await page.locator('#wordguessHypothesis1').fill('سماء');
  await page.locator('.wordguess-lab form > button').click();
  const firstLab = await page.evaluate(() => {
    const reports = state.labAnalysis.reports;
    const original = state.item,
      before = JSON.stringify(reports);
    state.item = wordsLexicon.find((item) => item.key === 'منزل');
    const same =
      JSON.stringify(
        state.hypothesisDrafts.map((word) => wordguessHypothesisReport(word, state)),
      ) === before;
    state.item = original;
    compareWordguessHypotheses();
    window.v9OldHypothesisButton = document.querySelector('.wordguess-hypothesis-results button');
    return {
      cost: state.helperPenalty,
      uses: state.labUses,
      attempts: state.attempts.length,
      publicOnly: same,
      meaningful: reports.every(
        (report) =>
          report.patterns > 1 &&
          report.worst < report.candidates &&
          report.expected >= 1 &&
          report.expected <= report.worst,
      ),
    };
  });
  assert.deepEqual(firstLab, { cost: 8, uses: 1, attempts: 0, publicOnly: true, meaningful: true });
  await page.locator('.wordguess-hypothesis-results button').first().click();
  await page.locator('.wordguess-native button').click();
  const laterLab = await page.evaluate(() => {
    v9OldHypothesisButton.click();
    const staleSafe = !state.entry;
    state.hypothesisDrafts = ['كتاب', 'مكتب'];
    compareWordguessHypotheses();
    const invalidFree = state.labUses === 1 && state.helperPenalty === 8;
    state.entry = 'كتاب';
    submitWordguess();
    const strict = state.attempts.length === 1;
    const candidates = wordguessCandidates(state),
      other = candidates.find((word) => word !== 'مكتب');
    if (!other) throw Error('Fixture needs two remaining evidence-consistent hypotheses');
    state.hypothesisDrafts = [other, 'مكتب'];
    showPause();
    compareWordguessHypotheses();
    const pauseSafe = state.labUses === 1;
    resumeGame();
    compareWordguessHypotheses();
    compareWordguessHypotheses();
    showWordguessCandidates();
    return {
      staleSafe,
      invalidFree,
      strict,
      pauseSafe,
      uses: state.labUses,
      totalCost: state.helperPenalty,
      attempts: state.attempts.length,
    };
  });
  assert.deepEqual(laterLab, {
    staleSafe: true,
    invalidFree: true,
    strict: true,
    pauseSafe: true,
    uses: 2,
    totalCost: 31,
    attempts: 1,
  });
  await page.locator('.wordguess-hypothesis-results button').nth(1).click();
  assert.equal(await page.evaluate(() => state.attempts.length), 1);
  await page.locator('.wordguess-native button').click();
  const labFinish = await page.evaluate(() => {
    finishWordguess();
    const saved = JSON.stringify([store.scores, store.extra.history]);
    finishWordguess();
    return {
      points: store.extra.history[0].points,
      won: state.won,
      attempts: state.attempts.length,
      scoreOnce: saved === JSON.stringify([store.scores, store.extra.history]),
    };
  });
  assert.deepEqual(labFinish, { points: 55, won: true, attempts: 2, scoreOnce: true });
  console.log(
    '✓ Hypothesis comparisons simulate observable evidence without reading the answer, enforce legal guesses and preserve cumulative helper pricing',
  );

  await page.evaluate(() => {
    setup('target');
    $('targetMode').value = 'intercept';
    $('targetLevel').value = 'easy';
    startWordsGame('target');
    window.v9InitialMovingLeft = $('targetRunner').style.left;
    window.v9OldMovingField = $('targetMovingField');
    window.v9MovingRun = state.run;
  });
  await page.waitForFunction(() => $('targetRunner').style.left !== v9InitialMovingLeft);
  const motion = await page.evaluate(() => {
    const positions = Array.from({ length: 101 }, (_, i) =>
      movingTargetPosition(state, state.targetBorn + i * 100),
    );
    const bounded = positions.every(
      (position) => position.x >= 18 && position.x <= 82 && position.y >= 18 && position.y <= 82,
    );
    const bounce = new Set(positions.map((position) => Math.sign(position.vx))).size === 2;
    showPause();
    window.v9PausedPosition = JSON.stringify(movingTargetPosition(state));
    const p = movingTargetPosition(state);
    interceptTarget(p.x, p.y, state.token, state.run);
    return { bounded, bounce, pauseSafe: state.hits === 0 && state.wrong === 0 };
  });
  assert.deepEqual(motion, { bounded: true, bounce: true, pauseSafe: true });
  await page.waitForTimeout(80);
  assert.equal(
    await page.evaluate(() => v9PausedPosition === JSON.stringify(movingTargetPosition(state))),
    true,
  );
  await page.evaluate(() => resumeGame());
  const point = await page.evaluate(() => {
    const position = movingTargetPosition(state),
      rect = $('targetMovingField').getBoundingClientRect();
    return {
      x: rect.left + (rect.width * position.x) / 100,
      y: rect.top + (rect.height * position.y) / 100,
    };
  });
  await page.mouse.click(point.x, point.y);
  const firstIntercept = await page.evaluate(() => {
    clearTimers();
    const hits = state.hits,
      samples = state.interceptErrors.length;
    spawnTarget();
    renderTarget();
    const p = movingTargetPosition(state),
      rect = $('targetMovingField').getBoundingClientRect();
    v9OldMovingField.dispatchEvent(
      new PointerEvent('pointerdown', {
        isPrimary: true,
        button: 0,
        clientX: rect.left + (rect.width * p.x) / 100,
        clientY: rect.top + (rect.height * p.y) / 100,
      }),
    );
    const staleSafe = state.hits === hits;
    state.lastInput = 0;
    interceptTarget(0, 0, state.token, state.run);
    return { hits, samples, staleSafe, wrong: state.wrong, points: state.points };
  });
  assert.deepEqual(firstIntercept, { hits: 1, samples: 1, staleSafe: true, wrong: 1, points: 7 });
  await page.locator('#targetMovingField').focus();
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await page.evaluate(() => state.aim), { x: 6, y: 0 });
  await page.evaluate(() => {
    state.lastInput = 0;
  });
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => state.hits),
    1,
    'Keyboard shoots at the reticle, rather than automatically hitting the moving target',
  );
  await page.evaluate(() => {
    state.aim = movingTargetPosition(state);
    state.lastInput = 0;
    updateMovingTargetReticle();
  });
  await page.keyboard.press('Enter');
  const movingFinish = await page.evaluate(() => {
    const focus = document.activeElement.id === 'targetMovingField',
      hits = state.hits;
    const p = movingTargetPosition(state);
    state.lastInput = 0;
    interceptTarget(p.x, p.y, state.token, state.run);
    const duplicateSafe = state.hits === hits;
    const hidden = $('targetRunner').hidden;
    spawnTarget();
    renderTarget();
    state.targetExpires = targetElapsed(state) - 1;
    finishTarget();
    const saved = JSON.stringify([store.scores, store.extra.history]);
    finishTarget();
    return {
      hits,
      focus,
      duplicateSafe,
      hidden,
      misses: state.misses,
      points: store.extra.history[0].points,
      scoreOnce: saved === JSON.stringify([store.scores, store.extra.history]),
      timers: timers.length,
    };
  });
  assert.deepEqual(movingFinish, {
    hits: 2,
    focus: true,
    duplicateSafe: true,
    hidden: true,
    misses: 1,
    points: 14,
    scoreOnce: true,
    timers: 0,
  });
  console.log(
    '✓ Moving interception changes physical position, bounces within the arena, checks pointer/reticle distance, freezes on pause and isolates stale events',
  );

  const seeded = await page.evaluate(() => {
    const sample = () => {
      const snapshots = [];
      for (const [id, field, mode] of [
        ['trivia', 'triviaMode', 'facts'],
        ['hangman', 'hangMode', 'mission'],
        ['wordguess', 'wordguessMode', 'lab'],
        ['target', 'targetMode', 'intercept'],
      ]) {
        setup(id);
        $(field).value = mode;
        seededRandom = makeSeed('words-v9-' + id);
        startWordsGame(id);
        clearTimers();
        if (id === 'trivia')
          snapshots.push(state.questions.map((q) => [q.id, q.statements.map((item) => item.text)]));
        if (id === 'hangman') snapshots.push(state.queue.map((item) => item.key));
        if (id === 'wordguess')
          snapshots.push([state.item.key, wordguessHypothesisReport(state.item.key, state)]);
        if (id === 'target')
          snapshots.push([state.moving, movingTargetPosition(state, state.targetBorn + 1370)]);
      }
      seededRandom = null;
      return JSON.stringify(snapshots);
    };
    return sample() === sample();
  });
  assert.equal(seeded, true);
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [id, field, mode] of [
      ['trivia', 'triviaMode', 'facts'],
      ['hangman', 'hangMode', 'mission'],
      ['wordguess', 'wordguessMode', 'lab'],
      ['target', 'targetMode', 'intercept'],
    ]) {
      await page.evaluate(
        ([id, field, mode]) => {
          setup(id);
          $(field).value = mode;
          startWordsGame(id);
          clearTimers();
        },
        [id, field, mode],
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        `${mode} must fit ${width}px`,
      );
    }
  }
  console.log(
    '✓ All four new variants replay identical seeded content and fit phone/desktop layouts offline',
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
