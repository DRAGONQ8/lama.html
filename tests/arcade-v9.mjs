import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
let html;
if (process.argv.includes('--built')) html = await read('lamma_universe.html');
else {
  const build = await read('scripts/build.mjs');
  const names = (key) =>
    JSON.parse(
      build
        .match(new RegExp(`const ${key} = (\\[[\\s\\S]*?\\]);`))[1]
        .replace(/'/g, '"')
        .replace(/,\s*]/g, ']'),
    );
  const scripts = await Promise.all(names('scripts').map((name) => read(`src/${name}.js`)));
  const styles = await Promise.all(names('styles').map((name) => read(`src/${name}.css`)));
  html = (await read('src/template.html'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n'))
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'));
}
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1200, height: 1000 },
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let checks = 0;
async function check(name, fn) {
  await fn();
  assert.deepEqual(errors, [], `${name}: browser exceptions`);
  console.log(`✓ ${name}`);
  checks++;
}
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await check(
    'V9 optional missions are available and fixed daily/tournament rounds retain classic rules',
    async () => {
      const results = await page.evaluate(() =>
        ['snake', 'merge', 'mines', 'maze'].flatMap((id) =>
          [false, true].map((tournament) => {
            setup(id);
            if ($('arcadeMission'))
              $('arcadeMission').value = { snake: 'courier', merge: 'workshop', mines: 'survey' }[
                id
              ];
            else $('arcadeMode').value = 'courier';
            if (tournament)
              tourney = {
                active: true,
                seed: 'v9-fixed',
                players: [store.players[0]],
                turn: 0,
                queue: [id],
              };
            else dailyRun = { date: '2026-10-13', id };
            startArcade(id);
            clearTimers();
            const result = { id, mission: state.mission, mode: state.mode, fixed: state.fixed };
            tourney = dailyRun = null;
            return result;
          }),
        ),
      );
      for (const result of results) {
        assert.equal(result.mission, 'classic');
        assert.equal(result.fixed, true);
        assert.equal(result.mode, result.id === 'maze' ? 'stars' : 'classic');
      }
    },
  );
  await check(
    'Snake requires the ordered fruit and a depot return; extra food costs points and the completed mission records once',
    async () => {
      const result = await page.evaluate(() => {
        setup('snake');
        $('arcadeMission').value = 'courier';
        $('arcadeDrive').value = 'step';
        $('arcadeMode').value = 'wrap';
        $('arcadePace').value = 'steady';
        startArcade('snake');
        clearTimers();
        state.deliveryOrders = [0, 1, 2];
        state.foods = [
          { kind: 1, x: 6, y: 10 },
          { kind: 0, x: 7, y: 10 },
          { kind: 2, x: 18, y: 18 },
        ];
        state.fruit = state.foods[1];
        snakeTurn('right');
        const wrong = {
          count: state.wrongPickups,
          cargo: state.cargoKind,
          delivered: state.deliveries,
          length: state.snake.length,
        };
        snakeTurn('right');
        const pickup = { cargo: state.cargoKind, delivered: state.deliveries, done: state.done };
        state.snake = [
          { x: 1, y: 2 },
          { x: 0, y: 2 },
          { x: 0, y: 3 },
          { x: 0, y: 4 },
          { x: 0, y: 5 },
        ];
        state.direction = 'right';
        state.turnQueue = [];
        const history = store.extra.history.length;
        snakeTurn('right');
        const firstDelivery = state.deliveries;
        for (const kind of [1, 2]) {
          state.foods = [
            { kind, x: 3, y: 2 },
            { kind: (kind + 1) % 3, x: 18, y: 18 },
            { kind: (kind + 2) % 3, x: 17, y: 18 },
          ];
          state.fruit = state.foods[0];
          for (const dir of ['right', 'right', 'up', 'up', 'left', 'left', 'down', 'down'])
            snakeTurn(dir);
        }
        snakeEnd('duplicate');
        return {
          wrong,
          pickup,
          firstDelivery,
          deliveries: state.deliveries,
          cargo: state.cargoKind,
          done: state.done,
          entries: store.extra.history.length - history,
          points: store.extra.history[0].points,
          summary: document.querySelector('.arcade-review').textContent,
        };
      });
      assert.deepEqual(result.wrong, { count: 1, cargo: null, delivered: 0, length: 4 });
      assert.deepEqual(result.pickup, { cargo: 0, delivered: 0, done: false });
      assert.equal(result.firstDelivery, 1);
      assert.equal(result.deliveries, 3);
      assert.equal(result.cargo, null);
      assert.equal(result.done, true);
      assert.equal(result.entries, 1);
      assert.equal(result.points, 45);
      assert.ok(result.summary.includes('3/3') && result.summary.includes('−5'));
    },
  );
  await check(
    'Snake cargo doubles sprint energy cost and pause preserves pickup, delivery and energy state',
    async () => {
      const result = await page.evaluate(() => {
        setup('snake');
        $('arcadeMission').value = 'courier';
        $('arcadeDrive').value = 'live';
        $('arcadeMode').value = 'wrap';
        startArcade('snake');
        clearTimers();
        state.foods = [];
        state.fruit = null;
        snakeBegin();
        snakeBoost(true);
        snakeStep();
        const emptyCost = 100 - state.energy;
        state.energy = 100;
        state.cargoKind = state.deliveryOrders[0];
        snakeStep();
        const loadedCost = 100 - state.energy;
        const before = JSON.stringify({
          energy: state.energy,
          steps: state.steps,
          cargo: state.cargoKind,
          delivered: state.deliveries,
        });
        showPause();
        snakeTurn('up');
        snakeStep();
        const after = JSON.stringify({
          energy: state.energy,
          steps: state.steps,
          cargo: state.cargoKind,
          delivered: state.deliveries,
        });
        resumeGame();
        snakeBoost(false);
        return { emptyCost, loadedCost, paused: before === after };
      });
      assert.deepEqual(result, { emptyCost: 8, loadedCost: 16, paused: true });
    },
  );
  await check(
    'Snake courier spawns three distinct reachable foods and protects its depot across 60 seeded rock fields',
    async () => {
      const failures = await page.evaluate(() => {
        const invalid = [];
        for (let round = 0; round < 60; round++) {
          state = {
            id: 'snake',
            name: store.players[0],
            mission: 'courier',
            mode: 'rocks',
            pace: 'steady',
            drive: 'step',
            speed: 150,
            started: Date.now(),
            done: false,
            arcadeRandom: makeSeed(`v9-snake-${round}`),
          };
          screen = 'snake';
          startSnake();
          clearTimers();
          const occupied = new Set(
              [...state.rocks, ...state.snake, state.deliveryDepot].map((p) => p.y * 20 + p.x),
            ),
            foodIndices = state.foods.map((p) => p.y * 20 + p.x),
            grid = Array(400).fill(0);
          for (const p of state.rocks) grid[p.y * 20 + p.x] = 1;
          const head = state.snake[0].y * 20 + state.snake[0].x,
            depot = state.deliveryDepot.y * 20 + state.deliveryDepot.x;
          if (
            state.deliveryOrders.length !== 3 ||
            new Set(state.deliveryOrders).size !== 3 ||
            new Set(foodIndices).size !== 3 ||
            foodIndices.some((i) => occupied.has(i) || !mazePath(grid, 20, head, i).length) ||
            !mazePath(grid, 20, head, depot).length
          )
            invalid.push(round);
        }
        return invalid;
      });
      assert.deepEqual(failures, []);
    },
  );
  await check(
    '2048 immovable crates divide movement; 2,000 randomized slides preserve all number mass and crate positions',
    async () => {
      const result = await page.evaluate(() => {
        const explicit = mergeSlide([2, -1, 2, 2, ...Array(12).fill(0)], 'right').board.slice(0, 4);
        let seed = 90248,
          tested = 0;
        const failures = [];
        const random = (n) => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed % n;
        };
        for (const size of [4, 5])
          for (let round = 0; round < 250; round++) {
            const board = Array.from({ length: size * size }, () => {
              const choice = random(10);
              return choice === 0 ? -1 : choice < 4 ? 0 : 2 ** (1 + random(7));
            });
            const mass = board.reduce((sum, v) => sum + Math.max(0, v), 0),
              crates = board.map((v, i) => (v < 0 ? i : null)).filter((i) => i !== null);
            for (const dir of ['up', 'down', 'left', 'right']) {
              const move = mergeSlide(board, dir);
              tested++;
              if (
                move.board.length !== board.length ||
                move.board.reduce((sum, v) => sum + Math.max(0, v), 0) !== mass ||
                crates.some((i) => move.board[i] !== -1) ||
                move.board.some((v, i) => v < 0 && !crates.includes(i))
              )
                failures.push({ size, round, dir });
            }
          }
        return { explicit, tested, failures };
      });
      assert.deepEqual(result.explicit, [2, -1, 0, 4]);
      assert.equal(result.tested, 2000);
      assert.deepEqual(result.failures, []);
    },
  );
  await check(
    'Workshop previews damage without mutation, needs both objectives, and undo restores crate layers with the exact spawn',
    async () => {
      const result = await page.evaluate(() => {
        setup('merge');
        $('arcadeMission').value = 'workshop';
        $('arcadeBoardSize').value = '4';
        startArcade('merge');
        clearTimers();
        state.board = Array(16).fill(0);
        state.board[5] = -1;
        state.board[6] = state.board[7] = 2;
        state.board[14] = state.board[15] = 128;
        state.crateHP = { 5: 2 };
        state.crateTotal = 1;
        renderMerge();
        const before = JSON.stringify({
          board: state.board,
          hp: state.crateHP,
          cursor: state.spawnCursor,
          tape: state.spawnTape,
        });
        mergeForecast('left');
        const preview = {
          hp: $('mergePreviewBoard').querySelector('.merge-crate small').textContent,
          unchanged:
            before ===
            JSON.stringify({
              board: state.board,
              hp: state.crateHP,
              cursor: state.spawnCursor,
              tape: state.spawnTape,
            }),
        };
        mergeApplyForecast();
        const first = {
          hp: state.crateHP[5],
          top: Math.max(...state.board),
          won: state.won,
          moves: state.moves,
        };
        state.board[6] = state.board[7] = 4;
        mergeMove('left');
        const complete = JSON.stringify({
          board: state.board,
          hp: state.crateHP,
          moves: state.moves,
          cursor: state.spawnCursor,
          won: state.won,
          broken: state.cratesBroken,
        });
        const completed =
          state.won && Object.keys(state.crateHP).length === 0 && state.cratesBroken === 1;
        mergeUndo();
        const undone = {
          hp: state.crateHP[5],
          moves: state.moves,
          won: state.won,
          broken: state.cratesBroken,
        };
        mergeMove('left');
        const exact =
          complete ===
          JSON.stringify({
            board: state.board,
            hp: state.crateHP,
            moves: state.moves,
            cursor: state.spawnCursor,
            won: state.won,
            broken: state.cratesBroken,
          });
        const history = store.extra.history.length;
        mergeEnd();
        mergeEnd();
        return {
          preview,
          first,
          completed,
          undone,
          exact,
          points: store.extra.history[0].points,
          entries: store.extra.history.length - history,
        };
      });
      assert.deepEqual(result.preview, { hp: '1', unchanged: true });
      assert.deepEqual(result.first, { hp: 1, top: 256, won: false, moves: 1 });
      assert.equal(result.completed, true);
      assert.deepEqual(result.undone, { hp: 1, moves: 1, won: false, broken: 0 });
      assert.equal(result.exact, true);
      assert.equal(result.points, 80);
      assert.equal(result.entries, 1);
    },
  );
  await check(
    'Workshop counts effective moves, stops at its budget and can undo the last move',
    async () => {
      const result = await page.evaluate(() => {
        setup('merge');
        $('arcadeMission').value = 'workshop';
        $('arcadeBoardSize').value = '4';
        startArcade('merge');
        clearTimers();
        state.board = Array(16).fill(0);
        state.board[0] = 2;
        state.board[5] = state.board[10] = -1;
        state.moves = 59;
        renderMerge();
        const cursor = state.spawnCursor;
        mergeMove('left');
        const noOp = state.moves === 59 && state.spawnCursor === cursor;
        state.board[1] = 2;
        mergeMove('left');
        const exhausted = { moves: state.moves, over: state.over, won: state.won };
        mergeMove('right');
        const blocked = state.moves === 60;
        mergeUndo();
        const undo = { moves: state.moves, over: state.over };
        return { noOp, exhausted, blocked, undo };
      });
      assert.deepEqual(result, {
        noOp: true,
        exhausted: { moves: 60, over: true, won: false },
        blocked: true,
        undo: { moves: 59, over: false },
      });
    },
  );
  await check(
    'Survey fields place one safe artifact per quadrant across 90 seeded fields of all sizes',
    async () => {
      const failures = await page.evaluate(() => {
        const invalid = [];
        for (const size of [8, 12, 16])
          for (let round = 0; round < 30; round++) {
            state = {
              id: 'mines',
              size,
              mission: 'survey',
              mineCount: { 8: 10, 12: 24, 16: 48 }[size],
              board: Array(size * size).fill(0),
              arcadeRandom: makeSeed(`v9-survey-${size}-${round}`),
            };
            const first = (round * 13) % (size * size);
            mineGenerate(first);
            const half = size / 2,
              quadrants = [...state.relics].map(
                (i) => (Math.floor(i / size) >= half ? 2 : 0) + (i % size >= half ? 1 : 0),
              );
            if (
              state.relics.size !== 4 ||
              new Set(quadrants).size !== 4 ||
              [...state.relics].some((i) => state.mines.has(i))
            )
              invalid.push({ size, round });
          }
        return invalid;
      });
      assert.deepEqual(failures, []);
    },
  );
  await check(
    'Survey readings do not inspect hidden mine information, and safe target selection does not reveal a cell',
    async () => {
      const result = await page.evaluate(() => {
        const hidden = new Proxy(
          {},
          {
            get() {
              throw new Error('Detector read hidden mine data');
            },
          },
        );
        const reading = mineSurveyReading(9, {
          size: 8,
          relics: new Set([0, 9, 60]),
          foundRelics: new Set([0]),
          board: hidden,
          mines: hidden,
        });
        setup('mines');
        $('arcadeMission').value = 'survey';
        startArcade('mines');
        clearTimers();
        mineScan();
        const freeBefore = state.scans === 0 && !state.generated;
        mineMode('scan');
        mineTap(27);
        const selection = {
          selected: state.selected,
          generated: state.generated,
          revealed: state.revealed.size,
          scans: state.scans,
        };
        return { count: reading.count, cells: reading.cells.length, freeBefore, selection };
      });
      assert.deepEqual(result, {
        count: 1,
        cells: 9,
        freeBefore: true,
        selection: { selected: 27, generated: false, revealed: 0, scans: 0 },
      });
    },
  );
  await check(
    'Survey artifacts stay hidden, detector charges once, pause guards extraction, and collecting four permits early return',
    async () => {
      const result = await page.evaluate(() => {
        setup('mines');
        $('arcadeMission').value = 'survey';
        $('arcadeSize').value = '8';
        startArcade('mines');
        clearTimers();
        state.mineCount = 10;
        state.mines = new Set([1, 3, 5, 7, 25, 27, 29, 31, 57, 59]);
        state.generated = state.clockRunning = true;
        state.board = state.board.map((_, i) =>
          state.mines.has(i) ? -1 : mineNeighbours(i).filter((j) => state.mines.has(j)).length,
        );
        state.relics = new Set([0, 4, 32, 60]);
        renderMines();
        const hidden = document.querySelectorAll('.mines-board .mine-relic').length === 0;
        mineExtract();
        const incompleteBlocked = !state.done;
        mineTap(0);
        mineMode('scan');
        mineTap(4);
        const beforeReveal = state.revealed.size;
        mineScan();
        mineScan();
        const scan = {
          count: state.scans,
          revealed: state.revealed.size,
          unchanged: state.revealed.size === beforeReveal,
        };
        showPause();
        mineScan();
        mineExtract();
        const paused = !state.done && state.scans === 1;
        resumeGame();
        mineMode(false);
        for (const i of [4, 32, 60]) mineTap(i);
        const before = {
          found: state.foundRelics.size,
          exposed: state.revealed.size,
          done: state.done,
        };
        const history = store.extra.history.length;
        mineExtract();
        mineExtract();
        return {
          hidden,
          incompleteBlocked,
          scan,
          paused,
          before,
          extracted: state.extracted,
          done: state.done,
          points: store.extra.history[0].points,
          entries: store.extra.history.length - history,
        };
      });
      assert.equal(result.hidden, true);
      assert.equal(result.incompleteBlocked, true);
      assert.deepEqual(result.scan, { count: 1, revealed: 1, unchanged: true });
      assert.equal(result.paused, true);
      assert.deepEqual(result.before, { found: 4, exposed: 4, done: false });
      assert.equal(result.extracted, true);
      assert.equal(result.done, true);
      assert.equal(result.points, 54);
      assert.equal(result.entries, 1);
    },
  );
  await check(
    'Maze courier stations remain distinct and reachable with the correct return-trip par across 60 seeded mazes',
    async () => {
      const failures = await page.evaluate(() => {
        const invalid = [];
        for (const size of [7, 10, 15])
          for (let round = 0; round < 20; round++) {
            state = {
              id: 'maze',
              size,
              mode: 'courier',
              arcadeRandom: makeSeed(`v9-courier-${size}-${round}`),
            };
            Object.assign(state, mazeGenerate(size));
            state.position = state.width + 1;
            mazeBuildCourier();
            const paths = state.courierStations.map((i) =>
              mazePath(state.grid, state.width, state.base, i),
            );
            if (
              state.courierStations.length !== 3 ||
              new Set(state.courierStations).size !== 3 ||
              paths.some((path) => !path.length) ||
              state.parMoves !== paths.reduce((sum, path) => sum + (path.length - 1) * 2, 0) ||
              state.exit !== state.base
            )
              invalid.push({ size, round });
          }
        return invalid;
      });
      assert.deepEqual(failures, []);
    },
  );
  await check(
    'Maze requires pickup order and actual base deliveries, and replay distinguishes visiting a future station from collecting it',
    async () => {
      const result = await page.evaluate(() => {
        setup('maze');
        $('arcadeMode').value = 'courier';
        $('arcadeVision').value = 'map';
        $('arcadeSize').value = '7';
        startArcade('maze');
        clearTimers();
        Object.assign(state, {
          width: 7,
          grid: Array(49).fill(1),
          base: 8,
          exit: 8,
          position: 8,
          courierStations: [12, 10, 19],
          delivered: 0,
          parcel: null,
          courierEvents: [],
          stars: new Set([12, 10, 19]),
          originalStars: [12, 10, 19],
          starTotal: 3,
          moves: 0,
          route: [8],
          trail: new Set([8]),
          parMoves: 22,
          travel: 'step',
          seen: new Set(),
        });
        for (const i of [8, 9, 10, 11, 12, 19]) state.grid[i] = 0;
        mazeDiscover();
        renderMaze();
        mazeMove('right', false, true);
        mazeMove('right', false, true);
        const future = { at: state.position, parcel: state.parcel, stars: state.stars.size };
        mazeMove('right', false, true);
        mazeMove('right', false, true);
        const pickup = { parcel: state.parcel, delivered: state.delivered, done: state.done };
        mazeFinish();
        const incomplete = !state.done;
        showPause();
        mazeMove('left', false, true);
        const paused = state.position === 12;
        resumeGame();
        const history = store.extra.history.length;
        for (const target of [8, 10, 8, 19, 8]) {
          const path = mazePath(state.grid, state.width, state.position, target);
          for (const next of path.slice(1)) {
            const delta = next - state.position;
            mazeMove(
              delta === 1 ? 'right' : delta === -1 ? 'left' : delta > 0 ? 'down' : 'up',
              false,
              true,
            );
          }
        }
        const early = mazeCourierReview(2),
          firstPickup = mazeCourierReview(4),
          firstDelivered = mazeCourierReview(8);
        const snapshot = JSON.stringify({
          moves: state.moves,
          delivered: state.delivered,
          position: state.position,
          events: state.courierEvents,
        });
        mazeReplay(2);
        mazeReplay(-1);
        return {
          future,
          pickup,
          incomplete,
          paused,
          early: { stars: early.stars.size, future: early.stars.has(10), parcel: early.parcel },
          firstPickup: {
            stars: firstPickup.stars.size,
            parcel: firstPickup.parcel,
            delivered: firstPickup.delivered,
          },
          firstDelivered: { parcel: firstDelivered.parcel, delivered: firstDelivered.delivered },
          done: state.done,
          moves: state.moves,
          delivered: state.delivered,
          parcel: state.parcel,
          events: state.courierEvents.length,
          points: store.extra.history[0].points,
          entries: store.extra.history.length - history,
          reviewPreserved:
            snapshot ===
            JSON.stringify({
              moves: state.moves,
              delivered: state.delivered,
              position: state.position,
              events: state.courierEvents,
            }),
        };
      });
      assert.deepEqual(result.future, { at: 10, parcel: null, stars: 3 });
      assert.deepEqual(result.pickup, { parcel: 0, delivered: 0, done: false });
      assert.equal(result.incomplete, true);
      assert.equal(result.paused, true);
      assert.deepEqual(result.early, { stars: 3, future: true, parcel: null });
      assert.deepEqual(result.firstPickup, { stars: 2, parcel: 0, delivered: 0 });
      assert.deepEqual(result.firstDelivered, { parcel: null, delivered: 1 });
      assert.equal(result.done, true);
      assert.equal(result.moves, 22);
      assert.equal(result.delivered, 3);
      assert.equal(result.parcel, null);
      assert.equal(result.events, 6);
      assert.equal(result.points, 70);
      assert.equal(result.entries, 1);
      assert.equal(result.reviewPreserved, true);
    },
  );
  await check(
    'Every mission fits 360px and remains playable offline with touch controls at least 44px',
    async () => {
      await context.setOffline(true);
      await page.setViewportSize({ width: 360, height: 844 });
      await mkdir('/tmp/lamma-arcade-v9', { recursive: true });
      for (const id of ['snake', 'merge', 'mines', 'maze']) {
        await page.evaluate((id) => {
          setup(id);
          if ($('arcadeMission'))
            $('arcadeMission').value = { snake: 'courier', merge: 'workshop', mines: 'survey' }[id];
          if (id === 'maze') $('arcadeMode').value = 'courier';
          if ($('arcadeDrive')) $('arcadeDrive').value = 'step';
          startArcade(id);
          clearTimers();
        }, id);
        const layout = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
          controls: [
            ...document.querySelectorAll('.arcade-directions button,.arcade-mission button'),
          ].map((el) => el.getBoundingClientRect().height),
        }));
        assert.ok(layout.width <= layout.viewport + 1, `${id} overflow ${JSON.stringify(layout)}`);
        assert.ok(
          layout.controls.every((height) => height >= 44),
          `${id} small controls ${JSON.stringify(layout)}`,
        );
        await page.screenshot({ path: `/tmp/lamma-arcade-v9/${id}-360.png`, fullPage: true });
      }
      await context.setOffline(false);
    },
  );
  console.log(`${checks} arcade v9 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
