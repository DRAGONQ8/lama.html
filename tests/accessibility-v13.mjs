import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

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
const report = { screens: 0, violations: [], errors: [], externalRequests: [] };
async function inspect(page, label) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.screens++;
  if (report.screens % 10 === 0)
    console.log(`Accessibility: ${report.screens} screens checked (${label})`);
  for (const violation of violations) {
    report.violations.push({
      label,
      rule: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map(({ target, html, failureSummary }) => ({
        target,
        html,
        failureSummary,
      })),
    });
  }
}
try {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push(error.message));
    page.on('request', (request) => {
      if (!request.url().startsWith(`http://127.0.0.1:${server.address().port}`))
        report.externalRequests.push(request.url());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate((theme) => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.theme = theme;
      store.extra.motion = false;
      applySettings();
      home();
    }, theme);
    await inspect(page, `${theme}:home`);
    for (const id of await page.evaluate(() => games.map((entry) => entry[0]))) {
      await page.evaluate((id) => setup(id), id);
      await inspect(page, `${theme}:${id}:setup`);
      await page.locator('#app button').evaluateAll((buttons) => {
        const start = buttons.find((button) =>
          /\bstart\w*\(/.test(button.getAttribute('onclick') || ''),
        );
        if (!start) throw Error('Missing start button');
        start.click();
      });
      assert.equal(await page.evaluate(() => screen), id, `Cannot audit ${id}`);
      await inspect(page, `${theme}:${id}:play`);
      await page.evaluate(() => home());
    }
    for (const action of [
      "openSettings('appearance')",
      "openSettings('play')",
      "openSettings('data')",
      'openPeople()',
      'openBoard()',
      'openGuide()',
      'openDaily()',
      'openProfile()',
      'openLounge()',
      'openTournament()',
      'openSoloHub()',
    ]) {
      await page.evaluate((action) => {
        closeModal(true);
        home();
        // Actions are this test's fixed local list, never user input.
        window.eval(action);
      }, action);
      await inspect(page, `${theme}:${action}`);
    }
    await context.close();
    console.log(`✓ ${theme}: accessibility audit completed for all games and shared screens`);
  }
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../test-results/accessibility-v13.json', import.meta.url),
    JSON.stringify(report, null, 2),
  );
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  assert.deepEqual(
    report.violations.map(({ label, rule }) => ({ label, rule })),
    [],
    'See test-results/accessibility-v13.json for actionable accessibility findings',
  );
  console.log(`✓ ${report.screens} screens passed axe WCAG A/AA checks without disabled rules`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
