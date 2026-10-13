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
    'Sealed number verifies truthful replies, rejects premature wins, and never persists the secret',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('finder');
        $('min').value = '1';
        $('max').value = '100';
        $('finderRule').value = 'sealed';
        startNumber('finder');
        const token = state.privateToken;
        $('finderPrivateInput').value = '97';
        sealFinder(token);
        const hidden = !$('app').innerText.includes('97') && !$('finderPrivateInput');
        const attempt = state.attempt;
        finderAnswer('correct');
        finderAnswer('lower');
        const rejected = !state.done && state.attempt === attempt && state.history.length === 0;
        while (!state.done)
          finderAnswer(state.guess === 97n ? 'correct' : state.guess < 97n ? 'higher' : 'lower');
        const rounds = store.scores[state.name].rounds;
        finderAnswer('correct');
        return {
          hidden,
          rejected,
          done: state.done,
          rounds,
          stable: store.scores[state.name].rounds === rounds,
          notSaved: !store.extra.savedSession,
        };
      });
      assert.deepEqual(value, {
        hidden: true,
        rejected: true,
        done: true,
        rounds: 1,
        stable: true,
        notSaved: true,
      });
    },
  );
  await check(
    'Three-lock mission banks rewards until the final lock and stale review actions cannot mutate it',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('solo');
        $('numberQuest').value = 'locks';
        startNumber('solo');
        const snapshots = [];
        for (let i = 0; i < 3; i++) {
          $('guessInput').value = state.secret.toString();
          guessSolo();
          snapshots.push({ rounds: store.scores[state.name]?.rounds || 0, stage: state.lockStage });
          if (i < 2) {
            const version = state.lockVersion;
            hintSolo();
            guessSolo();
            revealSolo();
            toggleSoloPad();
            nextSoloLock(version);
            nextSoloLock(version);
          }
        }
        const points = store.scores[state.name].points;
        guessSolo();
        nextSoloLock();
        return {
          snapshots,
          points,
          rounds: store.scores[state.name].rounds,
          locks: state.lockResults.length,
          done: state.done,
        };
      });
      assert.deepEqual(value.snapshots, [
        { rounds: 0, stage: 'review' },
        { rounds: 0, stage: 'review' },
        { rounds: 1, stage: 'finished' },
      ]);
      assert.equal(value.points, 100);
      assert.equal(value.rounds, 1);
      assert.equal(value.locks, 3);
      assert.equal(value.done, true);
    },
  );
  await check(
    'Unfinished lock mission ends once with partial reward and rejects tiny ranges before replacing setup',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('solo');
        $('numberQuest').value = 'locks';
        $('min').value = '1';
        $('max').value = '2';
        startNumber('solo');
        const tiny = screen === 'setup';
        $('max').value = '100';
        startNumber('solo');
        $('guessInput').value = state.secret.toString();
        guessSolo();
        nextSoloLock();
        revealSolo();
        const points = store.scores[state.name].points;
        revealSolo();
        return { tiny, points, rounds: store.scores[state.name].rounds, done: state.done };
      });
      assert.deepEqual(value, { tiny: true, points: 33, rounds: 1, done: true });
    },
  );
  await check(
    'Investigation lets the player choose an informative question and undo restores that question',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mind');
        $('mindStyle').value = 'investigate';
        startMind();
        const options = mindQuestionOptions();
        const q = options.find((v) => v.q !== state.q).q;
        const count = state.candidates.length;
        selectMindQuestion(q);
        const selected = state.q === q && state.answers === 0;
        mindAnswer('yes');
        const valid = state.candidates.every((i) => items[i].tags.has(questions[q][0]));
        undoMind();
        return { selected, valid, restored: state.q === q && state.candidates.length === count };
      });
      assert.deepEqual(value, { selected: true, valid: true, restored: true });
    },
  );
  await check(
    'Suspect notebook is player-authored, preserves typed guesses, and cannot bypass expert mode',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('who');
        startWho();
        whoCandidates();
        $('whoInput').value = 'مسودة محفوظة';
        const i = state.pool[0],
          before = state.attempt;
        toggleWhoSuspect(i);
        searchWhoSuspects(items[i].name);
        const draft = $('whoInput').value;
        useWhoSuspect(i);
        const excluded = $('whoInput').value === 'مسودة محفوظة';
        toggleWhoSuspect(i);
        useWhoSuspect(i);
        const selected = $('whoInput').value === items[i].name;
        const noGuess = state.attempt === before;
        setup('who');
        $('whoLevel').value = 'hard';
        startWho();
        whoCandidates();
        toggleWhoSuspect(i);
        return {
          draft,
          excluded,
          selected,
          noGuess,
          expert: !state.listOpen && !document.querySelector('.suspect-notebook'),
        };
      });
      assert.deepEqual(value, {
        draft: 'مسودة محفوظة',
        excluded: true,
        selected: true,
        noGuess: true,
        expert: true,
      });
    },
  );
  await check(
    'Memory duel passes only after mismatch, keeps successful turns, and records both players once',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        $('memoryplay').value = 'duo';
        memoryPlayChanged();
        startMemory();
        const pairs = [...new Set(state.deck)].map((symbol) =>
          state.deck.map((v, i) => (v === symbol ? i : -1)).filter((i) => i >= 0),
        );
        const oldVersion = state.memoryVersion;
        flipCard(pairs[0][0]);
        flipCard(pairs[1][0]);
        const locked = state.locked && state.memoryTurn === 0;
        state.endAt = Date.now() - 1;
        hideMemoryCards(state);
        const passed = state.memoryTurn === 1;
        const before = state.up.length;
        flipCard(pairs[2][0], oldVersion, 0);
        const stale = state.up.length === before;
        for (const [a, b] of pairs) {
          flipCard(a);
          flipCard(b);
        }
        const rows = state.players.map((name) => store.scores[name]);
        flipCard(0);
        return {
          locked,
          passed,
          stale,
          counts: state.matchCounts,
          rows,
          done: state.done,
          stable: state.players.every((name) => store.scores[name].rounds === 1),
        };
      });
      assert.equal(value.locked, true);
      assert.equal(value.passed, true);
      assert.equal(value.stale, true);
      assert.deepEqual(value.counts, [0, 4]);
      assert.deepEqual(value.rows, [
        { points: 0, rounds: 1 },
        { points: 100, rounds: 1 },
      ]);
      assert.equal(value.done, true);
      assert.equal(value.stable, true);
    },
  );
  await check(
    'Story MIME needs three scenes, limits skips and gives its full completion bonus after a broken streak',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mime');
        $('mimerule').value = 'story';
        startMime();
        mimeReady();
        const first = state.sceneRule;
        mimeAnswer(true);
        mimeAnswer(false);
        const second = state.sceneRule;
        mimeAnswer(true);
        mimeAnswer(true);
        const score = state.score;
        endMime();
        const rounds = store.scores[state.players[0]].rounds;
        advanceMime();
        mimeReady();
        for (let i = 0; i < 4; i++) mimeAnswer(false);
        return { first, second, score, rounds, stage: state.stage, skips: state.skips };
      });
      assert.notEqual(value.first, value.second);
      assert.equal(value.score, 38);
      assert.equal(value.rounds, 1);
      assert.equal(value.stage, 'active');
      assert.equal(value.skips, 3);
    },
  );
  await check(
    'Secret relay requires a real question, rotates guess ownership, and keeps the secret off the public screen',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('secret');
        $('secretRule').value = 'relay';
        startSecret();
        revealSecret();
        $('customword').value = 'سفينة';
        hideSecret();
        secretReady();
        secretQuestion('yes');
        const blocked = state.questions === 0;
        secretStarter(0, state.turn, state.questionSerial);
        secretQuestion('yes');
        const asked = state.questions === 1 && state.questionAuthors[0] === 1;
        $('secretGuessInput').value = 'سفينة';
        $('secretGuesser').value = '1';
        guessSecret();
        const wrongActor = state.stage === 'active';
        $('secretGuesser').value = '2';
        guessSecret();
        const won = state.stage === 'award';
        return { blocked, asked, wrongActor, won, questions: state.questions };
      });
      assert.deepEqual(value, {
        blocked: true,
        asked: true,
        wrongActor: true,
        won: true,
        questions: 1,
      });
    },
  );
  await check(
    'Choice reaction evaluates the actual direction, keyboard decisions and stale response buttons',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('reaction');
        $('reactionrule').value = 'choice';
        startReaction();
        state.stage = 'ready';
        state.requiredSide = 0;
        state.readyAt = performance.now() - 250;
        renderReaction();
        reactionChoice(1);
        const wrong = state.wrongDirection && state.last === 1500;
        advanceReaction();
        const turn = state.turn;
        reactionChoice(0, turn - 1, 'ready');
        const stale = state.stage === 'idle';
        state.stage = 'ready';
        state.requiredSide = 1;
        state.readyAt = performance.now() - 220;
        renderReaction();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        return {
          wrong,
          stale,
          correct: !state.falseStart && state.last >= 210 && state.last < 1000,
          records: state.records[state.players[0]].length,
        };
      });
      assert.deepEqual(value, { wrong: true, stale: true, correct: true, records: 2 });
    },
  );
  await check(
    'Space activates focused reaction controls without swallowing pause or next actions',
    async (page) => {
      await page.evaluate(() => {
        setup('reaction');
        $('reactionrule').value = 'choice';
        startReaction();
      });
      await page.locator('button[onclick="showPause()"]').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#pausecover').count(), 1);
      await page.evaluate(() => resumeGame());
      await page.evaluate(() => {
        state.stage = 'ready';
        state.requiredSide = 0;
        state.readyAt = performance.now() - 250;
        renderReaction();
      });
      await page.locator('.reaction-directions button').first().focus();
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => state.stage), 'result');
      assert.equal(await page.evaluate(() => state.falseStart), false);
      await page.locator('button[onclick^="advanceReaction("]').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => state.turn), 1);
      assert.equal(await page.evaluate(() => state.stage), 'idle');
    },
  );
  await check(
    'All core variants and their instructions remain readable at 320px offline',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await page.context().setOffline(true);
      for (const [id, option, value] of [
        ['finder', 'finderRule', 'sealed'],
        ['solo', 'numberQuest', 'locks'],
        ['mind', 'mindStyle', 'investigate'],
        ['memory', 'memoryplay', 'duo'],
        ['reaction', 'reactionrule', 'choice'],
        ['mime', 'mimerule', 'story'],
        ['secret', 'secretRule', 'relay'],
      ]) {
        await page.evaluate(
          ({ id, option, value }) => {
            setup(id);
            $(option).value = value;
            if (id === 'memory') memoryPlayChanged();
            const starts = {
              finder: () => startNumber('finder'),
              solo: () => startNumber('solo'),
              mind: startMind,
              memory: startMemory,
              reaction: startReaction,
              mime: startMime,
              secret: startSecret,
            };
            starts[id]();
          },
          { id, option, value },
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          `${id}: overflow`,
        );
      }
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Core v9: ${passed} browser checks passed.`);
