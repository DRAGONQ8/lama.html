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
let passed = 0;
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      store.sound = false;
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
const click = (page, action) => page.locator(`#app button[onclick="${action}"]`).last().click();

try {
  await check(
    'Manual teams preserve player choices while invalid sizes require correction',
    async (page) => {
      const report = await page.evaluate(() => {
        setup('teamcup');
        partyEditTeams();
        for (let i = 0; i < 4; i++) partyAssignTeam(i, 0);
        const manual = JSON.stringify(state.teams);
        startPartyGame('teamcup');
        const invalidSafe = screen === 'setup' && JSON.stringify(state.teams) === manual;
        partyAssignTeam(1, 1);
        partyAssignTeam(3, 1);
        const expected = state.teams.map((team) => [...team]);
        startPartyGame('teamcup');
        const started = screen === 'teamcup' && state.stage === 'handoff';
        partyAssignTeam(0, 1);
        return { invalidSafe, started, teams: state.teams, expected };
      });
      assert.equal(report.invalidSafe, true);
      assert.equal(report.started, true);
      assert.deepEqual(report.teams, report.expected);
      assert.deepEqual(report.teams, [
        ['أحمد', 'سالم'],
        ['ليلى', 'نورة'],
      ]);
    },
  );

  await check('Free clue order lets the group pick each speaker once per cycle', async (page) => {
    await page.evaluate(() => {
      setup('undercover');
      $('partyClueOrder').value = 'free';
      $('partyDuration').value = '0';
      startPartyGame('undercover');
      for (let i = 0; i < 4; i++) {
        undercoverReveal();
        undercoverHide();
      }
      undercoverDiscuss();
    });
    assert.equal(await page.locator('#undercoverClue').count(), 0);
    assert.match(await page.locator('.party-speaker-picker').textContent(), /اختاروا من يتكلم/);
    const report = await page.evaluate(() => {
      const orders = [
        [2, 0, 3, 1],
        [1, 3, 0, 2],
      ];
      for (const order of orders)
        for (const player of order) {
          const before = state.clueIndex;
          undercoverNextClue();
          if (state.clueIndex !== before) throw Error('Unselected speaker was accepted');
          undercoverSelectSpeaker(player);
          const stale = document.querySelector('button[onclick="undercoverNextClue()"]');
          undercoverNextClue();
          stale.click();
          if (state.clueIndex !== before + 1) throw Error('Stale clue button repeated a turn');
          if (state.clueIndex % 4) {
            undercoverSelectSpeaker(player);
            if (state.clueSpeaker !== null) throw Error('Repeated speaker accepted in same cycle');
          }
        }
      return { clues: state.clues.map((clue) => clue.player), count: state.clueIndex };
    });
    assert.equal(report.count, 8);
    assert.deepEqual(report.clues, [2, 0, 3, 1, 1, 3, 0, 2]);
    assert.equal(await page.locator('.party-secret-word').count(), 0);
  });

  await check(
    'Free inquiry chooses both people and rejects unanswered, repeated or blocked turns',
    async (page) => {
      await page.evaluate(() => {
        setup('undercover');
        $('partyQuestionOrder').value = 'free';
        $('partyDuration').value = '0';
        $('partyClueRounds').value = '1';
        startPartyGame('undercover');
        state.pair = ['قهوة', 'شاي'];
        for (let i = 0; i < 4; i++) {
          undercoverReveal();
          undercoverHide();
        }
        undercoverDiscuss();
        for (let i = 0; i < 4; i++) undercoverNextClue();
        undercoverBeginInquiry();
        undercoverSkipInquiry();
        if (state.questionIndex !== 0) throw Error('Skipped without choosing a questioner');
        undercoverSelectAsker(3);
      });
      assert.equal(await page.inputValue('#undercoverTarget'), '');
      await page.locator('#undercoverTarget').selectOption('1');
      await page.locator('#undercoverQuestion').fill('في أي وقت تستعمله؟');
      await page.locator('#undercoverReply').fill('في آخر النهار');
      await page.evaluate(() => {
        showPause();
        undercoverRecordInquiry();
      });
      assert.equal(await page.evaluate(() => state.questions.length), 0);
      await page.evaluate(() => resumeGame());
      await click(page, 'undercoverRecordInquiry()');
      const result = await page.evaluate(() => {
        undercoverSelectAsker(3);
        const repeatedSafe = state.inquiryAsker === null;
        for (const player of [1, 0, 2]) {
          undercoverSelectAsker(player);
          undercoverSkipInquiry();
        }
        return {
          repeatedSafe,
          asked: state.askedPlayers,
          question: state.questions[0],
          count: state.questionIndex,
        };
      });
      assert.equal(result.repeatedSafe, true);
      assert.deepEqual(result.asked, [3, 1, 0, 2]);
      assert.equal(result.count, 4);
      assert.equal(result.question.asker, 3);
      assert.equal(result.question.target, 1);
    },
  );

  await check(
    'Creative constraints accept natural Arabic word forms and reject substring shortcuts',
    async (page) => {
      const report = await page.evaluate(() => ({
        accepted: ['شاهدت القمر', 'فرحت بالقمر', 'نظرت للقمر', 'رأيت قمراً'].map((answer) =>
          creativeHasWord(answer, 'قمر'),
        ),
        rejected: ['قمرين', 'اقمري', 'قمريات'].map((answer) => creativeHasWord(answer, 'قمر')),
        tanween: creativeHasWord('حملت مفتاحاً', 'مفتاح'),
      }));
      assert.deepEqual(report.accepted, [true, true, true, true]);
      assert.deepEqual(report.rejected, [false, false, false]);
      assert.equal(report.tanween, true);
      await page.evaluate(() => {
        setup('improv');
        $('partyCreativeFormat').value = 'seven';
        $('partyCreativeSpark').value = 'on';
        startPartyGame('improv');
        state.sparkWord = 'قمر';
        creativeStartAnswers();
        creativeOpenAnswer();
      });
      await page.locator('#creativeAnswer').fill('قمرين');
      assert.equal(await page.locator('.party-constraints .met').count(), 0);
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.answerCount), 0);
      await page.locator('#creativeAnswer').fill('حلمت أن القمر يزور بيتنا كل مساء');
      assert.equal(await page.locator('.party-constraints .met').count(), 2);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#creativeAnswer').count(), 0);
      await click(page, 'creativeOpenAnswer()');
      assert.equal(await page.locator('.party-constraints .met').count(), 2);
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.answerCount), 1);
    },
  );

  for (const id of ['flags', 'truefalse', 'order']) {
    await check(
      `${id}: missed-answer practice reshuffles only mistakes, preserves scores and replays settings`,
      async (page) => {
        const report = await page.evaluate((id) => {
          setup(id);
          if (id === 'flags') {
            $('flagsRegion').value = 'gulf';
            $('flagsMode').value = 'flag';
          }
          if (id === 'truefalse') {
            $('factCategory').value = 'animals';
            $('factLevel').value = 'normal';
          }
          if (id === 'order') {
            $('orderCategory').value = 'space';
            $('orderDirection').value = 'mixed';
          }
          $('player').value = '2';
          startCollection(id);
          const originalRun = state.run,
            settings = { ...state.settings };
          while (!state.done) {
            const q = state.questions[state.index],
              wrong = state.index < 2;
            if (id === 'order') {
              q.arranged = [...q.solution];
              if (wrong) [q.arranged[0], q.arranged[1]] = [q.arranged[1], q.arranged[0]];
              submitCollectionOrder();
            } else
              answerCollection(
                id === 'flags'
                  ? q.choices.findIndex((c) => (c.code === q.code) !== wrong)
                  : q.truth !== wrong
                    ? 0
                    : 1,
              );
            nextCollection();
          }
          const scores = JSON.stringify(store.scores),
            history = JSON.stringify(store.extra.history),
            reviewShowsChoice =
              document.querySelectorAll('.collection-your-answer').length ===
              state.questions.length;
          collectionPractice(originalRun);
          const practiceRun = state.run,
            practiceCount = state.questions.length,
            shuffled =
              id !== 'order' ||
              state.questions.every((q) => q.arranged.some((item, i) => item !== q.solution[i]));
          collectionReplay(originalRun);
          const staleSafe = state.run === practiceRun && state.practice;
          while (!state.done) {
            const q = state.questions[state.index];
            if (id === 'order') {
              q.arranged = [...q.solution];
              submitCollectionOrder();
            } else
              answerCollection(
                id === 'flags' ? q.choices.findIndex((c) => c.code === q.code) : q.truth ? 0 : 1,
              );
            nextCollection();
          }
          const scoresSafe =
              JSON.stringify(store.scores) === scores &&
              JSON.stringify(store.extra.history) === history,
            noMorePractice = !document.querySelector('button[onclick^="collectionPractice("]');
          collectionReplay(practiceRun);
          return {
            reviewShowsChoice,
            practiceCount,
            shuffled,
            staleSafe,
            scoresSafe,
            noMorePractice,
            settings,
            replaySettings: state.settings,
            player: state.name,
            replay: !state.practice && !state.done,
          };
        }, id);
        assert.equal(report.reviewShowsChoice, true);
        assert.equal(report.practiceCount, 2);
        assert.equal(report.shuffled, true);
        assert.equal(report.staleSafe, true);
        assert.equal(report.scoresSafe, true);
        assert.equal(report.noMorePractice, true);
        assert.deepEqual(report.replaySettings, report.settings);
        assert.equal(report.player, 'سالم');
        assert.equal(report.replay, true);
      },
    );
  }

  await check(
    'Ordering keyboard follows the focused card and undo is blocked after confirmation',
    async (page) => {
      await page.evaluate(() => {
        setup('order');
        startCollection('order');
      });
      const before = await page.evaluate(() => [...state.questions[0].arranged]);
      await page.locator('[data-order-move="2-up"]').focus();
      await page.keyboard.press('ArrowUp');
      let after = await page.evaluate(() => [...state.questions[0].arranged]);
      assert.equal(after[1], before[2]);
      assert.equal(after[2], before[1]);
      assert.equal(
        await page.locator('[data-order-index="1"]').getAttribute('aria-current'),
        'true',
      );
      await click(page, `collectionUndoOrder(${await page.evaluate(() => state.run)},0)`);
      after = await page.evaluate(() => [...state.questions[0].arranged]);
      assert.deepEqual(after, before);
      const result = await page.evaluate(() => {
        moveCollectionOrder(0, 1);
        submitCollectionOrder();
        const confirmed = JSON.stringify(state.questions[0].arranged);
        collectionUndoOrder();
        return (
          JSON.stringify(state.questions[0].arranged) === confirmed && state.answers.length === 1
        );
      });
      assert.equal(result, true);
    },
  );

  await check('New controls fit enlarged Arabic text on narrow screens', async (page) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '130%';
    });
    for (const id of ['teamcup', 'undercover', 'improv', 'flags', 'truefalse', 'order']) {
      await page.evaluate((id) => {
        setup(id);
        if (id === 'teamcup') partyEditTeams();
      }, id);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
        `${id}: overflow`,
      );
    }
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Party / collection v12: ${passed} checks passed.`);
