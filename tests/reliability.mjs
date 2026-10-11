import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
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
let failed = 0;

async function check(name, test) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`✕ ${name}\n${error.stack}`);
  } finally {
    await context.close();
  }
}

try {
  for (const [id, names] of [
    ['spy', ['أنا', 'صاحبي']],
    ['mime', ['أنا']],
    ['secret', ['أنا']],
    ['taboo', ['أنا']],
  ]) {
    await check(
      `${id}: missing players cannot strand a running game without its timers`,
      async (page) => {
        await page.evaluate(
          ({ id, names }) => {
            store.players = names;
            setup('snake');
            $('arcadeMode').value = 'wrap';
            startArcade('snake');
            snakeBegin();
            openLounge();
            setup(id);
          },
          { id, names },
        );

        const modalVisible = await page.evaluate(() => !$('modalback').hidden);
        if (modalVisible) {
          await page.evaluate(() => closeModal());
        }
        const pending = await page.evaluate(() => ({
          screen,
          id: state?.id,
          timers: timers.length,
          running: state?.running,
          paused: !!state?.pausedAt,
          head: state?.snake?.[0],
        }));
        if (pending.screen === 'snake') {
          assert.ok(pending.timers > 0, 'The existing snake game lost all tracked timers');
          assert.equal(
            pending.paused,
            false,
            'The existing game stayed paused after closing the modal',
          );
          await page.waitForTimeout(500);
          assert.notDeepEqual(await page.evaluate(() => state.snake[0]), pending.head);
        } else {
          assert.equal(
            pending.screen,
            'setup',
            'The requested game should have a recoverable setup screen',
          );
          assert.equal(pending.id, id);
        }
      },
    );
  }

  await check(
    'Secret preserves a typed custom word when the pause overlay hides the screen',
    async (page) => {
      const outcome = await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        $('customword').value = 'كلمة مخصصة';
        showPause();
        resumeGame();
        return { word: state.word, draft: $('customword')?.value || null };
      });
      assert.ok(
        outcome.word === 'كلمة مخصصة' || outcome.draft === 'كلمة مخصصة',
        'Pausing silently discarded the custom secret word',
      );
    },
  );

  await check(
    'Stacked pause and modal overlays keep keyboard focus in the visible top dialog',
    async (page) => {
      await page.evaluate(() => {
        setup('math');
        startExtra('math');
        openSettings();
        // This is also called by visibilitychange when a tab is hidden during a modal.
        showPause();
      });
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => {
          const overlay = $('pausecover') || (!$('modalback').hidden ? $('modal') : null);
          return !!overlay?.contains(document.activeElement);
        }),
        true,
        'Tab moved focus from the visible pause dialog into an obscured modal',
      );
      await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => !!$('pausecover')),
        false,
        'Escape should dismiss the top pause dialog',
      );
      assert.equal(
        await page.evaluate(
          () => $('modalback').hidden || $('modal').contains(document.activeElement),
        ),
        true,
        'After resuming, focus should belong to the remaining modal',
      );
    },
  );

  await check(
    'Saved puzzle export and import retain board, attempts and assistance',
    async (page) => {
      const outcome = await page.evaluate(async () => {
        setup('code');
        startExtra('code');
        const wrong = [...state.secret];
        [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
        wrong.forEach((digit, i) => ($('digit' + i).value = String(digit)));
        submitCode();
        codeHint();
        captureSoloSession();
        const snapshot = structuredClone(store.extra.savedSession);
        const backup = { format: 'lamma-universe', version: 3, data: structuredClone(store) };
        home();
        await importProgress(
          new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }),
        );
        confirmImport();
        resumeSavedGame();
        captureSoloSession();
        return {
          before: snapshot.data,
          after: store.extra.savedSession.data,
          screen,
          attempts: state.attempts.length,
        };
      });
      assert.equal(outcome.screen, 'code');
      assert.equal(outcome.attempts, 1);
      assert.deepEqual(outcome.after, outcome.before);
    },
  );

  await check('Malformed backup leaves current saved progress and game unchanged', async (page) => {
    const outcome = await page.evaluate(async () => {
      setup('snake');
      startArcade('snake');
      const before = JSON.stringify(store);
      await importProgress(
        new File(
          [
            JSON.stringify({
              format: 'lamma-universe',
              version: 3,
              data: { players: ['أنا'], scores: { أنا: { points: -1, rounds: 1 } } },
            }),
          ],
          'invalid.json',
        ),
      );
      confirmImport();
      return { before, after: JSON.stringify(store), screen, id: state.id };
    });
    assert.equal(outcome.after, outcome.before);
    assert.equal(outcome.screen, 'snake');
    assert.equal(outcome.id, 'snake');
  });

  await check(
    'Per-game setup preferences survive reload, including dependent fields and checkboxes',
    async (page) => {
      await page.evaluate(() => setup('memory'));
      await page.locator('#difficulty').selectOption('12');
      await page.locator('#memoryTheme').selectOption('food');
      await page.evaluate(() => setup('reaction'));
      await page.locator('#trials').selectOption('7');
      await page.locator('#group').check();
      await page.evaluate(() => setup('ttt'));
      await page.locator('#opponent').selectOption('friend');
      await page.locator('#first').selectOption('1');
      await page.reload();
      const restored = await page.evaluate(() => {
        setup('memory');
        const memory = { difficulty: $('difficulty').value, theme: $('memoryTheme').value };
        setup('reaction');
        const reaction = { trials: $('trials').value, group: $('group').checked };
        setup('ttt');
        return {
          memory,
          reaction,
          board: {
            opponent: $('opponent').value,
            first: $('first').value,
            second: $('secondfield').hidden,
            bot: $('botfield').hidden,
          },
        };
      });
      assert.deepEqual(restored, {
        memory: { difficulty: '12', theme: 'food' },
        reaction: { trials: '7', group: true },
        board: { opponent: 'friend', first: '1', second: false, bot: true },
      });
    },
  );

  await check(
    'Invalid remembered options are ignored and game preferences can be reset',
    async (page) => {
      const outcome = await page.evaluate(() => {
        store.extra.preferences = normalizeGamePreferences({
          memory: { difficulty: '1000000', memoryTheme: 'unknown', player: '1' },
          reaction: { trials: 'bad', group: 'false' },
          arbitrary: null,
        });
        setup('memory');
        const memory = {
          pairs: $('difficulty').value,
          theme: $('memoryTheme').value,
          player: $('player').value,
        };
        setup('reaction');
        const reaction = { trials: $('trials').value, group: $('group').checked };
        setup('memory');
        $('difficulty').value = '12';
        rememberSetup();
        resetGamePreferences('memory');
        return {
          memory,
          reaction,
          reset: $('difficulty').value,
          hasSaved: Object.hasOwn(store.extra.preferences, 'memory'),
        };
      });
      assert.deepEqual(outcome, {
        memory: { pairs: '8', theme: 'mix', player: '0' },
        reaction: { trials: '5', group: false },
        reset: '8',
        hasSaved: false,
      });
    },
  );

  await check(
    'Remembered numeric bounds survive preset-dependent setup restoration',
    async (page) => {
      await page.evaluate(() => setup('solo'));
      await page.locator('#min').fill('-500');
      await page.locator('#max').fill('500');
      await page.reload();
      const restored = await page.evaluate(() => {
        setup('solo');
        return { minimum: $('min').value, maximum: $('max').value };
      });
      assert.deepEqual(restored, { minimum: '-500', maximum: '500' });
    },
  );

  await check('Daily questions ignore ordinary saved category preferences', async (page) => {
    const outcome = await page.evaluate(() => {
      setup('word');
      $('category').value = 'animal';
      $('wordcount').value = '5';
      rememberSetup();
      home();
      startDaily('word');
      const first = state.queue.map((item) => item.name);
      home();
      delete store.extra.preferences.word;
      startDaily('word');
      const second = state.queue.map((item) => item.name);
      return { first, second, fixed: state.fixed };
    });
    assert.equal(outcome.fixed, true);
    assert.deepEqual(
      outcome.first,
      outcome.second,
      'The daily seeded word set changed with ordinary remembered settings',
    );
  });

  await check(
    'Tournament and route setups keep their curated defaults without overwriting personal preferences',
    async (page) => {
      const outcome = await page.evaluate(() => {
        store.players = ['أنا', 'صاحبي'];
        setup('code');
        $('codelength').value = '5';
        $('level').value = 'hard';
        rememberSetup();
        const personal = structuredClone(store.extra.preferences.code);
        openTournament();
        startTournament();
        startTourRound();
        const tournament = { length: state.length, level: state.level, fixed: state.fixed };
        home();
        startRoute('master');
        const route = {
          length: $('codelength').value,
          level: $('level').value,
          reset: !!$('app').querySelector('.setup-memory'),
        };
        rememberSetup();
        return { personal, after: store.extra.preferences.code, tournament, route };
      });
      assert.deepEqual(outcome.personal, outcome.after);
      assert.deepEqual(outcome.tournament, { length: 4, level: 'normal', fixed: true });
      assert.deepEqual(outcome.route, { length: '4', level: 'normal', reset: false });
    },
  );

  await check(
    'Round history persists through reload and safely renders player names',
    async (page) => {
      const history = await page.evaluate(() => {
        store.players = ['<b>لاعب</b>'];
        setup('snake');
        startArcade('snake');
        finishExtra('انتهت الجولة', 'نتيجة محفوظة', 23);
        result('snake', 'تكرار', 'تكرار', 23);
        return store.extra.history;
      });
      assert.equal(history.length, 1);
      assert.equal(history[0].name, '<b>لاعب</b>');
      assert.equal(history[0].points, 23);
      await page.reload();
      await page.evaluate(() => openGameHistory());
      assert.deepEqual(await page.evaluate(() => store.extra.history), history);
      assert.equal(await page.locator('#modal small b').count(), 0);
      assert.ok((await page.locator('#modal').innerText()).includes('<b>لاعب</b>'));
    },
  );

  await check(
    'Downloaded backup restores remembered settings and completed round history',
    async (page) => {
      await page.evaluate(() => setup('memory'));
      await page.locator('#difficulty').selectOption('4');
      await page.locator('#memoryTheme').selectOption('animals');
      await page.locator("button[onclick='startMemory()']").click();
      await page.evaluate(() => {
        for (let i = 0; i < state.deck.length; i++) {
          if (state.matched.includes(i)) continue;
          const mate = state.deck.findIndex((value, j) => j !== i && value === state.deck[i]);
          flipCard(i);
          flipCard(mate);
        }
      });
      await page.waitForFunction(() => state.resultShown);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.evaluate(() => exportProgress()),
      ]);
      assert.equal(download.suggestedFilename(), 'lamma-backup.json');
      const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
      assert.equal(backup.data.extra.history.length, 1);
      assert.equal(backup.data.extra.preferences.memory.difficulty, '4');
      const restored = await page.evaluate(async (backup) => {
        home();
        store.extra.history = [];
        store.extra.preferences = {};
        save();
        await importProgress(
          new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }),
        );
        confirmImport();
        setup('memory');
        return {
          history: store.extra.history,
          settings: { pairs: $('difficulty').value, theme: $('memoryTheme').value },
        };
      }, backup);
      assert.deepEqual(restored.history, backup.data.extra.history);
      assert.deepEqual(restored.settings, { pairs: '4', theme: 'animals' });
    },
  );

  await check('Malformed history timestamps cannot break the history dialog', async (page) => {
    const outcome = await page.evaluate(() => {
      store.extra.history = normalizeGameHistory([
        { id: 'memory', name: 'أنا', points: 1, at: Number.MAX_SAFE_INTEGER },
        { id: 'memory', name: 'أنا', points: 10, at: Date.now() },
      ]);
      openGameHistory();
      return {
        rows: store.extra.history.length,
        rendered: document.querySelectorAll('.history-round').length,
      };
    });
    assert.deepEqual(outcome, { rows: 1, rendered: 1 });
  });

  await check('Party recommendations respect the minimum player count', async (page) => {
    for (const count of [1, 2, 3, 4, 12]) {
      const choices = await page.evaluate((count) => {
        store.players = Array.from({ length: count }, (_, i) => 'لاعب ' + i);
        openQuickPicker('party');
        return [...document.querySelectorAll('.picker-games button')].map((button) => {
          const id = button.getAttribute('onclick').match(/setup\('([^']+)'\)/)[1];
          return { id, minimum: gameMinimum(id) };
        });
      }, count);
      assert.ok(
        choices.every((choice) => choice.minimum <= count),
        `${count} players received an unavailable game`,
      );
      assert.equal(choices.length, count === 1 ? 0 : 3);
    }
  });

  await check(
    'Compact mobile lobby and new dialogs keep controls within the viewport',
    async (page) => {
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => home());
        const home = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          heroBottom: document.querySelector('.lobby-hero').getBoundingClientRect().bottom,
          art: getComputedStyle(document.querySelector('.lobby-art')).display,
          compact: !document.querySelector('.discover-drawer').open,
          quick: document.querySelectorAll('.quick-game').length,
        }));
        assert.equal(home.overflow, false);
        assert.equal(home.compact, true);
        assert.equal(home.quick, 3);
        if (width <= 390) {
          assert.equal(home.art, 'none');
          assert.ok(home.heroBottom < 650, 'The mobile hero pushes the main actions too far down');
        }
        for (const action of ['openQuickPicker()', 'openGameHistory()', 'openLounge()']) {
          await page.evaluate((action) => Function(action)(), action);
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
            false,
            `${action} at ${width}`,
          );
          await page.evaluate(() => closeModal());
        }
      }
    },
  );

  await check(
    'System reduced motion disables transitions and JavaScript celebration effects',
    async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.body.classList.contains('reduced-motion'));
      const outcome = await page.evaluate(() => {
        store.extra.motion = true;
        applySettings();
        setup('snake');
        startArcade('snake');
        finishExtra('انتهت الجولة', 'تم', 10);
        return {
          animations: document.getAnimations().length,
          celebration: !!$('celebration'),
          reduced: document.body.classList.contains('reduced-motion'),
        };
      });
      assert.equal(outcome.reduced, true);
      assert.equal(outcome.celebration, false);
      assert.equal(outcome.animations, 0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !document.body.classList.contains('reduced-motion'));
    },
  );

  await check(
    'Downloaded standalone file keeps preferences and history and starts every game offline',
    async (page) => {
      const remote = [];
      page.on('request', (request) => {
        if (/^https?:/.test(request.url())) remote.push(request.url());
      });
      await page.context().setOffline(true);
      await page.goto(new URL('../lamma_universe.html', import.meta.url).href);
      await page.evaluate(() => {
        store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
        store.extra.motion = false;
        setup('memory');
      });
      await page.locator('#difficulty').selectOption('4');
      await page.evaluate(() => {
        setup('snake');
        startArcade('snake');
        finishExtra('نتيجة الجولة', 'محفوظة', 10);
        home();
      });
      await page.reload();
      await page.evaluate(() => {
        openQuickPicker('party');
        closeModal();
        openGameHistory();
      });
      assert.equal(await page.locator('.history-round').count(), 1);
      await page.evaluate(() => {
        closeModal();
        setup('memory');
      });
      assert.equal(await page.locator('#difficulty').inputValue(), '4');
      const ids = await page.evaluate(() => games.map((game) => game[0]));
      assert.equal(ids.length, 34);
      for (const id of ids) {
        const started = await page.evaluate((id) => {
          setup(id);
          const start = [...document.querySelectorAll('#app button[onclick]')].find((button) =>
            /\bstart\w*\(/.test(button.getAttribute('onclick')),
          );
          start?.click();
          return { screen, content: $('app').innerText.length };
        }, id);
        assert.equal(started.screen, id, `${id}: offline file start`);
        assert.ok(started.content > 0, `${id}: offline file content`);
        await page.evaluate(() => home());
      }
      assert.deepEqual(remote, []);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`\n${passed} reliability checks passed; ${failed} failed.`);
if (failed) process.exitCode = 1;
