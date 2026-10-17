import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const names = (key) =>
  [...build.match(new RegExp(`const ${key} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const scripts = (await Promise.all(names('scripts').map((name) => read(`src/${name}.js`)))).join(
  '\n',
);
const styles = (await Promise.all(names('styles').map((name) => read(`src/${name}.css`)))).join(
  '\n',
);
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => scripts)
  .replace('/* BUILD_STYLES */', () => styles);
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, test, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['ليلى'];
      store.extra.motion = false;
      save();
      home();
    });
    await test(page);
    assert.deepEqual(errors, [], name + ': browser exception');
    console.log('✓ ' + name);
    passed++;
  } finally {
    await context.close();
  }
}
async function triviaPractice(page, facts = false) {
  await page.evaluate((facts) => {
    setup('trivia');
    $('triviaTimer').value = '0';
    if (facts) $('triviaMode').value = 'facts';
    startWordsGame('trivia');
    state.questions = state.questions.slice(0, 1);
    if (facts) {
      const indexes = state.questions[0].statements.flatMap((s, i) => (!s.truth ? [i] : []));
      indexes.forEach((i) => toggleTriviaFact(i));
      submitTriviaFacts();
    } else {
      answerTrivia(state.questions[0].choices.findIndex((c) => c !== state.questions[0].answer));
    }
    nextTrivia();
    startTriviaPractice();
  }, facts);
}
async function hangmanPractice(page) {
  await page.evaluate(() => {
    setup('hangman');
    $('hangCount').value = '1';
    startWordsGame('hangman');
    state.misses = state.maxMisses;
    finishHangmanWord();
    nextHangman();
    startHangmanPractice();
  });
}
try {
  await check(
    'Hangman prevents unavailable combinations and previews the exact round size',
    async (page) => {
      await page.evaluate(() => setup('hangman'));
      await page.locator('#hangMode').selectOption('mission');
      await page.locator('#hangLevel').selectOption('hard');
      await page.locator('#hangCategory').selectOption('general');
      assert.equal(await page.locator('#wordsStart').isDisabled(), true);
      assert.match(await page.locator('#hangAvailable').textContent(), /لا توجد/);
      await page.locator('#hangCategory').selectOption('animals');
      await page.locator('#hangCount').selectOption('10');
      assert.equal(await page.locator('#wordsStart').isDisabled(), false);
      const available = await page.evaluate(() => hangmanSetupOptions().pool.length);
      assert.ok(available > 0 && available < 10);
      assert.match(
        await page.locator('#hangAvailable').textContent(),
        new RegExp(`جولتك: ${available} من 10`),
      );
      await page.locator('#wordsStart').click();
      assert.equal(await page.evaluate(() => state.queue.length), available);
      assert.equal(
        await page.evaluate(() => new Set(state.queue.map((w) => w.key)).size),
        available,
      );
    },
  );
  await check(
    'Trivia review keeps answer focus and accepts number and Enter controls',
    async (page) => {
      await triviaPractice(page);
      await page.locator('#triviaPractice .trivia-choice').first().click();
      assert.equal(
        await page.evaluate(() => document.activeElement.hasAttribute('data-practice-next')),
        true,
      );
      await page.keyboard.press('Enter');
      assert.match(await page.locator('#triviaPracticeTitle').textContent(), /اكتملت/);
      await page.evaluate(() => startTriviaPractice());
      await page.keyboard.press('1');
      assert.equal(await page.evaluate(() => state.practice.choice), 0);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.practice.index), 1);
    },
  );
  await check(
    'Fact review preserves selected controls and keyboard confirmation without awarding points',
    async (page) => {
      await triviaPractice(page, true);
      const score = await page.evaluate(() => store.scores['ليلى']);
      await page.locator('#triviaPractice .trivia-choice').first().click();
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('.trivia-choice')),
        true,
      );
      const other = await page.evaluate(() =>
        [0, 1, 2, 3].find((i) => !state.practice.evidenceSelected.includes(i)),
      );
      await page.keyboard.press(String(other + 1));
      await page.locator('#triviaPracticeTitle').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.practice.choice), -2);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.practice.index), 1);
      assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), score);
    },
  );
  await check(
    'Hangman review keeps letter focus and Arabic keyboard typing solves the exercise',
    async (page) => {
      await hangmanPractice(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'hangmanPracticeTitle');
      await page.locator('#hangmanPractice .letter-key').first().click();
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.matches('#hangmanPractice .letter-key:not(:disabled)'),
        ),
        true,
      );
      const word = await page.evaluate(() => state.hangPractice.items[0].key);
      for (const letter of new Set(word))
        await page.evaluate(
          (key) =>
            document.activeElement.dispatchEvent(
              new KeyboardEvent('keydown', { key, bubbles: true }),
            ),
          letter,
        );
      assert.equal(await page.evaluate(() => state.hangPractice.solved), true);
      assert.equal(
        await page.evaluate(() => document.activeElement.hasAttribute('data-practice-next')),
        true,
      );
      await page.keyboard.press('Enter');
      assert.match(await page.locator('#hangmanPracticeTitle').textContent(), /استرجعت/);
    },
  );
  await check(
    'Hangman full-word review preserves the editable draft after a wrong answer',
    async (page) => {
      await hangmanPractice(page);
      await page.locator('#hangmanPracticeInput').fill('كلمة خاطئة');
      await page.locator('#hangmanPracticeInput').press('Enter');
      assert.equal(await page.locator('#hangmanPracticeInput').inputValue(), 'كلمة خاطئة');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'hangmanPracticeInput');
      const word = await page.evaluate(() => state.hangPractice.items[0].key);
      await page.locator('#hangmanPracticeInput').fill(word);
      await page.locator('#hangmanPracticeInput').press('Enter');
      assert.equal(
        await page.evaluate(() => document.activeElement.hasAttribute('data-practice-next')),
        true,
      );
    },
  );
  await check(
    'Pipe flow tests reject direct hint and lens mutation without losing the simulation',
    async (page) => {
      const outcome = await page.evaluate(() => {
        setup('pipes');
        startLab('pipes');
        labStartPipeTest();
        state.pipeTest.playing = false;
        const board = [...state.board],
          test = state.pipeTest,
          moves = state.moves,
          hints = state.hints;
        labHint();
        labToggleLens();
        const selected = state.board.findIndex((mask) => labRotatePipe(mask) !== mask);
        labSelect(selected);
        const blocked = labMoveLensData().blocked;
        labApplyLensMove();
        labPipesTap(selected, 1, true);
        return {
          board,
          after: state.board,
          sameTest: state.pipeTest === test,
          blocked,
          moves: state.moves - moves,
          hints: state.hints - hints,
        };
      });
      assert.deepEqual(outcome.after, outcome.board);
      assert.deepEqual(
        {
          sameTest: outcome.sameTest,
          blocked: outcome.blocked,
          moves: outcome.moves,
          hints: outcome.hints,
        },
        { sameTest: true, blocked: true, moves: 0, hints: 0 },
      );
      assert.equal(await page.locator('#labHint').isDisabled(), true);
      assert.equal(await page.locator('#labLensApply').isDisabled(), true);
      await page.locator('#labFlowClose').click();
      assert.equal(await page.locator('#labHint').isDisabled(), false);
    },
  );
  await check('Nonogram hypotheses keep keyboard focus across a preview render', async (page) => {
    await page.evaluate(() => {
      setup('nonogram');
      startLab('nonogram');
      labTogglePatterns();
    });
    await page.locator('.lab-pattern-choice').first().click();
    assert.equal(
      await page.evaluate(() => document.activeElement.matches('.lab-pattern-choice')),
      true,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('aria-pressed')),
      'true',
    );
    await page.locator('#labPatternApply').click();
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#labBoard')), true);
  });
  await check(
    'Word candidates lead to search, preserve paging, and return a chosen word to the input',
    async (page) => {
      await page.evaluate(() => {
        setup('wordguess');
        startWordsGame('wordguess');
        state.attempts = [{ word: 'ضضضضض', marks: Array(5).fill('absent') }];
        state.notesOpen = true;
        renderWordguess();
      });
      await page.locator('#wordguessCandidatesShow').click();
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        'wordguessCandidateSearch',
      );
      await page.locator('#wordguessCandidatesNext').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessCandidatesNext');
      const word = await page.locator('.wordguess-candidates button.chip').first().textContent();
      await page.locator('.wordguess-candidates button.chip').first().click();
      assert.equal(await page.locator('#wordguessInput').inputValue(), word);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessInput');
    },
  );
  await check(
    'Confirming a candidate or full word survives the mobile typing layout without losing the click',
    async (page) => {
      await page.evaluate(() => {
        setup('wordguess');
        $('wordguessLength').value = '4';
        startWordsGame('wordguess');
        state.item = wordsLexicon.find((item) => item.key === 'مكتب');
        state.entry = 'كتاب';
        submitWordguess();
        showWordguessCandidates();
      });
      await page.locator('.wordguess-candidates button.chip', { hasText: 'مكتب' }).click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessInput');
      assert.equal(await page.locator('.wordguess-panel.wordguess-typing').count(), 1);
      await page.locator('.wordguess-native button').click();
      assert.deepEqual(
        await page.evaluate(() => ({ won: state.won, attempts: state.attempts.length })),
        { won: true, attempts: 2 },
      );
      await page.evaluate(() => finishWordguess());
      assert.equal(await page.locator('.wordguess-review-row').count(), 2);
      assert.equal(await page.evaluate(() => store.extra.history[0].points), 71);
      await page.evaluate(() => {
        setup('hangman');
        $('hangCount').value = '1';
        startWordsGame('hangman');
      });
      const word = await page.evaluate(() => state.item.key);
      await page.locator('#hangmanInput').fill(word);
      assert.equal(await page.locator('.hangman-panel.hangman-typing').count(), 1);
      await page.locator('.hangman-native button').click();
      assert.equal(await page.evaluate(() => state.won), true);
    },
  );
  await check(
    'Touch taps and Enter both confirm native word guesses while the compact keyboard layout is active',
    async (page) => {
      await page.evaluate(() => {
        setup('wordguess');
        $('wordguessLength').value = '4';
        startWordsGame('wordguess');
        state.item = wordsLexicon.find((item) => item.key === 'مكتب');
        state.entry = 'كتاب';
        submitWordguess();
        showWordguessCandidates();
      });
      await page.locator('.wordguess-candidates button.chip', { hasText: 'مكتب' }).tap();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessInput');
      await page.locator('.wordguess-native button').tap();
      assert.deepEqual(
        await page.evaluate(() => ({ won: state.won, attempts: state.attempts.length })),
        { won: true, attempts: 2 },
      );
      await page.evaluate(() => {
        setup('wordguess');
        $('wordguessLength').value = '4';
        startWordsGame('wordguess');
        state.item = wordsLexicon.find((item) => item.key === 'مكتب');
      });
      await page.locator('#wordguessInput').fill('مكتب');
      await page.locator('#wordguessInput').press('Enter');
      assert.deepEqual(
        await page.evaluate(() => ({ won: state.won, attempts: state.attempts.length })),
        { won: true, attempts: 1 },
      );
      await page.evaluate(() => {
        setup('hangman');
        $('hangCount').value = '1';
        startWordsGame('hangman');
      });
      await page.locator('#hangmanInput').fill(await page.evaluate(() => state.item.key));
      await page.locator('.hangman-native button').tap();
      assert.equal(await page.evaluate(() => state.won), true);
    },
    { hasTouch: true, isMobile: true },
  );
  await check(
    'Hypothesis helpers keep comparison focus and place a chosen hypothesis in the editable input',
    async (page) => {
      await page.evaluate(() => {
        setup('wordguess');
        $('wordguessMode').value = 'lab';
        startWordsGame('wordguess');
        state.hypothesisDrafts = wordguessCandidates(state).slice(0, 2);
        renderWordguess();
      });
      await page.locator('#wordguessCompare').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessCompare');
      const word = await page.evaluate(() => state.labAnalysis.reports[0].word);
      await page.locator('#wordguessHypothesisChoice0').click();
      assert.equal(await page.locator('#wordguessInput').inputValue(), word);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessInput');
      assert.equal(await page.evaluate(() => state.attempts.length), 0);
    },
  );
  await check('Wordguess static cells have an accessible labelled semantic role', async (page) => {
    await page.evaluate(() => {
      setup('wordguess');
      startWordsGame('wordguess');
    });
    assert.equal(await page.locator('span.wordguess-cell').count(), 25);
    assert.equal(await page.locator('span.wordguess-cell[role="img"][aria-label]').count(), 25);
  });
  console.log(`\n${passed} words and logic V13 checks passed.`);
} finally {
  await browser.close();
  server.close();
}
