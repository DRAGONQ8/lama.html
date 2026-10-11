import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Use the source files directly so this suite also works before a release build.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const manifest = (name) =>
  [...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const scriptNames = manifest('scripts');
const styleNames = manifest('styles');
const scripts = (await Promise.all(scriptNames.map((name) => read(`src/${name}.js`)))).join('\n');
const styles = (
  await Promise.all(
    styleNames.map((name) =>
      read(`src/${name}.css`).catch((error) => {
        if (error.code === 'ENOENT' && name !== 'styles') return '';
        throw error;
      }),
    ),
  )
).join('\n');
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
let passed = 0;
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['ليلى'];
      store.extra.motion = false;
      save();
      home();
    });
    await run(page);
    assert.deepEqual(errors, [], name + ': browser exception');
    passed++;
    console.log('✓ ' + name);
  } finally {
    await context.close();
  }
}
async function start(page, id) {
  await page.evaluate((id) => {
    setup(id);
    $('labLevel').value = 'easy';
    startLab(id);
  }, id);
}
async function nonogramFixture(page) {
  await start(page, 'nonogram');
  await page.evaluate(() => {
    Object.assign(state, {
      size: 3,
      answer: [1, 1, 1, 0, 1, 0, 0, 1, 0],
      rowClues: [[3], [1], [1]],
      colClues: [[1], [3], [1]],
      board: Array(9).fill(0),
      initial: Array(9).fill(0),
      fixed: Array(9).fill(false),
      selected: 0,
      linePatterns: null,
    });
    renderLab();
  });
}

try {
  await check(
    'Move lens is opt-in, uses visible clues, and keeps moves and hints untouched',
    async (page) => {
      await nonogramFixture(page);
      assert.equal(await page.locator('#labLensToggle').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#labLensContent').isVisible(), false);
      const outcome = await page.evaluate(() => {
        const before = {
          board: [...state.board],
          moves: state.moves,
          hints: state.hints,
          history: state.history.length,
        };
        const answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('The move lens must not read the hidden solution');
          },
        });
        labToggleLens();
        labMode('cross');
        const comparison = labMoveLensData();
        const after = {
          board: [...state.board],
          moves: state.moves,
          hints: state.hints,
          history: state.history.length,
        };
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        return { before, after, comparison };
      });
      assert.deepEqual(outcome.after, outcome.before);
      assert.equal(outcome.comparison.conflict, true);
      assert.equal(outcome.comparison.after[0], 0);
      assert.match(await page.locator('#labLensContent').textContent(), /بلا ترتيب ممكن/);
      await page.evaluate(() => {
        labMode('fill');
      });
      await page.locator('#labBoard [data-index="1"]').click();
      assert.deepEqual(
        await page.evaluate(() => [state.selected, state.board[1], state.moves]),
        [1, 0, 0],
        'Selecting a cell while the lens is open must only preview it',
      );
      await page.locator('#labLensApply').click();
      assert.deepEqual(
        await page.evaluate(() => [state.board[1], state.moves, state.hints]),
        [1, 1, 0],
      );
      await page.locator('#labUndo').click();
      assert.equal(await page.evaluate(() => state.board[1]), 0);
      await page.evaluate(() => {
        state.fixed[0] = true;
        labSelect(0);
      });
      assert.equal(await page.locator('#labLensApply').isDisabled(), true);
      const fixed = await page.evaluate(() => {
        labApplyLensMove();
        return [state.board[0], state.moves];
      });
      assert.deepEqual(fixed, [0, 1]);
    },
  );

  await check(
    'Lights preview paints the planned result without committing it and can return to current board',
    async (page) => {
      await start(page, 'lights');
      await page.evaluate(() => {
        state.board = Array(16).fill(0);
        labToggleLights(state.board, 0, 4);
        labToggleLights(state.board, 8, 4);
        state.initial = [...state.board];
        state.plan.fill(false);
        state.parMoves = 2;
        renderLab();
      });
      const initial = await page.evaluate(() => [...state.board]);
      assert.equal(initial.filter(Boolean).length, 5);
      await page.locator('#labMode-plan').click();
      await page.locator('#labBoard [data-index="0"]').click();
      await page.locator('#labPlanPreview').click();
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      assert.equal(await page.locator('#labBoard .lab-lit').count(), 4);
      assert.equal(await page.locator('#labBoard .lab-projected-mark').count(), 3);
      assert.match(
        await page.locator('#labBoard [data-index="4"]').getAttribute('aria-label'),
        /بعد الخطة، حالياً مطفأ/,
      );
      assert.deepEqual(
        await page.evaluate(() => [state.moves, state.hints, state.history.length]),
        [0, 0, 0],
      );
      await page.locator('#labLensToggle').click();
      await page.locator('#labBoard [data-index="0"]').click();
      assert.equal(await page.evaluate(() => state.plan[0]), true);
      const comparison = await page.evaluate(() => labMoveLensData());
      assert.deepEqual(
        [comparison.before, comparison.after, comparison.off, comparison.on],
        [4, 5, 1, 2],
      );
      await page.locator('#labPlanPreview').click();
      assert.equal(await page.locator('#labBoard .lab-lit').count(), 5);
      assert.equal(await page.locator('.lab-preview-banner').count(), 0);
      await page.locator('#labApplyPlan').click();
      assert.equal(await page.evaluate(() => state.board.filter(Boolean).length), 4);
      assert.equal(await page.evaluate(() => state.moves), 1);
      await page.locator('#labUndo').click();
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      assert.equal(await page.evaluate(() => state.moves), 1);
      await page.locator('#labMode-plan').click();
      await page.locator('#labBoard [data-index="0"]').click();
      await page.locator('#labLensApply').click();
      assert.equal(await page.evaluate(() => state.plan[0]), true);
      await page.locator('#labReset').click();
      assert.equal(await page.evaluate(() => state.plan.some(Boolean)), false);
      assert.deepEqual(await page.evaluate(() => state.board), initial);
    },
  );

  await check(
    'Pipe lens previews one turn without consulting an answer; locks undo and reset even on the initial board',
    async (page) => {
      await start(page, 'pipes');
      await page.evaluate(() => {
        Object.assign(state, {
          size: 2,
          board: [4, 9, 4, 3],
          initial: [4, 9, 4, 3],
          answer: [2, 12, 2, 9],
          pipeLocked: Array(4).fill(false),
          source: 0,
          history: [],
          future: [],
          selected: 0,
        });
        renderLab();
      });
      const preview = await page.evaluate(() => {
        const answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('Hidden answer accessed');
          },
        });
        labToggleLens();
        const result = labMoveLensData();
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        return result;
      });
      assert.equal(preview.mask, 8);
      assert.equal(await page.evaluate(() => state.moves), 0);
      assert.equal(await page.locator('.lab-lens-pipe svg').count(), 1);
      await page.locator('#labLock').click();
      assert.equal(await page.locator('#labLensApply').isDisabled(), true);
      assert.equal(await page.evaluate(() => state.history.length), 1);
      await page.locator('#labUndo').click();
      assert.equal(await page.evaluate(() => state.pipeLocked[0]), false);
      await page.locator('#labRedo').click();
      assert.equal(await page.evaluate(() => state.pipeLocked[0]), true);
      await page.locator('#labReset').click();
      assert.equal(await page.evaluate(() => state.pipeLocked.some(Boolean)), false);
      await page.locator('#labUndo').click();
      assert.equal(await page.evaluate(() => state.pipeLocked[0]), true);
      await page.evaluate(() => labTogglePipeLock(1));
      assert.equal(await page.evaluate(() => state.future.length), 0);
      assert.equal(await page.evaluate(() => state.moves), 0);
    },
  );

  await check('Paused games reject preview controls and lens execution', async (page) => {
    for (const id of ['nonogram', 'lights', 'pipes']) {
      await start(page, id);
      const outcome = await page.evaluate(() => {
        labToggleLens();
        if (state.id === 'lights') labMode('plan');
        state.pausedAt = Date.now();
        const snapshot = () =>
          JSON.stringify({
            board: state.board,
            moves: state.moves,
            hints: state.hints,
            lensOpen: state.lensOpen,
            plan: state.plan,
            planPreview: state.planPreview,
            history: state.history,
            locked: state.pipeLocked,
          });
        const before = snapshot();
        labToggleLens();
        labApplyLensMove();
        labTogglePlanPreview();
        labTogglePipeLock();
        labReset();
        const after = snapshot();
        delete state.pausedAt;
        return { before, after };
      });
      assert.equal(outcome.before, outcome.after, id + ': pause leaked an action');
    }
  });

  await check(
    'Hard nonogram keyboard navigation keeps the selected column visible without page overflow',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await page.evaluate(() => {
        setup('nonogram');
        $('labLevel').value = 'hard';
        startLab('nonogram');
      });
      await page.locator('#labBoard [data-index="0"]').focus();
      await page.keyboard.press('Control+End');
      const visibility = await page.evaluate(() => {
        const selected = $('labBoard')
          .querySelector(`[data-index="${state.selected}"]`)
          .getBoundingClientRect();
        const scroll = document.querySelector('.lab-scroll').getBoundingClientRect();
        return {
          selected: state.selected,
          left: selected.left,
          right: selected.right,
          viewportLeft: scroll.left,
          viewportRight: scroll.right,
          scrollLeft: document.querySelector('.lab-scroll').scrollLeft,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(visibility.selected, 80);
      assert.ok(visibility.left >= visibility.viewportLeft - 1);
      assert.ok(visibility.right <= visibility.viewportRight + 1);
      assert.ok(visibility.scrollLeft > 0);
      assert.equal(visibility.overflow, false);
      assert.equal(await page.locator('#labBoard .lab-clue-selected').count(), 2);
      await page.locator('#labLensToggle').click();
      assert.equal(
        await page.evaluate(() => document.querySelector('.lab-scroll').scrollLeft),
        visibility.scrollLeft,
        'Opening tools must preserve the column being viewed',
      );
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'labLensToggle');
      await page.screenshot({ path: '/tmp/lama-lab-v7-nonogram.png', fullPage: true });
    },
  );

  console.log(`${passed} logic v7 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
