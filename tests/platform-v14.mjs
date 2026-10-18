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
    ].map((entry) => entry[1]);
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
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, test) {
  if (process.env.PLATFORM_V14_CHECK && !name.includes(process.env.PLATFORM_V14_CHECK)) return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      store.sound = false;
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}

try {
  await check('Catalogue filters retain keyboard focus and its visible position', async (page) => {
    await page.evaluate(() => home('top'));
    const control = page.locator('.filter button[onclick="setFilter(\'solo\')"]');
    await control.scrollIntoViewIfNeeded();
    await control.focus();
    const oldTop = await control.evaluate((element) => element.getBoundingClientRect().top);
    await page.keyboard.press('Enter');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('onclick')),
      "setFilter('solo')",
    );
    assert.equal(await page.evaluate(() => filter), 'solo');
    const newTop = await page
      .locator('.filter button[aria-pressed="true"]')
      .first()
      .evaluate((element) => element.getBoundingClientRect().top);
    assert.ok(Math.abs(newTop - oldTop) < 2, `${oldTop} -> ${newTop}`);
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('onclick')),
      "setFilter('duo')",
    );
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => filter), 'duo');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('onclick')),
      "setFilter('duo')",
    );
  });
  await check(
    'RTL world navigation supports arrows, Home and End without changing selection',
    async (page) => {
      await page.evaluate(() => home('top'));
      const first = page.locator('.worldtabs button').first();
      await first.focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(
        await page.evaluate(
          () => document.activeElement === document.querySelectorAll('.worldtabs button')[1],
        ),
        true,
      );
      assert.equal(await page.evaluate(() => world), 'all');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => world), 'arcade');
      assert.equal(
        await page.evaluate(
          () => document.activeElement === document.querySelector('.worldtabs button:last-child'),
        ),
        true,
      );
      await page.keyboard.press('Home');
      assert.equal(
        await page.evaluate(
          () => document.activeElement === document.querySelector('.worldtabs button'),
        ),
        true,
      );
    },
  );
  await check(
    'Catalogue combines worlds, favorites and Arabic search while preserving active choices',
    async (page) => {
      await page.evaluate(() => {
        home('top');
        store.extra.favorites = ['memory', 'spy', 'pipes', 'flags'];
      });
      await page.locator('button[onclick="toggleFavorites()"]').click();
      assert.equal(await page.locator('.gamecard').count(), 4);
      await page.locator('.worldtabs button[onclick="setWorld(\'brain\')"]').click();
      assert.equal(await page.locator('.gamecard').count(), 2);
      await page.locator('#search').fill('الذاكرة');
      assert.equal(await page.locator('.gamecard').count(), 1);
      assert.match(await page.locator('.gamecard h3').innerText(), /الذاكرة/);
      await page.locator('.filter button[onclick="setFilter(\'solo\')"]').click();
      assert.equal(await page.locator('.gamecard').count(), 1);
      assert.equal(await page.locator('#search').inputValue(), 'الذاكرة');
      await page.locator('button[onclick="clearFilters()"]').first().click();
      await page.locator('#search').fill('كَاسِحَة');
      assert.equal(await page.locator('.gamecard').count(), 1);
      assert.match(await page.locator('.gamecard h3').innerText(), /كاسحة/);
      await page.locator('.filter button[onclick="setFilter(\'new\')"]').click();
      assert.equal(await page.evaluate(() => filter), 'new');
      assert.equal(await page.locator('.emptylist').count(), 1);
      await page.locator('.emptylist button').click();
      assert.equal(await page.locator('.gamecard').count(), 37);
    },
  );
  await check('Removing the last favorite keeps a useful focus target', async (page) => {
    await page.evaluate(() => {
      home('top');
      store.extra.favorites = ['memory'];
      onlyFavorites = true;
      renderHome();
    });
    const star = page.locator('#catalog .fav');
    await star.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.emptylist').count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
    await page.locator('.emptylist button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.gamecard').count(), 37);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
  });
  await check(
    'Browse-all shortcut focuses the catalogue and respects reduced motion',
    async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => {
        home('top');
        store.extra.motion = true;
        applySettings();
      });
      await page.locator('button[onclick="scrollCatalog(true)"]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'gamesheading');
      assert.equal(
        await page.evaluate(() => document.body.classList.contains('reduced-motion')),
        true,
      );
      assert.ok(
        await page
          .locator('#gamesheading')
          .evaluate((el) => el.getBoundingClientRect().top < innerHeight),
      );
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const font of ['Arial, sans-serif', 'serif', 'monospace']) {
          await page.evaluate((font) => {
            document.body.style.fontFamily = font;
            home('top');
          }, font);
          const layout = await page.evaluate(() => ({
            bottom: document.querySelector('.lobby-hero').getBoundingClientRect().bottom,
            width: document.documentElement.scrollWidth,
          }));
          assert.ok(layout.bottom < 650, `${width}px ${font}: hero reaches ${layout.bottom}px`);
          assert.ok(layout.width <= width + 1, `${width}px ${font}: page overflow`);
        }
      }
    },
  );
  await check(
    'World choice retains search and favorite settings through render and back',
    async (page) => {
      await page.evaluate(() => {
        home('top');
        searchGames('الذاكرة');
        store.extra.favorites = ['memory'];
        onlyFavorites = true;
        renderHome();
      });
      // Use the registered world rather than relying on the label's spelling.
      const action = await page.evaluate(() => "setWorld('" + gameWorld.memory + "')");
      await page.locator(`.worldtabs button[onclick="${action}"]`).click();
      assert.equal(await page.locator('.gamecard').count(), 1);
      await page.locator('.cardstart').click();
      await page.goBack();
      assert.equal(await page.locator('#search').inputValue(), 'الذاكرة');
      assert.equal(await page.evaluate(() => onlyFavorites), true);
      assert.equal(await page.locator('.gamecard').count(), 1);
    },
  );
  await check(
    'Automatic theme updates browser chrome and native controls with the device',
    async (page) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => {
        store.extra.theme = 'system';
        applySettings();
      });
      assert.equal(await page.locator('html').evaluate((el) => el.style.colorScheme), 'dark');
      assert.equal(
        await page.locator('meta[name="theme-color"]').getAttribute('content'),
        '#0d101b',
      );
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.body.dataset.theme === 'light');
      assert.equal(await page.locator('html').evaluate((el) => el.style.colorScheme), 'light');
      assert.equal(
        await page.locator('meta[name="theme-color"]').getAttribute('content'),
        '#edf2f8',
      );
      await page.evaluate(() => {
        store.extra.theme = 'dark';
        applySettings();
      });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.emulateMedia({ colorScheme: 'light' });
      assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
    },
  );
  await check(
    'Numeric progress and results keep current/total order in all 37 RTL games',
    async (page) => {
      await page.evaluate(() => {
        store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
        home('top');
      });
      for (const id of await page.evaluate(() => games.map((g) => g[0]))) {
        await page.evaluate((id) => setup(id), id);
        await page.locator('#app button').evaluateAll((buttons) => {
          const start = buttons.find((button) =>
            /\bstart\w*\(/.test(button.getAttribute('onclick') || ''),
          );
          if (!start) throw Error('Missing start');
          start.click();
        });
        const reversed = await page.evaluate(() => {
          const walker = document.createTreeWalker($('app'), NodeFilter.SHOW_TEXT);
          const found = [];
          while (walker.nextNode()) {
            const node = walker.currentNode,
              el = node.parentElement;
            if (
              /\d+\s*\/\s*\d+/.test(node.textContent) &&
              el.getClientRects().length &&
              !el.closest('[hidden]') &&
              getComputedStyle(el).direction !== 'ltr'
            )
              found.push(node.textContent.trim());
          }
          return found;
        });
        assert.deepEqual(reversed, [], `${id}: reversed numeric progress`);
        assert.equal(await page.locator('#app h1').count(), 1, `${id}: main game heading`);
        await page.evaluate(() => home());
      }
      await page.evaluate(() => {
        setup('who');
        startWho();
        result('who', 'نتيجة', 'مراجعة', 0, '3 / 10');
      });
      assert.equal(
        await page.locator('.resultnum bdi').evaluate((el) => getComputedStyle(el).direction),
        'ltr',
      );
      assert.equal(await page.locator('.resultnum').innerText(), '3 / 10');
    },
  );
  console.log(`\n${passed} platform v14 browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
