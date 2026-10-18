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
    ].map((match) => match[1]);
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
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const click = (page, action) => page.locator(`#app button[onclick="${action}"]`).last().click();
let passed = 0;
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.sound = false;
      store.extra.motion = false;
      save();
    });
    await run(page);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function layout(page) {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '130%'));
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
    'Narrow layout must not overflow',
  );
  await page.setViewportSize({ width: 390, height: 844 });
}

try {
  await check(
    'Team cup: every team size rotates captains across all challenge types',
    async (page) => {
      const schedules = await page.evaluate(() => {
        setup('teamcup');
        startPartyGame('teamcup');
        return Array.from({ length: 5 }, (_, offset) => {
          const size = offset + 2;
          state.teams = [0, 1].map((team) =>
            Array.from({ length: size }, (_, member) => `فريق ${team} لاعب ${member}`),
          );
          const roles = {};
          for (let turn = 0; turn < size * 6; turn++) {
            state.turn = turn;
            const { captain, mode } = teamCupInfo();
            (roles[captain] ||= []).push(mode.id);
          }
          return { size, roles };
        });
      });
      for (const { size, roles } of schedules) {
        assert.equal(Object.keys(roles).length, size * 2);
        for (const modes of Object.values(roles)) {
          assert.equal(modes.length, 3);
          assert.equal(new Set(modes).size, 3, `${size}-person team repeats a captain's mode`);
        }
      }
    },
  );

  await check(
    'Team cup: complete all three challenges with keyboard focus and one final score',
    async (page) => {
      await page.evaluate(() => setup('teamcup'));
      await page.locator('#partyCycles').selectOption('3');
      await page.locator('#partyTeamTactic').selectOption('streak');
      await click(page, "startPartyGame('teamcup')");
      for (let turn = 0; turn < 6; turn++) {
        await click(page, 'teamCupBegin()');
        const mode = await page.evaluate(() => state.mode);
        if (mode === 'trivia') {
          const correct = await page.evaluate(() => state.choices.indexOf(state.card.answer));
          await click(page, `teamCupTrivia(${correct})`);
          assert.equal(
            await page.evaluate(() => document.activeElement.getAttribute('onclick')),
            'teamCupTriviaNext()',
          );
          await page.keyboard.press('Enter');
          assert.equal(await page.evaluate(() => state.feedback), null);
        } else {
          await click(page, "teamCupRecord('correct')");
          assert.equal(
            await page.evaluate(() => document.activeElement.getAttribute('onclick')),
            "teamCupRecord('correct')",
          );
          await page.keyboard.press('Enter');
          assert.equal(await page.evaluate(() => state.correct), 2);
          await click(page, 'teamCupBoost()');
          await click(page, "teamCupRecord('skip')");
          await click(page, 'teamCupUndo()');
          assert.equal(await page.evaluate(() => state.boostActive), true);
          await click(page, "teamCupRecord('correct')");
          assert.equal(await page.evaluate(() => state.turnScore), 45);
        }
        if (!turn) await layout(page);
        await click(page, 'teamCupEndTurn()');
        assert.equal(await page.evaluate(() => totalRounds()), 0);
        await click(page, 'teamCupAdvance()');
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => state.history.length), 6);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      const persisted = await page.evaluate(() => JSON.stringify(store.scores));
      await page.evaluate(() => finishTeamCup());
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), persisted);
      await layout(page);
    },
  );

  await check(
    'Undercover: paused private ballots resume safely and public evidence stays available',
    async (page) => {
      await page.evaluate(() => {
        setup('undercover');
        $('partyDuration').value = '0';
        $('partyRounds').value = '1';
        $('partyClueRounds').value = '1';
        startPartyGame('undercover');
        state.hidden = [3];
        state.pair = ['قهوة', 'شاي'];
      });
      for (let i = 0; i < 4; i++) {
        await click(page, 'undercoverReveal()');
        await click(page, 'undercoverHide()');
      }
      await click(page, 'undercoverDiscuss()');
      for (let i = 0; i < 4; i++) {
        await page.locator('#undercoverClue').fill(`وصف علني رقم ${i}`);
        await click(page, 'undercoverNextClue()');
      }
      await click(page, 'undercoverStartVote()');
      await click(page, 'undercoverOpenVote()');
      await click(page, 'undercoverChoose(3)');
      await click(page, 'undercoverConfidence(3)');
      await page.locator('#undercoverReason').fill('تفصيل سري للمراجعة');
      await page.evaluate(() => {
        window.oldPartyBallot = document.querySelector('button[onclick="undercoverConfirmVote()"]');
      });
      await page.keyboard.press('Escape');
      assert.equal(
        await page.locator('.party-ballots,#undercoverReason,.party-clue-trail').count(),
        0,
      );
      assert.equal(
        await page
          .locator('#app')
          .textContent()
          .then((text) => text.includes('تفصيل سري')),
        false,
      );
      assert.equal(await page.evaluate(() => state.votes.length), 0);
      await click(page, 'undercoverOpenVote()');
      assert.deepEqual(await page.evaluate(() => [state.voteChoice, state.confidence]), [3, 3]);
      assert.equal(await page.inputValue('#undercoverReason'), 'تفصيل سري للمراجعة');
      await page.evaluate(() => oldPartyBallot.click());
      assert.equal(await page.evaluate(() => state.votes.length), 0);
      await page.evaluate(() => showPause());
      assert.equal(
        await page.locator('.party-ballots,#undercoverReason,.party-clue-trail').count(),
        0,
      );
      await page.locator('#pausecover button[onclick="resumeGame()"]').click();
      await click(page, 'undercoverOpenVote()');
      assert.deepEqual(await page.evaluate(() => [state.voteChoice, state.confidence]), [3, 3]);
      assert.equal(await page.inputValue('#undercoverReason'), 'تفصيل سري للمراجعة');
      assert.equal(await page.locator('.party-clue-trail').getAttribute('open'), null);
      await page.locator('.party-clue-trail summary').click();
      assert.match(await page.locator('.party-clue-trail').textContent(), /وصف علني رقم 0/);
      await layout(page);
      await click(page, 'undercoverConfirmVote()');
      for (let i = 1; i < 4; i++) {
        await click(page, 'undercoverOpenVote()');
        assert.deepEqual(
          await page.evaluate(() => [state.voteChoice, state.confidence, state.voteReason]),
          [null, 2, ''],
        );
        await click(page, `undercoverChoose(${i === 3 ? -1 : 3})`);
        await click(page, 'undercoverConfirmVote()');
      }
      assert.deepEqual(await page.evaluate(() => state.roundPoints), [30, 30, 30, 0]);
      assert.match(await page.locator('.party-ballot-review').textContent(), /تفصيل سري للمراجعة/);
      await click(page, 'undercoverAdvance()');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.locator('.party-round-archive').count(), 1);
    },
  );

  await check(
    'Creative council: punctuation cannot pass the seven-word rule and preview agrees with the counter',
    async (page) => {
      await page.evaluate(() => {
        setup('improv');
        $('partyCreativeFormat').value = 'seven';
        startPartyGame('improv');
      });
      await click(page, 'creativeStartAnswers()');
      await click(page, 'creativeOpenAnswer()');
      await page.locator('#creativeAnswer').fill('هذه فكرة لطيفة تجعل الجميع يبتسمون !');
      assert.match(await page.locator('#creativeCounter').textContent(), /6 \/ 7 كلمات/);
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.answerCount), 0);
      await page.locator('#creativeAnswer').fill('هذه فكرة لطيفة تجعل كل الأصدقاء يبتسمون !');
      assert.match(await page.locator('#creativeCounter').textContent(), /7 \/ 7 كلمات/);
      await click(page, 'creativePreview()');
      assert.match(await page.locator('.party-private').textContent(), /7 كلمات/);
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.answerCount), 1);
      await click(page, 'creativeOpenAnswer()');
      await page.locator('#creativeAnswer').fill('! ! ! ! ! ! !');
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.answerCount), 1);
      await layout(page);
    },
  );

  await check(
    'Creative story: all writers, ranked ballots, private resume and completed book keep exact scores',
    async (page) => {
      await page.evaluate(() => {
        setup('improv');
        $('partyRounds').value = '3';
        $('partyCreativeMode').value = 'chain';
        $('partyCreativeBallot').value = 'ranked';
        startPartyGame('improv');
      });
      for (let round = 0; round < 3; round++) {
        await click(page, 'creativeStartAnswers()');
        for (let writer = 0; writer < 4; writer++) {
          await click(page, 'creativeOpenAnswer()');
          const bridge = await page.evaluate(() => state.chainBridge);
          await page
            .locator('#creativeAnswer')
            .fill(`بعد ${bridge} بدأت مغامرة جميلة رقم ${round}${writer}`);
          await click(page, 'creativeSubmit()');
        }
        assert.equal(await page.locator('.party-shared-story small').count(), 0);
        await click(page, 'creativeStartVoting()');
        for (let voter = 0; voter < 4; voter++) {
          await click(page, 'creativeOpenVote()');
          const choices = await page.evaluate(() =>
            state.entries
              .map((entry, i) => (entry.author === state.voteIndex ? -1 : i))
              .filter((i) => i >= 0),
          );
          await click(page, `creativeChoose(${choices[0]})`);
          await click(page, `creativeChooseSecond(${choices[1]})`);
          if (!voter) {
            if (round === 1) await page.evaluate(() => showPause());
            else await page.keyboard.press('Escape');
            assert.equal(await page.locator('.party-creative-entry').count(), 0);
            assert.equal(await page.evaluate(() => state.votes.length), 0);
            if (round === 1)
              await page.locator('#pausecover button[onclick="resumeGame()"]').click();
            await click(page, 'creativeOpenVote()');
            assert.deepEqual(
              await page.evaluate(() => [state.voteChoice, state.secondChoice]),
              choices.slice(0, 2),
            );
          }
          await click(page, 'creativeConfirmVote()');
        }
        const points = await page.evaluate(() =>
          state.history.at(-1).entries.reduce((sum, entry) => sum + entry.points, 0),
        );
        assert.equal(points, 58); // Four first votes, four appreciations, one winning bonus, four story bonuses.
        await click(page, 'creativeAdvance()');
      }
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.locator('.party-story-book article').count(), 3);
      assert.equal(await page.evaluate(() => totalRounds()), 4);
      const persisted = await page.evaluate(() => JSON.stringify(store.scores));
      await page.evaluate(() => finishPartySession('improv', 'نجوم الإبداع', true));
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), persisted);
      await layout(page);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Party v14: ${passed} checks passed.`);
