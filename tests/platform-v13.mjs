import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (kind) =>
    [
      ...build.match(new RegExp(`const ${kind} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((match) => match[1]);
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
async function check(name, task) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      save();
      home('top');
    });
    await task(page);
    assert.deepEqual(errors, [], name + ': browser exceptions');
    passed++;
    console.log('✓ ' + name);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Solo and route Hangman stations recompute availability after applying their setup',
    async (page) => {
      await page.evaluate(() => {
        setup('hangman');
        $('hangMode').value = 'mission';
        $('hangLevel').value = 'hard';
        $('hangCategory').value = 'general';
        updateHangmanAvailability();
        rememberSetup();
      });
      assert.equal(await page.locator('#wordsStart').isDisabled(), true);
      await page.evaluate(() => {
        openSoloHub('ليلى');
        const profile = soloProfile();
        profile.active = {
          token: storageToken(),
          name: profile.name,
          queue: ['hangman', 'word', 'wordguess'],
          at: 0,
          results: [],
          mode: 'practice',
          level: 'hard',
          adaptive: false,
          started: Date.now(),
        };
        save();
        continueSoloSession();
      });
      assert.equal(await page.locator('#wordsStart').isDisabled(), false);
      assert.match(await page.locator('#hangAvailable').innerText(), /جولتك: 1 من 1/);
      // Reapplying a station preset must also recover a previously disabled button.
      await page.evaluate(() => {
        $('hangMode').value = 'mission';
        $('hangCategory').value = 'general';
        updateHangmanAvailability();
      });
      assert.equal(await page.locator('#wordsStart').isDisabled(), true);
      await page.evaluate(() => soloConfigureRound(soloRound));
      assert.equal(await page.locator('#wordsStart').isDisabled(), false);
      assert.match(await page.locator('#hangAvailable').innerText(), /جولتك: 1 من 1/);
      await page.locator('#wordsStart').click();
      assert.deepEqual(
        await page.evaluate(() => ({
          screen,
          count: state.queue.length,
          mode: state.mode,
          name: state.name,
          linked: !!soloLinkedRound(),
        })),
        { screen: 'hangman', count: 1, mode: 'classic', name: 'ليلى', linked: true },
      );
      await page.evaluate(() => {
        home();
        experience().route = {
          id: 'explore',
          at: 2,
          results: [
            { id: 'maze', points: 50 },
            { id: 'pipes', points: 50 },
          ],
        };
        continueRoute();
      });
      assert.equal(await page.locator('#wordsStart').isDisabled(), false);
      assert.match(await page.locator('#hangAvailable').innerText(), /جولتك: 1 من 1/);
      await page.locator('#wordsStart').click();
      assert.deepEqual(
        await page.evaluate(() => ({ screen, count: state.queue.length, route: activeRoute.id })),
        { screen: 'hangman', count: 1, route: 'hangman' },
      );
    },
  );
  await check(
    'Keyboard navigation reaches collapsed settings disclosures and remains trapped',
    async (page) => {
      await page.evaluate(() => openSettings('data'));
      await page.locator('#modal button[onclick="openHelp()"]:visible').focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('.settings-reset > summary')),
        true,
      );
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.settings-reset').getAttribute('open'), '');
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'closeModal()',
      );
      await page.keyboard.press('Shift+Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('.settings-reset > summary')),
        true,
      );

      await page.evaluate(() => openSettings('play'));
      await page.locator('#modal button[onclick="toggleFullscreen()"]:visible').focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('.settings-defaults > summary')),
        true,
      );
    },
  );
  await check(
    'Modal focusables omit hidden, inert and disabled fields and respect tab order',
    async (page) => {
      const value = await page.evaluate(() => {
        openModal(
          `<h2 id="modaltitle">اختبار التنقل</h2><button id="ordinary">عادي</button><button id="priority" tabindex="2">أولاً</button><fieldset disabled><button id="disabledField">معطل</button></fieldset><div inert><button id="inertField">خامل</button></div><button id="hiddenField" style="visibility:hidden">مخفي</button><details><summary id="disclosure">تفاصيل</summary><button id="closedField">داخل التفاصيل</button></details><div id="editor" contenteditable="plaintext-only">نص</div><div id="customControl" tabindex="0">تحكم</div>`,
        );
        return {
          ids: overlayControls($('modal')).map((element) => element.id),
          focus: document.activeElement.id,
        };
      });
      assert.deepEqual(value, {
        ids: ['priority', 'ordinary', 'disclosure', 'editor', 'customControl'],
        focus: 'priority',
      });
      await page.locator('#customControl').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'priority');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'customControl');
    },
  );
  await check(
    'Game view changes announce a heading while board redraws retain keyboard focus',
    async (page) => {
      await page.locator('.cardstart[onclick="setup(\'memory\')"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => screen), 'setup');
      assert.equal(await page.evaluate(() => document.activeElement.matches('.playhead h1')), true);
      await page.locator('button[onclick="startMemory()"]').click();
      assert.equal(await page.evaluate(() => document.activeElement.matches('.playhead h1')), true);
      const first = page.locator('.memcard:not(:disabled)').first();
      await first.focus();
      const index = await first.getAttribute('data-memory-index');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.memoryIndex), index);
      await page.evaluate(() => finishExtra('نتيجة الاختبار', 'انتهت الجولة', 0));
      assert.equal(await page.evaluate(() => document.activeElement.matches('.success h2')), true);
      await page.locator('#app button[onclick="home()"]').last().click();
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.matches('.cardstart[onclick="setup(\'memory\')"]'),
        ),
        true,
      );
    },
  );
  await check(
    'Editing and composition do not trigger global shortcuts or numeric keypad entry',
    async (page) => {
      const value = await page.evaluate(() => {
        const root = document.createElement('div');
        root.contentEditable = 'plaintext-only';
        root.innerHTML = '<span id="editableShortcut" tabindex="0">نص</span>';
        $('app').append(root);
        const edit = $('editableShortcut');
        edit.focus();
        const slash = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
        edit.dispatchEvent(slash);
        const stayed = document.activeElement === edit && !slash.defaultPrevented;
        const composingSlash = new KeyboardEvent('keydown', {
          key: '/',
          isComposing: true,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(composingSlash);
        const compositionStayed =
          document.activeElement === edit && !composingSlash.defaultPrevented;
        openSettings('appearance');
        $('settings-tab-appearance').dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', isComposing: true, bubbles: true }),
        );
        const tabStayed = settingsSection === 'appearance';
        closeModal();
        setup('solo');
        startNumber('solo');
        state.soloPad = true;
        renderSolo();
        $('guessInput').focus();
        const before = $('guessInput').value;
        $('guessInput').dispatchEvent(
          new KeyboardEvent('keydown', { key: '1', isComposing: true, bubbles: true }),
        );
        return {
          stayed,
          compositionStayed,
          tabStayed,
          draftStayed: $('guessInput').value === before,
          editableViewport: playEditable(edit),
        };
      });
      assert.deepEqual(value, {
        stayed: true,
        compositionStayed: true,
        tabStayed: true,
        draftStayed: true,
        editableViewport: true,
      });
    },
  );
  await check(
    'Starting a route detaches daily and tournament rules before its editable setup',
    async (page) => {
      for (const previous of ['daily', 'tournament']) {
        const value = await page.evaluate((previous) => {
          home();
          if (previous === 'daily') startDaily('word');
          else {
            openTournament();
            startTournament();
            startTourRound();
          }
          startRoute('master');
          const isolated =
            !dailyRun && !tourney && !!activeRoute && !$('app').querySelector('.sessionbanner');
          $('codelength').value = '3';
          startExtra('code');
          return { isolated, fixed: state.fixed, length: state.length, route: activeRoute.id };
        }, previous);
        assert.deepEqual(value, { isolated: true, fixed: false, length: 3, route: 'code' });
      }
    },
  );
  await check(
    'Settings provide the offline HTML download separately from the progress backup',
    async (page) => {
      await page.evaluate(() => openSettings('data'));
      assert.equal(await page.locator('#modal button[onclick="downloadStandalone()"]').count(), 1);
      assert.match(
        await page
          .locator('#modal button[onclick="downloadStandalone()"]')
          .locator('..')
          .locator('..')
          .innerText(),
        /بشكل منفصل/,
      );
      assert.equal(await page.locator('#modal button[onclick="exportProgress()"]').count(), 1);
    },
  );
  console.log(`\n${passed} platform v13 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
