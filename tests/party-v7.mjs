import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
if (process.env.PARTY_SOURCE === '1') {
  const [party, css] = await Promise.all([
    readFile(new URL('../src/party.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/party.css', import.meta.url), 'utf8'),
  ]);
  html = html
    .replace(
      /\/\/ Source: src\/party\.js\n[\s\S]*?(?=\/\/ Source: src\/lab\.js)/,
      () => `// Source: src/party.js\n${party}\n`,
    )
    .replace('</style>', () => `${css}\n</style>`);
}
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const url = `http://127.0.0.1:${server.address().port}`;
const click = (page, action) => page.locator(`#app button[onclick="${action}"]`).last().click();
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      save();
    });
    await context.setOffline(true);
    await run(page);
    assert.deepEqual(errors, []);
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  );
  assert.equal(await page.locator('.party-flow [aria-current="step"]').count(), 1);
}

try {
  await check('Team boost scores once, survives undo and protects hidden cards', async (page) => {
    await page.evaluate(() => setup('teamcup'));
    await click(page, "startPartyGame('teamcup')");
    await click(page, 'teamCupBegin()');
    await noOverflow(page);
    await click(page, 'teamCupBoost()');
    assert.equal(await page.evaluate(() => state.boostActive), true);
    await page.evaluate(() => {
      const button = document.querySelector('button[onclick="teamCupRecord(\'correct\')"]');
      button.click();
      button.click();
      teamCupBoost();
    });
    assert.equal(await page.evaluate(() => state.turnScore), 20);
    assert.equal(await page.evaluate(() => state.turnLog[0].boosted), true);
    await page.evaluate(() => {
      partyHidePrivate();
      teamCupUndo();
    });
    assert.equal(await page.evaluate(() => state.turnScore), 20);
    assert.equal(await page.locator('.party-secret-word').count(), 0);
    await click(page, 'teamCupToggleCard()');
    await click(page, 'teamCupUndo()');
    assert.deepEqual(
      await page.evaluate(() => [state.turnScore, state.boostUsed, state.boostActive]),
      [0, true, true],
    );
    await click(page, "teamCupRecord('skip')");
    assert.equal(await page.evaluate(() => state.turnScore), -4);
    await click(page, 'teamCupUndo()');
    await click(page, "teamCupRecord('correct')");
    await click(page, 'teamCupEndTurn()');
    await page.evaluate(() => teamCupEndTurn());
    assert.equal(await page.evaluate(() => state.history.length), 1);
    assert.equal(await page.evaluate(() => state.history[0].boosts), 1);
    assert.equal(await page.locator('.party-metrics').count(), 1);
    await page.evaluate(() => {
      state.turn = 4;
      teamCupHandoff();
    });
    await click(page, 'teamCupBegin()');
    await click(page, 'teamCupBoost()');
    const wrong = await page.evaluate(() =>
      state.choices.findIndex((c) => c !== state.card.answer),
    );
    await click(page, `teamCupTrivia(${wrong})`);
    assert.equal(await page.evaluate(() => state.turnScore), -10);
    await click(page, 'teamCupTriviaNext()');
    assert.equal(await page.evaluate(() => state.boostActive), false);
    assert.equal(await page.locator('button[onclick="teamCupBoost()"]').count(), 0);
    const correct = await page.evaluate(() => state.choices.indexOf(state.card.answer));
    await click(page, `teamCupTrivia(${correct})`);
    assert.equal(await page.evaluate(() => state.turnScore), 0);
    await noOverflow(page);
  });

  await check(
    'Public clue diary respects speaker order, privacy, pause and stale taps',
    async (page) => {
      await page.evaluate(() => setup('undercover'));
      await page.locator('#partyDuration').selectOption('0');
      await click(page, "startPartyGame('undercover')");
      for (let player = 0; player < 4; player++) {
        if (!player)
          await page.evaluate(() => {
            window.oldSecretHandoff = document.querySelector(
              'button[onclick="undercoverReveal()"]',
            );
          });
        if (player === 1) {
          await page.evaluate(() => oldSecretHandoff.click());
          assert.equal(await page.evaluate(() => state.stage), 'reveal-handoff');
          assert.equal(await page.locator('.party-secret-word').count(), 0);
        }
        await click(page, 'undercoverReveal()');
        await click(page, 'undercoverHide()');
      }
      await click(page, 'undercoverDiscuss()');
      const first = await page.evaluate(() => state.clueOrder[0]);
      const ownWord = await page.evaluate(() =>
        state.hidden.includes(state.clueOrder[0]) ? state.pair[1] : state.pair[0],
      );
      await page.locator('#undercoverClue').fill(ownWord);
      await click(page, 'undercoverNextClue()');
      assert.equal(await page.evaluate(() => state.clueIndex), 0);
      await page.locator('#undercoverClue').fill('<b>وصف خيالي لطيف</b>');
      await page.evaluate(() => {
        const button = document.querySelector('button[onclick="undercoverNextClue()"]');
        button.click();
        button.click();
      });
      assert.equal(await page.evaluate(() => state.clueIndex), 1);
      assert.equal(await page.evaluate(() => state.clues[0].player), first);
      assert.equal(await page.locator('.party-clue-trail p > span b').count(), 0);
      assert.match(await page.locator('.party-clue-trail').innerText(), /<b>وصف خيالي لطيف<\/b>/u);
      await page.locator('#undercoverClue').fill('تلميح ينتظر');
      await page.evaluate(() => {
        openSettings();
        undercoverNextClue();
      });
      assert.equal(await page.evaluate(() => state.clueIndex), 1);
      await page.evaluate(() => closeModal());
      assert.equal(await page.locator('#undercoverClue').inputValue(), 'تلميح ينتظر');
      await click(page, 'undercoverNextClue()');
      for (let i = 2; i < 4; i++) await click(page, 'undercoverNextClue()');
      assert.equal(await page.evaluate(() => new Set(state.clues.map((c) => c.player)).size), 4);
      assert.equal(
        await page.evaluate(() => state.clueOrder[1]),
        await page.evaluate(() => {
          const cycle = Math.floor(state.clueIndex / state.players.length);
          return [...state.clueOrder.slice(cycle), ...state.clueOrder.slice(0, cycle)][0];
        }),
      );
      await noOverflow(page);
      await click(page, 'undercoverStartVote()');
      assert.equal(await page.locator('.party-clue-trail').count(), 0);
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      await click(page, 'undercoverOpenVote()');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.party-ballots').count(), 0);
      for (let voter = 0; voter < 4; voter++) {
        await click(page, 'undercoverOpenVote()');
        if (voter === 1) {
          await page.evaluate(() => oldBallotChoice.click());
          assert.equal(await page.evaluate(() => state.voteChoice), null);
        }
        const target = voter === 0 ? 2 : (voter + 1) % 4;
        await click(page, `undercoverChoose(${target})`);
        if (!voter)
          await page.evaluate(() => {
            window.oldBallotChoice = document.querySelector(
              'button[onclick="undercoverChoose(2)"]',
            );
            window.oldBallotConfirm = document.querySelector(
              'button[onclick="undercoverConfirmVote()"]',
            );
          });
        if (voter === 1) {
          await page.evaluate(() => oldBallotConfirm.click());
          assert.equal(await page.evaluate(() => state.votes.length), 1);
        }
        await click(page, 'undercoverConfirmVote()');
      }
      assert.equal(await page.evaluate(() => state.stage), 'round-result');
      assert.equal(await page.locator('.party-clue-trail').count(), 1);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      await page.evaluate(() => finishUndercoverRound(state.hidden[0]));
      assert.equal(await page.evaluate(() => totalRounds()), 4);
    },
  );

  await check(
    'Creative review preserves drafts, rotates every role and rejects stale submit buttons',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyRounds').selectOption('3');
      await click(page, "startPartyGame('improv')");
      for (let round = 0; round < 3; round++) {
        await click(page, 'creativeStartAnswers()');
        assert.equal(await page.evaluate(() => state.answerIndex), round % 4);
        for (let count = 0; count < 4; count++) {
          await click(page, 'creativeOpenAnswer()');
          assert.equal(await page.evaluate(() => state.answerIndex), (round + count) % 4);
          const answer = `فكرة خيالية ${round}-${count}`;
          await page.locator('#creativeAnswer').fill(answer);
          if (!round && !count) {
            await click(page, 'creativePreview()');
            assert.equal(await page.locator('#creativeAnswer').count(), 0);
            assert.equal(await page.locator('.party-answer-preview').innerText(), answer);
            await page.evaluate(() => openSettings());
            assert.equal(await page.locator('.party-answer-preview').count(), 0);
            await page.evaluate(() => closeModal());
            await click(page, 'creativeOpenAnswer()');
            assert.equal(await page.locator('#creativeAnswer').inputValue(), answer);
            await click(page, 'creativePreview()');
            await click(page, 'creativeEditAnswer()');
            assert.equal(await page.locator('#creativeAnswer').inputValue(), answer);
            await click(page, 'creativePreview()');
            await page.evaluate(() => {
              window.oldCreativeSubmit = document.querySelector(
                'button[onclick="creativeSubmit()"]',
              );
            });
            await noOverflow(page);
          }
          if (!round && count === 1) {
            await page.evaluate(() => oldCreativeSubmit.click());
            assert.equal(await page.evaluate(() => state.entries.length), 1);
            assert.equal(await page.locator('#creativeAnswer').inputValue(), answer);
          }
          await click(page, 'creativeSubmit()');
          await page.evaluate(() => creativeSubmit());
          assert.equal(await page.evaluate(() => state.entries.length), count + 1);
        }
        assert.equal(
          await page.evaluate(() => new Set(state.entries.map((e) => e.author)).size),
          4,
        );
        assert.ok(
          await page.evaluate(() =>
            state.players.every(
              (name) => !document.querySelector('.party-creative-cards').textContent.includes(name),
            ),
          ),
        );
        await click(page, 'creativeStartVoting()');
        for (let count = 0; count < 4; count++) {
          assert.equal(await page.evaluate(() => state.voteIndex), (round + count) % 4);
          await click(page, 'creativeOpenVote()');
          const target = await page.evaluate(() => {
            creativeChoose(state.entries.findIndex((entry) => entry.author === state.voteIndex));
            if (state.voteChoice !== null) throw new Error('A self-vote was accepted');
            return state.entries.findIndex((entry) => entry.author === (state.voteIndex + 1) % 4);
          });
          await click(page, `creativeChoose(${target})`);
          await click(page, 'creativeConfirmVote()');
          await page.evaluate(() => creativeConfirmVote());
        }
        await page.evaluate(() => creativeTally());
        assert.equal(await page.evaluate(() => state.history.length), round + 1);
        await click(page, 'creativeAdvance()');
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      assert.deepEqual(await page.evaluate(() => Object.values(state.results)), [45, 45, 45, 45]);
      assert.equal(await page.locator('.party-creative-recap section').count(), 3);
      await page.evaluate(() => finishPartySession('improv', 'تكرار', true));
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      for (const width of [320, 390, 768, 1366]) {
        await page.setViewportSize({ width, height: 844 });
        await noOverflow(page);
      }
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
