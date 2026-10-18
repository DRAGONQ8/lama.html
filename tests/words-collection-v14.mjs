import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const manifest = (key) =>
  [...build.match(new RegExp(`const ${key} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const [scripts, styles, template] = await Promise.all([
  Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`))),
  Promise.all(manifest('styles').map((name) => read(`src/${name}.css`))),
  read('src/template.html'),
]);
const html = process.env.LAMMA_TEST_HTML
  ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
  : template
      .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'))
      .replace('/* BUILD_STYLES */', () => styles.join('\n'));
const server = createServer((_, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, test, options = {}) {
  if (process.env.WORDS_COLLECTION_CHECK && !name.includes(process.env.WORDS_COLLECTION_CHECK))
    return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['ليلى'];
      store.sound = false;
      store.extra.motion = false;
      applySettings();
      save();
      home();
    });
    await test(page, context);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(`✓ ${name}`);
    passed++;
  } finally {
    await context.close();
  }
}
async function start(page, id, fields = {}) {
  await page.evaluate(
    ({ id, fields }) => {
      setup(id);
      for (const [key, value] of Object.entries(fields)) $(key).value = value;
      if (collectionGameIds.has(id)) startCollection(id);
      else startWordsGame(id);
    },
    { id, fields },
  );
}
async function finishCollectionCorrectly(page) {
  await page.evaluate(() => {
    while (!state.done) {
      const q = state.questions[state.index];
      if (state.id === 'order') {
        q.arranged = [...q.solution];
        submitCollectionOrder();
      } else if (!state.locked)
        answerCollection(
          state.id === 'flags'
            ? q.choices.findIndex((item) => item.code === q.code)
            : q.truth
              ? 0
              : 1,
        );
      nextCollection();
    }
  });
}
try {
  await check(
    'Trivia: classic, confidence and fact checks keep keyboard focus and enforce deadlines',
    async (page) => {
      for (const mode of ['classic', 'strategy', 'facts']) {
        await start(page, 'trivia', { triviaMode: mode, triviaTimer: '0' });
        assert.equal(await page.evaluate(() => document.activeElement.id), 'triviaQuestion');
        if (mode === 'facts') {
          const correct = await page.evaluate(() =>
            state.questions[0].statements.flatMap((item, i) => (item.truth ? [i] : [])),
          );
          for (const index of correct) await page.locator('.trivia-choice').nth(index).click();
          await page.locator('#triviaConfirm').click();
          assert.equal(await page.evaluate(() => state.knowledgePoints), 10);
        } else {
          if (mode === 'strategy') {
            await page.locator('.trivia-confidence button').nth(1).click();
            await page.locator('.trivia-aid').click();
          }
          const correct = await page.evaluate(() =>
            state.questions[0].choices.indexOf(state.questions[0].answer),
          );
          await page.keyboard.press(String(correct + 1));
          assert.equal(
            await page.evaluate(() => state.knowledgePoints),
            mode === 'strategy' ? 12 : 10,
          );
        }
        assert.equal(await page.evaluate(() => document.activeElement.id), 'triviaNext');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => state.index), 1);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'triviaQuestion');
      }
      await start(page, 'trivia', { triviaTimer: '15' });
      await page.evaluate(() => {
        state.endAt = Date.now() - 1;
      });
      await page.keyboard.press('1');
      await page.waitForFunction(() => state.locked);
      assert.deepEqual(
        await page.evaluate(() => [state.choice, state.correct, document.activeElement.id]),
        [-1, 0, 'triviaNext'],
      );
    },
  );

  await check(
    'Hangman: native guesses, repeated mistakes and all three modes preserve focus and scoring',
    async (page) => {
      for (const mode of ['classic', 'rescue', 'mission']) {
        await start(page, 'hangman', { hangMode: mode, hangCount: '1', hangLevel: 'easy' });
        assert.equal(await page.evaluate(() => document.activeElement.id), 'hangmanClue');
        const wrong = await page.evaluate(() =>
          (state.item.key[0] === 'ب' ? 'ت' : 'ب').repeat(state.item.key.length),
        );
        await page.locator('#hangmanInput').fill(wrong);
        await page.locator('.hangman-native button').click();
        assert.equal(await page.evaluate(() => state.misses), 2);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'hangmanFeedback');
        await page.locator('#hangmanInput').fill(wrong);
        await page.locator('.hangman-native button').click();
        assert.equal(await page.evaluate(() => state.misses), 2);
        const word = await page.evaluate(() => state.item.word);
        await page.locator('#hangmanInput').fill(word);
        await page.locator('#hangmanInput').press('Enter');
        assert.equal(await page.evaluate(() => state.won), true);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'hangmanNext');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => state.done), true);
        assert.equal(await page.locator('.words-round-review > div').count(), 1);
        assert.ok(await page.evaluate(() => state.total > 0));
      }
    },
  );

  await check(
    'Wordguess: repeated letters have shape and spoken cues; native submission leads to editable next turn',
    async (page) => {
      await start(page, 'wordguess', { wordguessLength: '4' });
      await page.evaluate(() => {
        state.item = wordsLexicon.find((item) => item.key === 'مكتب');
      });
      await page.locator('#wordguessInput').fill('كتاب');
      await page.locator('.wordguess-native button').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'wordguessMessage');
      assert.equal(await page.evaluate(() => state.attempts.length), 1);
      for (const mark of ['correct', 'present', 'absent']) {
        const cell = page.locator(`.wordguess-cell.${mark}`).first();
        if (await cell.count())
          assert.notEqual(
            await cell.evaluate((el) => getComputedStyle(el, '::after').content),
            'none',
          );
      }
      assert.match(
        await page.locator('.wordguess-cell.absent').first().getAttribute('aria-label'),
        /تكراره زائد/,
      );
      assert.match(
        await page.locator('.letter-key.absent').first().getAttribute('aria-label'),
        /تكراره زائد/,
      );
      await page.locator('#wordguessInput').fill('مَكْتَب');
      await page.locator('#wordguessInput').press('Enter');
      assert.deepEqual(
        await page.evaluate(() => [state.won, state.attempts.length, document.activeElement.id]),
        [true, 2, 'wordguessFinish'],
      );
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.locator('.wordguess-review-row').count(), 2);
      assert.deepEqual(await page.evaluate(() => wordguessFeedback('بابا', 'بابر')), [
        'correct',
        'correct',
        'correct',
        'absent',
      ]);
    },
  );

  await check(
    'Target: all five modes accept browser input, preserve keyboard focus and reject stale hits',
    async (page) => {
      for (const mode of ['speed', 'precision', 'sequence', 'memory', 'intercept']) {
        await start(page, 'target', { targetMode: mode, targetLevel: 'easy' });
        if (mode === 'intercept') {
          assert.equal(await page.evaluate(() => document.activeElement.id), 'targetMovingField');
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.evaluate(() => state.aim.x), 56);
          await page.keyboard.press('Home');
          assert.equal(await page.evaluate(() => state.aim.x), 50);
          await page.evaluate(() => {
            clearTimers();
            state.moving = { x: 50, y: 50, vx: 0, vy: 0 };
            renderTarget();
          });
          await page.keyboard.press('Enter');
        } else {
          assert.equal(
            await page.evaluate(() => document.activeElement.matches('.target-cell')),
            true,
          );
          if (mode === 'memory') {
            await page.evaluate(() => {
              state.memoryPreviewUntil = targetElapsed() - 1;
            });
            await page.waitForFunction(() => !state.memoryPreview);
          }
          await page.evaluate(() => {
            clearTimers();
            state.targetLifetime = 60000;
            state.targetExpires = targetElapsed() + 60000;
          });
          if (mode === 'precision') {
            await page.evaluate(() => {
              state.points = 20;
            });
            await page.locator('.target-cell.decoy').click();
            assert.deepEqual(
              await page.evaluate(() => [state.points, state.wrong, state.bombHits]),
              [12, 1, 1],
            );
            await page.waitForTimeout(90);
          }
          const old = await page.evaluate(() => {
            window.v14OldTarget = document.querySelector(
              `.target-cell[data-index="${state.slot}"]`,
            );
            return state.slot;
          });
          await page.locator(`.target-cell[data-index="${old}"]`).click();
          await page.evaluate(() => v14OldTarget.click());
          assert.equal(await page.evaluate(() => state.hits), 1);
          if (['memory', 'sequence'].includes(mode)) {
            for (let i = 1; i < 3; i++) {
              await page.waitForTimeout(90);
              const slot = await page.evaluate(() => state.slot);
              await page.locator(`.target-cell[data-index="${slot}"]`).click();
            }
            assert.equal(await page.evaluate(() => state.completedPaths), 1);
            if (mode === 'memory') assert.equal(await page.evaluate(() => state.points), 35);
          }
        }
        assert.ok(await page.evaluate(() => state.hits >= 1));
        await page.evaluate(() => {
          state.endAt = Date.now() - 1;
          finishTarget();
        });
        assert.equal(await page.evaluate(() => state.done), true);
        assert.equal(await page.locator('.target-review').count(), 1);
      }
    },
  );

  await check(
    'Flags: both directions compare the chosen and correct countries without repeat awards',
    async (page) => {
      for (const mode of ['country', 'flag']) {
        await start(page, 'flags', { flagsMode: mode, flagsChoices: '6', flagsRegion: 'gulf' });
        const data = await page.evaluate(() => {
          const q = state.questions[0],
            index = q.choices.findIndex((item) => item.code !== q.code);
          return { index, selected: q.choices[index].name, correct: q.name };
        });
        await page.locator('.collection-choice').nth(data.index).click();
        assert.equal(await page.locator('.collection-flag-comparison figure').count(), 2);
        assert.ok(
          (await page.locator('.collection-flag-comparison figcaption').allTextContents()).some(
            (text) => text.includes(data.selected),
          ),
        );
        assert.ok(
          (await page.locator('.collection-flag-comparison figcaption').allTextContents()).some(
            (text) => text.includes(data.correct),
          ),
        );
        const before = await page.evaluate(() => state.answers.length);
        await page.evaluate(() => answerCollection(0));
        assert.equal(await page.evaluate(() => state.answers.length), before);
        await finishCollectionCorrectly(page);
        assert.equal(await page.locator('.collection-review-flag').count(), 5);
      }
    },
  );

  await check(
    'Truefalse: bookmark a correct statement, reopen it in practice and keep recorded scores intact',
    async (page) => {
      await start(page, 'truefalse', { factCount: '5' });
      const statement = await page.locator('#collectionQuestion').textContent();
      await page.evaluate(() => {
        window.v14OldReview = $('collectionMarkReview');
      });
      await page.locator('#collectionMarkReview').click();
      assert.equal(
        await page.locator('#collectionMarkReview').getAttribute('aria-pressed'),
        'true',
      );
      const correct = await page.evaluate(() => (state.questions[0].truth ? 0 : 1));
      await page.locator('.collection-choice').nth(correct).click();
      assert.equal(
        await page.locator('#collectionMarkReview').getAttribute('aria-pressed'),
        'true',
      );
      await page.locator('#collectionNext').click();
      await page.evaluate(() => v14OldReview.click());
      assert.deepEqual(await page.evaluate(() => state.reviewMarked), [0]);
      await finishCollectionCorrectly(page);
      const recorded = await page.evaluate(() =>
        JSON.stringify([store.scores, store.extra.history]),
      );
      await page.getByRole('button', { name: /تدرب على 1/ }).click();
      assert.equal(await page.locator('#collectionQuestion').textContent(), statement);
      assert.deepEqual(await page.evaluate(() => [state.practice, state.questions.length]), [
        true,
        1,
      ]);
      await finishCollectionCorrectly(page);
      assert.equal(
        await page.evaluate(() => JSON.stringify([store.scores, store.extra.history])),
        recorded,
      );
    },
  );

  await check(
    'Order: touch relocation, cancel, undo, keyboard arrows and locked submissions work together',
    async (page) => {
      await start(page, 'order', { orderCategory: 'numbers' });
      await page.evaluate(() => {
        state.questions = state.questions.slice(0, 1);
        renderCollection();
      });
      const original = await page.evaluate(() => [...state.questions[0].arranged]);
      const last = original.length - 1;
      await page.locator('[data-order-pick="0"]').tap();
      assert.equal(
        await page.locator('[data-order-pick="0"]').getAttribute('aria-pressed'),
        'true',
      );
      await page.locator('[data-order-pick="0"]').tap();
      assert.equal(await page.evaluate(() => state.orderPicked), null);
      await page.locator('[data-order-pick="0"]').tap();
      await page.locator(`[data-order-pick="${last}"]`).tap();
      assert.deepEqual(await page.evaluate(() => state.questions[0].arranged), [
        ...original.slice(1),
        original[0],
      ]);
      await page.getByRole('button', { name: '↶ تراجع عن آخر حركة' }).tap();
      assert.deepEqual(await page.evaluate(() => state.questions[0].arranged), original);
      await page.keyboard.press('1');
      await page.keyboard.press('ArrowDown');
      await page.getByRole('button', { name: '↶ تراجع عن آخر حركة' }).tap();
      assert.deepEqual(await page.evaluate(() => state.questions[0].arranged), original);
      const solution = await page.evaluate(() => state.questions[0].solution);
      for (let index = 0; index < solution.length; index++) {
        const from = await page.evaluate(
          (item) => state.questions[0].arranged.indexOf(item),
          solution[index],
        );
        if (from === index) continue;
        await page.locator(`[data-order-pick="${from}"]`).tap();
        await page.locator(`[data-order-pick="${index}"]`).tap();
      }
      await page.locator('.collection-confirm').tap();
      assert.equal(await page.evaluate(() => state.correct), 1);
      assert.ok((await page.locator('.collection-order-label:disabled').count()) > 0);
      await page.locator('#collectionNext').tap();
      assert.equal(await page.locator('.resultnum').textContent(), '100 / 100');
    },
    { hasTouch: true, isMobile: true },
  );

  await check(
    'Collection: seeded questions, choices and both order directions reproduce exactly',
    async (page) => {
      for (const id of ['flags', 'truefalse', 'order']) {
        const snapshots = [];
        for (let repeat = 0; repeat < 2; repeat++) {
          await page.evaluate((id) => {
            setup(id);
            if (id === 'order') $('orderDirection').value = 'mixed';
            seededRandom = makeSeed('collection-v14-' + id);
            startCollection(id);
          }, id);
          snapshots.push(await page.evaluate(() => JSON.stringify(state.questions)));
        }
        assert.equal(snapshots[0], snapshots[1], id);
        await page.evaluate(() => {
          seededRandom = null;
        });
      }
    },
  );

  await check(
    'All seven games: offline 320px large-text layouts and WCAG A/AA remain usable',
    async (page, context) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await context.setOffline(true);
      await mkdir('test-results/words-collection-v14', { recursive: true });
      for (const theme of ['dark', 'light']) {
        await page.evaluate((theme) => {
          store.extra.theme = theme;
          store.extra.textScale = 130;
          applySettings();
        }, theme);
        for (const id of [
          'trivia',
          'hangman',
          'wordguess',
          'target',
          'flags',
          'truefalse',
          'order',
        ]) {
          await start(
            page,
            id,
            id === 'trivia'
              ? { triviaTimer: '0' }
              : id === 'wordguess'
                ? { wordguessLength: '4' }
                : {},
          );
          if (id === 'target') await page.evaluate(() => clearTimers());
          if (id === 'flags') {
            const wrong = await page.evaluate(() =>
              state.questions[0].choices.findIndex((item) => item.code !== state.questions[0].code),
            );
            await page.locator('.collection-choice').nth(wrong).click();
          }
          if (id === 'wordguess') {
            await page.evaluate(() => {
              state.item = wordsLexicon.find((item) => item.key === 'مكتب');
            });
            await page.locator('#wordguessInput').fill('كتاب');
            await page.locator('.wordguess-native button').click();
          }
          if (id === 'order') {
            await page.locator('[data-order-pick="0"]').click();
          }
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
            false,
            `${theme}/${id} overflow`,
          );
          const audit = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
          assert.deepEqual(
            audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
            [],
            `${theme}/${id}`,
          );
          if (theme === 'dark')
            await page.screenshot({
              path: `test-results/words-collection-v14/${id}.png`,
              fullPage: true,
            });
        }
      }
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Words and collection v14: ${passed} browser checks passed.`);
