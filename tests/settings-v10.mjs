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
const address = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, task) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(address);
    await task(page, context);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Legacy v3 backups gain safe defaults and reject malformed new preferences before replacement',
    async (page) => {
      const result = await page.evaluate(async () => {
        const old = {
          format: 'lamma-universe',
          version: 3,
          data: {
            players: ['قديم'],
            scores: { قديم: { points: 125, rounds: 2 } },
            sound: true,
            extra: { theme: 'light', preferences: { memory: { difficulty: '4' } } },
          },
        };
        await importProgress(
          new File([JSON.stringify(old)], 'old.json', { type: 'application/json' }),
        );
        confirmImport();
        const valid = {
          player: store.players[0],
          score: store.scores['قديم'].points,
          theme: store.extra.theme,
          volume: store.extra.volume,
          textScale: store.extra.textScale,
          contrast: store.extra.contrast,
          remember: store.extra.rememberDefaults,
        };
        const bad = structuredClone(old);
        bad.data.extra.volume = 101;
        await importProgress(
          new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' }),
        );
        const rejected = !pendingImport && store.scores['قديم'].points === 125;
        const normalized = normalizeExtra({
          textScale: '130',
          volume: -5,
          contrast: 'true',
          rememberDefaults: 0,
        });
        return {
          valid,
          rejected,
          normalized: [
            normalized.textScale,
            normalized.volume,
            normalized.contrast,
            normalized.rememberDefaults,
          ],
        };
      });
      assert.deepEqual(result, {
        valid: {
          player: 'قديم',
          score: 125,
          theme: 'light',
          volume: 70,
          textScale: 100,
          contrast: false,
          remember: true,
        },
        rejected: true,
        normalized: [100, 70, false, true],
      });
    },
  );
  await check(
    'Tabs expose one panel and support RTL arrow, Home and End keyboard navigation',
    async (page) => {
      await page.evaluate(() => openSettings('appearance'));
      await page.locator('#settings-tab-appearance').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#settings-tab-play').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#settings-panel-play').isVisible(), true);
      assert.equal(await page.locator('#settings-panel-appearance').isVisible(), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-tab-play');
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-tab-data');
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-tab-data');
      await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => $('modalback').hidden && !document.querySelector('.shell').inert),
        true,
      );
    },
  );
  await check(
    'Appearance follows system changes, scales readable text and persists across reload',
    async (page) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => {
        openSettings('appearance');
        changeSetting('theme', 'system');
        changeSetting('textScale', 130);
        changeSetting('contrast', true);
      });
      const before = await page.evaluate(() => ({
        theme: document.body.dataset.theme,
        scale: document.body.dataset.textScale,
        label: parseFloat(
          getComputedStyle($('settings-theme').closest('.settingsrow').querySelector('label'))
            .fontSize,
        ),
        contrast: document.body.classList.contains('high-contrast'),
      }));
      assert.equal(before.theme, 'light');
      assert.equal(before.scale, '130');
      assert.equal(before.contrast, true);
      assert.ok(before.label > 18);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.body.dataset.theme === 'dark');
      await page.reload();
      assert.deepEqual(
        await page.evaluate(() => [store.extra.theme, store.extra.textScale, store.extra.contrast]),
        ['system', 130, true],
      );
      await page.evaluate(() => changeSetting('theme', 'light'));
      await page.emulateMedia({ colorScheme: 'light' });
      await page.emulateMedia({ colorScheme: 'dark' });
      assert.equal(await page.evaluate(() => document.body.dataset.theme), 'light');
    },
  );
  await check(
    'Volume scales actual oscillator gain and zero volume does not create a sound',
    async (page) => {
      const values = await page.evaluate(() => {
        const gains = [];
        let oscillators = 0;
        audioCtx = {
          currentTime: 0,
          destination: {},
          resume() {},
          createOscillator() {
            oscillators++;
            return { connect() {}, frequency: { setValueAtTime() {} }, start() {}, stop() {} };
          },
          createGain() {
            return {
              connect() {},
              gain: {
                setValueAtTime(value) {
                  gains.push(value);
                },
                exponentialRampToValueAtTime() {},
              },
            };
          },
        };
        store.sound = true;
        changeSetting('volume', 100);
        tone();
        changeSetting('volume', 20);
        tone();
        changeSetting('volume', 0);
        tone();
        changeSetting('volume', 50);
        store.sound = false;
        tone();
        return {
          gains,
          oscillators,
          invalid: changeSetting('volume', 150),
          volume: store.extra.volume,
        };
      });
      assert.equal(values.oscillators, 2);
      assert.ok(Math.abs(values.gains[0] - 0.045) < 0.000001);
      assert.ok(Math.abs(values.gains[1] - 0.009) < 0.000001);
      assert.equal(values.invalid, false);
      assert.equal(values.volume, 50);
    },
  );
  await check(
    'Disabling remembered defaults starts fresh, never overwrites saved values and re-enables them',
    async (page) => {
      const result = await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        $('memoryTheme').value = 'animals';
        rememberSetup();
        changeSetting('rememberDefaults', false);
        setup('memory');
        const fresh = [$('difficulty').value, $('memoryTheme').value];
        $('difficulty').value = '12';
        rememberSetup();
        const saved = store.extra.preferences.memory.difficulty;
        changeSetting('rememberDefaults', true);
        setup('memory');
        return { fresh, saved, restored: [$('difficulty').value, $('memoryTheme').value] };
      });
      assert.deepEqual(result, { fresh: ['8', 'mix'], saved: '4', restored: ['4', 'animals'] });
    },
  );
  await check(
    'Settings toggles preserve keyboard focus and resetting defaults refreshes an idle setup only',
    async (page) => {
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        rememberSetup();
        openSettings('appearance');
      });
      const contrast = page.locator(
        'button[onclick="changeSetting(\'contrast\',!store.extra.contrast);openSettings()"]',
      );
      await contrast.focus();
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        "changeSetting('contrast',!store.extra.contrast);openSettings()",
      );
      await page.evaluate(() => {
        settingsRequestReset('defaults', 'memory');
        settingsConfirmReset(pendingSettingsReset.token);
        closeModal();
      });
      assert.equal(await page.locator('#difficulty').inputValue(), '8');
      await page.evaluate(() => {
        $('difficulty').value = '4';
        rememberSetup();
        startMemory();
        openSettings('play');
      });
      const before = await page.evaluate(() => ({ deck: state.deck, pausedAt: state.pausedAt }));
      await page.evaluate(() => {
        settingsRequestReset('defaults', 'memory');
        settingsConfirmReset(pendingSettingsReset.token);
      });
      assert.deepEqual(
        await page.evaluate(() => ({ deck: state.deck, pausedAt: state.pausedAt })),
        before,
      );
    },
  );
  await check(
    'Scoped resets preserve unrelated progress, require live confirmation and resist stale tabs',
    async (page, context) => {
      await page.evaluate(() => {
        store.players = ['ثابت'];
        store.scores['ثابت'] = { points: 80, rounds: 2 };
        store.extra.preferences = { memory: { difficulty: '4' }, solo: { preset: 'million' } };
        store.extra.favorites = ['memory'];
        store.extra.history = [{ id: 'memory', name: 'ثابت', points: 40, at: Date.now() }];
        save();
      });
      const second = await context.newPage();
      await second.goto(address);
      await page.evaluate(() => {
        openSettings('data');
        settingsRequestReset('history');
        const token = pendingSettingsReset.token;
        settingsCancelReset();
        settingsConfirmReset(token);
      });
      assert.equal(await page.evaluate(() => store.extra.history.length), 1);
      await page.evaluate(() => {
        settingsRequestReset('history');
        settingsConfirmReset(pendingSettingsReset.token);
      });
      await second.waitForFunction(() => store.extra.history.length === 0);
      await second.evaluate(() => {
        store.extra.theme = 'light';
        save();
      });
      await page.waitForFunction(() => store.extra.theme === 'light');
      await page.evaluate(() => {
        settingsRequestReset('defaults', 'memory');
        settingsConfirmReset(pendingSettingsReset.token);
      });
      const result = await page.evaluate(() => ({
        players: store.players,
        scores: store.scores['ثابت'],
        history: store.extra.history.length,
        favorites: store.extra.favorites,
        solo: store.extra.preferences.solo,
        memory: store.extra.preferences.memory || null,
      }));
      assert.deepEqual(result, {
        players: ['ثابت'],
        scores: { points: 80, rounds: 2 },
        history: 0,
        favorites: ['memory'],
        solo: { preset: 'million' },
        memory: null,
      });
      await second.waitForFunction(() => !store.extra.preferences.memory);
      await second.evaluate(() => save());
      assert.equal(await page.evaluate(() => store.extra.history.length), 0);
      await page.evaluate(() => {
        settingsRequestReset('favorites');
        const token = pendingSettingsReset.token;
        closeModal();
        settingsConfirmReset(token);
      });
      assert.deepEqual(await page.evaluate(() => store.extra.favorites), ['memory']);
    },
  );
  await check(
    'Cross-tab settings apply while the current round and settings dialog stay intact',
    async (page, context) => {
      await page.evaluate(() => {
        setup('math');
        startExtra('math');
        openSettings('play');
      });
      const original = await page.evaluate(() => ({
        questions: state.questions,
        answers: state.answers,
        pausedAt: state.pausedAt,
        text: $('settings-panel-play').innerHTML,
      }));
      const second = await context.newPage();
      await second.goto(address);
      await second.evaluate(() => {
        changeSetting('theme', 'light');
        changeSetting('textScale', 115);
        changeSetting('contrast', true);
      });
      await page.waitForFunction(
        () =>
          document.body.dataset.textScale === '115' &&
          document.body.classList.contains('high-contrast'),
      );
      const current = await page.evaluate(() => ({
        questions: state.questions,
        answers: state.answers,
        pausedAt: state.pausedAt,
        text: $('settings-panel-play').innerHTML,
      }));
      assert.deepEqual(current, original);
      assert.equal(await page.evaluate(() => $('modalback').hidden), false);
      await page.evaluate(() => {
        switchSettingsTab('appearance');
        changeSetting('textScale', 130);
        switchSettingsTab('data');
        answerQuiz(0);
      });
      assert.equal(await page.evaluate(() => state.answers.length), 0);
      await page.evaluate(() => closeModal());
      assert.equal(await page.evaluate(() => state.pausedAt), 0);
    },
  );
  await check(
    'All settings sections and expanded managers remain readable offline at 320px with large text',
    async (page, context) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await context.setOffline(true);
      await page.evaluate(() => {
        store.extra.preferences.memory = { difficulty: '4' };
        store.extra.preferences.solo = { preset: 'million' };
        changeSetting('textScale', 130);
        changeSetting('contrast', true);
      });
      for (const theme of ['dark', 'light']) {
        await page.evaluate((theme) => changeSetting('theme', theme), theme);
        for (const section of ['appearance', 'play', 'data']) {
          await page.evaluate((section) => {
            openSettings(section);
            document
              .querySelectorAll('.settings-content details')
              .forEach((detail) => (detail.open = true));
          }, section);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true,
            `${theme}/${section}: page overflow`,
          );
          assert.equal(
            await page.evaluate(() => $('modal').scrollWidth <= $('modal').clientWidth + 1),
            true,
            `${theme}/${section}: modal overflow`,
          );
        }
      }
    },
  );
  await check(
    'Large text and stronger contrast fit the home, solo hub and every game setup at 320px',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await page.evaluate(() => {
        store.players = ['أحمد', 'ليلى', 'سالم'];
        changeSetting('textScale', 130);
        changeSetting('contrast', true);
        home();
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
        'home overflow',
      );
      const ids = await page.evaluate(() => games.map((game) => game[0]));
      for (const id of ids) {
        await page.evaluate((id) => setup(id), id);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          `${id} setup overflow`,
        );
      }
      if (await page.evaluate(() => typeof openSoloHub === 'function')) {
        await page.evaluate(() => openSoloHub());
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
          'solo hub overflow',
        );
      }
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        startMemory();
        changeSetting('textScale', 100);
      });
      const board = await page.locator('.memcard').first().boundingBox();
      await page.evaluate(() => changeSetting('textScale', 130));
      const enlarged = await page.locator('.memcard').first().boundingBox();
      assert.equal(enlarged.width, board.width, 'reading preferences changed memory board width');
      assert.equal(
        enlarged.height,
        board.height,
        'reading preferences changed memory board height',
      );
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Settings v10: ${passed} browser checks passed.`);
