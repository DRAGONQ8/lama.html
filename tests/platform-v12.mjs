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
let passed = 0;
async function check(name, fn) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة', 'خالد'];
      store.extra.motion = false;
    });
    await fn(page);
    assert.deepEqual(errors, []);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Every game guide exposes its actual controls, and F1 preserves a live round',
    async (page) => {
      const count = await page.evaluate(() => {
        for (const [id] of games) {
          openGuide(id);
          if (!$('modal').textContent.includes(games.find((g) => g[0] === id)[2]))
            throw Error(id + ' missing guide');
          if (gameControlTips[id] && !$('modal').querySelector('.guide-controls'))
            throw Error(id + ' missing controls');
          closeModal();
        }
        setup('math');
        startExtra('math');
        return games.length;
      });
      assert.equal(count, 37);
      await page.keyboard.press('F1');
      assert.equal(await page.locator('#modalback').isVisible(), true);
      assert.equal(await page.evaluate(() => !!state.pausedAt), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => !!state.pausedAt), false);
    },
  );
  await check('Page freeze hides secret cards and preserves typed private words', async (page) => {
    const value = await page.evaluate(() => {
      setup('secret');
      startSecret();
      revealSecret();
      $('customword').value = 'غيمة سرية';
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      const hidden =
        !!$('pausecover') &&
        state.stage !== 'revealed' &&
        !document.querySelector('.secret')?.textContent.includes('غيمة سرية');
      const word = state.word;
      resumeGame();
      return { hidden, word, paused: !!state.pausedAt };
    });
    assert.deepEqual(value, { hidden: true, word: 'غيمة سرية', paused: false });
  });
  await check('Mind cannot score before a single candidate is confirmed', async (page) => {
    const value = await page.evaluate(() => {
      setup('mind');
      startMind();
      const before = totalRounds(),
        candidates = state.candidates.length;
      confirmMind(true);
      return { candidates, before, after: totalRounds(), done: !!state.done };
    });
    assert.ok(value.candidates > 1);
    assert.equal(value.before, value.after);
    assert.equal(value.done, false);
  });
  console.log(`\n${passed} platform v12 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
