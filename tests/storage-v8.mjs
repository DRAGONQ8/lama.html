import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const manifest = await read('scripts/build.mjs');
const names = (kind) =>
  [
    ...manifest.match(new RegExp(`const ${kind} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
  ].map((match) => match[1]);
const scripts = (await Promise.all(names('scripts').map((name) => read(`src/${name}.js`)))).join(
  '\n',
);
const styles = (await Promise.all(names('styles').map((name) => read(`src/${name}.css`)))).join(
  '\n',
);
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => scripts)
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
const errors = [];
async function tabs(test) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.addEventListener(
      'storage',
      (event) => {
        if (window.auditBlockStorage) event.stopImmediatePropagation();
      },
      true,
    );
  });
  const a = await context.newPage(),
    b = await context.newPage();
  for (const page of [a, b]) page.on('pageerror', (error) => errors.push(error.message));
  await a.goto(url);
  await b.goto(url);
  try {
    await test(a, b);
  } finally {
    await context.close();
  }
  passed++;
}
async function win(page) {
  return page.evaluate(() => {
    home();
    setup('solo');
    startNumber('solo');
    $('guessInput').value = state.secret.toString();
    guessSolo();
    return store.extra.history.find((row) => row.id === 'solo')?.points || 0;
  });
}
async function score(page) {
  return page.evaluate(() => store.scores['أنا'] || { points: 0, rounds: 0 });
}
async function untilScore(page, rounds) {
  await page.waitForFunction((rounds) => (store.scores['أنا']?.rounds || 0) === rounds, rounds);
}
try {
  await tabs(async (a, b) => {
    const earned = await win(a);
    await untilScore(b, 1);
    await b.evaluate(() => toggleSound());
    await a.reload();
    assert.deepEqual(await score(a), { points: earned, rounds: 1 });
    assert.equal(await a.evaluate(() => store.sound), true);
    console.log('✓ A setting change in a second tab preserves the completed round');
  });
  await tabs(async (a) => {
    const earned = await win(a);
    const actor = await a.evaluate(() => storageWriter);
    for (let i = 0; i < 8; i++) {
      await a.reload();
      assert.equal(await a.evaluate(() => storageWriter), actor);
      assert.deepEqual(await score(a), { points: earned, rounds: 1 });
    }
    const next = await win(a);
    assert.deepEqual(await score(a), { points: earned + next, rounds: 2 });
    assert.equal(
      await a.evaluate(
        () => Object.keys(JSON.parse(localStorage.getItem(KEY))._sync.writers).length,
      ),
      1,
    );
    console.log('✓ Repeated reloads reuse one acknowledged tab actor without growing the ledger');
  });
  await tabs(async (a, b) => {
    const fixed = 1800000000000;
    for (const page of [a, b])
      await page.evaluate((fixed) => {
        Date.now = () => fixed;
      }, fixed);
    await win(a);
    await untilScore(b, 1);
    await win(b);
    await untilScore(a, 2);
    const rows = await a.evaluate(() => store.extra.history.filter((row) => row.id === 'solo'));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].at, rows[1].at);
    assert.equal(rows[0].points, rows[1].points);
    assert.notEqual(rows[0].rid, rows[1].rid);
    await a.reload();
    assert.equal(
      await a.evaluate(() => store.extra.history.filter((row) => row.id === 'solo').length),
      2,
    );
    console.log('✓ Identical same-millisecond rounds retain separate history identities');
  });
  await tabs(async (a, b) => {
    for (const page of [a, b])
      await page.evaluate(() => {
        window.auditNativeSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === KEY) {
            window.auditDeferred = value;
            return;
          }
          return window.auditNativeSetItem.call(this, key, value);
        };
      });
    const gains = await Promise.all([win(a), win(b)]);
    await Promise.all(
      [a, b].map((page) =>
        page.evaluate(() => {
          Storage.prototype.setItem = window.auditNativeSetItem;
          window.auditNativeSetItem.call(localStorage, KEY, window.auditDeferred);
        }),
      ),
    );
    await untilScore(a, 2);
    await untilScore(b, 2);
    const expected = { points: gains[0] + gains[1], rounds: 2 };
    assert.deepEqual(await score(a), expected);
    assert.deepEqual(await score(b), expected);
    for (const page of [a, b])
      await page.evaluate(() => {
        save();
        save();
      });
    await a.reload();
    await b.reload();
    assert.deepEqual(await score(a), expected);
    assert.deepEqual(await score(b), expected);
    assert.equal(await a.evaluate(() => store.extra.played.solo), 2);
    console.log('✓ Racing snapshots converge to both contributions and repeat saves add nothing');
  });
  await tabs(async (a, b) => {
    await a.evaluate(() => {
      store.extra.favorites = ['memory'];
      save();
    });
    await b.waitForFunction(() => store.extra.favorites.includes('memory'));
    await b.evaluate(() => {
      window.auditBlockStorage = true;
    });
    await a.evaluate(() => {
      store.extra.favorites = ['solo'];
      store.extra.preferences.memory = { difficulty: '4' };
      save();
    });
    // Prove B still has its old view while A's removal is already committed.
    const staleViews = await Promise.all(
      [a, b].map((page) =>
        page.evaluate(() => ({
          current: store.extra.favorites,
          base: storageBaseline.extra.favorites,
          stored: JSON.parse(localStorage.getItem(KEY)).extra.favorites,
        })),
      ),
    );
    assert.deepEqual(staleViews, [
      { current: ['solo'], base: ['solo'], stored: ['solo'] },
      { current: ['memory'], base: ['memory'], stored: ['solo'] },
    ]);
    await b.evaluate(() => {
      store.extra.favorites.push('code');
      store.extra.preferences.memory = { memoryTheme: 'food' };
      save();
      window.auditBlockStorage = false;
    });
    await a.waitForFunction(() => store.extra.favorites.includes('code'));
    assert.deepEqual((await a.evaluate(() => store.extra.favorites)).sort(), ['code', 'solo']);
    assert.deepEqual(await a.evaluate(() => store.extra.preferences.memory), {
      difficulty: '4',
      memoryTheme: 'food',
    });
    console.log(
      '✓ Concurrent settings merge independent fields and keep a removed favorite removed',
    );
  });
  await tabs(async (a, b) => {
    await win(a);
    await untilScore(b, 1);
    await b.evaluate(() => {
      window.auditBlockStorage = true;
    });
    await a.evaluate(() => resetScores());
    await b.evaluate(() => {
      toggleSound();
      window.auditBlockStorage = false;
    });
    assert.deepEqual(await score(b), { points: 0, rounds: 0 });
    await a.reload();
    assert.deepEqual(await score(a), { points: 0, rounds: 0 });
    console.log('✓ An old tab cannot resurrect counters after an explicit reset');
  });
  await tabs(async (a, b) => {
    await win(a);
    await untilScore(b, 1);
    await b.evaluate(() => {
      window.auditBlockStorage = true;
    });
    await a.evaluate(async () => {
      const backup = {
        format: 'lamma-universe',
        version: 3,
        data: {
          players: ['جديد'],
          scores: { جديد: { points: 7, rounds: 1 } },
          sound: false,
          extra: {},
        },
      };
      await importProgress(new File([JSON.stringify(backup)], 'backup.json'));
      confirmImport();
    });
    await b.evaluate(() => {
      toggleSound();
      window.auditBlockStorage = false;
    });
    assert.deepEqual(await b.evaluate(() => store.players), ['جديد']);
    assert.deepEqual(await b.evaluate(() => store.scores), { جديد: { points: 7, rounds: 1 } });
    assert.equal(await b.evaluate(() => Object.hasOwn(store, '_sync')), false);
    console.log(
      '✓ Backup import replaces the generation and leaves transport metadata outside backups',
    );
  });
  await tabs(async (a, b) => {
    await a.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      save();
    });
    await b.waitForFunction(() => store.players.length === 3);
    const privateView = await b.evaluate(() => {
      setup('spy');
      startExtra('spy');
      spyReveal();
      window.auditActiveState = state;
      return document.querySelector('.secretcover').textContent;
    });
    await a.evaluate(() => {
      store.extra.theme = 'light';
      save();
    });
    await b.waitForFunction(() => store.extra.theme === 'light');
    assert.equal(await b.evaluate(() => state === window.auditActiveState), true);
    assert.equal(
      await b.evaluate(() => document.querySelector('.secretcover').textContent),
      privateView,
    );
    assert.equal(await b.evaluate(() => screen), 'spy');
    console.log('✓ Incoming settings preserve the active private role and game state');
  });
  await tabs(async (a) => {
    await a.evaluate(() => {
      window.auditNativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException('Full', 'QuotaExceededError');
      };
      setup('reaction');
      state.name = 'constructor';
      legacyAddScore('constructor', 12);
      Storage.prototype.setItem = window.auditNativeSetItem;
      save();
      save();
    });
    await a.reload();
    assert.deepEqual(await a.evaluate(() => store.scores.constructor), { points: 12, rounds: 1 });
    console.log(
      '✓ Failed storage writes can retry once without duplicating prototype-like player names',
    );
  });
  assert.deepEqual(errors, [], 'Cross-tab browser errors');
  console.log(`Storage v8: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
