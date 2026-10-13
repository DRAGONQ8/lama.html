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
    'Mirror generator retains a unique symmetric solution and paired givens on every size',
    async (page) => {
      const boards = await page.evaluate(() => {
        const original = state,
          boards = [];
        for (const level of ['easy', 'normal', 'hard'])
          for (let seed = 0; seed < 8; seed++) {
            state = {
              id: 'nonogram',
              level,
              rule: 'mirror',
              rng: makeSeed('mirror-v9:' + level + ':' + seed),
            };
            labNewNonogram();
            const s = state,
              givens = s.board.map((v) => (v === 0 ? -1 : Number(v === 1))),
              solved = labNonogramSolve(s.rowClues, s.colClues, givens);
            boards.push({
              size: s.size,
              symmetric: s.answer.every((v, i) => v === s.answer[labMirrorCell(i)]),
              fixed: s.fixed.every((v, i) => v === s.fixed[labMirrorCell(i)]),
              unique: solved.solutions.length,
              exhausted: solved.exhausted,
              answer: s.answer,
              solution: solved.solutions[0],
              playable: !labNonogramWon(s),
            });
          }
        state = original;
        return boards;
      });
      assert.equal(boards.length, 24);
      for (const board of boards) {
        assert.equal(board.symmetric, true);
        assert.equal(board.fixed, true);
        assert.equal(board.unique, 1);
        assert.equal(board.exhausted, false);
        assert.deepEqual(board.solution, board.answer);
        assert.equal(board.playable, true);
      }
    },
  );

  await check(
    'Mirror taps, lens, hypotheses and hints preserve paired marks with honest move costs',
    async (page) => {
      await nonogramFixture(page);
      const result = await page.evaluate(() => {
        Object.assign(state, {
          rule: 'mirror',
          answer: [1, 0, 1, 0, 1, 0, 1, 0, 1],
          rowClues: [[1, 1], [1], [1, 1]],
          colClues: [[1, 1], [1], [1, 1]],
          linePatterns: null,
        });
        renderLab();
        labNonogramTap(0);
        const painted = { board: [...state.board], moves: state.moves };
        labUndo();
        const undone = [...state.board];
        labRedo();
        state.selected = 3;
        state.mode = 'fill';
        const lens = labMoveLensData();
        labTogglePatterns();
        state.selected = 0;
        labPatternAxis('column');
        const data = labPatternData();
        labPreviewPattern(data.axis, data.line, 0, state.board.join(''));
        labApplyPattern();
        const pattern = { board: [...state.board], moves: state.moves, hints: state.hints };
        labUndo();
        labHint();
        const hinted = { board: [...state.board], hints: state.hints, fixed: [...state.fixed] };
        return { painted, undone, lens, pattern, hinted };
      });
      assert.deepEqual(result.painted.board.slice(0, 3), [1, 0, 1]);
      assert.equal(result.painted.moves, 2);
      assert.equal(result.undone.some(Boolean), false);
      assert.equal(result.lens.conflict, true);
      assert.equal(result.pattern.moves, 6);
      assert.equal(result.pattern.hints, 0);
      for (const snapshot of [result.pattern, result.hinted])
        for (let i = 0; i < 9; i++)
          assert.equal(snapshot.board[i], snapshot.board[Math.floor(i / 3) * 3 + 2 - (i % 3)]);
      assert.equal(result.hinted.hints, 1);
    },
  );

  await check(
    'Brush gestures preview without mutation, commit once, and cancel on pointer cancellation or pause',
    async (page) => {
      await nonogramFixture(page);
      await page.locator('#labBrush').click();
      const a = await page.locator('#labBoard [data-index="0"]').boundingBox(),
        b = await page.locator('#labBoard [data-index="2"]').boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
      assert.equal(await page.evaluate(() => state.board.some(Boolean)), false);
      assert.equal(await page.evaluate(() => state.moves), 0);
      assert.equal(await page.locator('.lab-brush-preview.lab-filled').count(), 3);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      assert.equal(await page.evaluate(() => state.selected), 2);
      assert.equal(await page.locator('#labBoard .lab-cell[tabindex="0"]').count(), 1);
      assert.deepEqual(await page.evaluate(() => state.board.slice(0, 3)), [1, 1, 1]);
      assert.deepEqual(await page.evaluate(() => [state.moves, state.history.length]), [3, 1]);
      await page.evaluate(() => labUndo());
      assert.equal(await page.evaluate(() => state.board.some(Boolean)), false);
      const canceled = await page.evaluate(() => {
        const cell = $('labBoard').querySelector('[data-index="3"]');
        cell.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 91,
            pointerType: 'touch',
            button: 0,
          }),
        );
        labBrushPaint(4);
        document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 91 }));
        const canceled = { board: [...state.board], moves: state.moves, gesture: labBrushGesture };
        $('labBoard')
          .querySelector('[data-index="3"]')
          .dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              pointerId: 92,
              pointerType: 'touch',
              button: 0,
            }),
          );
        labBrushPaint(4);
        showPause();
        labFinishBrush(92);
        return {
          canceled,
          paused: { board: [...state.board], moves: state.moves, gesture: labBrushGesture },
        };
      });
      for (const snapshot of [canceled.canceled, canceled.paused]) {
        assert.equal(snapshot.board.some(Boolean), false);
        assert.equal(snapshot.moves, 3);
        assert.equal(snapshot.gesture, null);
      }
    },
  );

  await check(
    'Restricted switch generator is solvable with only available switches across every size',
    async (page) => {
      const boards = await page.evaluate(() => {
        const original = state,
          boards = [];
        for (const level of ['easy', 'normal', 'hard'])
          for (let seed = 0; seed < 8; seed++) {
            state = {
              id: 'lights',
              level,
              rule: 'switches',
              rng: makeSeed('switch-v9:' + level + ':' + seed),
            };
            labNewLights();
            const solution = labLightsSolve(state.board, state.size, state.switches),
              board = [...state.board];
            for (const i of solution) labToggleLights(board, i, state.size);
            boards.push({
              disabled: state.switches.filter((v) => !v).length,
              legal: solution.every((i) => state.switches[i]),
              dark: !board.some(Boolean),
              par: state.parMoves,
              presses: solution.length,
              playable: state.board.some(Boolean),
            });
          }
        state = original;
        return boards;
      });
      assert.equal(boards.length, 24);
      for (const board of boards) {
        assert.ok(board.disabled >= 2);
        assert.equal(board.legal, true);
        assert.equal(board.dark, true);
        assert.equal(board.par, board.presses);
        assert.equal(board.playable, true);
      }
      const exact = await page.evaluate(() => {
        const n = 4,
          switches = Array.from({ length: 16 }, (_, i) => i % 4 !== 0),
          available = switches.flatMap((v, i) => (v ? [i] : [])),
          minima = new Map();
        for (let mask = 0; mask < 2 ** available.length; mask++) {
          const board = Array(16).fill(0);
          let moves = 0;
          for (let k = 0; k < available.length; k++)
            if (mask & (2 ** k)) {
              labToggleLights(board, available[k], n);
              moves++;
            }
          const signature = board.join('');
          minima.set(signature, Math.min(minima.get(signature) ?? Infinity, moves));
        }
        return [...minima]
          .slice(0, 128)
          .every(
            ([signature, moves]) =>
              labLightsSolve([...signature].map(Number), n, switches).length === moves,
          );
      });
      assert.equal(exact, true, 'Restricted exact solver disagrees with exhaustive legal presses');
    },
  );

  await check(
    'Locked switches reject taps/plans/lens execution and hints suggest legal moves',
    async (page) => {
      await variant(page, 'lights', 'switches');
      const result = await page.evaluate(() => {
        const i = state.switches.findIndex((v) => !v),
          before = [...state.board];
        labLightsTap(i);
        labMode('plan');
        labLightsTap(i);
        const blocked = { board: [...state.board], moves: state.moves, plan: [...state.plan] };
        labToggleLens();
        labSelect(i);
        const lens = labMoveLensData();
        labApplyLensMove();
        labHint();
        const hint = { legal: state.switches[state.hintCell], hints: state.hints };
        labMode('plan');
        state.plan = state.board.map(() => false);
        state.plan[i] = true;
        const injectedBefore = [...state.board];
        labApplyPlan();
        labStepPlan();
        return {
          before,
          blocked,
          lens,
          hint,
          injectedBefore,
          after: [...state.board],
          moves: state.moves,
        };
      });
      assert.deepEqual(result.blocked.board, result.before);
      assert.equal(result.blocked.moves, 0);
      assert.equal(result.blocked.plan.some(Boolean), false);
      assert.equal(result.lens.blocked, true);
      assert.equal(result.lens.before, result.lens.after);
      assert.deepEqual(result.hint, { legal: true, hints: 1 });
      assert.deepEqual(result.after, result.injectedBefore);
      assert.equal(result.moves, 0);
      assert.ok((await page.locator('.lab-switch-disabled[aria-disabled="true"]').count()) >= 2);
      const won = await page.evaluate(() => {
        const before = store.scores[state.name]?.rounds || 0,
          solution = labLightsSolve(state.board, state.size, state.switches);
        state.plan = state.board.map((_, i) => solution.includes(i));
        labApplyPlan();
        labApplyPlan();
        return {
          done: state.done,
          rounds: (store.scores[state.name]?.rounds || 0) - before,
          points: state.points,
        };
      });
      assert.equal(won.done, true);
      assert.equal(won.rounds, 1);
      assert.equal(won.points, 77);
    },
  );

  await check(
    'District generators connect each colored region without cross-boundary ports',
    async (page) => {
      const boards = await page.evaluate(() => {
        const original = state,
          boards = [];
        for (const level of ['easy', 'normal', 'hard'])
          for (let seed = 0; seed < 8; seed++) {
            state = {
              id: 'pipes',
              level,
              rule: 'districts',
              rng: makeSeed('district-v9:' + level + ':' + seed),
            };
            labNewPipes();
            const answer = labAnalysePipes(state, state.answer),
              domains = labPipeDomains(state.board, state.size, [], state.districts);
            boards.push({
              solved: answer.solved,
              sourceCount: state.sources.length,
              sources: state.sources.map((i) => state.districts[i]),
              viable: domains.every((domain, i) => domain.includes(state.answer[i])),
              playable: !labAnalysePipes().solved,
              regionSizes: [0, 1].map((zone) => state.districts.filter((v) => v === zone).length),
            });
          }
        const crossing = labPipeAnalysis([2, 8, 2, 8], 2, 0, {
          districts: [0, 1, 0, 1],
          sources: [0, 1],
        });
        state = original;
        return {
          boards,
          crossing: {
            leaks: crossing.leaks,
            connected: [...crossing.connected],
            distance: crossing.distance,
          },
        };
      });
      assert.equal(boards.boards.length, 24);
      for (const board of boards.boards) {
        assert.equal(board.solved, true);
        assert.equal(board.sourceCount, 2);
        assert.deepEqual(board.sources, [0, 1]);
        assert.equal(board.viable, true);
        assert.equal(board.playable, true);
        assert.ok(board.regionSizes.every((size) => size >= 4));
      }
      assert.deepEqual(boards.crossing, { leaks: 4, connected: [0, 1], distance: [0, 0, -1, -1] });
    },
  );

  await check(
    'District flow starts from both sources and traces the correct region without awarding points',
    async (page) => {
      await variant(page, 'pipes', 'districts');
      const result = await page.evaluate(() => {
        state.board = [...state.answer];
        renderLab();
        const before = store.scores[state.name]?.rounds || 0,
          answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('Flow/lens read hidden district answer');
          },
        });
        labStartPipeTest();
        state.pipeTest.playing = false;
        const roots = [...labPipeFlowState().reached];
        while (state.pipeTest.step < labPipeFlowState().maximum) labStepPipeTest();
        const target = state.districts.findIndex((v, i) => v === 1 && !state.sources.includes(i));
        labPipesTap(target);
        const flow = labPipeFlowState();
        labToggleLens();
        const preview = labMoveLensData();
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        return {
          roots,
          sources: state.sources,
          reached: flow.reached.size,
          count: state.board.length,
          wetLeaks: flow.wetLeaks,
          pathZones: flow.path.map((i) => state.districts[i]),
          endpoint: flow.path.at(-1),
          rightSource: state.sources[1],
          rounds: (store.scores[state.name]?.rounds || 0) - before,
          moves: state.moves,
          previewKind: preview.kind,
        };
      });
      assert.deepEqual(result.roots, result.sources);
      assert.equal(result.reached, result.count);
      assert.equal(result.wetLeaks, 0);
      assert.ok(result.pathZones.every((v) => v === 1));
      assert.equal(result.endpoint, result.rightSource);
      assert.deepEqual([result.rounds, result.moves], [0, 0]);
      assert.equal(result.previewKind, 'pipes');
      assert.equal(await page.locator('#labBoard .lab-source-drop').count(), 2);
      assert.ok((await page.locator('#labBoard [style*="3px solid"]').count()) > 0);
    },
  );

  await check(
    'Pipe touch selection chooses a piece without turning it and selected actions respect locks',
    async (page) => {
      await variant(page, 'pipes', 'districts');
      await page.locator('#labMode-select').click();
      const before = await page.evaluate(() => [...state.board]);
      await page.locator('#labBoard [data-index="0"]').click();
      assert.deepEqual(await page.evaluate(() => state.board), before);
      assert.equal(await page.evaluate(() => state.selected), 0);
      assert.equal(await page.evaluate(() => state.moves), 0);
      await page.locator('#labRotateSelected').click();
      assert.equal(
        await page.evaluate(() => state.board[0]),
        await page.evaluate((v) => labRotatePipe(v), before[0]),
      );
      assert.equal(await page.evaluate(() => state.moves), 1);
      await page.locator('#labLock').click();
      assert.equal(await page.locator('#labRotateSelected').isDisabled(), true);
      await page.locator('#labBoard [data-index="1"]').click();
      assert.equal(await page.locator('#labRotateSelected').isEnabled(), true);
      await page.locator('#labFlowStart').click();
      assert.equal(await page.locator('#labRotateSelected').isDisabled(), true);
    },
  );

  await check(
    'Daily and tournament launches force original rules despite alternate setup input',
    async (page) => {
      const result = await page.evaluate(() => {
        const results = [];
        for (const id of ['nonogram', 'lights', 'pipes'])
          for (const mode of ['daily', 'tournament']) {
            const generate = () => {
              setup(id);
              if (mode === 'daily') dailyRun = { id, date: '2026-10-13' };
              else
                tourney = {
                  active: true,
                  seed: 'lab-v9-fair',
                  players: ['ليلى', 'سالم'],
                  turn: 0,
                  queue: [id],
                };
              setup(id, true);
              const disabled = $('labRule').disabled;
              $('labRule').value = { nonogram: 'mirror', lights: 'switches', pipes: 'districts' }[
                id
              ];
              startLab(id);
              return {
                disabled,
                rule: state.rule,
                board: [...state.board],
                size: state.size,
                switches: state.switches,
                districts: state.districts,
              };
            };
            const first = generate(),
              second = generate();
            results.push({ id, mode, first, second });
            dailyRun = null;
            tourney = null;
          }
        return results;
      });
      for (const sample of result) {
        assert.deepEqual(sample.first, sample.second);
        assert.equal(sample.first.disabled, true);
        assert.equal(sample.first.rule, 'classic');
        if (sample.id === 'lights') assert.ok(sample.first.switches.every(Boolean));
        if (sample.id === 'pipes') assert.equal(sample.first.districts, null);
      }
    },
  );

  await check(
    'New rules work offline at 320px and all actions obey pause, done and stale-screen guards',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await page.context().setOffline(true);
      for (const [id, rule] of [
        ['nonogram', 'mirror'],
        ['lights', 'switches'],
        ['pipes', 'districts'],
      ]) {
        await variant(page, id, rule);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          id + ': overflow',
        );
        const result = await page.evaluate(() => {
          const snapshot = () =>
            JSON.stringify({
              board: state.board,
              moves: state.moves,
              hints: state.hints,
              brushOn: state.brushOn,
              plan: state.plan,
              locks: state.pipeLocked,
              flow: state.pipeTest,
            });
          const action = () => {
            labToggleBrush();
            labNonogramTap(0);
            labLightsTap(0);
            labPipesTap(0);
            labStartPipeTest();
            labHint();
          };
          const before = snapshot();
          state.pausedAt = Date.now();
          action();
          const paused = snapshot();
          state.pausedAt = 0;
          state.done = true;
          action();
          const done = snapshot();
          state.done = false;
          const original = screen;
          screen = 'home';
          action();
          const stale = snapshot();
          screen = original;
          return { before, paused, done, stale };
        });
        assert.equal(result.paused, result.before);
        assert.equal(result.done, result.before);
        assert.equal(result.stale, result.before);
      }
    },
  );
  console.log(`${passed} logic v9 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
