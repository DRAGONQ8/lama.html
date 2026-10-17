import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(
  process.env.LAMMA_TEST_HTML || new URL('../lamma_universe.html', import.meta.url),
  'utf8',
);
const server = createServer((_, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => {
    store.players = ['خاص-927641-اسم', 'خاص-927641-ثاني'];
    store.extra.theme = 'light';
    applySettings();
    home();
    const secret = document.createElement('p');
    secret.textContent = 'خاص-927641-سر-الجولة';
    $('app').append(secret);
    openSettings('data');
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button[onclick="downloadStandalone()"]').click(),
  ]);
  assert.equal(download.suggestedFilename(), 'lamma_universe.html');
  const downloaded = await readFile(await download.path(), 'utf8');
  assert.match(downloaded, /^<!doctype html>/i);
  assert.equal(downloaded.includes('خاص-927641'), false, 'Download leaked private live data');
  assert.equal(/<script[^>]+src=|<link[^>]+stylesheet/i.test(downloaded), false);
  console.log('✓ Download from settings contains the original game, without live names or secrets');

  const offline = await browser.newContext();
  await offline.setOffline(true);
  const game = await offline.newPage(),
    requests = [];
  game.on('pageerror', (error) => errors.push(error.message));
  game.on('request', (request) => requests.push(request.url()));
  await game.setContent(downloaded);
  assert.equal(await game.locator('.gamecard').count(), 37);
  await game.evaluate(() => {
    store.players = ['أحمد', 'سالم', 'نورة', 'مريم'];
    store.extra.motion = false;
  });
  for (const id of await game.evaluate(() => games.map((entry) => entry[0]))) {
    await game.evaluate((id) => setup(id), id);
    await game.locator('#app button').evaluateAll((buttons) => {
      const start = buttons.find((button) =>
        /\bstart\w*\(/.test(button.getAttribute('onclick') || ''),
      );
      if (!start) throw Error('Missing start button');
      start.click();
    });
    assert.equal(await game.evaluate(() => screen), id, `${id} did not start offline`);
    await game.evaluate(() => home());
  }
  assert.deepEqual(requests, [], 'Downloaded game requested external resources');
  assert.deepEqual(errors, []);
  console.log('✓ The downloaded bytes start all 37 games with networking disabled');
  await offline.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
