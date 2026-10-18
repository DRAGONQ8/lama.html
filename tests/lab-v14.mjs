import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

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
  if (process.env.LAB_V14_FILTER && !new RegExp(process.env.LAB_V14_FILTER).test(name)) return;
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

async function variant(page, id, rule, level = 'easy') {
  await page.evaluate(
    ({ id, rule, level }) => {
      setup(id);
      $('labLevel').value = level;
      $('labRule').value = rule;
      startLab(id);
    },
    { id, rule, level },
  );
}

try {
  await check(
    'Nonogram line map identifies complete/conflicting lines and navigates without a move',
    async (page) => {
      await nonogramFixture(page);
      await page.locator('#labLineMapToggle').click();
      assert.equal(await page.locator('.lab-line-map button').count(), 6);
      assert.match(await page.locator('#labLine-row-0').textContent(), /الاحتمالات: 1/);
      const independent = await page.evaluate(() => {
        const descriptor = Object.getOwnPropertyDescriptor(state, 'answer');
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw Error('answer read');
          },
        });
        try {
          return labLineMapContentHTML().includes('الصفوف');
        } finally {
          Object.defineProperty(state, 'answer', descriptor);
        }
      });
      assert.equal(independent, true);
      for (const i of [0, 1, 2]) await page.locator(`#labBoard [data-index="${i}"]`).click();
      assert.match(await page.locator('#labLine-row-0').textContent(), /مكتمل/);
      const before = await page.evaluate(() => ({
        moves: state.moves,
        hints: state.hints,
        board: [...state.board],
      }));
      await page.locator('#labLine-column-1').click();
      assert.equal(await page.evaluate(() => state.selected), 4);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '4');
      assert.equal(await page.evaluate(() => state.patternAxis), 'column');
      assert.deepEqual(
        await page.evaluate(() => ({ moves: state.moves, hints: state.hints, board: state.board })),
        before,
      );
      await page.locator('#labMode-cross').click();
      await page.locator('#labBoard [data-index="4"]').click();
      assert.match(await page.locator('#labLine-column-1').textContent(), /متعارض/);
      await page.locator('#labUndo').click();
      assert.doesNotMatch(await page.locator('#labLine-column-1').textContent(), /متعارض/);
    },
  );
  await check(
    'Nonogram generated puzzles complete through board clicks on every level and rule',
    async (page) => {
      for (const rule of ['classic', 'mirror'])
        for (const level of ['easy', 'normal', 'hard']) {
          await variant(page, 'nonogram', rule, level);
          const answer = await page.evaluate(() => [...state.answer]);
          for (let i = 0; i < answer.length; i++) {
            if (
              await page.evaluate((i) => !state.done && state.answer[i] && state.board[i] !== 1, i)
            )
              await page.locator(`#labBoard [data-index="${i}"]`).click();
          }
          assert.equal(await page.evaluate(() => state.done), true, `${rule}/${level}`);
          assert.equal(await page.evaluate(() => labNonogramWon()), true);
          assert.equal(await page.locator('.lab-result-review').count(), 1);
          const score = await page.evaluate(() => store.scores['ليلى']);
          await page.evaluate(() => {
            labHint();
            labFinish('again', 'again');
          });
          assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), score);
        }
    },
  );
  await check(
    'Lights draft undo/redo reverses toggles and clearing without changing the board or scoring',
    async (page) => {
      await start(page, 'lights');
      const before = await page.evaluate(() => ({
        board: [...state.board],
        moves: state.moves,
        hints: state.hints,
      }));
      await page.locator('#labMode-plan').click();
      await page.locator('#labBoard [data-index="0"]').click();
      await page.locator('#labBoard [data-index="1"]').click();
      await page.locator('#labClearPlan').click();
      assert.equal(await page.evaluate(() => state.plan.filter(Boolean).length), 0);
      await page.locator('#labPlanUndo').click();
      assert.equal(await page.evaluate(() => state.plan.filter(Boolean).length), 2);
      await page.locator('#labPlanUndo').press('Enter');
      assert.equal(await page.evaluate(() => state.plan.filter(Boolean).length), 1);
      await page.locator('#labPlanRedo').click();
      assert.equal(await page.evaluate(() => state.plan.filter(Boolean).length), 2);
      await page.locator('#labPlanUndo').click();
      await page.locator('#labBoard [data-index="2"]').click();
      assert.equal(await page.locator('#labPlanRedo').isDisabled(), true);
      assert.deepEqual(
        await page.evaluate(() => ({ board: state.board, moves: state.moves, hints: state.hints })),
        before,
      );
    },
  );
  await check(
    'Lights hints preserve the draft, suggest a legal edit, and never charge for a solved plan',
    async (page) => {
      await variant(page, 'lights', 'switches');
      await page.evaluate(() => {
        state.board = Array(16).fill(0);
        state.switches = Array.from({ length: 16 }, (_, i) => ![3, 12].includes(i));
        for (const i of [0, 5, 15]) labToggleLights(state.board, i, 4);
        state.initial = [...state.board];
        state.parMoves = 3;
        renderLab();
      });
      await page.locator('#labMode-plan').click();
      const solution = await page.evaluate(() =>
        labLightsSolve(state.board, state.size, state.switches),
      );
      await page.locator(`#labBoard [data-index="${solution[0]}"]`).click();
      const before = await page.evaluate(() => ({
        board: [...state.board],
        plan: [...state.plan],
        history: state.planHistory.length,
      }));
      await page.locator('#labHint').click();
      const first = await page.evaluate(() => ({
        board: state.board,
        plan: state.plan,
        mode: state.mode,
        legal: state.switches[state.hintCell],
        hints: state.hints,
        history: state.planHistory.length,
      }));
      assert.deepEqual(first.board, before.board);
      assert.deepEqual(first.plan, before.plan);
      assert.equal(first.mode, 'plan');
      assert.equal(first.legal, true);
      assert.equal(first.history, before.history);
      await page.locator('#labHint').click();
      assert.equal(await page.evaluate(() => state.hints), first.hints);
      for (let k = 1; k < solution.length; k++)
        await page.locator(`#labBoard [data-index="${solution[k]}"]`).click();
      const hints = await page.evaluate(() => state.hints);
      await page.locator('#labHint').click();
      assert.equal(await page.evaluate(() => state.hints), hints);
      assert.match(await page.locator('#labMessage').textContent(), /خطتك الحالية تطفئ/);
      await page.locator('#labApplyPlan').click();
      assert.equal(await page.evaluate(() => state.done), true);
      assert.equal(await page.evaluate(() => state.moves), solution.length);
    },
  );
  await check(
    'Lights chase can be undone as a draft and committed steps reset draft history',
    async (page) => {
      await start(page, 'lights');
      await page.evaluate(() => {
        state.board = Array(16).fill(0);
        for (const i of [0, 8]) labToggleLights(state.board, i, 4);
        state.initial = [...state.board];
        state.parMoves = 2;
        renderLab();
      });
      await page.locator('#labMode-plan').click();
      const before = await page.evaluate(() => [...state.plan]);
      await page.locator('#labChase').click();
      assert.ok(await page.evaluate(() => state.plan.some(Boolean)));
      await page.locator('#labPlanUndo').click();
      assert.deepEqual(await page.evaluate(() => state.plan), before);
      await page.locator('#labPlanRedo').click();
      await page.locator('#labStepPlan').click();
      assert.equal(await page.evaluate(() => state.moves), 1);
      assert.equal(await page.evaluate(() => state.planHistory.length), 0);
      await page.locator('#labUndo').click();
      assert.equal(await page.evaluate(() => state.plan.some(Boolean)), false);
      assert.equal(await page.evaluate(() => state.moves), 1);
    },
  );
  await check(
    'Lights generated boards solve using legal clicks on every level and rule',
    async (page) => {
      for (const rule of ['classic', 'switches'])
        for (const level of ['easy', 'normal', 'hard']) {
          await variant(page, 'lights', rule, level);
          const solution = await page.evaluate(() =>
            labLightsSolve(state.board, state.size, state.switches),
          );
          assert.ok(solution.length > 0);
          for (const i of solution) await page.locator(`#labBoard [data-index="${i}"]`).click();
          assert.equal(await page.evaluate(() => state.done), true, `${rule}/${level}`);
          assert.equal(await page.evaluate(() => state.board.some(Boolean)), false);
          assert.equal(await page.evaluate(() => state.moves), solution.length);
        }
    },
  );
  await check(
    'Pipe orientation comparison is read-only, selects pieces, applies shortest rotations and supports undo',
    async (page) => {
      await start(page, 'pipes');
      await page.evaluate(() => {
        Object.assign(state, {
          size: 2,
          source: 0,
          board: [2, 12, 2, 3],
          initial: [2, 12, 2, 3],
          answer: [2, 12, 2, 9],
          pipeLocked: Array(4).fill(false),
          selected: 0,
        });
        renderLab();
      });
      await page.locator('#labOrientationsToggle').click();
      const i = await page.evaluate(() =>
        state.board.findIndex((mask) => [1, 2, 4, 8].includes(mask)),
      );
      const board = await page.evaluate(() => [...state.board]);
      await page.locator(`#labBoard [data-index="${i}"]`).click();
      assert.deepEqual(await page.evaluate(() => state.board), board);
      assert.equal(await page.locator('.lab-orientation').count(), 4);
      const option = await page.evaluate(() => {
        const descriptor = Object.getOwnPropertyDescriptor(state, 'answer');
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw Error('answer read');
          },
        });
        try {
          return labPipeOrientations().find((option) => option.turns === 2);
        } finally {
          Object.defineProperty(state, 'answer', descriptor);
        }
      });
      await page.locator(`#labOrientation-${option.mask}`).click();
      assert.equal(await page.evaluate((i) => state.board[i], i), option.mask);
      assert.equal(await page.evaluate(() => state.moves), 2);
      assert.equal(await page.evaluate(() => state.history.length), 1);
      await page.locator('#labUndo').click();
      assert.deepEqual(await page.evaluate(() => state.board), board);
      assert.equal(await page.evaluate(() => state.moves), 2);
      await page.locator('#labRedo').click();
      assert.equal(await page.evaluate((i) => state.board[i], i), option.mask);
      assert.equal(await page.evaluate(() => state.moves), 2);
    },
  );
  await check(
    'Pipe simulation and locks reject orientation actions without dropping the test or changing history',
    async (page) => {
      await variant(page, 'pipes', 'districts');
      await page.locator('#labOrientationsToggle').click();
      await page.locator('#labLock').click();
      assert.equal(await page.locator('.lab-orientation:not(:disabled)').count(), 0);
      await page.locator('#labLock').click();
      await page.locator('#labFlowStart').click();
      assert.equal(await page.locator('#labLock').isDisabled(), true);
      assert.equal(await page.locator('.lab-orientation:not(:disabled)').count(), 0);
      const guarded = await page.evaluate(() => {
        state.pipeTest.playing = false;
        const board = [...state.board],
          test = state.pipeTest,
          history = state.history.length,
          locked = [...state.pipeLocked],
          moves = state.moves;
        labTogglePipeLock();
        labApplyPipeOrientation(labRotatePipe(state.board[state.selected]), state.board.join(','));
        return {
          board,
          after: state.board,
          sameTest: state.pipeTest === test,
          history: state.history.length - history,
          locked,
          afterLocked: state.pipeLocked,
          moves: state.moves - moves,
        };
      });
      assert.deepEqual(guarded.after, guarded.board);
      assert.deepEqual(guarded.afterLocked, guarded.locked);
      assert.equal(guarded.sameTest, true);
      assert.equal(guarded.history, 0);
      assert.equal(guarded.moves, 0);
      await page.locator('#labFlowClose').click();
      assert.equal(await page.locator('#labLock').isDisabled(), false);
    },
  );
  await check(
    'Pipe orientation rejects obsolete signatures and detached controls',
    async (page) => {
      await start(page, 'pipes');
      await page.locator('#labOrientationsToggle').click();
      const result = await page.evaluate(() => {
        const i = state.board.findIndex((mask) => labRotatePipe(mask) !== mask);
        labSelect(i);
        const signature = state.board.join(','),
          mask = labRotatePipe(state.board[i]),
          stale = document.querySelector('.lab-orientation:not(:disabled)');
        labRotateSelected(1);
        const after = [...state.board],
          moves = state.moves;
        labApplyPipeOrientation(mask, signature);
        stale.click();
        return {
          unchanged: after.every((value, i) => value === state.board[i]),
          moves: state.moves - moves,
        };
      });
      assert.deepEqual(result, { unchanged: true, moves: 0 });
    },
  );
  await check(
    'Pipe generated networks finish through orientation choices on every level and rule',
    async (page) => {
      for (const rule of ['classic', 'districts'])
        for (const level of ['easy', 'normal', 'hard']) {
          await variant(page, 'pipes', rule, level);
          await page.locator('#labOrientationsToggle').click();
          const answer = await page.evaluate(() => [...state.answer]);
          for (let i = 0; i < answer.length; i++) {
            if (await page.evaluate((i) => !state.done && state.board[i] !== state.answer[i], i)) {
              await page.locator(`#labBoard [data-index="${i}"]`).click();
              await page.locator(`#labOrientation-${answer[i]}`).click();
            }
          }
          assert.equal(await page.evaluate(() => state.done), true, `${rule}/${level}`);
          assert.equal(await page.evaluate(() => labAnalysePipes().solved), true);
          assert.equal(await page.locator('.lab-result-review').count(), 1);
        }
    },
  );
  await check('Opened Lab tools pass all default Axe rules in both mobile themes', async (page) => {
    const output = new URL('../test-results/lab-v14/', import.meta.url),
      report = { screens: 0, rulesDisabled: [], violations: [] };
    await mkdir(output, { recursive: true });
    for (const theme of ['dark', 'light'])
      for (const id of ['nonogram', 'lights', 'pipes']) {
        await page.evaluate(
          ({ theme, id }) => {
            store.extra.theme = theme;
            applySettings();
            setup(id);
            startLab(id);
            if (id === 'nonogram') labToggleLineMap();
            else if (id === 'lights') {
              labMode('plan');
              labLightsTap(0);
              labLightsTap(1);
              labUndoPlan();
            } else {
              labTogglePipeOrientations();
              labSelect(state.board.findIndex((mask) => [1, 2, 4, 8].includes(mask)));
            }
          },
          { theme, id },
        );
        const label = `${theme}-${id}`,
          audit = await new AxeBuilder({ page }).analyze();
        await writeFile(new URL(`suite-${label}.json`, output), JSON.stringify(audit, null, 2));
        report.screens++;
        for (const violation of audit.violations)
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
    await writeFile(new URL('suite-summary.json', output), JSON.stringify(report, null, 2));
    assert.equal(report.screens, 6);
    assert.deepEqual(report.violations, [], 'See test-results/lab-v14/suite-summary.json');
  });
  console.log(`\n${passed} lab V14 browser checks passed.`);
} finally {
  await browser.close();
  server.close();
}
