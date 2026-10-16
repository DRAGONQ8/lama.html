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
    ].map((m) => m[1]);
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
let passed = 0;
async function check(name, test) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة', 'خالد'];
      store.extra.motion = false;
      store.sound = false;
      save();
      home();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function start(page, options = {}) {
  await page.evaluate((options) => {
    setup('spy');
    for (const [id, value] of Object.entries(options)) {
      if (!$(id)) throw new Error(`Missing spy control ${id}`);
      $(id).value = String(value);
    }
    spySetupChanged();
    startExtra('spy');
  }, options);
}
async function discuss(page) {
  await page.evaluate(() => {
    for (let i = 0; i < state.players.length; i++) {
      spyReveal();
      spyHide();
    }
    spyDiscuss();
  });
}
async function vote(page, votes) {
  await page.evaluate((votes) => {
    startSpyVote();
    for (let i = 0; i < votes.length; i++) {
      spyVoteReveal();
      castSpyVote(votes[i], i, state.run);
    }
  }, votes);
}
async function fixSpies(page, spies = [0]) {
  await page.evaluate((spies) => {
    state.spy = spies[0];
    state.spies = spies;
    state.location = 'أمريكا';
  }, spies);
}
async function guess(page, value) {
  await page.evaluate(() => spyGuessHandoff());
  await page.locator('[onclick="spyGuess()"]').click();
  await page.locator('#spyguess').fill(value);
  await page.locator('#spyguess').press('Enter');
}
try {
  await check(
    'Stale handoff controls cannot expose another player or a later round',
    async (page) => {
      await start(page);
      const firstRun = await page.evaluate(() => state.run);
      await page.evaluate(() => {
        spyReveal(0, state.run);
        spyHide(0, state.run);
        spyReveal(0, state.run);
      });
      assert.deepEqual(await page.evaluate(() => [state.turn, state.stage]), [1, 'handoff']);
      await page.evaluate(() => {
        spyReveal(1, state.run);
        spyHide(0, state.run);
      });
      assert.deepEqual(await page.evaluate(() => [state.turn, state.stage]), [1, 'view']);
      await start(page);
      await page.evaluate((run) => spyReveal(0, run), firstRun);
      assert.equal(await page.evaluate(() => state.stage), 'handoff');
      await discuss(page);
      await page.evaluate((oldRun) => {
        startSpyVote();
        spyVoteReveal(0, oldRun);
      }, firstRun);
      assert.equal(await page.evaluate(() => state.stage), 'vote-handoff');
      await page.evaluate(() => {
        spyVoteReveal(0, state.run);
        castSpyVote(1, 0, state.run);
        spyVoteReveal(0, state.run);
      });
      assert.deepEqual(await page.evaluate(() => [state.voteTurn, state.stage]), [
        1,
        'vote-handoff',
      ]);
    },
  );
  await check(
    'Voting is compulsory before revealing spies and guessing; the word stays hidden',
    async (page) => {
      await start(page, { spytheme: 'countries', spycandidates: 'hide' });
      await fixSpies(page);
      await discuss(page);
      assert.equal(await page.locator('[onclick="spyGuess()"]').count(), 0);
      await page.evaluate(() => {
        spyGuess();
        spyResult();
        submitSpyGuess(state.run);
      });
      assert.equal(await page.evaluate(() => state.stage), 'active');
      await vote(page, [1, 0, 0, 0, 0]);
      assert.deepEqual(
        await page.evaluate(() => [state.stage, state.done, state.voteOutcome.caught]),
        ['vote-result', false, true],
      );
      assert.match(await page.locator('.spy-vote-result').innerText(), /اختياركم صحيح/);
      assert.match(await page.locator('.spy-revealed-names').innerText(), /أحمد/);
      assert.equal(await page.locator('#spyguess').count(), 0);
      assert.ok(!(await page.locator('#app').innerText()).includes('أمريكا'));
      assert.deepEqual(await page.evaluate(() => Object.keys(store.scores)), []);
      await guess(page, 'أمريكا');
      assert.equal(await page.evaluate(() => state.done), true);
      assert.match(await page.locator('.secret').innerText(), /أمريكا/);
    },
  );
  await check(
    'Every vote/guess outcome scores its two phases once against the round roster',
    async (page) => {
      for (const caught of [true, false])
        for (const correct of [true, false]) {
          await page.evaluate(() => {
            store.players = ['أحمد', 'ليلى', 'سالم', 'نورة', 'خالد'];
          });
          const before = await page.evaluate(() =>
            store.players.map((name) => store.scores[name]?.points || 0),
          );
          await start(page, { spytheme: 'countries', spycandidates: 'hide' });
          await fixSpies(page);
          await discuss(page);
          await vote(page, caught ? [1, 0, 0, 0, 0] : [1, 2, 1, 1, 1]);
          await page.evaluate(() => {
            store.players = ['اسم جديد', 'ضيف'];
          });
          await guess(page, correct ? 'الولايات المتحدة الأمريكية' : 'فرنسا');
          const spyPoints = (caught ? 0 : 20) + (correct ? 20 : 0);
          const residentPoints = (caught ? 20 : 0) + (correct ? 0 : 20);
          assert.deepEqual(
            await page.evaluate(() => state.players.map((name) => store.scores[name]?.points || 0)),
            [spyPoints, residentPoints, residentPoints, residentPoints, residentPoints].map(
              (points, i) => before[i] + points,
            ),
          );
          assert.equal(await page.evaluate(() => store.scores['اسم جديد']?.points || 0), 0);
          const scores = await page.evaluate(() => JSON.stringify(store.scores));
          await page.evaluate(() => {
            spyResult();
            submitSpyGuess(state.run);
            castSpyVote(0, 4, state.run);
          });
          assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), scores);
        }
    },
  );
  await check(
    'Two spies are revealed before one shared guess even after correct votes or ties',
    async (page) => {
      for (const tied of [false, true]) {
        await start(page, { spycount: 2, spytheme: 'countries', spycandidates: 'hide' });
        await fixSpies(page, [0, 1]);
        await discuss(page);
        await vote(page, tied ? [1, 0, 0, 2, 3] : [1, 0, 0, 1, 0]);
        assert.deepEqual(await page.evaluate(() => state.accused), tied ? [] : [0, 1]);
        assert.equal(await page.evaluate(() => state.voteOutcome.tied), tied);
        assert.match(await page.locator('.spy-revealed-names').innerText(), /أحمد و ليلى/);
        assert.ok(!(await page.locator('#app').innerText()).includes('أمريكا'));
        await guess(page, 'أمريكا');
        assert.equal(await page.evaluate(() => state.done), true);
        assert.equal(await page.locator('.spy-phase-results article').count(), 2);
      }
    },
  );
  await check(
    'Word guessing has a top search input, no preselected answer, and Arabic matching',
    async (page) => {
      await start(page, { spytheme: 'animals' });
      await page.evaluate(() => {
        state.location = 'أسد';
        state.spy = 0;
        state.spies = [0];
      });
      await discuss(page);
      await vote(page, [1, 0, 0, 0, 0]);
      await page.evaluate(() => {
        spyGuessHandoff();
        spyGuess();
      });
      assert.equal(await page.locator('#spyguess').evaluate((el) => el.tagName), 'INPUT');
      assert.equal(await page.locator('#spyguess').inputValue(), '');
      assert.equal(await page.locator('#spyguessresults .selected').count(), 0);
      assert.ok((await page.locator('#spyguessresults button').count()) <= 24);
      await page.locator('[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.done), false);
      await page.locator('#spyguess').fill('اَسَد');
      assert.equal(await page.locator('#spyguessresults button').count(), 1);
      await page.locator('#spyguessresults button').click();
      assert.equal(await page.locator('#spyguess').inputValue(), 'أسد');
      assert.equal(await page.evaluate(() => state.done), false);
      await page.locator('[type="submit"]').click();
      assert.equal(await page.evaluate(() => state.guessCorrect), true);
    },
  );
  await check(
    'Hidden candidates never leak decks; wrong and stale submissions stay guarded',
    async (page) => {
      await start(page, { spytheme: 'countries', spycandidates: 'hide' });
      await fixSpies(page);
      await discuss(page);
      assert.equal(await page.locator('.spy-candidates').count(), 0);
      await vote(page, [1, 0, 0, 0, 0]);
      await page.evaluate(() => {
        spyGuessHandoff();
        spyGuess();
      });
      assert.equal(await page.locator('#spyguessresults').count(), 0);
      assert.ok(!(await page.locator('#app').innerText()).includes('فرنسا'));
      await page.locator('#spyguess').fill('فرنسا');
      await page.evaluate(() => submitSpyGuess(state.run - 1));
      assert.equal(await page.evaluate(() => state.done), false);
      await page.locator('#spyguess').press('Enter');
      assert.equal(await page.evaluate(() => state.guessCorrect), false);
    },
  );
  await check(
    'Guess drafts disappear on pause and handoff, and restore only for the spy',
    async (page) => {
      await start(page, { spytheme: 'countries', spycandidates: 'hide' });
      await fixSpies(page);
      await discuss(page);
      await vote(page, [1, 0, 0, 0, 0]);
      await page.evaluate(() => {
        spyGuessHandoff();
        spyGuess();
      });
      await page.locator('#spyguess').fill('المملكة المتحدة');
      await page.evaluate(() => {
        pauseClock();
        submitSpyGuess(state.run);
      });
      assert.equal(await page.evaluate(() => state.stage), 'guess-handoff');
      assert.equal(await page.locator('#spyguess').count(), 0);
      assert.ok(!(await page.locator('#app').innerText()).includes('المملكة المتحدة'));
      await page.evaluate(() => {
        resumeClock();
        spyGuess();
      });
      assert.equal(await page.locator('#spyguess').inputValue(), 'المملكة المتحدة');
      await page.locator('[onclick="cancelSpyGuess()"]').click();
      assert.equal(await page.locator('#spyguess').count(), 0);
      await page.locator('[onclick="spyGuess()"]').click();
      assert.equal(await page.locator('#spyguess').inputValue(), 'المملكة المتحدة');
    },
  );
  await check(
    'Offline chosen starts impose no player; random start selects one starter without assigning a target',
    async (page) => {
      await start(page, { spystart: 'manual' });
      await discuss(page);
      assert.deepEqual(
        await page.evaluate(() => [state.startingPlayer, state.asker, state.target]),
        [null, null, null],
      );
      assert.match(await page.locator('.spy-start-note').innerText(), /بدون الموقع/);
      await page.evaluate(() => {
        setup('spy');
        $('spystart').value = 'random';
        state = { id: 'spy', run: 987, done: false };
        screen = 'spy';
        seededRandom = () => 0.999;
        try {
          startSpy();
        } finally {
          seededRandom = null;
        }
      });
      await discuss(page);
      assert.deepEqual(
        await page.evaluate(() => [state.startingPlayer, state.asker, state.target]),
        [4, 4, null],
      );
      assert.match(await page.locator('.spy-start-note').innerText(), /خالد/);
    },
  );
  await check(
    'Players freely choose asker and target, write their own question, and keep optional history',
    async (page) => {
      await start(page, { spystart: 'manual' });
      await discuss(page);
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.equal(await page.evaluate(() => state.questionHistory.length), 0);
      await page.locator('#spyasker').selectOption('3');
      await page.locator('#spytarget').selectOption('0');
      await page.locator('#spyquestion').fill('هل تفضله بالليل؟');
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.deepEqual(await page.evaluate(() => state.questionHistory[0]), {
        asker: 3,
        target: 0,
        text: 'هل تفضله بالليل؟',
      });
      assert.deepEqual(await page.evaluate(() => [state.asker, state.target]), [null, null]);
      await page.locator('#spyasker').selectOption('1');
      await page.locator('#spytarget').selectOption('4');
      await page.locator('#spyquestion').fill('سؤال ثاني');
      await page.locator('#spyasker').selectOption('4');
      assert.equal(await page.evaluate(() => state.target), null);
      assert.equal(await page.locator('#spyquestion').inputValue(), 'سؤال ثاني');
    },
  );
  await check(
    'Candidate search filters instantly, and all spy phases fit mobile screens offline',
    async (page) => {
      await page.context().setOffline(true);
      await start(page, { spytheme: 'all' });
      await discuss(page);
      await page.locator('.spy-candidates summary').click();
      await page.locator('#spycandidatesearch').fill('زرافة');
      assert.equal(await page.locator('#spycandidatelist span').count(), 1);
      assert.equal(await page.locator('#spycandidatelist span').innerText(), 'زرافة');
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
      }
      await vote(page, [1, 0, 0, 0, 0]);
      await page.setViewportSize({ width: 320, height: 700 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      await page.evaluate(() => {
        spyGuessHandoff();
        spyGuess();
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
    },
  );
  await check(
    'Timeouts start voting once, private ballot drafts survive pause, and duplicate votes are ignored',
    async (page) => {
      await start(page);
      await discuss(page);
      await page.evaluate(() => {
        state.endAt = Date.now() - 1;
        nextSpyPrompt();
        spyVoteReveal();
      });
      await page.locator('#spyreason').fill('دليل خاص');
      await page.locator('#spyconfidence').selectOption('sure');
      await page.evaluate(() => pauseClock());
      assert.equal(await page.locator('#spyreason').count(), 0);
      await page.evaluate(() => {
        resumeClock();
        spyVoteReveal();
      });
      assert.equal(await page.locator('#spyreason').inputValue(), 'دليل خاص');
      await page.evaluate(() => {
        const run = state.run;
        castSpyVote(1, 0, run);
        castSpyVote(1, 0, run);
        startSpyVote();
      });
      assert.equal(await page.evaluate(() => state.votes.length), 1);
      assert.equal(await page.evaluate(() => state.voteTurn), 1);
    },
  );
  console.log(`${passed} spy v12 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
