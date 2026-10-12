import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
if (process.env.WORDS_SOURCE === '1') {
  const [words, css] = await Promise.all([
    readFile(new URL('../src/words.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/words.css', import.meta.url), 'utf8'),
  ]);
  html = html
    .replace(
      /\/\/ Source: src\/words\.js[\s\S]*?(?=\/\/ Source: src\/party\.js)/,
      () => words + '\n',
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

  await page.evaluate(() => {
    setup('hangman');
    $('hangCount').value = '1';
    startWordsGame('hangman');
    state.item = { word: 'كتاب', key: 'كتاب', cat: 'home', hint: 'صفحات للقراءة' };
    renderHangman();
  });
  await page.locator('#hangmanInput').fill('مَكْتَب');
  await page.locator('#hangmanInput').press('Enter');
  assert.equal(await page.evaluate(() => state.misses), 2);
  await page.locator('#hangmanInput').fill('مكتب');
  await page.locator('#hangmanInput').press('Enter');
  assert.equal(
    await page.evaluate(() => state.misses),
    2,
    'Repeated word guesses cannot consume attempts twice',
  );
  await page.evaluate(() => showPause());
  await page.evaluate(() => {
    readHangmanDraft('كتاب');
    submitHangmanWord();
  });
  assert.equal(await page.evaluate(() => state.won), false);
  await page.evaluate(() => resumeGame());
  await page.locator('#hangmanInput').fill('كتابة');
  await page.locator('#hangmanInput').press('Enter');
  assert.equal(await page.evaluate(() => state.misses), 2);
  assert.equal(
    await page.evaluate(() => state.won),
    false,
    'Longer words must not win through truncation',
  );
  await page.locator('#hangmanInput').fill('كِتَاب');
  await page.locator('#hangmanInput').press('Enter');
  assert.equal(await page.evaluate(() => state.won), true);
  assert.equal(await page.locator('#hangmanInput').count(), 0);
  await page.evaluate(() => nextHangman());
  assert.equal(await page.evaluate(() => state.total), 16);
  console.log(
    '✓ Whole-word guesses normalize Arabic, charge two misses, reject repeats and respect pause',
  );

  const inference = await page.evaluate(() => {
    const attempts = [{ word: 'اااا', marks: wordguessFeedback('اااا', 'اابب') }];
    return {
      evidence: wordguessEvidence(attempts, 4),
      extra: wordguessConstraintViolation('اابا', attempts),
      valid: wordguessConstraintViolation('اابب', attempts),
      absent: wordguessConstraintViolation('اامج', [
        { word: 'ااحج', marks: wordguessFeedback('ااحج', 'اابب') },
      ]),
    };
  });
  assert.equal(inference.evidence.minimum.ا, 2);
  assert.equal(inference.evidence.maximum.ا, 2);
  assert.ok(inference.extra && inference.absent);
  assert.equal(inference.valid, '');
  console.log('✓ Inference mode respects gray positions and exact repeated-letter counts');

  for (let round = 0; round < 6; round++) {
    await page.evaluate(() => {
      // Re-rendering an open native details queues a toggle that can outlive the round.
      if (state?.id === 'wordguess') hintWordguess();
      setup('wordguess');
      $('wordguessLength').value = '4';
      $('wordguessMode').value = 'classic';
      startWordsGame('wordguess');
      state.item = { word: 'مكتب', key: 'مكتب', cat: 'home', hint: 'طاولة للكتابة' };
      state.entry = 'كتاب';
      submitWordguess();
    });
    // Let native DOM toggle tasks from the removed notebook run before checking the new round.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(await page.evaluate(() => state.notesOpen), false);
    assert.equal(await page.locator('.wordguess-notebook').getAttribute('open'), null);
    await page.locator('.wordguess-notebook summary').click();
    assert.equal(await page.locator('.wordguess-notebook').getAttribute('open'), '');
    assert.match(await page.locator('.wordguess-notebook').innerText(), /الحروف المستبعدة.*ا/s);
    await page.waitForFunction(() => state.notesOpen === true);
  }
  console.log(
    '✓ Removed native notebooks cannot overwrite a new round; its first real click opens the evidence',
  );

  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => {
      setup('wordguess');
      $('wordguessLength').value = '4';
      $('wordguessMode').value = 'classic';
      startWordsGame('wordguess');
      state.item = { word: 'مكتب', key: 'مكتب', cat: 'home', hint: 'طاولة للكتابة' };
      renderWordguess();
    });
    await page.locator('#wordguessInput').fill('كِتَاب');
    assert.equal(await page.locator('.arabic-keyboard').isVisible(), false);
    assert.equal(await page.locator('.wordguess-row:visible').count(), 1);
    await page.locator('#wordguessInput').press('Enter');
    assert.equal(await page.evaluate(() => state.attempts.length), 1);
    assert.equal(await page.evaluate(() => document.activeElement?.id === 'wordguessInput'), false);
    assert.equal(await page.locator('.arabic-keyboard').isVisible(), true);
    await page.locator('.wordguess-notebook summary').click();
    assert.match(await page.locator('.wordguess-notebook').innerText(), /الحروف المستبعدة.*ا/s);
    await page.locator('#wordguessInput').fill('مكتب');
    assert.equal(await page.locator('.wordguess-row:visible').count(), 2);
    assert.equal(await page.locator('.wordguess-notebook').isVisible(), false);
    const position = await page.evaluate(() => {
      const feedback = $('wordguessMessage').getBoundingClientRect(),
        input = $('wordguessInput').getBoundingClientRect();
      return {
        ordered: feedback.bottom <= input.top,
        fits: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert.deepEqual(position, { ordered: true, fits: true });
    await page.locator('#wordguessInput').press('Enter');
    assert.equal(await page.evaluate(() => state.won), true);
  }
  console.log(
    '✓ 360/390px word guessing keeps feedback above input, compacts native typing and restores the board',
  );

  const practice = await page.evaluate(() => {
    setup('trivia');
    $('triviaTimer').value = '0';
    startWordsGame('trivia');
    while (!state.done) {
      const q = state.questions[state.index];
      answerTrivia(state.index < 2 ? -1 : q.choices.indexOf(q.answer));
      nextTrivia();
    }
    const saved = JSON.stringify({
      scores: store.scores,
      history: store.extra.history,
      daily: store.extra.daily,
    });
    startTriviaPractice();
    const total = state.practice.questions.length;
    let duplicateSafe = true;
    while (state.practice.index < total) {
      const q = state.practice.questions[state.practice.index];
      const answer = q.choices.indexOf(q.answer);
      answerTriviaPractice(answer);
      const before = state.practice.correct;
      answerTriviaPractice(answer);
      duplicateSafe &&= before === state.practice.correct;
      nextTriviaPractice();
    }
    return {
      total,
      correct: state.practice.correct,
      duplicateSafe,
      unchanged:
        saved ===
        JSON.stringify({
          scores: store.scores,
          history: store.extra.history,
          daily: store.extra.daily,
        }),
      timers: timers.length,
      finished: $('triviaPractice').textContent.includes('اكتملت المراجعة'),
    };
  });
  assert.deepEqual(practice, {
    total: 2,
    correct: 2,
    duplicateSafe: true,
    unchanged: true,
    timers: 0,
    finished: true,
  });
  console.log(
    '✓ Knowledge review quizzes missed answers without changing scores, daily records or timers',
  );

  const sequence = await page.evaluate(() => {
    setup('target');
    $('targetMode').value = 'sequence';
    $('targetLevel').value = 'hard';
    startWordsGame('target');
    clearTimers();
    const cells = [...state.sequence];
    const header = document.querySelector('.playhead');
    state.points = 20;
    hitTarget(cells[1], state.token);
    const wrong = state.wrong,
      points = state.points;
    state.lastInput = 0;
    const firstToken = state.token;
    hitTarget(cells[0], firstToken);
    state.lastInput = 0;
    hitTarget(cells[1], firstToken);
    const staleIgnored = state.hits === 1;
    for (const index of cells.slice(1)) {
      state.lastInput = 0;
      hitTarget(index, state.token);
    }
    return {
      unique: new Set(cells).size,
      wrong,
      points,
      staleIgnored,
      hits: state.hits,
      paths: state.completedPaths,
      waiting: state.slot === -1,
      surroundingPreserved: !header || header === document.querySelector('.playhead'),
    };
  });
  assert.deepEqual(sequence, {
    unique: 3,
    wrong: 1,
    points: 17,
    staleIgnored: true,
    hits: 3,
    paths: 1,
    waiting: true,
    surroundingPreserved: true,
  });
  await page.locator('.target-cell[data-index="0"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '1');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '5');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '7');
  await page.evaluate(() => finishTarget());
  assert.equal(await page.locator('.target-review meter').count(), 3);
  assert.equal(await page.evaluate(() => timers.length), 0);
  console.log(
    '✓ Target paths enforce order and stale-event protection, preserve page controls and support 4×4 arrow navigation',
  );

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
