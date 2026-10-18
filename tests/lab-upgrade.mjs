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
    'Nonogram deductions use visible line constraints and reject contradictory marks',
    async (page) => {
      const lines = await page.evaluate(() => ({
        overlap: labLineAnalysis([0, 0, 0, 0, 0], [3]),
        conflict: labLineAnalysis([0, 0, 2, 0, 0], [3]),
        complete: labLineAnalysis([1, 1, 1, 0, 0], [3]),
      }));
      assert.deepEqual(lines.overlap.forced, [{ position: 2, value: 1 }]);
      assert.equal(lines.conflict.conflict, true);
      assert.equal(lines.complete.complete, true);
      assert.deepEqual(lines.complete.forced, [
        { position: 3, value: 0 },
        { position: 4, value: 0 },
      ]);
      await nonogramFixture(page);
      await page.evaluate(() => labHint());
      assert.deepEqual(await page.evaluate(() => [state.board[0], state.hints]), [1, 1]);
      assert.match(await page.locator('#labMessage').textContent(), /كل احتمالات/);
      const after = await page.evaluate(() => {
        state.board[1] = 2;
        const before = [...state.board];
        labHint();
        return { before, board: state.board, hints: state.hints };
      });
      assert.deepEqual(after.board, after.before);
      assert.equal(after.hints, 1);
      assert.ok((await page.locator('.lab-clue-conflict').count()) > 0);
      assert.match(await page.locator('#labMessage').textContent(), /لم يُخصم/);
    },
  );

  await check(
    'Completed-line marking has one reversible action and new moves discard redo',
    async (page) => {
      await nonogramFixture(page);
      const outcome = await page.evaluate(() => {
        state.board[4] = 1;
        state.selected = 4;
        labCompleteLine('row');
        const completed = [...state.board];
        labUndo();
        const undone = [...state.board];
        labRedo();
        const redone = [...state.board];
        labUndo();
        labNonogramTap(6, 'cross');
        return { completed, undone, redone, moves: state.moves, future: state.future.length };
      });
      assert.deepEqual(outcome.completed.slice(3, 6), [2, 1, 2]);
      assert.deepEqual(outcome.undone.slice(3, 6), [0, 1, 0]);
      assert.deepEqual(outcome.redone, outcome.completed);
      assert.equal(outcome.moves, 2);
      assert.equal(outcome.future, 0);
      await page.evaluate(() => {
        labSelect(0);
        labCompleteLine('row');
      });
      assert.match(await page.locator('#labMessage').textContent(), /أكمل مجموعات/);
    },
  );

  await check(
    'Lights planning changes no live cells until commit and preserves costs through undo',
    async (page) => {
      await start(page, 'lights');
      const initial = await page.evaluate(() => [...state.board]);
      await page.locator('#labMode-plan').click();
      await page.locator('#labBoard [data-index="0"]').click();
      await page.locator('#labBoard [data-index="0"]').click();
      assert.equal(await page.evaluate(() => state.plan.filter(Boolean).length), 0);
      for (const index of [0, 1]) await page.locator(`#labBoard [data-index="${index}"]`).click();
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      assert.equal(await page.evaluate(() => state.moves), 0);
      const expected = [...initial];
      for (const index of [0, 1]) {
        const r = Math.floor(index / 4),
          c = index % 4;
        for (const [dr, dc] of [
          [0, 0],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const rr = r + dr,
            cc = c + dc;
          if (rr >= 0 && rr < 4 && cc >= 0 && cc < 4) expected[rr * 4 + cc] ^= 1;
        }
      }
      await page.locator('#labApplyPlan').click();
      assert.deepEqual(await page.evaluate(() => state.board), expected);
      assert.equal(await page.evaluate(() => state.moves), 2);
      await page.locator('#labUndo').click();
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      await page.locator('#labRedo').click();
      assert.deepEqual(await page.evaluate(() => state.board), expected);
      assert.equal(await page.evaluate(() => state.moves), 2);
      await page.locator('#labMode-plan').click();
      await page.locator('#labBoard [data-index="3"]').click();
      await page.locator('#labHint').click();
      assert.equal(await page.evaluate(() => state.mode), 'plan');
      assert.equal(await page.evaluate(() => state.plan[3]), true);
      await page.locator('#labHint').click();
      assert.equal(await page.evaluate(() => state.hints), 1);
    },
  );

  await check(
    'Pipe constraints derive orientations and SVG marks every open leak',
    async (page) => {
      const outcome = await page.evaluate(() => {
        const board = [4, 9, 4, 3],
          analysis = labPipeAnalysis(board, 2, 0);
        return {
          domains: labPipeDomains(board, 2),
          locked: labPipeDomains(board, 2, [true, false, false, false]),
          leaks: analysis.leaks,
          leaking: analysis.leaking,
          solved: labPipeAnalysis([2, 12, 2, 9], 2, 0).solved,
        };
      });
      assert.deepEqual(outcome.domains, [[2], [12], [2], [9]]);
      assert.ok(outcome.locked.some((domain) => !domain.length));
      assert.equal(outcome.solved, true);
      assert.equal(
        outcome.leaks,
        outcome.leaking.reduce((sum, value) => sum + value.toString(2).replace(/0/g, '').length, 0),
      );
      await start(page, 'pipes');
      assert.equal(
        await page.locator('.lab-leak-tip').count(),
        await page.evaluate(() => labPipeAnalysis(state.board, state.size, state.source).leaks),
      );
      assert.ok((await page.locator('.lab-pipe[aria-label*="فتحات غير موصولة"]').count()) > 0);
    },
  );

  await check(
    'Pipe locks block rotations and undo restores both reset board and locks',
    async (page) => {
      await start(page, 'pipes');
      const outcome = await page.evaluate(() => {
        const i = state.board.findIndex((mask, i) => mask !== state.answer[i]);
        labSelect(i);
        const initial = [...state.board];
        labTogglePipeLock();
        labPipesTap(i);
        const blocked = [...state.board];
        labTogglePipeLock();
        labPipesTap(i);
        const rotated = [...state.board];
        labTogglePipeLock();
        labReset();
        const resetLocks = [...state.pipeLocked];
        labUndo();
        const undo = { board: [...state.board], locked: state.pipeLocked[i] };
        labRedo();
        return {
          initial,
          blocked,
          rotated,
          resetLocks,
          undo,
          redone: [...state.board],
          moves: state.moves,
        };
      });
      assert.deepEqual(outcome.blocked, outcome.initial);
      assert.notDeepEqual(outcome.rotated, outcome.initial);
      assert.equal(outcome.resetLocks.some(Boolean), false);
      assert.deepEqual(outcome.undo.board, outcome.rotated);
      assert.equal(outcome.undo.locked, true);
      assert.deepEqual(outcome.redone, outcome.initial);
      assert.equal(outcome.moves, 1);
      await page.evaluate(() => {
        while (!(state.board[0] & 1)) state.board[0] = labRotatePipe(state.board[0]);
        state.pipeLocked[0] = true;
        labHint();
      });
      assert.equal(await page.evaluate(() => state.hints), 0);
      assert.match(await page.locator('#labMessage').textContent(), /تتعارض/);
    },
  );

  await check(
    'Board navigation supports row endpoints and global endpoints with one tab stop',
    async (page) => {
      await start(page, 'lights');
      await page.locator('#labBoard [data-index="5"]').focus();
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(() => state.selected), 7);
      await page.keyboard.press('Home');
      assert.equal(await page.evaluate(() => state.selected), 4);
      await page.keyboard.press('Control+End');
      assert.equal(await page.evaluate(() => state.selected), 15);
      await page.keyboard.press('Control+Home');
      assert.equal(await page.evaluate(() => state.selected), 0);
      assert.equal(await page.locator('#labBoard [tabindex="0"]').count(), 1);
      assert.equal(await page.locator('#labBoard .lab-affected').count(), 3);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    },
  );

  console.log(`${passed} logic upgrade checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
