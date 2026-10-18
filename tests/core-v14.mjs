import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) =>
    [
      ...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((entry) => entry[1]);
  const [scripts, styles, template] = await Promise.all([
    Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`))),
    Promise.all(manifest('styles').map((name) => read(`src/${name}.css`))),
    read('src/template.html'),
  ]);
  return template
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n'));
}
const html = process.env.LAMMA_TEST_HTML
  ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
  : await assemble();
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
async function check(name, test) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      store.sound = false;
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Finder: custom questions show their real guarantee, stale taps are ignored, and sealed search finishes once',
    async (page) => {
      await page.evaluate(() => {
        setup('finder');
        $('min').value = '1';
        $('max').value = '100';
        startNumber('finder');
      });
      await page.locator('.strategy-lens summary').click();
      await page.locator('#finderGuessInput').fill('1');
      await page.locator('.strategy-lens button[type="submit"]').click();
      assert.match(
        await page.locator('.panel > p[role="status"]').first().textContent(),
        /8 تخمينات/,
      );
      await page.evaluate(() => {
        window.oldFinderAnswer = document.querySelector('.answerrow button');
      });
      await page.locator('.answerrow button').first().click();
      const before = await page.evaluate(() => state.attempt);
      await page.evaluate(() => oldFinderAnswer.click());
      assert.equal(await page.evaluate(() => state.attempt), before);
      await page.locator('[onclick="undoFinder()"]').click();
      assert.equal(await page.evaluate(() => state.guess.toString()), '1');
      await page.evaluate(() => {
        setup('finder');
        $('min').value = '1';
        $('max').value = '100';
        $('finderRule').value = 'sealed';
        startNumber('finder');
      });
      await page.locator('#finderPrivateInput').fill('97');
      await page.locator('form button[type="submit"]').click();
      await page.locator('.answerrow button').nth(1).click();
      assert.equal(await page.evaluate(() => state.done), false);
      assert.equal(await page.evaluate(() => state.attempt), 1);
      for (let i = 0; i < 8 && !(await page.evaluate(() => state.done)); i++) {
        const guess = Number(await page.evaluate(() => state.guess.toString()));
        await page
          .locator('.answerrow button')
          .nth(guess === 97 ? 1 : guess < 97 ? 0 : 2)
          .click();
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => store.scores[state.name].rounds), 1);
      assert.match(await page.locator('.success').textContent(), /97/);
    },
  );
  await check(
    'Solo: drafts survive hints, invalid inputs are free, and the final review includes every guess',
    async (page) => {
      await page.evaluate(() => {
        setup('solo');
        startNumber('solo');
        state.secret = 81n;
      });
      await page.locator('#guessInput').fill('17');
      await page.locator('[onclick="hintSolo()"]').click();
      assert.equal(await page.locator('#guessInput').inputValue(), '17');
      assert.equal(await page.evaluate(() => state.attempt), 0);
      await page.locator('.solo-form button[type="submit"]').click();
      assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.evaluate(() => state.attempt), 0);
      await page.locator('#guessInput').fill('75');
      await page.locator('.solo-form button[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.l.toString()), '76');
      assert.equal(await page.locator('#guessInput').inputValue(), '');
      await page.evaluate(() => {
        window.oldSoloForm = document.querySelector('.solo-form');
      });
      await page.locator('#guessInput').fill('٨١');
      await page.locator('.solo-form button[type="submit"]').click();
      await page.locator('.success .round-review summary').click();
      assert.match(await page.locator('.success .round-review').textContent(), /75/);
      assert.match(await page.locator('.success .round-review').textContent(), /81/);
      assert.equal(await page.locator('.round-review ol li').count(), 2);
      assert.equal(await page.evaluate(() => state.attempt), 2);
      await page.evaluate(() => {
        setup('solo');
        startNumber('solo');
        oldSoloForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      assert.equal(await page.evaluate(() => state.attempt), 0);
      assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), null);
    },
  );
  await check(
    'Mind: uncertain evidence, correction, stale search, and complete candidate inference work independently',
    async (page) => {
      await page.evaluate(() => {
        setup('mind');
        $('mindStyle').value = 'investigate';
        startMind();
        window.oldMindSearch = $('mindCandidateSearch');
      });
      const initial = await page.evaluate(() => state.candidates.length);
      await page.locator('.answerrow button').nth(2).click();
      assert.equal(await page.evaluate(() => state.candidates.length), initial);
      await page.locator('#mindNotebook summary').click();
      await page.locator('#mindCandidateSearch').fill('شيف');
      await page.evaluate(() => {
        oldMindSearch.value = 'خطأ قديم';
        oldMindSearch.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.evaluate(() => state.mindCandidateQuery), 'شيف');
      await page.locator('[onclick="undoMind()"]').click();
      assert.equal(await page.evaluate(() => state.evidence.length), 0);
      await page.evaluate(() => {
        window.mindTarget = state.candidates.find((i) => items[i].name === 'طباخ');
      });
      for (let i = 0; i < 40 && (await page.locator('.answerrow button').count()); i++) {
        const yes = await page.evaluate(() => items[mindTarget].tags.has(questions[state.q][0]));
        await page
          .locator('.answerrow button')
          .nth(yes ? 0 : 1)
          .click();
      }
      if ((await page.evaluate(() => state.candidates.length)) > 1)
        await page.locator('.panel button').filter({ hasText: 'طباخ' }).click();
      else await page.locator('.panel button').filter({ hasText: 'إي، هذا هو!' }).click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => store.scores[state.name].points), 30);
    },
  );
  await check(
    'Who: final wrong guess is retained, unsafe text is escaped, and aliases win in a new round',
    async (page) => {
      await page.evaluate(() => {
        setup('who');
        startWho();
        state.item = items.find((item) => item.name === 'طباخ');
        state.max = 2;
        renderWho();
      });
      await page.locator('#whoInput').fill('<img src=x>');
      await page.locator('form button[type="submit"]').click();
      await page.evaluate(() => {
        window.oldWhoHint = document.querySelector('[onclick="whoHint()"]');
      });
      await page.locator('#whoInput').fill('عنقاء');
      await page.locator('form button[type="submit"]').click();
      assert.deepEqual(await page.evaluate(() => state.wrong), ['<img src=x>', 'عنقاء']);
      await page.locator('.success .history summary').click();
      assert.match(await page.locator('.success .history').textContent(), /عنقاء/);
      assert.equal(await page.locator('.success .history img').count(), 0);
      await page.evaluate(() => {
        setup('who');
        startWho();
        state.item = items.find((item) => item.name === 'طباخ');
        renderWho();
        oldWhoHint.click();
      });
      assert.equal(await page.evaluate(() => state.hints), 1);
      await page.locator('#whoInput').fill('الشِّيف');
      await page.locator('form button[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => store.scores[state.name].rounds), 2);
    },
  );
  await check(
    'Memory: mismatches lock correctly, stale cards cannot flip, meaning pairs finish with accessible progress',
    async (page) => {
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        $('memorymode').value = 'meaning';
        $('memoryPace').value = '600';
        startMemory();
        window.oldMemoryCard = document.querySelector('.memcard');
      });
      assert.equal(await page.locator('.memory').getAttribute('role'), 'group');
      const other = await page.evaluate(() =>
        state.deck.findIndex((symbol) => symbol !== state.deck[0]),
      );
      await page.locator('[data-memory-index="0"]').click();
      await page.locator(`[data-memory-index="${other}"]`).click();
      assert.equal(await page.evaluate(() => state.locked), true);
      await page.waitForFunction(() => !state.locked);
      await page.evaluate(() => oldMemoryCard.click());
      assert.deepEqual(await page.evaluate(() => state.up), []);
      const pairs = await page.evaluate(() =>
        [...new Set(state.deck)].map((symbol) =>
          state.deck.map((value, i) => (value === symbol ? i : -1)).filter((i) => i >= 0),
        ),
      );
      for (let n = 0; n < pairs.length; n++) {
        for (const i of pairs[n]) await page.locator(`[data-memory-index="${i}"]`).click();
        if (n < pairs.length - 1)
          assert.equal(
            await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'),
            String(n + 1),
          );
      }
      await page.waitForSelector('.success');
      assert.equal(await page.evaluate(() => state.moves), 5);
      assert.equal(await page.evaluate(() => state.matched.length), 8);
      assert.equal(await page.evaluate(() => store.scores[state.name].rounds), 1);
    },
  );
  await check(
    'Mime: story skip budget, undo, invisible-word privacy and classic unresolved-word review are correct',
    async (page) => {
      await page.evaluate(() => {
        setup('mime');
        $('mimerule').value = 'story';
        startMime();
      });
      await page.locator('[onclick="mimeReady()"]').click();
      await page.evaluate(() => {
        window.oldMimeAnswer = document.querySelector('.actions .primary');
      });
      for (let i = 0; i < 3; i++)
        await page.locator('button').filter({ hasText: 'تجاوز −2' }).click();
      assert.equal(await page.locator('button').filter({ hasText: 'تجاوز −2' }).isDisabled(), true);
      await page.evaluate(() => oldMimeAnswer.click());
      assert.equal(await page.evaluate(() => state.correct), 0);
      await page.locator('button').filter({ hasText: 'تراجع عن آخر ضغطة' }).click();
      assert.equal(await page.evaluate(() => state.skips), 2);
      await page.locator('button').filter({ hasText: 'إخفاء الكلمة' }).click();
      assert.equal(await page.evaluate(() => !$('app').textContent.includes(state.word)), true);
      for (let i = 0; i < 3; i++)
        await page.locator('button').filter({ hasText: 'عرفوها! +10' }).click();
      assert.equal(await page.evaluate(() => state.stage), 'result');
      assert.equal(await page.evaluate(() => state.score), 40);
      await page.evaluate(() => {
        setup('mime');
        $('mimerule').value = 'classic';
        startMime();
        mimeReady();
        mimeAnswer(true);
      });
      const word = await page.evaluate(() => state.word);
      await page.locator('button').filter({ hasText: 'أنهِ الدور' }).click();
      assert.match(await page.locator('.panel').textContent(), /الكلمة الأخيرة غير المحتسبة/);
      assert.ok((await page.locator('.panel').textContent()).includes(word));
      assert.equal(await page.evaluate(() => state.score), 10);
    },
  );
  await check(
    'Secret: private handoff, evidence/undo, final written guess, aliases, review, and once-only awards work',
    async (page) => {
      await page.evaluate(() => {
        setup('secret');
        $('questionLimit').value = '10';
        startSecret();
      });
      await page.locator('[onclick="revealSecret()"]').click();
      await page.locator('#customword').fill('شيف');
      await page.locator('[onclick="hideSecret()"]').click();
      await page.locator('[onclick="secretReady()"]').click();
      assert.equal(
        await page
          .locator('.panel')
          .textContent()
          .then((text) => text.includes('شيف')),
        false,
      );
      await page.locator('#secretQuestionText').fill('هل يطبخ؟ <img src=x>');
      await page
        .locator('button')
        .filter({ hasText: /^نعم ✓$/ })
        .click();
      await page.locator('#secretGuessInput').fill('عنقاء');
      await page.locator('.secret-guess button[type="submit"]').click();
      await page.locator('button').filter({ hasText: 'تراجع عن سؤال' }).click();
      assert.equal(await page.locator('#secretGuessInput').inputValue(), 'عنقاء');
      assert.equal(await page.evaluate(() => state.questions), 1);
      await page.locator('#secretGuessInput').fill('');
      for (let i = 1; i < 10; i++)
        await page
          .locator('button')
          .filter({ hasText: /^لا ✕$/ })
          .click();
      assert.equal(await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'), '10');
      await page.locator('#secretGuessInput').fill('طباخ');
      await page.locator('.secret-guess button[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.stage), 'award');
      await page.locator('.history summary').click();
      assert.match(await page.locator('.history').textContent(), /هل يطبخ/);
      assert.equal(await page.locator('.history img').count(), 0);
      await page.evaluate(() => {
        window.oldSecretAward = document.querySelector('.actions button.primary');
      });
      await page.locator('button').filter({ hasText: 'احسب النقاط ونكمل' }).click();
      await page.evaluate(() => oldSecretAward.click());
      assert.equal(await page.evaluate(() => state.turn), 1);
      assert.equal(
        await page.evaluate(() =>
          Object.values(store.scores).reduce((n, score) => n + score.rounds, 0),
        ),
        2,
      );
    },
  );
  await check(
    'Reaction: stale start taps are harmless, orange mistakes are distinct, valid responses finish one recorded result',
    async (page) => {
      await page.evaluate(() => {
        setup('reaction');
        $('trials').value = '3';
        $('reactionmode').value = 'focus';
        startReaction();
        window.oldReactionStart = document.querySelector('button.reaction');
      });
      await page.locator('button.reaction').click();
      await page.evaluate(() => oldReactionStart.click());
      assert.equal(await page.evaluate(() => state.stage), 'waiting');
      await page.locator('button.reaction').click();
      assert.equal(await page.evaluate(() => state.last), 1500);
      await page.locator('button').filter({ hasText: 'المحاولة التالية' }).click();
      await page.evaluate(() => {
        state.stage = 'decoy';
        renderReaction();
      });
      await page.locator('button.reaction').click();
      assert.match(await page.locator('button.reaction small').textContent(), /إشارة التوقف/);
      assert.equal(await page.evaluate(() => state.records[reactionName()][1].noGoError), true);
      await page.locator('button').filter({ hasText: 'المحاولة التالية' }).click();
      await page.evaluate(() => {
        reactionTap();
        clearTimers();
        state.stage = 'ready';
        state.readyAt = performance.now() - 230;
        renderReaction();
      });
      await page.locator('button.reaction').click();
      assert.equal(await page.evaluate(() => state.falseStart), false);
      await page.locator('button').filter({ hasText: 'المحاولة التالية' }).click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => store.scores[state.players[0]].rounds), 1);
      await page.locator('.reaction-analysis summary').click();
      assert.equal(await page.locator('.reaction-trial-history meter').count(), 3);
      assert.match(await page.locator('.reaction-trial-history').textContent(), /ضغط إشارة التوقف/);
    },
  );
  await check(
    'All eight core games fit a 320px offline phone with their new controls open',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await page.context().setOffline(true);
      for (const id of ['finder', 'solo', 'mind', 'who', 'memory', 'mime', 'secret', 'reaction']) {
        await page.evaluate((id) => {
          setup(id);
          if (['finder', 'solo'].includes(id)) startNumber(id);
          if (id === 'mind') startMind();
          if (id === 'who') {
            startWho();
            whoCandidates();
          }
          if (id === 'memory') {
            $('difficulty').value = '24';
            $('memorymode').value = 'meaning';
            startMemory();
          }
          if (id === 'mime') {
            startMime();
            mimeReady();
          }
          if (id === 'secret') {
            startSecret();
            revealSecret();
            hideSecret();
            secretReady();
          }
          if (id === 'reaction') startReaction();
          document.querySelectorAll('details').forEach((detail) => (detail.open = true));
        }, id);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          id,
        );
      }
    },
  );
  console.log(`Core v14: ${passed} independent Chromium checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
