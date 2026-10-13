import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
if (process.env.PARTY_SOURCE === '1') {
  const [script, css] = await Promise.all([
    readFile(new URL('../src/party.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/party.css', import.meta.url), 'utf8'),
  ]);
  html = html
    .replace(
      /\/\/ Source: src\/party\.js\n[\s\S]*?(?=\/\/ Source: src\/lab\.js)/,
      () => `// Source: src/party.js\n${script}\n`,
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
async function check(name, test) {
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
    await test(page);
    assert.deepEqual(errors, []);
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function layouts(page) {
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      `Overflow at ${width}px`,
    );
    assert.equal(await page.locator('.party-flow [aria-current="step"]').count(), 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

try {
  await check(
    'Two-captain relay preserves one time budget, secrets, scoring and private transfer',
    async (page) => {
      await page.evaluate(() => setup('teamcup'));
      await page.locator('#partyCycles').selectOption('3');
      await page.locator('#partyTeamFormat').selectOption('relay');
      await page.locator('#partyMimeDeck').selectOption('scenes');
      await click(page, "startPartyGame('teamcup')");
      const roles = await page.evaluate(() => teamCupInfo());
      assert.notEqual(roles.captain, roles.coCaptain);
      await click(page, 'teamCupBegin()');
      await click(page, "teamCupRecord('correct')");
      await click(page, 'teamCupBoost()');
      const prior = await page.evaluate(() => {
        window.oldRelayScore = document.querySelector(
          'button[onclick="teamCupRecord(\'correct\')"]',
        );
        window.oldRelayEnd = document.querySelector('button[onclick="teamCupEndTurn()"]');
        const snapshot = { card: state.card, score: state.turnScore, cardToken: state.cardToken };
        state.endAt = Date.now() + 24000;
        return snapshot;
      });
      await page.waitForFunction(() => state.stage === 'relay-handoff');
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      assert.equal(await page.evaluate(() => state.endAt), 0);
      assert.equal(await page.evaluate(() => timers.length), 0);
      const remaining = await page.evaluate(() => state.relayRemaining);
      assert.ok(remaining > 23000 && remaining <= 24000);
      await page.evaluate(() => {
        teamCupRecord('correct');
        teamCupUndo();
        teamCupEndTurn();
      });
      assert.equal(await page.evaluate(() => state.turnScore), 10);
      await page.evaluate(() => openSettings());
      await page.evaluate(() => teamCupRelayResume());
      assert.equal(await page.evaluate(() => state.stage), 'relay-handoff');
      await page.evaluate(() => closeModal());
      assert.equal(await page.evaluate(() => state.relayRemaining), remaining);
      await layouts(page);
      await click(page, 'teamCupRelayResume()');
      assert.notEqual(await page.evaluate(() => state.card), prior.card);
      assert.equal(await page.evaluate(() => state.relayRetiredCard), prior.card);
      assert.notEqual(await page.evaluate(() => state.cardToken), prior.cardToken);
      assert.equal(await page.evaluate(() => state.boostActive), true);
      assert.ok(await page.evaluate(() => state.endAt - Date.now() <= state.relayRemaining));
      assert.ok(await page.evaluate(() => state.endAt - Date.now() > state.relayRemaining - 1500));
      assert.match(await page.locator('.party-matchbar').innerText(), new RegExp(roles.coCaptain));
      await page.evaluate(() => {
        oldRelayScore.click();
        oldRelayEnd.click();
        teamCupUndo();
      });
      assert.deepEqual(
        await page.evaluate(() => [state.stage, state.turnScore, state.turnLog.length]),
        ['active', 10, 1],
      );
      await click(page, "teamCupRecord('correct')");
      assert.equal(await page.evaluate(() => state.turnScore), 30);
      await click(page, 'teamCupUndo()');
      assert.deepEqual(await page.evaluate(() => [state.turnScore, state.boostActive]), [10, true]);
      await click(page, "teamCupRecord('correct')");
      await click(page, 'teamCupEndTurn()');
      assert.deepEqual(await page.evaluate(() => state.history[0].captains), [
        roles.captain,
        roles.coCaptain,
      ]);
      assert.equal(await page.evaluate(() => state.history[0].relay), true);
      assert.equal(await page.evaluate(() => state.history[0].score), 30);
      await page.evaluate(() => teamCupEndTurn());
      assert.equal(await page.evaluate(() => state.history.length), 1);
      await layouts(page);
    },
  );

  await check(
    'Accusation and defense give every player a turn before an unchanged private ballot',
    async (page) => {
      await page.evaluate(() => setup('undercover'));
      await page.locator('#partyRounds').selectOption('1');
      await page.locator('#partyDuration').selectOption('0');
      await page.locator('#partyUndercoverCourt').selectOption('on');
      await click(page, "startPartyGame('undercover')");
      await page.evaluate(() => {
        state.pair = ['قهوة', 'شاي'];
      });
      for (let i = 0; i < 4; i++) {
        await click(page, 'undercoverReveal()');
        await click(page, 'undercoverHide()');
      }
      await click(page, 'undercoverDiscuss()');
      await click(page, 'undercoverStartVote()');
      assert.equal(await page.evaluate(() => state.stage), 'accusation');
      assert.equal(await page.evaluate(() => totalRounds()), 0);
      assert.equal(await page.locator('.party-word-reveal').count(), 0);
      for (let turn = 0; turn < 4; turn++) {
        const actor = await page.evaluate(() => state.clueOrder[state.accusationIndex]);
        assert.equal(await page.locator(`#courtTarget option[value="${actor}"]`).count(), 0);
        if (!turn)
          await page.evaluate(() => {
            window.oldAccusation = document.querySelector('button[onclick="undercoverAccuse()"]');
          });
        if (turn === 1) {
          await page.evaluate(() => oldAccusation.click());
          assert.equal(await page.evaluate(() => state.accusationIndex), 1);
        }
        await page.locator('#courtTarget').selectOption(String((actor + 1) % 4));
        if (!turn) {
          await click(page, 'undercoverAccuse()');
          assert.equal(await page.evaluate(() => state.accusationIndex), 0);
          await page.locator('#courtReason').fill('قهوة');
          await click(page, 'undercoverAccuse()');
          assert.equal(await page.evaluate(() => state.accusationIndex), 0);
        }
        await page.locator('#courtReason').fill(`تلميح غريب ${turn}`);
        if (turn === 2) {
          await page.evaluate(() => {
            openSettings();
            undercoverAccuse();
          });
          assert.equal(await page.evaluate(() => state.accusationIndex), 2);
          await page.evaluate(() => closeModal());
        }
        await click(page, 'undercoverAccuse()');
      }
      assert.equal(await page.evaluate(() => state.stage), 'defense');
      assert.equal(
        await page.evaluate(() => new Set(state.accusations.map((item) => item.player)).size),
        4,
      );
      assert.equal(await page.evaluate(() => new Set(state.defenseCandidates).size), 4);
      assert.equal(await page.evaluate(() => totalRounds()), 0);
      await layouts(page);
      for (let turn = 0; turn < 4; turn++) {
        if (!turn) {
          await page.locator('#courtDefense').fill('شاي');
          await click(page, 'undercoverDefend()');
          assert.equal(await page.evaluate(() => state.defenseIndex), 0);
          await page.evaluate(() => {
            undercoverStartVote();
            window.oldDefense = document.querySelector('button[onclick="undercoverDefend()"]');
          });
          assert.equal(await page.evaluate(() => state.stage), 'defense');
        }
        if (turn === 1) {
          await page.evaluate(() => oldDefense.click());
          assert.equal(await page.evaluate(() => state.defenseIndex), 1);
        }
        if (turn === 3) await click(page, 'undercoverDefend(true)');
        else {
          await page.locator('#courtDefense').fill(`<b>زاوية أخرى ${turn}</b>`);
          await click(page, 'undercoverDefend()');
        }
      }
      assert.equal(await page.evaluate(() => state.stage), 'vote-handoff');
      assert.equal(await page.evaluate(() => state.courtCompleted), true);
      assert.equal(
        await page.evaluate(() => new Set(state.defenses.map((item) => item.player)).size),
        4,
      );
      assert.equal(await page.locator('.party-word-reveal').count(), 0);
      assert.equal(await page.evaluate(() => totalRounds()), 0);
      const hidden = await page.evaluate(() => state.hidden[0]);
      for (let voter = 0; voter < 4; voter++) {
        await click(page, 'undercoverOpenVote()');
        await click(page, `undercoverChoose(${voter === hidden ? -1 : hidden})`);
        await click(page, 'undercoverConfirmVote()');
      }
      assert.equal(await page.evaluate(() => state.stage), 'round-result');
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      assert.equal(await page.locator('.party-court-trail p b b').count(), 0);
      assert.equal(await page.evaluate(() => state.history[0].accusations.length), 4);
      assert.equal(await page.evaluate(() => state.history[0].defenses.length), 4);
      assert.deepEqual(
        await page.evaluate(() =>
          state.roundPoints.map((points, i) =>
            state.hidden.includes(i) ? points === 0 : points === 30,
          ),
        ),
        [true, true, true, true],
      );
      await click(page, 'undercoverAdvance()');
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.court), true);
      assert.equal(await page.evaluate(() => state.accusations.length), 0);
    },
  );

  await check(
    'Everyone can abstain from public accusation; the final secret ballot still has one runoff',
    async (page) => {
      const report = await page.evaluate(() => {
        store.players.pop();
        save();
        setup('undercover');
        document.getElementById('partyRounds').value = '1';
        document.getElementById('partyDuration').value = '0';
        document.getElementById('partyUndercoverCourt').value = 'on';
        startPartyGame('undercover');
        for (let i = 0; i < 3; i++) {
          undercoverReveal();
          undercoverHide();
        }
        undercoverDiscuss();
        undercoverStartVote();
        for (let i = 0; i < 3; i++) undercoverAccuse();
        const afterCourt = {
          stage: state.stage,
          defenses: state.defenses.length,
          scores: totalRounds(),
        };
        for (let ballot = 0; ballot < 2; ballot++) {
          for (let voter = 0; voter < 3; voter++) {
            undercoverOpenVote();
            undercoverChoose((voter + 1) % 3);
            undercoverConfirmVote();
          }
          if (!ballot) undercoverRunoff();
        }
        return {
          afterCourt,
          stage: state.stage,
          accusations: state.accusations.length,
          rounds: totalRounds(),
          normalWin: state.history[0].normalWin,
        };
      });
      assert.deepEqual(report.afterCourt, { stage: 'vote-handoff', defenses: 0, scores: 0 });
      assert.equal(report.stage, 'round-result');
      assert.equal(report.accusations, 3);
      assert.equal(report.rounds, 3);
      assert.equal(report.normalWin, false);
    },
  );

  await check(
    'Three-writer stories combine seven-word and inspiration constraints with ranked ballots',
    async (page) => {
      const report = await page.evaluate(() => {
        store.players.pop();
        save();
        setup('improv');
        document.getElementById('partyRounds').value = '3';
        document.getElementById('partyCreativeMode').value = 'chain';
        document.getElementById('partyCreativeFormat').value = 'seven';
        document.getElementById('partyCreativeSpark').value = 'on';
        document.getElementById('partyCreativeBallot').value = 'ranked';
        startPartyGame('improv');
        for (let round = 0; round < 3; round++) {
          creativeStartAnswers();
          for (let count = 0; count < 3; count++) {
            creativeOpenAnswer();
            document.getElementById('creativeAnswer').value =
              `هذه ${state.chainBridge} ${state.sparkWord} فكرة جديدة جميلة ${round}-${count}`;
            creativeSubmit();
          }
          creativeStartVoting();
          for (let voter = 0; voter < 3; voter++) {
            creativeOpenVote();
            creativeChoose(
              state.entries.findIndex((entry) => entry.author === (state.voteIndex + 1) % 3),
            );
            creativeChooseSecond(
              state.entries.findIndex((entry) => entry.author === (state.voteIndex + 2) % 3),
            );
            creativeConfirmVote();
          }
          creativeAdvance();
        }
        return {
          done: state.done,
          points: Object.values(state.results),
          rounds: totalRounds(),
          lines: state.history.map((round) => round.story.length),
        };
      });
      assert.equal(report.done, true);
      assert.deepEqual(report.points, [66, 66, 66]);
      assert.equal(report.rounds, 3);
      assert.deepEqual(report.lines, [3, 3, 3]);
      await layouts(page);
    },
  );

  await check(
    'Story chain hides author history, enforces connections and reveals one ordered collaborative story',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyRounds').selectOption('3');
      await page.locator('#partyCreativeMode').selectOption('chain');
      await click(page, "startPartyGame('improv')");
      assert.equal(await page.evaluate(() => partyStoryStarts.length), 24);
      const previousPrompt = await page.evaluate(() => state.prompt);
      await click(page, 'creativeRefreshPrompt()');
      assert.notEqual(await page.evaluate(() => state.prompt), previousPrompt);
      for (let round = 0; round < 3; round++) {
        await click(page, 'creativeStartAnswers()');
        const texts = [];
        for (let count = 0; count < 4; count++) {
          assert.equal(await page.locator('.party-chain-brief blockquote').count(), 0);
          await click(page, 'creativeOpenAnswer()');
          const bridge = await page.evaluate(() => state.chainBridge);
          assert.ok(bridge.length);
          if (count)
            assert.equal(
              await page.locator('.party-chain-brief blockquote').innerText(),
              texts.at(-1),
            );
          if (!round && !count) {
            await page.locator('#creativeAnswer').fill('أحداث جديدة بدون ربط');
            await click(page, 'creativeSubmit()');
            assert.equal(await page.evaluate(() => state.entries.length), 0);
          }
          const text = `تابعنا ${bridge} في مغامرة ${round} ${count} جميلة`;
          texts.push(text);
          await page.locator('#creativeAnswer').fill(text);
          if (!round && !count) {
            await page.evaluate(() => openSettings());
            assert.equal(await page.locator('.party-chain-brief blockquote').count(), 0);
            await page.evaluate(() => closeModal());
            await click(page, 'creativeOpenAnswer()');
            assert.equal(await page.locator('#creativeAnswer').inputValue(), text);
            await click(page, 'creativePreview()');
            await layouts(page);
          }
          await click(page, 'creativeSubmit()');
          assert.equal(await page.evaluate(() => state.entries.length), count + 1);
        }
        assert.deepEqual(
          await page.evaluate(() => state.entries.map((entry) => entry.text)),
          texts,
        );
        assert.equal(await page.locator('.party-shared-story small').count(), 0);
        assert.equal(
          await page.evaluate(() =>
            state.players.some((name) =>
              document.querySelector('.party-shared-story').textContent.includes(name),
            ),
          ),
          false,
        );
        await layouts(page);
        await click(page, 'creativeStartVoting()');
        for (let count = 0; count < 4; count++) {
          await click(page, 'creativeOpenVote()');
          const target = await page.evaluate(() =>
            state.entries.findIndex((entry) => entry.author === (state.voteIndex + 1) % 4),
          );
          await click(page, `creativeChoose(${target})`);
          await click(page, 'creativeConfirmVote()');
        }
        assert.equal(await page.evaluate(() => state.history.at(-1).story.length), 4);
        assert.deepEqual(
          await page.evaluate(() => state.history.at(-1).entries.map((entry) => entry.points)),
          [20, 20, 20, 20],
        );
        assert.equal(await page.locator('.party-shared-story small').count(), 4);
        await page.evaluate(() => creativeTally());
        assert.equal(await page.evaluate(() => state.history.length), round + 1);
        await click(page, 'creativeAdvance()');
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.deepEqual(await page.evaluate(() => Object.values(state.results)), [60, 60, 60, 60]);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      assert.equal(await page.locator('.party-story-book article').count(), 3);
      await layouts(page);
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.creativeMode), 'chain');
      assert.equal(await page.evaluate(() => state.entries.length), 0);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
