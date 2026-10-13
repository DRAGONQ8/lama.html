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
    'Scene tournament tracks combos, undo and old phase buttons without duplicate awards',
    async (page) => {
      await page.evaluate(() => setup('teamcup'));
      await page.locator('#partyCycles').selectOption('3');
      await page.locator('#partyMimeDeck').selectOption('scenes');
      await page.locator('#partyTeamTactic').selectOption('streak');
      await click(page, "startPartyGame('teamcup')");
      await page.evaluate(() => {
        window.oldTeamBegin = document.querySelector('button[onclick="teamCupBegin()"]');
      });
      await click(page, 'teamCupBegin()');
      assert.equal(await page.evaluate(() => state.decks.mime.length), 48);
      assert.equal(await page.locator('.party-scene').count(), 1);
      await page.evaluate(() => {
        teamCupRecord('correct');
        teamCupRecord('correct');
        teamCupBoost();
        teamCupRecord('correct');
      });
      assert.deepEqual(
        await page.evaluate(() => [state.turnScore, state.streak, state.comboPoints]),
        [45, 3, 5],
      );
      await click(page, 'teamCupUndo()');
      assert.deepEqual(
        await page.evaluate(() => [
          state.turnScore,
          state.streak,
          state.comboPoints,
          state.boostActive,
        ]),
        [20, 2, 0, true],
      );
      await page.evaluate(() => {
        teamCupRecord('correct');
        teamCupRecord('skip');
        window.oldTeamEnd = document.querySelector('button[onclick="teamCupEndTurn()"]');
      });
      assert.deepEqual(
        await page.evaluate(() => [state.turnScore, state.streak, state.bestStreak]),
        [43, 0, 3],
      );
      await page.evaluate(() => {
        openSettings();
        teamCupRecord('correct');
      });
      assert.equal(await page.evaluate(() => state.turnScore), 43);
      await page.evaluate(() => closeModal());
      await click(page, 'teamCupEndTurn()');
      assert.equal(await page.evaluate(() => state.history[0].comboPoints), 5);
      await click(page, 'teamCupAdvance()');
      await page.evaluate(() => oldTeamBegin.click());
      assert.equal(await page.evaluate(() => state.stage), 'handoff');
      await click(page, 'teamCupBegin()');
      await page.evaluate(() => oldTeamEnd.click());
      assert.equal(await page.evaluate(() => state.stage), 'active');
      await layouts(page);
      await page.evaluate(() => {
        teamCupEndTurn();
        teamCupAdvance();
        while (!state.done) {
          teamCupBegin();
          if (state.mode === 'trivia') teamCupTrivia(state.choices.indexOf(state.card.answer));
          else teamCupRecord('correct');
          teamCupEndTurn();
          teamCupAdvance();
        }
      });
      assert.equal(await page.evaluate(() => state.history.length), 6);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      await page.evaluate(() => {
        finishTeamCup();
        teamCupBegin();
        teamCupEndTurn();
      });
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      assert.equal(await page.locator('.party-debrief').count(), 1);
      await layouts(page);
      const teams = await page.evaluate(() => state.teams);
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.stage), 'handoff');
      assert.deepEqual(await page.evaluate(() => state.teams), teams);
      assert.deepEqual(
        await page.evaluate(() => [state.mimeDeck, state.teamTactic, state.cycles]),
        ['scenes', 'streak', 3],
      );
      assert.equal(await page.evaluate(() => totalRounds()), 4);
    },
  );

  await check(
    'Undercover interrogation shares evidence safely and stores confidence only after all ballots',
    async (page) => {
      await page.evaluate(() => setup('undercover'));
      await page.locator('#partyRounds').selectOption('1');
      await page.locator('#partyDuration').selectOption('0');
      await page.locator('#partyClueRounds').selectOption('1');
      await click(page, "startPartyGame('undercover')");
      await page.evaluate(() => {
        state.pair = ['قهوة', 'شاي'];
      });
      for (let i = 0; i < 4; i++) {
        await click(page, 'undercoverReveal()');
        await click(page, 'undercoverHide()');
      }
      await click(page, 'undercoverDiscuss()');
      assert.equal(await page.locator('.party-clue-lens').count(), 1);
      for (let i = 0; i < 4; i++) {
        await page.locator('#undercoverClue').fill(`وصف مشترك ${i}`);
        await click(page, 'undercoverNextClue()');
      }
      await click(page, 'undercoverBeginInquiry()');
      await page.locator('#undercoverQuestion').fill('كيف يبدو مكانه الطبيعي؟');
      await page.locator('#undercoverReply').fill('قهوة');
      await click(page, 'undercoverRecordInquiry()');
      assert.equal(await page.evaluate(() => state.questions.length), 0);
      await page.locator('#undercoverReply').fill('<b>مكان هادئ</b>');
      await page.evaluate(() => {
        window.oldInquiry = document.querySelector('button[onclick="undercoverRecordInquiry()"]');
      });
      await click(page, 'undercoverRecordInquiry()');
      assert.equal(await page.evaluate(() => state.questions.length), 1);
      assert.equal(await page.locator('.party-question-trail span b').count(), 0);
      await page.evaluate(() => oldInquiry.click());
      assert.equal(await page.evaluate(() => state.questionIndex), 1);
      await page.locator('#undercoverQuestion').fill('هل يستخدم غالباً في الخارج؟');
      await page.locator('#undercoverReply').fill('ليس بالضرورة');
      await page.evaluate(() => {
        openSettings();
        undercoverRecordInquiry();
      });
      assert.equal(await page.evaluate(() => state.questions.length), 1);
      await page.evaluate(() => closeModal());
      await click(page, 'undercoverRecordInquiry()');
      await click(page, 'undercoverSkipInquiry()');
      await click(page, 'undercoverSkipInquiry()');
      assert.equal(await page.evaluate(() => state.questionIndex), 4);
      assert.equal(await page.evaluate(() => new Set(state.questions.map((q) => q.asker)).size), 2);
      await layouts(page);
      await click(page, 'undercoverStartVote()');
      assert.equal(await page.locator('.party-question-trail').count(), 0);
      const hidden = await page.evaluate(() => state.hidden[0]);
      for (let voter = 0; voter < 4; voter++) {
        await click(page, 'undercoverOpenVote()');
        await click(page, `undercoverChoose(${voter === hidden ? (voter + 1) % 4 : hidden})`);
        await click(page, 'undercoverConfidence(3)');
        await page.locator('#undercoverReason').fill(`دليل خاص ${voter}`);
        await click(page, 'undercoverConfirmVote()');
        if (voter < 3) {
          assert.equal(await page.locator('.party-word-reveal').count(), 0);
          assert.equal(await page.locator('#undercoverReason').count(), 0);
        }
      }
      assert.equal(await page.evaluate(() => state.history.length), 1);
      assert.deepEqual(await page.evaluate(() => state.voteConfidence), [3, 3, 3, 3]);
      assert.equal(await page.evaluate(() => state.history[0].questions.length), 2);
      assert.match(await page.locator('.party-debrief').innerText(), /3 \/ 4/u);
      await click(page, 'undercoverAdvance()');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      await layouts(page);
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.stage), 'reveal-handoff');
      assert.deepEqual(
        await page.evaluate(() => [state.duration, state.clueRounds, state.rounds]),
        [0, 1, 1],
      );
      assert.equal(await page.evaluate(() => state.history.length), 0);
    },
  );

  await check(
    'Undercover rotates ballot handoffs and maps private evidence and points to the correct voters',
    async (page) => {
      await page.evaluate(() => setup('undercover'));
      await page.locator('#partyDuration').selectOption('0');
      await click(page, "startPartyGame('undercover')");
      const report = await page.evaluate(() => {
        const rounds = [];
        for (let round = 0; round < 3; round++) {
          for (let player = 0; player < state.players.length; player++) {
            undercoverReveal();
            undercoverHide();
          }
          undercoverDiscuss();
          undercoverStartVote();
          const first = state.voteIndex,
            hidden = state.hidden[0];
          for (let count = 0; count < state.players.length; count++) {
            const voter = state.voteIndex;
            undercoverOpenVote();
            undercoverChoose(voter === hidden ? -1 : hidden);
            undercoverConfidence((voter % 3) + 1);
            state.voteReason = `دليل اللاعب ${voter}`;
            undercoverConfirmVote();
          }
          rounds.push({
            first,
            hidden,
            votes: [...state.votes],
            confidence: [...state.voteConfidence],
            reasons: [...state.voteReasons],
            points: [...state.roundPoints],
          });
          undercoverAdvance();
        }
        return { rounds, done: state.done, history: state.history.length, writes: totalRounds() };
      });
      assert.equal(report.done, true);
      assert.equal(report.history, 3);
      assert.equal(report.writes, 12);
      for (const [round, result] of report.rounds.entries()) {
        assert.equal(result.first, round);
        for (let voter = 0; voter < 4; voter++) {
          assert.equal(result.votes[voter], voter === result.hidden ? -1 : result.hidden);
          assert.equal(result.confidence[voter], (voter % 3) + 1);
          assert.equal(result.reasons[voter], `دليل اللاعب ${voter}`);
          assert.equal(result.points[voter], voter === result.hidden ? 0 : 30);
        }
      }
    },
  );

  await check(
    'Creative ranked votes enforce two other authors, rotate criteria and award exactly once',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyRounds').selectOption('3');
      await page.locator('#partyCreativeBallot').selectOption('ranked');
      await page.locator('#partyCreativeSpark').selectOption('on');
      await click(page, "startPartyGame('improv')");
      const criteria = [];
      for (let round = 0; round < 3; round++) {
        criteria.push(await page.evaluate(() => state.criterion.name));
        await click(page, 'creativeStartAnswers()');
        const spark = await page.evaluate(() => state.sparkWord);
        for (let count = 0; count < 4; count++) {
          await click(page, 'creativeOpenAnswer()');
          if (!round && !count) {
            await page.locator('#creativeAnswer').fill('فكرة بلا كلمة مطلوبة');
            await click(page, 'creativeSubmit()');
            assert.equal(await page.evaluate(() => state.entries.length), 0);
          }
          if (count === 1) {
            await page.locator('#creativeAnswer').fill(`فكرة ${spark} رائعة 0`);
            await click(page, 'creativeSubmit()');
            assert.equal(await page.evaluate(() => state.entries.length), 1);
          }
          await page.locator('#creativeAnswer').fill(`فكرة ${spark} رائعة ${count}`);
          await click(page, 'creativeSubmit()');
        }
        await click(page, 'creativeGalleryToggle()');
        assert.equal(await page.locator('.party-focus-card').count(), 1);
        await click(page, 'creativeGalleryMove(1)');
        assert.equal(await page.evaluate(() => state.galleryIndex), 1);
        assert.equal(
          await page.evaluate(() =>
            state.players.some((name) =>
              document.querySelector('.party-focus-card').textContent.includes(name),
            ),
          ),
          false,
        );
        await layouts(page);
        await click(page, 'creativeStartVoting()');
        for (let count = 0; count < 4; count++) {
          await click(page, 'creativeOpenVote()');
          const indices = await page.evaluate(() => ({
            own: state.entries.findIndex((entry) => entry.author === state.voteIndex),
            first: state.entries.findIndex((entry) => entry.author === (state.voteIndex + 1) % 4),
            second: state.entries.findIndex((entry) => entry.author === (state.voteIndex + 2) % 4),
          }));
          await page.evaluate(({ own }) => {
            creativeChoose(own);
            creativeChooseSecond(own);
          }, indices);
          assert.deepEqual(await page.evaluate(() => [state.voteChoice, state.secondChoice]), [
            null,
            null,
          ]);
          if (!round && count === 1) {
            await page.evaluate(() => oldAppreciation.click());
            assert.equal(await page.evaluate(() => state.secondChoice), null);
          }
          await click(page, `creativeChoose(${indices.first})`);
          await page.evaluate((i) => creativeChooseSecond(i), indices.first);
          assert.equal(await page.evaluate(() => state.secondChoice), null);
          await page.evaluate(() => creativeConfirmVote());
          assert.equal(await page.evaluate(() => state.voteCount), count);
          await click(page, `creativeChooseSecond(${indices.second})`);
          if (!round && !count)
            await page.evaluate(({ second }) => {
              window.oldAppreciation = document.querySelector(
                `button[onclick="creativeChooseSecond(${second})"]`,
              );
            }, indices);
          await click(page, 'creativeConfirmVote()');
        }
        assert.equal(await page.evaluate(() => state.history.length), round + 1);
        assert.deepEqual(
          await page.evaluate(() => state.history.at(-1).entries.map((e) => e.points)),
          [17, 17, 17, 17],
        );
        await page.evaluate(() => creativeTally());
        assert.equal(await page.evaluate(() => state.history.length), round + 1);
        await click(page, 'creativeAdvance()');
      }
      assert.equal(new Set(criteria).size, 3);
      assert.deepEqual(await page.evaluate(() => Object.values(state.results)), [51, 51, 51, 51]);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      await page.evaluate(() => finishPartySession('improv', 'تكرار', true));
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      await layouts(page);
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.stage), 'prompt');
      assert.deepEqual(
        await page.evaluate(() => [state.creativeBallot, state.creativeSpark, state.rounds]),
        ['ranked', true, 3],
      );
      assert.equal(await page.evaluate(() => totalRounds()), 4);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
