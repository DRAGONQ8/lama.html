import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
// Allows a scoped source check while other agents assemble the final standalone build.
if (process.env.WORDS_SOURCE === '1') {
  const words = await readFile(new URL('../src/words.js', import.meta.url), 'utf8');
  html = html.replace(
    /\/\/ Source: src\/words\.js[\s\S]*?(?=\/\/ Source: src\/party\.js)/,
    () => words + '\n',
  );
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

  const levels = await page.evaluate(() =>
    ['easy', 'normal', 'hard'].map((level) => {
      setup('hangman');
      $('hangLevel').value = level;
      $('hangCount').value = '1';
      startWordsGame('hangman');
      const maxMisses = state.maxMisses,
        maxHints = state.maxHints;
      const absent = arabicKeyboard.filter((letter) => !state.item.key.includes(letter));
      absent.slice(0, maxMisses).forEach(guessHangman);
      guessHangman(absent[0]);
      const lost = state.over && !state.won;
      nextHangman();
      return { maxMisses, maxHints, lost };
    }),
  );
  assert.deepEqual(levels, [
    { maxMisses: 8, maxHints: 3, lost: true },
    { maxMisses: 6, maxHints: 2, lost: true },
    { maxMisses: 5, maxHints: 1, lost: true },
  ]);
  console.log('✓ Hangman difficulty changes attempts and hints, and every level can finish');

  const constraints = await page.evaluate(() => {
    const attempts = [{ word: 'مممم', marks: wordguessFeedback('مممم', 'ماما') }];
    return {
      green: wordguessConstraintViolation('بابا', attempts),
      repeats: wordguessConstraintViolation('مابا', attempts),
      valid: wordguessConstraintViolation('ماما', attempts),
      yellow: wordguessConstraintViolation('اااب', [
        { word: 'اااب', marks: wordguessFeedback('اااب', 'ابجد') },
      ]),
      validYellow: wordguessConstraintViolation('ابجد', [
        { word: 'اااب', marks: wordguessFeedback('اااب', 'ابجد') },
      ]),
      minimum: wordguessConstraintViolation('بابا', [
        { word: 'ممبا', marks: ['present', 'present', 'absent', 'correct'] },
      ]),
    };
  });
  assert.ok(constraints.green && constraints.repeats && constraints.yellow && constraints.minimum);
  assert.equal(constraints.valid, '');
  assert.equal(constraints.validYellow, '');
  console.log(
    '✓ Inference mode honors green positions, yellow positions and repeated known letters',
  );

  await page.evaluate(() => {
    setup('wordguess');
    $('wordguessMode').value = 'focus';
    $('wordguessLength').value = '4';
    startWordsGame('wordguess');
    state.item = { word: 'مكتب', key: 'مكتب', cat: 'home', hint: 'للكتابة' };
    state.entry = 'مقص';
    renderWordguess();
  });
  await page.locator('#wordguessInput').fill('مَدْرَسة');
  assert.equal(await page.evaluate(() => state.entry), 'مدرس');
  assert.equal(
    await page
      .locator('.wordguess-row')
      .first()
      .innerText()
      .then((text) => text.replace(/\s/g, '')),
    'مدرس',
  );
  await page.locator('#wordguessInput').fill('مكتب');
  await page.locator('#wordguessInput').press('Enter');
  assert.equal(await page.evaluate(() => state.won), true);
  assert.equal(await page.locator('#wordguessInput').count(), 0);
  console.log('✓ Native mobile input normalizes pasted Arabic and submits with Enter');

  const target = await page.evaluate(() => {
    setup('target');
    $('targetMode').value = 'precision';
    startWordsGame('target');
    clearTimers();
    const firstToken = state.token,
      bomb = state.decoy;
    state.points = 20;
    hitTarget(bomb, firstToken);
    const pointsAfterBomb = state.points;
    state.lastInput = 0;
    const slot = state.slot;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(slot + 1), bubbles: true }));
    hitTarget(slot, firstToken);
    return {
      hits: state.hits,
      wrong: state.wrong,
      bombs: state.bombHits,
      pointsAfterBomb,
      distinct: bomb !== slot,
      samples: state.reactions.length,
    };
  });
  assert.deepEqual(target, {
    hits: 1,
    wrong: 1,
    bombs: 1,
    pointsAfterBomb: 12,
    distinct: true,
    samples: 1,
  });
  console.log(
    '✓ Precision targets penalize bombs, accept keyboard input and reject duplicate hits',
  );

  const review = await page.evaluate(() => {
    setup('trivia');
    $('triviaTimer').value = '0';
    startWordsGame('trivia');
    let first = true;
    while (!state.done) {
      const q = state.questions[state.index];
      answerTrivia(first ? -1 : q.choices.indexOf(q.answer));
      first = false;
      nextTrivia();
    }
    return {
      correct: state.correct,
      total: state.questions.length,
      best: state.bestStreak,
      missed: document.querySelectorAll('.trivia-review-item').length,
      timers: timers.length,
    };
  });
  assert.equal(review.correct, review.total - 1);
  assert.equal(review.best, review.total - 1);
  assert.equal(review.missed, 1);
  assert.equal(review.timers, 0);
  console.log(
    '✓ Trivia result reviews missed answers and reports topic mastery without leaving timers',
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
