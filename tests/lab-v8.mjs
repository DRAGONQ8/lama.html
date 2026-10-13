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
    'Nonogram notebook previews visible hypotheses and applies one reversible group',
    async (page) => {
      await nonogramFixture(page);
      assert.equal(await page.locator('#labPatterns').getAttribute('aria-expanded'), 'false');
      const outcome = await page.evaluate(() => {
        const answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('Notebook accessed hidden solution');
          },
        });
        const before = { board: [...state.board], moves: state.moves, hints: state.hints };
        labTogglePatterns();
        const data = labPatternData();
        labPreviewPattern(data.axis, data.line, 0, state.board.join(''));
        const preview = {
          board: [...state.board],
          moves: state.moves,
          hints: state.hints,
          impact: labPatternImpact(data.options[0], data),
        };
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        labApplyPattern();
        const applied = {
          board: [...state.board],
          moves: state.moves,
          hints: state.hints,
          history: state.history.length,
        };
        labUndo();
        const undone = [...state.board];
        labRedo();
        return { before, preview, applied, undone, redone: [...state.board], moves: state.moves };
      });
      assert.deepEqual(outcome.preview.board, outcome.before.board);
      assert.deepEqual([outcome.preview.moves, outcome.preview.hints], [0, 0]);
      assert.equal(outcome.preview.impact.conflicts.length, 0);
      assert.equal(outcome.preview.impact.changes, 3);
      assert.deepEqual(outcome.applied.board.slice(0, 3), [1, 1, 1]);
      assert.deepEqual(
        [outcome.applied.moves, outcome.applied.hints, outcome.applied.history],
        [3, 0, 1],
      );
      assert.deepEqual(outcome.undone, outcome.before.board);
      assert.deepEqual(outcome.redone, outcome.applied.board);
      assert.equal(outcome.moves, 3);
      assert.equal(await page.locator('#labPatternApply').count(), 0);
    },
  );

  await check(
    'Notebook diagnoses crossed-line conflicts, keeps givens, and rejects stale selections',
    async (page) => {
      await nonogramFixture(page);
      const outcome = await page.evaluate(() => {
        state.selected = 3;
        state.board[0] = 1;
        state.fixed[0] = true;
        labTogglePatterns();
        const data = labPatternData(),
          impact = labPatternImpact(data.options[0], data);
        labPreviewPattern(data.axis, data.line, 0, state.board.join(''));
        const warning = $('labNotebookContent').textContent;
        const stale = { ...state.patternPreview, pattern: [...state.patternPreview.pattern] };
        state.board[8] = 2;
        const before = [...state.board];
        labApplyPattern();
        const rejected = { board: [...state.board], moves: state.moves };
        labPreviewPattern(stale.axis, stale.line, 0, stale.signature);
        const staleIgnored = state.patternPreview === null;
        state.board[8] = 0;
        const fresh = labPatternData();
        labPreviewPattern(fresh.axis, fresh.line, 0, state.board.join(''));
        labApplyPattern();
        const fixed = state.board[0];
        labSelect(6);
        return {
          conflicts: impact.conflicts,
          warning,
          before,
          rejected,
          staleIgnored,
          fixed,
          preview: state.patternPreview,
        };
      });
      assert.deepEqual(outcome.conflicts, [0, 1]);
      assert.match(outcome.warning, /يتعارض مع الأعمدة 1، 2/);
      assert.deepEqual(outcome.rejected.board, outcome.before);
      assert.equal(outcome.rejected.moves, 0);
      assert.equal(outcome.staleIgnored, true);
      assert.equal(outcome.fixed, 1);
      assert.equal(outcome.preview, null);
    },
  );

  await check(
    'Row chasing clears upper rows, and solver top-row choices complete every supported board size',
    async (page) => {
      const outcomes = await page.evaluate(() => {
        const outcomes = [];
        for (const n of [4, 5, 6])
          for (let trial = 0; trial < 12; trial++) {
            const rng = makeSeed('lab-v8-chase:' + n + ':' + trial),
              board = Array(n * n).fill(0);
            for (let i = 0; i < board.length; i++) if (rng() < 0.4) labToggleLights(board, i, n);
            const before = [...board],
              top = Array.from({ length: n }, (_, c) => !!((trial >> c) & 1)),
              candidate = labLightsChase(board, n, top);
            const solution = labLightsSolve(board, n),
              solved = labLightsChase(
                board,
                n,
                Array.from({ length: n }, (_, c) => solution.includes(c)),
              );
            const applied = [...board];
            for (let i = 0; i < candidate.plan.length; i++)
              if (candidate.plan[i]) labToggleLights(applied, i, n);
            outcomes.push({
              original: board,
              before,
              upper: candidate.projected.slice(0, (n - 1) * n),
              bottom: candidate.bottom,
              projected: candidate.projected,
              applied,
              solved: solved.solved,
            });
          }
        return outcomes;
      });
      assert.equal(outcomes.length, 36);
      for (const outcome of outcomes) {
        assert.deepEqual(outcome.original, outcome.before);
        assert.equal(outcome.upper.some(Boolean), false);
        assert.deepEqual(outcome.applied, outcome.projected);
        assert.equal(outcome.solved, true);
      }
    },
  );

  await check(
    'Chase planning costs no moves or hints; individual execution keeps the remaining plan and undo costs',
    async (page) => {
      await start(page, 'lights');
      const outcome = await page.evaluate(() => {
        state.board = Array(16).fill(0);
        labToggleLights(state.board, 0, 4);
        labToggleLights(state.board, 8, 4);
        state.initial = [...state.board];
        state.parMoves = 2;
        labMode('plan');
        state.plan[0] = true;
        const before = [...state.board];
        labChaseLights();
        const planned = {
          board: [...state.board],
          projected: labLightsProjected(),
          plan: [...state.plan],
          moves: state.moves,
          hints: state.hints,
        };
        labStepPlan();
        const stepped = {
          board: [...state.board],
          projected: labLightsProjected(),
          plan: [...state.plan],
          moves: state.moves,
          mode: state.mode,
        };
        labUndo();
        return {
          before,
          planned,
          stepped,
          undone: [...state.board],
          cleared: !state.plan.some(Boolean),
          moves: state.moves,
        };
      });
      assert.deepEqual(outcome.planned.board, outcome.before);
      assert.equal(outcome.planned.projected.some(Boolean), false);
      assert.deepEqual(
        outcome.planned.plan.flatMap((v, i) => (v ? [i] : [])),
        [0, 8],
      );
      assert.deepEqual([outcome.planned.moves, outcome.planned.hints], [0, 0]);
      assert.equal(outcome.stepped.moves, 1);
      assert.equal(outcome.stepped.mode, 'plan');
      assert.equal(outcome.stepped.plan[0], false);
      assert.equal(outcome.stepped.plan[8], true);
      assert.equal(outcome.stepped.projected.some(Boolean), false);
      assert.deepEqual(outcome.undone, outcome.before);
      assert.equal(outcome.cleared, true);
      assert.equal(outcome.moves, 1);
      assert.equal(await page.locator('#labChase').count(), 1);
    },
  );

  await check(
    'Pipe flow follows matching connections, distinguishes dry leaks, and board taps inspect paths',
    async (page) => {
      await start(page, 'pipes');
      await page.evaluate(() => {
        Object.assign(state, {
          size: 2,
          board: [2, 12, 2, 3],
          initial: [2, 12, 2, 3],
          answer: [2, 12, 2, 9],
          pipeLocked: Array(4).fill(false),
          source: 0,
          selected: 0,
        });
        renderLab();
      });
      const outcome = await page.evaluate(() => {
        const answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('Flow accessed hidden solution');
          },
        });
        const before = [...state.board];
        labStartPipeTest();
        state.pipeTest.playing = false;
        const initial = {
          reached: [...labPipeFlowState().reached],
          wetLeaks: labPipeFlowState().wetLeaks,
        };
        labStepPipeTest();
        const first = [...labPipeFlowState().reached];
        labStepPipeTest();
        labPipesTap(3);
        const complete = {
          reached: [...labPipeFlowState().reached],
          wetLeaks: labPipeFlowState().wetLeaks,
          path: labPipeFlowState().path,
          leaks: state.pipeTest.flow.leaks,
          distance: state.pipeTest.flow.distance,
          parent: state.pipeTest.flow.parent,
          board: [...state.board],
          moves: state.moves,
          hints: state.hints,
          history: state.history.length,
        };
        labPipesTap(2);
        const dryLabel = $('labFlow').textContent;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        return { before, initial, first, complete, dryLabel };
      });
      assert.deepEqual(outcome.initial, { reached: [0], wetLeaks: 0 });
      assert.deepEqual(outcome.first, [0, 1]);
      assert.deepEqual(outcome.complete.reached, [0, 1, 3]);
      assert.deepEqual(outcome.complete.path, [3, 1, 0]);
      assert.deepEqual(outcome.complete.distance, [0, 1, -1, 2]);
      assert.deepEqual(outcome.complete.parent, [-1, 0, -1, 1]);
      assert.equal(outcome.complete.wetLeaks, 1);
      assert.equal(outcome.complete.leaks, 2);
      assert.deepEqual(outcome.complete.board, outcome.before);
      assert.deepEqual(
        [outcome.complete.moves, outcome.complete.hints, outcome.complete.history],
        [0, 0, 0],
      );
      assert.match(outcome.dryLabel, /القطعة المحددة معزولة/);
      assert.equal(await page.locator('.lab-leak-tip').count(), 1);
      assert.equal(await page.locator('#labFlowStep').isDisabled(), true);
      await page.locator('#labFlowClose').click();
      assert.equal(await page.locator('.lab-leak-tip').count(), 2);
      await page.evaluate(() => labPipesTap(3));
      assert.equal(await page.evaluate(() => state.moves), 1);
    },
  );

  await check(
    'Finishing a stepped light plan records one result and rejects further execution',
    async (page) => {
      await start(page, 'lights');
      const outcome = await page.evaluate(() => {
        state.board = Array(16).fill(0);
        labToggleLights(state.board, 0, 4);
        labToggleLights(state.board, 8, 4);
        state.initial = [...state.board];
        state.parMoves = 2;
        const before = store.scores[state.name]?.rounds || 0;
        labMode('plan');
        state.plan[0] = true;
        labChaseLights();
        labStepPlan();
        labStepPlan();
        const points = state.points;
        labStepPlan();
        labChaseLights();
        labApplyPlan();
        labUndo();
        labHint();
        return {
          done: state.done,
          rounds: (store.scores[state.name]?.rounds || 0) - before,
          points,
          moves: state.moves,
          hints: state.hints,
          board: [...state.board],
        };
      });
      assert.equal(outcome.done, true);
      assert.equal(outcome.rounds, 1);
      assert.equal(outcome.points, 85);
      assert.deepEqual([outcome.moves, outcome.hints], [2, 0]);
      assert.equal(outcome.board.some(Boolean), false);
    },
  );

  await check(
    'New notebook, chase, and flow controls reject paused, finished, and stale screens',
    async (page) => {
      for (const id of ['nonogram', 'lights', 'pipes']) {
        await start(page, id);
        const result = await page.evaluate(() => {
          if (state.id === 'nonogram') {
            labTogglePatterns();
            const d = labPatternData();
            labPreviewPattern(d.axis, d.line, 0, state.board.join(''));
          }
          if (state.id === 'lights') {
            labMode('plan');
            state.plan[0] = true;
          }
          if (state.id === 'pipes') labStartPipeTest();
          const snapshot = () =>
            JSON.stringify({
              board: state.board,
              moves: state.moves,
              hints: state.hints,
              patternOpen: state.patternOpen,
              patternAxis: state.patternAxis,
              patternPage: state.patternPage,
              patternPreview: state.patternPreview,
              plan: state.plan,
              planPreview: state.planPreview,
              flow: state.pipeTest && {
                step: state.pipeTest.step,
                playing: state.pipeTest.playing,
              },
            });
          const blocked = () => {
            labTogglePatterns();
            labPatternAxis('column');
            labPatternPage(1);
            labApplyPattern();
            labChaseLights();
            labStepPlan();
            labStartPipeTest();
            labStepPipeTest();
            labTogglePipeTest();
            labClosePipeTest();
          };
          const before = snapshot();
          state.pausedAt = Date.now();
          blocked();
          const paused = snapshot();
          state.pausedAt = 0;
          state.done = true;
          blocked();
          const done = snapshot();
          state.done = false;
          const previous = screen;
          screen = 'home';
          blocked();
          const stale = snapshot();
          screen = previous;
          return { before, paused, done, stale };
        });
        assert.equal(result.paused, result.before, id + ': paused control mutated state');
        assert.equal(result.done, result.before, id + ': finished control mutated state');
        assert.equal(result.stale, result.before, id + ': stale control mutated state');
      }
      await start(page, 'pipes');
      await page.evaluate(() => {
        labStartPipeTest();
        state.pausedAt = Date.now();
      });
      const step = await page.evaluate(() => state.pipeTest.step);
      await page.waitForTimeout(1100);
      assert.equal(
        await page.evaluate(() => state.pipeTest.step),
        step,
        'Background flow advanced during pause',
      );
    },
  );

  await check(
    'Seeded daily and tournament laboratory boards remain deterministic with new controls',
    async (page) => {
      const result = await page.evaluate(() => {
        const snapshots = [];
        for (const id of ['nonogram', 'lights', 'pipes'])
          for (const mode of ['daily', 'tournament']) {
            const generate = () => {
              setup(id);
              if (mode === 'daily') dailyRun = { date: '2026-10-13', id };
              else
                tourney = {
                  active: true,
                  seed: 'lab-v8-tournament',
                  turn: 0,
                  players: ['ليلى', 'أحمد'],
                  queue: [id],
                };
              startLab(id);
              return {
                board: [...state.board],
                answer: state.answer && [...state.answer],
                size: state.size,
                par: state.parMoves,
                fixed: state.fixed && [...state.fixed],
              };
            };
            const first = generate();
            if (id === 'nonogram') {
              labTogglePatterns();
              labPatternAxis('column');
            } else if (id === 'lights') {
              labMode('plan');
              labChaseLights();
            } else {
              labStartPipeTest();
              labClosePipeTest();
            }
            const second = generate();
            snapshots.push({ id, mode, first, second });
            dailyRun = null;
            tourney = null;
          }
        return snapshots;
      });
      for (const snapshot of result) {
        assert.deepEqual(
          snapshot.second,
          snapshot.first,
          snapshot.id + ': ' + snapshot.mode + ' seed drifted',
        );
        assert.equal(snapshot.first.size, snapshot.id === 'nonogram' ? 7 : 5);
      }
    },
  );

  await check(
    'Notebook pagination, planning, and flow panels remain usable on narrow phones',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await nonogramFixture(page);
      await page.evaluate(() => {
        state.size = 9;
        state.board = Array(81).fill(0);
        state.initial = [...state.board];
        state.fixed = Array(81).fill(false);
        state.rowClues = Array.from({ length: 9 }, () => [1, 1, 1]);
        state.colClues = Array.from({ length: 9 }, () => [1, 1, 1]);
        state.answer = Array(81).fill(0);
        state.linePatterns = null;
        labTogglePatterns();
      });
      assert.equal(await page.locator('[data-pattern]').count(), 8);
      await page.locator('#labPatternNext').click();
      assert.equal(await page.locator('[data-pattern="8"]').count(), 1);
      await page.locator('[data-pattern="8"]').click();
      assert.equal(await page.locator('#labPatternApply').isEnabled(), true);
      for (const id of ['nonogram', 'lights', 'pipes']) {
        if (id !== 'nonogram') {
          await start(page, id);
          await page.evaluate((id) => {
            if (id === 'lights') {
              labMode('plan');
              labChaseLights();
            } else {
              labStartPipeTest();
              state.pipeTest.playing = false;
            }
          }, id);
        }
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          id + ': phone page overflow',
        );
      }
    },
  );

  console.log(`${passed} logic v8 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
