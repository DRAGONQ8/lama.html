import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
const html = await readFile(
  process.env.LAMMA_TEST_HTML || new URL('../lamma_universe.html', import.meta.url),
  'utf8',
);
const server = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
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
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Numerical strategy uses only the visible range, preserves the draft and handles huge integers',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('solo');
        startNumber('solo');
        $('guessInput').value = '50';
        updateSoloSplit();
        const first = $('soloSplit').textContent,
          attempts = state.attempt;
        state.secret = 99n;
        updateSoloSplit();
        const unchanged = first === $('soloSplit').textContent;
        toggleSoloPad();
        const restored = $('soloSplit').textContent;
        const edge = splitNumberRange(1n, 100n, 1n),
          huge = splitNumberRange(-1n, 10n ** 40n, 10n ** 39n);
        return {
          first,
          restored,
          unchanged,
          attempts,
          edge: edge.worst.toString(),
          huge: huge.higher.toString(),
          outside: splitNumberRange(1n, 100n, 101n),
        };
      });
      assert.match(value.first, /49/);
      assert.match(value.first, /50/);
      assert.equal(value.restored, value.first);
      assert.equal(value.unchanged, true);
      assert.equal(value.attempts, 0);
      assert.equal(value.edge, '99');
      assert.equal(value.outside, null);
      assert.ok(value.huge.length >= 39);
    },
  );
  await check(
    'Finder planned questions narrow legally, undo accurately, and never display negative budgets',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('finder');
        $('min').value = '1';
        $('max').value = '100';
        startNumber('finder');
        $('finderGuessInput').value = '1';
        planFinderGuess();
        const before = state.attempt;
        finderAnswer('higher');
        const narrowed = [state.l.toString(), state.h.toString()];
        undoFinder();
        const undone = [state.guess.toString(), state.l.toString(), state.attempt];
        for (let i = 0; i < 9; i++) {
          $('finderGuessInput').value = state.l.toString();
          planFinderGuess();
          finderAnswer('higher');
        }
        return { before, narrowed, undone, stats: document.querySelector('.stats').innerText };
      });
      assert.equal(value.before, 1);
      assert.deepEqual(value.narrowed, ['2', '100']);
      assert.deepEqual(value.undone, ['1', '1', 1]);
      assert.doesNotMatch(value.stats, /−|\n-\d/);
    },
  );
  await check(
    'Mind notebook corrects older uncertainty from all evidence, supports undo and rejects stale actions',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mind');
        startMind();
        const question = state.q;
        mindAnswer('unknown');
        const oldVersion = state.notebookVersion,
          original = [...state.candidates];
        mindRevisit(question, 'yes', oldVersion);
        const narrowed = state.candidates.every((i) => items[i].tags.has(questions[question][0])),
          count = state.candidates.length;
        const currentVersion = state.notebookVersion;
        mindRevisit(question, 'no', oldVersion);
        const unchanged = count === state.candidates.length;
        undoMind();
        return {
          narrowed,
          count,
          initial: original.length,
          unchanged,
          restored: state.candidates.length === original.length,
          currentVersion,
        };
      });
      assert.equal(value.narrowed, true);
      assert.ok(value.count < value.initial);
      assert.equal(value.unchanged, true);
      assert.equal(value.restored, true);
    },
  );
  await check(
    'Who attribute inquiries charge the disclosed cost without spending guesses, and pause blocks aids',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('who');
        startWho();
        const initial = whoPoints();
        askWhoInquiry();
        const cost = initial - whoPoints();
        askWhoInquiry(0);
        openGuide('who');
        askWhoInquiry();
        const blockedCount = state.inquiries.length;
        closeModal();
        askWhoInquiry();
        askWhoInquiry();
        return {
          cost,
          blockedCount,
          count: state.inquiries.length,
          attempts: state.attempt,
          correct: state.inquiries.every((v) => v.yes === state.item.tags.has(questions[v.q][0])),
        };
      });
      assert.deepEqual(value, { cost: 6, blockedCount: 1, count: 2, attempts: 0, correct: true });
    },
  );
  await check(
    'Semantic memory gives one picture and one name per pair and awards a solved board once',
    async (page) => {
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        $('memorymode').value = 'meaning';
        startMemory();
      });
      const value = await page.evaluate(() => {
        const pairs = [...new Set(state.deck)].map((symbol) =>
          state.deck.map((v, i) => (v === symbol ? i : -1)).filter((i) => i >= 0),
        );
        const meaningful = pairs.every(([a, b]) => state.faces[a] !== state.faces[b]);
        for (const [a, b] of pairs) {
          flipCard(a);
          flipCard(b);
        }
        const rounds = store.scores[state.name].rounds,
          points = store.scores[state.name].points;
        flipCard(0);
        return {
          meaningful,
          done: state.done,
          matched: state.matched.length,
          rounds,
          points,
          unchanged: store.scores[state.name].rounds === rounds,
        };
      });
      assert.equal(value.meaningful, true);
      assert.equal(value.done, true);
      assert.equal(value.matched, 8);
      assert.equal(value.rounds, 1);
      assert.ok(value.points > 0);
      assert.equal(value.unchanged, true);
      await page.waitForTimeout(500);
    },
  );
  await check(
    'Mime scenes and card tokens prevent duplicate answers and hidden undo never reveals the previous word',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mime');
        $('mimerule').value = 'scene';
        startMime();
        mimeReady();
        const turn = state.turn,
          serial = state.cardSerial,
          rule = state.sceneRule;
        mimeAnswer(true, turn, serial);
        const score = state.score;
        mimeAnswer(true, turn, serial);
        const stable = state.score === score;
        toggleMimeWord();
        undoMime();
        const privateUndo = state.hiddenWord && !$('app').innerText.includes(state.word);
        endMime();
        const results = JSON.stringify(state.results);
        advanceMime(turn);
        mimeReady();
        endMime(turn, serial);
        return {
          rule,
          stable,
          privateUndo,
          notEnded: state.stage === 'active',
          noExtra: JSON.stringify(state.results) === results,
        };
      });
      assert.ok(value.rule.length > 0);
      assert.equal(value.stable, true);
      assert.equal(value.privateUndo, true);
      assert.equal(value.notEnded, true);
      assert.equal(value.noExtra, true);
    },
  );
  await check(
    'Secret typed guesses rotate evidence authors, reject repetition and award the chosen guesser once',
    async (page) => {
      await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        $('customword').value = 'سفينة';
        hideSecret();
        secretReady();
      });
      await page.locator('#secretGuessInput').fill('طائرة');
      await page.locator('.secret-guess button[type="submit"]').click();
      await page.locator('#secretGuessInput').fill('طائرة');
      await page.locator('.secret-guess button[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.questions), 1);
      await page.locator('#secretQuestionText').fill('هل يتحرك على الماء؟');
      await page.evaluate(() => secretQuestion('yes'));
      assert.equal(await page.evaluate(() => new Set(state.questionAuthors).size), 2);
      await page.locator('#secretGuesser').selectOption('2');
      await page.locator('#secretGuessInput').fill('السفينة');
      await page.locator('.secret-guess button[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.stage), 'award');
      assert.equal(await page.locator('#winner').inputValue(), '2');
      await page.locator('button[onclick^="awardSecret("]').click();
      const value = await page.evaluate(() => {
        const old = JSON.stringify(store.scores);
        awardSecret(0);
        return {
          stable: old === JSON.stringify(store.scores),
          awarded: store.scores['سالم']?.points,
          owner: store.scores['أحمد']?.points,
          turn: state.turn,
        };
      });
      assert.equal(value.stable, true);
      assert.ok(value.awarded >= 10);
      assert.equal(value.owner, 10);
      assert.equal(value.turn, 1);
    },
  );
  await check(
    'Final textual secret guess is limited and reveals no private answer in active DOM',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        $('customword').value = 'عنقاء';
        hideSecret();
        secretReady();
        const privateDom = !$('app').innerText.includes('عنقاء');
        state.questions = state.questionLimit;
        renderSecret();
        $('secretGuessInput').value = 'خطأ';
        guessSecret();
        const stage = state.stage;
        guessSecret();
        return { privateDom, stage, final: state.finalGuessUsed };
      });
      assert.deepEqual(value, { privateDom: true, stage: 'result', final: true });
    },
  );
  await check(
    'Reaction false-only rounds earn zero, real next-button works, and decoy modals can restart',
    async (page) => {
      await page.evaluate(() => {
        setup('reaction');
        $('trials').value = '3';
        startReaction();
        reactionTap();
        reactionTap();
      });
      await page.locator('button[onclick^="advanceReaction("]').click();
      assert.equal(await page.evaluate(() => state.turn), 1);
      const value = await page.evaluate(() => {
        for (let i = 1; i < 3; i++) {
          reactionTap();
          reactionTap();
          advanceReaction();
        }
        const points = store.scores[state.players[0]].points;
        setup('reaction');
        $('reactionmode').value = 'focus';
        startReaction();
        state.stage = 'decoy';
        renderReaction();
        reactionTap();
        const falseStart = state.falseStart && state.last === 1500;
        advanceReaction();
        state.stage = 'decoy';
        renderReaction();
        openGuide('reaction');
        closeModal();
        return { points, falseStart, recovered: state.stage === 'idle' };
      });
      assert.deepEqual(value, { points: 0, falseStart: true, recovered: true });
    },
  );
  await check(
    'Oversize learned aliases fail visibly instead of disappearing after reload',
    async (page) => {
      const value = await page.evaluate(() => {
        teachItem();
        $('learnname').value = 'اسم اختبار فريد';
        for (let i = 0; i < 3; i++) $('learnhint' + i).value = 'تلميح ' + i;
        $('learnaliases').value = 'س'.repeat(51);
        const before = store.extra.learned.length;
        saveLearned(-1);
        return { stable: store.extra.learned.length === before, notice: $('toast').innerText };
      });
      assert.equal(value.stable, true);
      assert.match(value.notice, /50/);
      const boundary = await page.evaluate(() => {
        $('learnaliases').value = 'س'.repeat(50);
        saveLearned(-1);
        const added = items.find((item) => item.name === 'اسم اختبار فريد');
        return added?.aliases.includes('س'.repeat(50));
      });
      assert.equal(boundary, true, 'The maximum valid alias stays playable');
    },
  );
  await check(
    'Solo, duo and group entry points expose real controls and remain usable on small screens',
    async (page) => {
      await page.locator('.audience-choices button:nth-child(2)').click();
      assert.equal(await page.evaluate(() => filter), 'duo');
      assert.equal(
        await page.evaluate(() => filteredGames().every((g) => duoGameIds.has(g[0]))),
        true,
      );
      for (const id of ['solo', 'memory', 'ttt', 'mime', 'secret', 'reaction']) {
        await page.evaluate((id) => setup(id), id);
        assert.equal(await page.locator('#setupBlueprint').count(), 1);
        await page.locator('#setupBlueprint summary').click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          `${id}: mobile overflow`,
        );
      }
      await page.evaluate(() => {
        openSettings();
        openHelp();
      });
      assert.equal(await page.locator('.help-question').count(), 8);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`${passed} Lamma 8 core checks passed.`);
