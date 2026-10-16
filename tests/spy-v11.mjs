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
try {
  await check(
    'General words, famous countries and all continent pools are complete and distinct',
    async (page) => {
      const data = await page.evaluate(() => ({
        themes: spyThemes,
        countries: spyCountries,
        all: spyPool(),
        countryPool: spyPool('countries'),
        regions: spyRegions,
        places: spyLocations,
        wordPools: spyWordPools,
      }));
      for (const id of [
        'all',
        'animals',
        'objects',
        'countries',
        'food',
        'jobs',
        'sports',
        'places',
        'everyday',
        'travel',
        'fantasy',
      ])
        assert.ok(data.themes.some(([value]) => id === value));
      assert.ok(data.all.length > 350);
      assert.equal(new Set(data.all).size, data.all.length);
      for (const country of ['فرنسا', 'ألمانيا', 'إيطاليا', 'أمريكا', 'بريطانيا'])
        assert.ok(data.countryPool.includes(country));
      assert.deepEqual(data.countries.gulf, [
        'الكويت',
        'السعودية',
        'الإمارات',
        'قطر',
        'البحرين',
        'عُمان',
      ]);
      assert.ok(data.countries.gulf.every((country) => data.countries.asia.includes(country)));
      assert.deepEqual(data.countries.oceania, ['أستراليا', 'نيوزيلندا']);
      assert.equal(data.regions.length, 8);
      const continents = data.regions
        .filter(([id]) => !['all', 'gulf'].includes(id))
        .flatMap(([id]) => data.countries[id]);
      assert.equal(
        new Set(continents).size,
        continents.length,
        'continent decks do not mix regions',
      );
      assert.equal(new Set(continents).size, data.countryPool.length);
      for (const pool of [...Object.values(data.wordPools), data.places, data.countryPool])
        assert.ok(pool.every((word) => data.all.includes(word)));
    },
  );
  await check(
    'Every category and country region starts with its exact intended deck',
    async (page) => {
      const themes = await page.evaluate(() => spyThemes.map(([id]) => id));
      for (const theme of themes) {
        await start(page, { spytheme: theme });
        assert.ok(await page.evaluate(() => state.locationPool.includes(state.location)));
        assert.deepEqual(
          await page.evaluate(() => state.locationPool),
          await page.evaluate((theme) => spyPool(theme), theme),
        );
      }
      const regions = await page.evaluate(() => spyRegions.map(([id]) => id));
      for (const region of regions) {
        await start(page, { spytheme: 'countries', spyregion: region });
        assert.deepEqual(
          await page.evaluate(() => state.locationPool),
          await page.evaluate((region) => spyPool('countries', region), region),
        );
        assert.equal(await page.evaluate(() => state.region), region);
      }
    },
  );
  await check(
    'Country region and difficulty preferences restore together after reload',
    async (page) => {
      await page.evaluate(() => setup('spy'));
      assert.equal(await page.locator('#spyregionfield').isVisible(), false);
      await page.locator('#spytheme').selectOption('countries');
      assert.equal(await page.locator('#spyregionfield').isVisible(), true);
      await page.locator('#spyregion').selectOption('southAmerica');
      await page.locator('#spycount').selectOption('2');
      await page.locator('#spycandidates').selectOption('hide');
      await page.locator('#spystyle').selectOption('subtle');
      await page.reload();
      await page.evaluate(() => setup('spy'));
      assert.equal(await page.locator('#spytheme').inputValue(), 'countries');
      assert.equal(await page.locator('#spyregion').inputValue(), 'southAmerica');
      assert.equal(await page.locator('#spyregionfield').isVisible(), true);
      assert.match(await page.locator('#spypreview').innerText(), /أمريكا الجنوبية/);
      assert.equal(await page.locator('#spycandidates').inputValue(), 'hide');
      assert.equal(await page.locator('#spycount').inputValue(), '2');
      await page.evaluate(() => startExtra('spy'));
      assert.deepEqual(
        await page.evaluate(() => state.locationPool),
        await page.evaluate(() => spyCountries.southAmerica),
      );
      assert.deepEqual(
        await page.evaluate(() => [...state.questionOrder].sort()),
        await page.evaluate(() => [...spySubtlePrompts].sort()),
      );
      await page.evaluate(() => {
        home();
        setup('spy');
        $('spytheme').value = 'animals';
        $('spytheme').dispatchEvent(new Event('change', { bubbles: true }));
      });
      assert.equal(await page.locator('#spyregionfield').isVisible(), false);
      await page.evaluate(() => setup('spy'));
      assert.equal(await page.locator('#spyregionfield').isVisible(), false);
    },
  );
  await check(
    'Secret roles disappear on handoff and pause; words use appropriate wording',
    async (page) => {
      for (const theme of ['objects', 'countries', 'everyday']) {
        await start(page, { spytheme: theme, spycandidates: 'hide' });
        const location = await page.evaluate(() => state.location);
        assert.ok(!(await page.locator('#app').innerText()).includes(location));
        await page.evaluate(() => {
          state.spy = (state.turn + 1) % state.players.length;
          state.spies = [state.spy];
          spyReveal();
        });
        assert.equal(await page.locator('.secretcover h2').innerText(), location);
        if (theme === 'everyday')
          assert.match(await page.locator('.secretcover').innerText(), /دورك التمثيلي/);
        else assert.ok(!(await page.locator('.secretcover').innerText()).includes('دورك التمثيلي'));
        await page.evaluate(() => pauseClock());
        assert.equal(await page.evaluate(() => state.stage), 'handoff');
        assert.ok(!(await page.locator('#app').innerText()).includes(location));
        await page.evaluate(() => {
          resumeClock();
          spyReveal();
          spyHide();
        });
        assert.ok(!(await page.locator('#app').innerText()).includes(location));
      }
    },
  );
  await check('Two spies receive distinct secret roles and need five players', async (page) => {
    await start(page, { spycount: 2, spytheme: 'animals' });
    const spies = await page.evaluate(() => state.spies);
    assert.equal(spies.length, 2);
    assert.equal(new Set(spies).size, 2);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => spyReveal());
      if (spies.includes(i)) {
        assert.match(await page.locator('.secretcover h2').innerText(), /واحد من الجاسوسين/);
        assert.ok(
          !(await page.locator('.secretcover').innerText()).includes(
            await page.evaluate(() => state.location),
          ),
        );
      }
      await page.evaluate(() => spyHide());
    }
    await page.evaluate(() => {
      home();
      store.players = ['أحمد', 'ليلى', 'سالم'];
      setup('spy');
    });
    assert.equal(await page.locator('#spycount option[value="2"]').isDisabled(), true);
    await page.evaluate(() => {
      $('spycount').value = '2';
      startExtra('spy');
    });
    assert.equal(await page.evaluate(() => state.spyCount), 1);
    assert.equal(await page.evaluate(() => state.spies.length), 1);
  });
  await check(
    'Hidden possibilities stay hidden in discussion and typed guesses support country aliases',
    async (page) => {
      await start(page, { spytheme: 'countries', spycandidates: 'hide', spycount: 2 });
      await page.evaluate(() => {
        state.location = 'أمريكا';
      });
      await discuss(page);
      assert.equal(await page.locator('.spy-candidates').count(), 0);
      assert.ok(!(await page.locator('#app').innerText()).includes('فرنسا'));
      await page.evaluate(() => spyGuess());
      assert.equal(await page.locator('#spyguess').evaluate((element) => element.tagName), 'INPUT');
      assert.ok(!(await page.locator('#modal').innerText()).includes('فرنسا'));
      await page.evaluate(() => submitSpyGuess(state.run));
      assert.equal(await page.evaluate(() => state.done), false);
      await page.locator('#spyguess').fill('الولايات المتحدة الأمريكية');
      await page.evaluate(() => submitSpyGuess(state.run - 1));
      assert.equal(await page.evaluate(() => state.done), false);
      await page.evaluate(() => submitSpyGuess(state.run));
      assert.equal(await page.evaluate(() => state.done), true);
      const results = await page.evaluate(() =>
        state.players.map((name, i) => [isSpy(i), store.scores[name]?.points || 0]),
      );
      assert.deepEqual(
        results.map(([spy, score]) => score),
        results.map(([spy]) => (spy ? 40 : 0)),
      );
      const prior = await page.evaluate(() => JSON.stringify(store.scores));
      await page.evaluate(() => {
        submitSpyGuess();
        spyResult(true, 'تكرار');
      });
      assert.equal(await page.evaluate(() => JSON.stringify(store.scores)), prior);
      assert.match(await page.locator('.spot small').innerText(), /الدولة/);
    },
  );
  await check(
    'Wrong guesses award the residents and visible mode only offers its selected deck',
    async (page) => {
      await start(page, { spytheme: 'countries', spyregion: 'gulf' });
      await discuss(page);
      assert.equal(await page.locator('.spy-candidates .listchips span').count(), 6);
      await page.evaluate(() => spyGuess());
      assert.equal(await page.locator('#spyguess option').count(), 6);
      await page.evaluate(() => {
        $('spyguess').value = state.locationPool.find((word) => word !== state.location);
        submitSpyGuess(state.run);
      });
      assert.equal(await page.evaluate(() => state.done), true);
      assert.deepEqual(
        await page.evaluate(() => state.players.map((name, i) => store.scores[name]?.points || 0)),
        await page.evaluate(() => state.players.map((_, i) => (isSpy(i) ? 0 : 40))),
      );
    },
  );
  await check(
    'Two-spy voting catches both leaders, boundary ties protect spies and scores use the round roster',
    async (page) => {
      await start(page, { spycount: 2 });
      await page.evaluate(() => {
        state.spy = 0;
        state.spies = [0, 1];
      });
      await discuss(page);
      await page.evaluate(() => {
        store.players = ['شخص جديد', 'اسم آخر', 'ضيف'];
      });
      await vote(page, [1, 0, 0, 1, 0]);
      assert.match(await page.locator('.success h2').innerText(), /كشفتم الجاسوسين/);
      assert.deepEqual(await page.evaluate(() => state.accused), [0, 1]);
      assert.deepEqual(
        await page.evaluate(() => state.players.map((name) => store.scores[name]?.points || 0)),
        [0, 0, 40, 40, 40],
      );
      assert.equal(await page.evaluate(() => store.scores['شخص جديد']?.points || 0), 0);
      await page.evaluate(() => {
        store.players = ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة'];
      });
      await start(page, { spycount: 2 });
      await page.evaluate(() => {
        state.spy = 0;
        state.spies = [0, 1];
      });
      await discuss(page);
      await vote(page, [1, 0, 0, 2, 3]);
      assert.match(await page.locator('.success h2').innerText(), /تعادلت/);
      assert.deepEqual(await page.evaluate(() => state.accused), []);
      assert.deepEqual(
        await page.evaluate(() => state.players.map((name) => store.scores[name]?.points || 0)),
        [40, 40, 0, 0, 0],
      );
    },
  );
  await check(
    'Single-spy votes and timeouts retain the original outcome and guard duplicate ballots',
    async (page) => {
      await start(page, { spycount: 1 });
      await page.evaluate(() => {
        state.spy = 0;
        state.spies = [0];
      });
      await discuss(page);
      await vote(page, [1, 0, 0, 0, 0]);
      assert.match(await page.locator('.success h2').innerText(), /كشفتم الجاسوس!/);
      await start(page, { spytheme: 'animals' });
      await discuss(page);
      await page.evaluate(() => {
        state.endAt = Date.now() - 1;
        nextSpyPrompt();
        spyVoteReveal();
        const voter = state.voteTurn,
          run = state.run;
        castSpyVote(1, voter, run);
        castSpyVote(1, voter, run);
      });
      assert.equal(await page.evaluate(() => state.votes.length), 1);
      assert.equal(await page.evaluate(() => state.stage), 'vote-handoff');
    },
  );
  await check('Setup and full general word list fit small phones offline', async (page) => {
    await page.context().setOffline(true);
    await page.evaluate(() => setup('spy'));
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
    }
    await start(page);
    await discuss(page);
    await page.locator('.spy-candidates summary').click();
    await page.setViewportSize({ width: 320, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    assert.ok((await page.locator('.spy-candidates .listchips span').count()) > 350);
  });
  console.log(`${passed} spy v11 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
