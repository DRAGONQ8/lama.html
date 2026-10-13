import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (name) => readFile(new URL('../' + name, import.meta.url), 'utf8'),
  build = await read('scripts/build.mjs'),
  names = (kind) =>
    [
      ...build.match(new RegExp(`const ${kind} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((match) => match[1]);
const scriptNames = names('scripts'),
  styleNames = names('styles');
if (!scriptNames.includes('navigation'))
  scriptNames.splice(scriptNames.indexOf('boot'), 0, 'navigation');
if (!styleNames.includes('navigation')) styleNames.push('navigation');
const source = (await Promise.all(scriptNames.map((name) => read(`src/${name}.js`)))).join('\n'),
  styles = (
    await Promise.all(
      styleNames.map((name) =>
        read(`src/${name}.css`).catch((error) => {
          if (error.code === 'ENOENT' && name !== 'styles') return '';
          throw error;
        }),
      ),
    )
  ).join('\n');
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => source)
  .replace('/* BUILD_STYLES */', () => styles);
const server = createServer((request, response) => {
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
async function check(name, test, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 } }),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      save();
      home('top');
    });
    await test(page, context);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function pickCard(page, id) {
  const card = page.locator(`#catalog .cardstart[onclick="setup('${id}')"]`);
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  return {
    card,
    before: await card.evaluate((element) => ({
      y: scrollY,
      top: element.getBoundingClientRect().top,
    })),
  };
}
async function verifyReturn(page, id, before) {
  await page.waitForFunction(() => screen === 'home');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const current = await page
    .locator(`#catalog .cardstart[onclick="setup('${id}')"]`)
    .evaluate((element) => ({
      y: scrollY,
      top: element.getBoundingClientRect().top,
      focused: document.activeElement === element,
    }));
  assert.ok(current.y > 200, 'Returning to the catalogue jumped to the home hero');
  assert.ok(
    Math.abs(current.top - before.top) < 3,
    `Card moved from ${before.top} to ${current.top}`,
  );
  assert.equal(current.focused, true, 'Focus did not return to the originating catalogue card');
}
async function findRandom(page, mode, target) {
  return page.evaluate(
    ({ mode, target }) => {
      const count = randomGameChoices(mode).length;
      for (let i = 0; i < count * 2 + 1; i++) {
        if (screen !== 'home') home();
        const id = chooseRandomGame(mode);
        if (id === target) return id;
      }
      throw Error(`Random bag did not include ${target}`);
    },
    { mode, target },
  );
}
try {
  for (const width of [390, 1440])
    await check(
      `${width}px: setup exit restores catalogue card, scroll and keyboard focus`,
      async (page) => {
        await page.evaluate(() => {
          world = 'brain';
          filter = 'solo';
          experience().sort = 'name';
          renderHome();
        });
        const { card, before } = await pickCard(page, 'memory');
        await card.click();
        assert.equal(await page.evaluate(() => screen), 'setup');
        await page.locator('.playtools button[onclick="home()"]').click();
        await verifyReturn(page, 'memory', before);
      },
      width,
    );
  await check(
    'Pause exit returns to the catalogue without changing the checkpoint or filters',
    async (page) => {
      const { card, before } = await pickCard(page, 'slide');
      await card.click();
      await page.locator('button[onclick="startExtra(\'slide\')"]').click();
      await page.evaluate(() => {
        showPause();
      });
      await page.locator('#pausecover button[onclick="home()"]').click();
      await verifyReturn(page, 'slide', before);
      assert.equal(await page.evaluate(() => store.extra.savedSession?.id), 'slide');
    },
  );
  await check(
    'A rapid exit and new launch cannot apply an old catalogue scroll to the new setup',
    async (page) => {
      const { card } = await pickCard(page, 'memory');
      await card.click();
      await page.evaluate(() => {
        home();
        setup('solo');
      });
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(await page.evaluate(() => screen), 'setup');
      assert.equal(await page.evaluate(() => state.id), 'solo');
      assert.equal(await page.evaluate(() => scrollY), 0);
    },
  );
  await check(
    'Result exit keeps the filtered catalogue and records no duplicate result',
    async (page) => {
      await page.evaluate(() => {
        world = 'guess';
        filter = 'solo';
        renderHome();
      });
      const { card, before } = await pickCard(page, 'solo');
      await card.click();
      await page.evaluate(() => {
        startNumber('solo');
        $('guessInput').value = state.secret.toString();
        guessSolo();
      });
      const rounds = await page.evaluate(() => totalRounds());
      await page.locator('.success button[onclick="home()"]').click();
      await verifyReturn(page, 'solo', before);
      assert.deepEqual(await page.evaluate(() => [world, filter]), ['guess', 'solo']);
      assert.equal(await page.evaluate(() => totalRounds()), rounds);
    },
  );
  await check(
    'Search, favorite, world and sort choices survive an unrelated game-view mutation',
    async (page) => {
      await page.evaluate(() => {
        store.extra.favorites = ['nonogram'];
        world = 'brain';
        filter = 'solo';
        onlyFavorites = true;
        searchQuery = games.find((game) => game[0] === 'nonogram')[2];
        experience().sort = 'name';
        renderHome();
      });
      const wanted = await page.evaluate(() => ({
        world,
        filter,
        onlyFavorites,
        searchQuery,
        sort: experience().sort,
      }));
      const { card, before } = await pickCard(page, 'nonogram');
      await card.click();
      await page.evaluate(() => {
        world = 'arcade';
        filter = 'group';
        onlyFavorites = false;
        searchQuery = 'غير موجود';
        experience().sort = 'popular';
        home();
      });
      await verifyReturn(page, 'nonogram', before);
      assert.deepEqual(
        await page.evaluate(() => ({
          world,
          filter,
          onlyFavorites,
          searchQuery,
          sort: experience().sort,
        })),
        wanted,
      );
      assert.equal(await page.locator('#catalog .gamecard').count(), 1);
    },
  );
  await check(
    'Route exit restores the expanded discovery panel and its launch control',
    async (page) => {
      await page.locator('.discover-drawer > summary').click();
      const route = page.locator('.route-card[onclick="openRoute(\'focus\')"]');
      await route.scrollIntoViewIfNeeded();
      await route.focus();
      const top = await route.evaluate((element) => element.getBoundingClientRect().top);
      await route.click();
      await page.locator('button[onclick="startRoute(\'focus\')"]').click();
      await page.locator('.playtools button[onclick="home()"]').click();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(
        await page.locator('.discover-drawer').evaluate((element) => element.open),
        true,
      );
      assert.equal(await route.evaluate((element) => document.activeElement === element), true);
      assert.ok(
        Math.abs((await route.evaluate((element) => element.getBoundingClientRect().top)) - top) <
          3,
      );
      assert.equal(await page.evaluate(() => store.extra.experience.route?.id), 'focus');
    },
  );
  await check(
    'Browser Back restores home; Forward opens a fresh setup without replaying results',
    async (page) => {
      const { card, before } = await pickCard(page, 'solo');
      await card.click();
      await page.evaluate(() => {
        startNumber('solo');
        $('guessInput').value = state.secret.toString();
        guessSolo();
      });
      const rounds = await page.evaluate(() => totalRounds());
      await page.evaluate(() => history.back());
      await verifyReturn(page, 'solo', before);
      await page.evaluate(() => history.forward());
      await page.waitForFunction(() => screen === 'setup' && state?.id === 'solo');
      assert.equal(await page.evaluate(() => totalRounds()), rounds);
      assert.equal(await page.evaluate(() => state.done === true), false);
      await page.evaluate(() => home('top'));
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(await page.evaluate(() => scrollY), 0);
    },
  );
  await check(
    'Solo, duo and group random bags exhaust eligible games before repeating',
    async (page) => {
      for (const mode of ['solo', 'duo', 'group']) {
        const result = await page.evaluate((mode) => {
          home('top');
          const eligible = randomGameChoices(mode),
            picks = [];
          for (let i = 0; i < eligible.length; i++) {
            if (screen !== 'home') home();
            const id = chooseRandomGame(mode);
            picks.push(id);
            if (screen !== 'setup' || state.id !== id)
              throw Error('A random pick started gameplay');
            if (
              ['ttt', 'connect'].includes(id) &&
              $('opponent').value !== (mode === 'solo' ? 'bot' : 'friend')
            )
              throw Error('Wrong board audience');
            if (id === 'memory' && $('memoryplay')?.value !== (mode === 'duo' ? 'duo' : 'solo'))
              throw Error('Wrong memory audience');
            if (id === 'reaction' && $('group').checked !== (mode !== 'solo'))
              throw Error('Wrong reaction audience');
          }
          home();
          return { eligible, picks, next: chooseRandomGame(mode) };
        }, mode);
        assert.equal(new Set(result.picks).size, result.eligible.length);
        assert.deepEqual([...result.picks].sort(), [...result.eligible].sort());
        assert.notEqual(result.next, result.picks.at(-1));
      }
    },
  );
  await check(
    'Random eligibility respects the roster and ignores incompatible catalogue filters',
    async (page) => {
      const result = await page.evaluate(() => {
        store.players = ['أحمد'];
        home('top');
        world = 'party';
        filter = 'group';
        searchQuery = 'لا توجد';
        onlyFavorites = true;
        renderHome();
        const solo = chooseRandomGame('solo');
        home();
        const duo = chooseRandomGame('duo'),
          duoStayedHome = screen === 'home';
        closeModal();
        const group = chooseRandomGame('group'),
          groupStayedHome = screen === 'home';
        closeModal();
        store.players = ['أحمد', 'ليلى', 'سالم'];
        const three = randomGameChoices('group');
        store.players.push('نورة');
        const four = randomGameChoices('group');
        return {
          solo,
          soloAllowed: soloGameIds.has(solo),
          duo,
          duoStayedHome,
          group,
          groupStayedHome,
          three,
          four,
        };
      });
      assert.equal(result.soloAllowed, true);
      assert.equal(result.duo, null);
      assert.equal(result.group, null);
      assert.equal(result.duoStayedHome, true);
      assert.equal(result.groupStayedHome, true);
      assert.ok(!result.three.includes('teamcup'));
      assert.ok(result.four.includes('teamcup'));
      assert.ok(
        !result.four.some((id) => ['ttt', 'connect', 'finder', 'mind', 'memory'].includes(id)),
      );
    },
  );
  await check(
    'Random duo party and reaction launches use an explicit pair without changing the roster',
    async (page) => {
      for (const id of ['mime', 'secret', 'taboo', 'reaction']) {
        await findRandom(page, 'duo', id);
        const before = await page.evaluate(() => [...store.players]);
        await page.locator('#randomPairFirst').selectOption('سالم');
        await page.locator('#randomPairSecond').selectOption('نورة');
        const action =
          id === 'mime'
            ? 'startMime()'
            : id === 'secret'
              ? 'startSecret()'
              : id === 'reaction'
                ? 'startReaction()'
                : "startExtra('taboo')";
        await page.locator(`button[onclick="${action}"]`).click();
        assert.deepEqual(await page.evaluate(() => state.players), ['سالم', 'نورة']);
        assert.deepEqual(await page.evaluate(() => store.players), before);
        assert.deepEqual(
          await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).players),
          before,
        );
        await page.evaluate(() => home());
      }
    },
  );
  await check(
    'A stale random-duo pair cannot start after a roster change in another tab',
    async (page, context) => {
      await findRandom(page, 'duo', 'reaction');
      const other = await context.newPage();
      await other.goto(url);
      await other.evaluate(() => {
        store.players = ['أحمد'];
        save();
      });
      await page.waitForFunction(() => store.players.length === 1);
      await page.locator('button[onclick="startReaction()"]').click();
      assert.equal(await page.evaluate(() => screen), 'setup');
      assert.equal(await page.evaluate(() => state.id), 'reaction');
      assert.deepEqual(await page.evaluate(() => selectedGameParticipants('reaction')), []);
      await other.close();
    },
  );
  await check(
    'Hidden and detached random buttons do not consume a bag or replace a live game',
    async (page) => {
      const outcome = await page.evaluate(() => {
        $('app').insertAdjacentHTML('afterbegin', randomPickButtonsHTML());
        const button = document.querySelector('button[onclick="chooseRandomGame(\'solo\')"]');
        openGuide();
        button.click();
        const blocked = screen === 'home' && !navigationRandomBags.has('solo');
        closeModal();
        button.click();
        const first = state;
        button.click();
        const stale = state === first && screen === 'setup';
        home();
        const old = button;
        old.click();
        return { blocked, stale, detachedStayedHome: screen === 'home' };
      });
      assert.deepEqual(outcome, { blocked: true, stale: true, detachedStayedHome: true });
    },
  );
  console.log(`Navigation v9: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
