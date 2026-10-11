import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, run, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    ...options,
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.extra.motion = false;
      applySettings();
    });
    await run(page);
    assert.deepEqual(errors, [], name + ': browser exceptions');
    passed++;
    console.log('✓ ' + name);
  } catch (error) {
    await page.screenshot({
      path: `test-results/playflow-failure-${passed + 1}.png`,
      fullPage: true,
    });
    throw error;
  } finally {
    await context.close();
  }
}
async function startSolo(page) {
  await page.evaluate(() => setup('solo'));
  await page.locator('button[onclick="startNumber(\'solo\')"]').click();
  await page.evaluate(() => (state.secret = 25n));
}
try {
  await check(
    'Phone number pad keeps lower/higher feedback above input without reopening the keyboard',
    async (page) => {
      await startSolo(page);
      assert.equal(await page.locator('#guessInput').getAttribute('readonly'), '');
      assert.equal(await page.evaluate(() => document.activeElement.id), '');
      await page.locator('button[onclick="soloKey(\'5\')"]').click();
      await page.locator('button[onclick="soloKey(\'0\')"]').click();
      await page.locator('.guess-entry button').click();
      await page.waitForTimeout(50);
      assert.match(await page.locator('#soloFeedback').innerText(), /أصغر/);
      const positions = await page.evaluate(() => ({
        feedback: $('soloFeedback').getBoundingClientRect().toJSON(),
        input: $('guessInput').getBoundingClientRect().toJSON(),
        focus: document.activeElement.id,
        range: [state.l.toString(), state.h.toString()],
        attempts: state.attempt,
      }));
      assert.deepEqual(positions.range, ['1', '49']);
      assert.equal(positions.attempts, 1);
      assert.ok(positions.feedback.bottom <= positions.input.top);
      assert.ok(positions.feedback.top >= 0 && positions.feedback.bottom < 844);
      assert.notEqual(positions.focus, 'guessInput');
      await page.screenshot({ path: 'test-results/solo-pad-390.png', fullPage: true });
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      assert.equal(await page.locator('#guessInput').getAttribute('inputmode'), 'numeric');
      assert.equal(await page.locator('#guessInput').getAttribute('enterkeyhint'), 'go');
      await page.locator('#guessInput').fill('٢٤');
      await page.locator('#guessInput').press('Enter');
      assert.match(await page.locator('#soloFeedback').innerText(), /أكبر/);
      assert.deepEqual(await page.evaluate(() => [state.l.toString(), state.h.toString()]), [
        '25',
        '49',
      ]);
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'guessInput');
    },
  );
  await check(
    'Invalid guesses retain their draft and cost no attempt; Arabic/Persian guesses score only once',
    async (page) => {
      await startSolo(page);
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      for (const value of ['', '0', '101', '1.5', 'مرحبا']) {
        await page.locator('#guessInput').fill(value);
        await page.locator('#guessInput').press('Enter');
        assert.equal(await page.evaluate(() => state.attempt), 0);
        assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), 'true');
        assert.equal(await page.locator('#guessInput').inputValue(), value);
      }
      await page.locator('#guessInput').fill('۲۵');
      assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), null);
      await page.locator('#guessInput').press('Enter');
      const result = await page.evaluate(() => ({ total: totalRounds(), attempts: state.attempt }));
      assert.deepEqual(result, { total: 1, attempts: 1 });
      await page.evaluate(() => {
        guessSolo();
        result('solo', 'duplicate', '', 0);
      });
      assert.equal(await page.evaluate(() => totalRounds()), 1);
      await page.locator('.round-review summary').click();
      assert.match(await page.locator('.round-review').innerText(), /25/);
    },
  );
  await check(
    'Keyboard viewport resizing compacts the game and modal; pinch zoom is not mistaken for a keyboard',
    async (page) => {
      await startSolo(page);
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      await page.setViewportSize({ width: 390, height: 390 });
      await page.waitForFunction(() => document.body.classList.contains('keyboard-open'));
      assert.equal(await page.locator('.top').isVisible(), false);
      await page.locator('#soloFeedback').scrollIntoViewIfNeeded();
      const feedback = await page.locator('#soloFeedback').boundingBox();
      assert.ok(feedback.y >= 0 && feedback.y + feedback.height <= 390);
      await page.screenshot({ path: 'test-results/solo-keyboard-390.png' });
      await page.evaluate(() => {
        openPeople();
        $('name0').focus();
        updatePlayViewport();
      });
      const modal = await page.locator('#modal').boundingBox();
      assert.ok(modal.height <= 374);
      await page.evaluate(() => {
        closeModal();
        $('guessInput').focus();
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => !document.body.classList.contains('keyboard-open'));
      const zoomed = await page.evaluate(() => {
        Object.defineProperty(window, 'visualViewport', {
          configurable: true,
          value: { height: 400, offsetTop: 0, scale: 2 },
        });
        updatePlayViewport();
        return document.body.classList.contains('keyboard-open');
      });
      assert.equal(zoomed, false);
    },
  );
  await check(
    'Pause blocks keypad, submission and hints; input mode switches preserve a signed draft',
    async (page) => {
      await startSolo(page);
      await page.evaluate(() => {
        state.l = -100n;
        state.initialL = -100n;
        renderSolo();
        soloKey('sign');
        soloKey('4');
        soloKey('2');
      });
      assert.equal(await page.locator('#guessInput').inputValue(), '-42');
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      assert.equal(await page.locator('#guessInput').inputValue(), '-42');
      await page.evaluate(() => showPause());
      const value = await page.evaluate(() => {
        soloKey('9');
        guessSolo();
        hintSolo();
        return { value: $('guessInput').value, attempts: state.attempt, hints: state.hints };
      });
      assert.deepEqual(value, { value: '-42', attempts: 0, hints: 0 });
      await page.evaluate(() => resumeGame());
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      assert.equal(await page.locator('#guessInput').inputValue(), '-42');
    },
  );
  await check(
    'Resizing a desktop window does not activate mobile keyboard mode',
    async (page) => {
      await startSolo(page);
      await page.setViewportSize({ width: 800, height: 600 });
      await page.locator('#guessInput').focus();
      assert.equal(
        await page.evaluate(() => document.body.classList.contains('keyboard-open')),
        false,
      );
      assert.equal(await page.locator('.top').isVisible(), true);
    },
    { viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false },
  );
  await check(
    'Training midpoint clears previous input errors without spending an attempt',
    async (page) => {
      await page.evaluate(() => {
        setup('solo');
        $('numberMode').value = 'easy';
        startNumber('solo');
        $('guessInput').value = '0';
        guessSolo();
      });
      assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), 'true');
      await page.locator('button[onclick="soloMidpoint()"]').click();
      assert.equal(await page.locator('#guessInput').getAttribute('aria-invalid'), null);
      assert.equal(await page.evaluate(() => state.attempt), 0);
      assert.equal(await page.locator('#guessInput').inputValue(), '50');
    },
  );
  await check(
    'Sixty-digit signed ranges remain readable at 320px and the built-in pad can win a negative round',
    async (page) => {
      await page.evaluate(() => setup('solo'));
      await page.locator('#preset').selectOption('custom');
      await page.locator('#min').fill('-' + '9'.repeat(60));
      await page.locator('#max').fill('9'.repeat(60));
      await page.locator('button[onclick="startNumber(\'solo\')"]').click();
      await page.evaluate(() => (state.secret = -42n));
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.locator('button[onclick="soloKey(\'sign\')"]').click();
      await page.locator('button[onclick="soloKey(\'4\')"]').click();
      await page.locator('button[onclick="soloKey(\'2\')"]').click();
      await page.locator('.guess-entry button').click();
      assert.match(await page.locator('.resultnum').innerText(), /-42/);
    },
    { viewport: { width: 320, height: 740 } },
  );
  await check(
    'Focus mode persists safely, returns the home navigation, and keeps guides accessible',
    async (page) => {
      await startSolo(page);
      await page.locator('.focus-toggle').click();
      assert.equal(await page.locator('.top').isVisible(), false);
      assert.equal(await page.locator('.focus-toggle').getAttribute('aria-pressed'), 'true');
      await page.locator('button[onclick="openGuide(\'solo\')"]').click();
      assert.equal(await page.locator('#modal').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => !!state.pausedAt), false);
      await page.locator('.playtools button[onclick="home()"]').click();
      assert.equal(await page.locator('.top').isVisible(), true);
      await page.reload();
      assert.equal(await page.evaluate(() => store.extra.focus), true);
      await startSolo(page);
      assert.equal(await page.locator('.top').isVisible(), false);
      await page.locator('.focus-toggle').click();
      assert.equal(await page.locator('.top').isVisible(), true);
      assert.equal(await page.evaluate(() => normalizeExtra({ focus: 'true' }).focus), false);
    },
  );
  await check(
    'Memory keyboard navigation follows RTL and restores focus after a match or mismatch',
    async (page) => {
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        startMemory();
        state.deck = ['🍎', '🍎', '🐱', '🐱', '🚀', '🚀', '⭐', '⭐'];
        renderMemory();
      });
      await page.locator('[data-memory-index="0"]').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), '1');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), '1');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(() => state.matched), [1, 0]);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), '2');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), '6');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !state.locked);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), '6');
      assert.equal(await page.locator('.memcard[tabindex="0"]').count(), 1);
    },
    { viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false },
  );
  console.log(`\n${passed} play comfort and mobile regression checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
