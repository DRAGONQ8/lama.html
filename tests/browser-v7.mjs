import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Audit the current sources so layout checks never depend on a stale release file.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const manifest = (name) =>
  [...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const scripts = (await Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`)))).join(
  '\n',
);
const styles = (await Promise.all(manifest('styles').map((name) => read(`src/${name}.css`)))).join(
  '\n',
);
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => scripts)
  .replace('/* BUILD_STYLES */', () => styles);
const directory = new URL('../test-results/browser-v7/', import.meta.url);
await mkdir(directory, { recursive: true });
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const widths = process.env.AUDIT_WIDTHS?.split(',').map(Number) || [320, 360, 390, 768, 1440];
const report = { widths, games: [], screens: [], issues: [], pageErrors: [], externalRequests: [] };

async function inspect(page, label, width, screenshot = false) {
  const layout = await page.evaluate(() => {
    const visible = (element) => {
      const closed = element.closest('details:not([open])');
      if (closed && !closed.querySelector(':scope > summary')?.contains(element)) return false;
      return (
        !!element.getClientRects().length &&
        !element.closest('[hidden]') &&
        getComputedStyle(element).visibility !== 'hidden'
      );
    };
    const selector = (element) =>
      element.id
        ? '#' + element.id
        : element.tagName.toLowerCase() + '.' + [...element.classList].join('.');
    const modal = !$('modalback').hidden ? $('modal') : $('pausecover');
    const root = modal || document.querySelector('.shell');
    const controls = [
      ...root.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]'),
    ].filter((element) => visible(element) && !element.disabled && !element.inert);
    const tiny = [],
      occluded = [],
      unnamed = [];
    for (const element of controls) {
      const box = element.getBoundingClientRect();
      const name =
        element.getAttribute('aria-label') ||
        element.innerText ||
        element.textContent ||
        element.labels?.[0]?.innerText ||
        element.getAttribute('title') ||
        '';
      const info = {
        selector: selector(element),
        label: name.trim().replace(/\s+/g, ' ').slice(0, 90),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
      if (Math.min(box.width, box.height) < 24 && element.matches('button,a[href]'))
        tiny.push(info);
      if (!name.trim() && element.matches('button')) unnamed.push(info);
      if (box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight) {
        const covering = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        if (covering && covering !== element && !element.contains(covering)) {
          // A fixed navigation bar or a modal scroll edge can cover a button
          // temporarily. Flag it only if scrolling cannot expose its centre.
          const position = [scrollX, scrollY],
            ancestors = [];
          for (let parent = element.parentElement; parent; parent = parent.parentElement)
            ancestors.push([parent, parent.scrollLeft, parent.scrollTop]);
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          const exposed = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            exposed.x + exposed.width / 2,
            exposed.y + exposed.height / 2,
          );
          if (hit && hit !== element && !element.contains(hit))
            occluded.push({ ...info, covering: selector(hit) });
          ancestors.forEach(([parent, left, top]) => {
            parent.scrollLeft = left;
            parent.scrollTop = top;
          });
          window.scrollTo({ left: position[0], top: position[1], behavior: 'instant' });
        }
      }
    }
    return {
      screen,
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      controls: controls.length,
      focus: selector(document.activeElement),
      modalFocused: !modal || modal.contains(document.activeElement),
      tiny,
      occluded,
      unnamed,
      overflowing: [...root.querySelectorAll('section,header,nav,.panel,.actions,.fields,.play')]
        .filter(visible)
        .map((element) => ({ selector: selector(element), box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.left < -1 || box.right > innerWidth + 1)
        .map(({ selector, box }) => ({
          selector,
          left: Math.round(box.left),
          right: Math.round(box.right),
        })),
    };
  });
  report.screens.push({ width, label, ...layout });
  if (layout.scrollWidth > width + 1)
    report.issues.push({
      severity: 'error',
      width,
      label,
      kind: 'document-overflow',
      detail: layout,
    });
  if (!layout.modalFocused)
    report.issues.push({
      severity: 'error',
      width,
      label,
      kind: 'modal-focus',
      detail: layout.focus,
    });
  if (layout.tiny.length)
    report.issues.push({
      severity: 'warning',
      width,
      label,
      kind: 'tiny-targets',
      detail: layout.tiny,
    });
  if (layout.occluded.length)
    report.issues.push({
      severity: 'warning',
      width,
      label,
      kind: 'covered-targets',
      detail: layout.occluded,
    });
  if (layout.unnamed.length)
    report.issues.push({
      severity: 'warning',
      width,
      label,
      kind: 'unnamed-buttons',
      detail: layout.unnamed,
    });
  if (screenshot || layout.scrollWidth > width + 1)
    await page.screenshot({
      path: new URL(`${width}-${label}.png`, directory).pathname,
      fullPage:
        !label.includes('keyboard') &&
        !['settings', 'guide', 'profile', 'players', 'scores', 'daily', 'tournament'].includes(
          label,
        ),
    });
}

async function inspectModal(page, action, name, width) {
  await page.evaluate(() => home());
  const opener = page.locator(`button[onclick="${action}"]`).filter({ visible: true }).first();
  if (await opener.count()) {
    await opener.focus();
    await page.evaluate(() => {
      window.auditPreviousFocus = document.activeElement;
    });
    await opener.click();
  } else {
    await page.locator('.brand').focus();
    await page.evaluate((action) => {
      window.auditPreviousFocus = document.activeElement;
      window[action.replace('()', '')]();
    }, action);
  }
  await inspect(page, name, width, width === 320 || width === 1440);
  const controls = page
    .locator('#modal button,#modal input,#modal select,#modal textarea,#modal a[href]')
    .filter({ visible: true });
  const enabled = await controls.evaluateAll(
    (elements) => elements.filter((element) => !element.disabled && element.tabIndex >= 0).length,
  );
  if (enabled) {
    await page.evaluate(() => {
      const controls = [
        ...$('modal').querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]'),
      ].filter(
        (element) => !element.disabled && element.getClientRects().length && element.tabIndex >= 0,
      );
      controls.at(-1).focus();
    });
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => $('modal').contains(document.activeElement)),
      true,
      `${width} ${name}: Tab escaped modal`,
    );
    await page.keyboard.press('Shift+Tab');
    assert.equal(
      await page.evaluate(() => $('modal').contains(document.activeElement)),
      true,
      `${width} ${name}: Shift+Tab escaped modal`,
    );
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => $('modalback').hidden), true, `${width} ${name}: Escape`);
  assert.equal(
    await page.evaluate(() => document.activeElement === window.auditPreviousFocus),
    true,
    `${width} ${name}: focus was not restored`,
  );
}

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width >= 768 ? 1000 : 844 },
      isMobile: width <= 768,
      hasTouch: width <= 768,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.pageErrors.push({ width, error: error.message }));
    page.on('request', (request) => {
      if (!request.url().startsWith(`http://127.0.0.1:${server.address().port}`))
        report.externalRequests.push(request.url());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      store.sound = false;
      applySettings();
      save();
      home();
    });
    const ids = await page.evaluate(() => games.map((game) => game[0]));
    assert.equal(ids.length, 37);
    report.games = ids;
    await inspect(page, 'home', width, true);
    await page.locator('.discover-drawer > summary').click();
    await inspect(page, 'home-discovery', width, width === 320 || width === 1440);
    await page.locator('#catalog').scrollIntoViewIfNeeded();
    await page.screenshot({ path: new URL(`${width}-catalog-viewport.png`, directory).pathname });
    for (const id of ids) {
      await page.evaluate((id) => setup(id), id);
      assert.equal(await page.evaluate(() => screen), 'setup', `${width} ${id}: setup`);
      await inspect(page, `${id}-setup`, width);
      const start = page.locator('#app button[onclick]').filter({ visible: true });
      const action = await start.evaluateAll((buttons) =>
        buttons
          .map((button) => button.getAttribute('onclick'))
          .find((action) => /\bstart\w*\(/.test(action)),
      );
      assert.ok(action, `${width} ${id}: start control`);
      await page.locator(`#app button[onclick="${action}"]`).click();
      await page.evaluate(() => clearTimers());
      assert.equal(await page.evaluate(() => screen), id, `${width} ${id}: started`);
      await inspect(
        page,
        `${id}-play`,
        width,
        width === 320 ||
          (width === 1440 && ['solo', 'sudoku', 'teamcup', 'nonogram', 'wordguess'].includes(id)),
      );
      const guide = page
        .locator(`button[onclick="openGuide('${id}')"]`)
        .filter({ visible: true })
        .first();
      assert.equal(await guide.count(), 1, `${width} ${id}: game guide`);
      await guide.click();
      await inspect(page, `${id}-guide`, width);
      await page.keyboard.press('Escape');
      const guideFocus = await page.evaluate(() => document.activeElement?.getAttribute('onclick'));
      if (guideFocus !== `openGuide('${id}')`)
        report.issues.push({
          severity: 'error',
          width,
          label: `${id}-guide-close`,
          kind: 'focus-restore',
          detail: guideFocus,
        });
      await page.evaluate(
        (id) =>
          result(
            id,
            'أكملت التحدي!',
            'نتيجة تدقيق الواجهة: اكتملت الجولة بنجاح؛ جرّب تحدياً جديداً أو راجع الجولة السابقة.',
            85,
          ),
        id,
      );
      await inspect(
        page,
        `${id}-result`,
        width,
        width === 320 && ['solo', 'wordguess', 'sudoku'].includes(id),
      );
      await page.evaluate(() => home());
    }
    // Separate rendering fixtures exercise dense pass-and-play screens and
    // the specialised party results, beyond the common result template.
    await page.evaluate(() => {
      store.players = Array.from({ length: 12 }, (_, i) => `عبدالرحمن عبدالمحسن ${i + 1}`);
    });
    for (const id of ['teamcup', 'undercover', 'improv']) {
      await page.evaluate((id) => setup(id), id);
      await inspect(page, `${id}-twelve-setup`, width);
      await page.evaluate((id) => {
        startPartyGame(id);
        if (id === 'teamcup') teamCupBegin();
        else if (id === 'undercover') {
          state.stage = 'vote-handoff';
          renderUndercoverVoteHandoff();
          undercoverOpenVote();
        } else {
          creativeStartAnswers();
          creativeOpenAnswer();
        }
        clearTimers();
      }, id);
      await inspect(page, `${id}-twelve-active`, width, width === 320);
      await page.evaluate((id) => {
        const s = state;
        s.players.forEach((name) => {
          s.results[name] = 20;
        });
        if (id === 'teamcup') {
          s.turn = s.cycles * 2;
          s.teamScores = [120, 105];
          s.history = Array.from({ length: s.cycles * 2 }, (_, i) => ({
            team: i % 2,
            captain: s.teams[i % 2][i % s.teams[i % 2].length],
            mode: ['تمثيل', 'كلمات ممنوعة', 'معلومات'][Math.floor(i / 2) % 3],
            score: 10,
            correct: 1,
            attempts: 2,
            boosts: 0,
            words: [{ action: 'correct', word: 'مكتبة', boosted: false }],
          }));
          finishTeamCup();
        } else {
          if (id === 'improv')
            s.history = [
              {
                prompt: 'اقتراح جديد يختاره جميع اللاعبين لهذه الجولة',
                entries: s.players.map((_, author) => ({
                  author,
                  text: 'فكرة طويلة للمراجعة: نتعاون ونبتكر حلاً مختلفاً، ثم نجرّب الطريقة معاً.',
                  winning: true,
                  votes: 1,
                })),
              },
            ];
          s.round = s.rounds;
          finishPartySession(id, 'نتائج اللمّة: اثنا عشر لاعباً', false);
        }
      }, id);
      await inspect(page, `${id}-twelve-result`, width, width === 320);
      const review = page.locator('.success details > summary').first();
      if (await review.count()) {
        await review.click();
        await inspect(page, `${id}-twelve-review`, width);
      }
      await page.evaluate(() => home());
    }
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      home();
    });
    for (const [action, name] of [
      ['openSettings()', 'settings'],
      ['openGuide()', 'guide'],
      ['openProfile()', 'profile'],
      ['openPeople()', 'players'],
      ['openBoard()', 'scores'],
      ['openDaily()', 'daily'],
      ['openTournament()', 'tournament'],
    ])
      await inspectModal(page, action, name, width);
    if (width < 768) {
      await page.evaluate(() => {
        home();
        setup('solo');
        startNumber('solo');
        state.secret = 75n;
      });
      assert.equal(
        await page.locator('#guessInput').getAttribute('readonly'),
        '',
        'Touch screens default to the game keypad',
      );
      await page.evaluate(() => {
        soloKey('5');
        soloKey('0');
        guessSolo();
      });
      await inspect(page, 'solo-touch-feedback', width, true);
      await page.locator('button[onclick="toggleSoloPad()"]').click();
      await page.locator('#guessInput').focus();
      await page.setViewportSize({ width, height: 420 });
      await page.evaluate(() => updatePlayViewport());
      await inspect(page, 'solo-keyboard-viewport', width, true);
      await page.locator('#guessInput').fill('60');
      await page.evaluate(() => guessSolo());
      await page.waitForFunction(() => {
        const feedback = $('soloFeedback').getBoundingClientRect();
        return feedback.top >= -1 && feedback.bottom <= innerHeight + 1;
      });
      const feedback = await page.locator('#soloFeedback').boundingBox();
      assert.ok(
        feedback.y >= -1 && feedback.y + feedback.height <= 421,
        `${width} feedback is outside the shrunken keyboard viewport`,
      );
      await inspect(page, 'solo-keyboard-feedback', width, true);
      await page.setViewportSize({ width, height: 844 });
    }
    await page.evaluate(() => {
      openTournament();
      startTournament();
    });
    await inspect(page, 'tournament-handoff', width, width === 320);
    await page.evaluate(() => {
      startTourRound();
      clearTimers();
    });
    await inspect(page, 'tournament-round', width);
    await page.evaluate(() => {
      tourney.turn = tourney.queue.length * tourney.players.length - 1;
      state.done = true;
      nextTournament();
    });
    await inspect(page, 'tournament-result', width, width === 320);
    await page.evaluate(() => {
      home();
      store.extra.theme = 'light';
      applySettings();
    });
    await inspect(page, 'home-light', width, width === 320 || width === 1440);
    console.log(
      `✓ ${width}px: 37 setups, games, guides, results; seven dialogs; tournament; light theme`,
    );
    await context.close();
  }
} finally {
  await writeFile(new URL('report.json', directory), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const failures = report.issues.filter((issue) => issue.severity === 'error');
console.log(
  `${report.screens.length} browser layout screens inspected; ${report.issues.length} findings.`,
);
for (const finding of report.issues)
  console.log(
    `${finding.severity}: ${finding.width}px ${finding.label} ${finding.kind}: ${JSON.stringify(finding.detail).slice(0, 500)}`,
  );
assert.deepEqual(report.pageErrors, [], 'Browser runtime errors');
assert.deepEqual(report.externalRequests, [], 'Standalone app made external requests');
assert.deepEqual(
  failures,
  [],
  'Layout or focus errors; inspect test-results/browser-v7/report.json',
);
