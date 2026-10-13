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
  await check('Maze generation remains independent of an active game on fresh home', async () => {
    const outcome = await page.evaluate(() => {
      state = null;
      const maze = mazeGenerate(7),
        start = maze.width + 1,
        exit = (maze.width - 2) * maze.width + maze.width - 2;
      return {
        width: maze.width,
        size: maze.grid.length,
        start: maze.grid[start],
        exit: maze.grid[exit],
        reachable: mazePath(maze.grid, maze.width, start, exit).length > 0,
        randomRange: arcadeRand(10) >= 0 && arcadeRand(10) < 10,
      };
    });
    assert.deepEqual(outcome, {
      width: 15,
      size: 225,
      start: 0,
      exit: 0,
      reachable: true,
      randomRange: true,
    });
  });
  await check(
    'Daily and tournament arcade rounds own repeatable fields and fixed rules',
    async () => {
      const outcome = await page.evaluate(() => {
        const runs = (id, tournament) => {
          setup(id);
          if ($('arcadeSpeed')) $('arcadeSpeed').value = '90';
          if ($('arcadeDrive')) $('arcadeDrive').value = 'step';
          if ($('arcadeBoardSize')) $('arcadeBoardSize').value = '5';
          if ($('arcadeVision')) $('arcadeVision').value = 'lantern';
          if (tournament)
            tourney = {
              active: true,
              seed: 'v8-fairness',
              players: [store.players[0]],
              turn: 0,
              queue: [id],
            };
          else dailyRun = { date: '2026-10-13', id };
          startArcade(id);
          clearTimers();
          if (id === 'mines') mineTap(27);
          const result = {
            fixed: state.fixed,
            drive: state.drive,
            size: state.size,
            boardSize: state.boardSize,
            vision: state.vision,
            field: JSON.stringify({
              board: state.board,
              grid: state.grid,
              rocks: state.rocks,
              fruit: state.fruit,
              stars: [...(state.stars || [])],
              mines: [...(state.mines || [])],
            }),
          };
          dailyRun = null;
          tourney = null;
          return result;
        };
        return ['snake', 'merge', 'mines', 'maze'].flatMap((id) =>
          [false, true].map((tournament) => ({
            id,
            first: runs(id, tournament),
            second: runs(id, tournament),
          })),
        );
      });
      for (const run of outcome) {
        assert.deepEqual(run.first, run.second, `${run.id} changed its seeded field`);
        assert.equal(run.first.fixed, true);
        assert.equal(run.first.drive, 'live');
        assert.equal(run.first.boardSize, 4);
        assert.equal(run.first.vision, 'map');
      }
    },
  );
  await check(
    'Snake sprint spends energy, exhausts, recovers and respects pause without changing fruit scoring',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('snake');
        $('arcadeDrive').value = 'live';
        $('arcadeMode').value = 'wrap';
        startArcade('snake');
        clearTimers();
        state.fruit = { x: 0, y: 0 };
        const normal = snakeInterval();
        snakeBoost(true);
        const fast = snakeInterval();
        for (let i = 0; i < 13; i++) snakeStep();
        const empty = { energy: state.energy, boost: state.boosting, boosted: state.boostSteps };
        snakeBoost(true);
        const refused = !state.boosting;
        for (let i = 0; i < 7; i++) snakeStep();
        const recovered = state.energy;
        snakeBoost(true);
        const steps = state.steps;
        showPause();
        snakeStep();
        snakeBoost(true);
        snakeBoost(false);
        return {
          normal,
          fast,
          empty,
          refused,
          recovered,
          stopped: !state.boosting,
          pauseSteps: state.steps - steps,
          fruit: state.fruitCount,
          length: state.snake.length,
          energyDisplay: $('snakeEnergy').value,
        };
      });
      assert.ok(outcome.fast < outcome.normal);
      assert.deepEqual(outcome.empty, { energy: 0, boost: false, boosted: 13 });
      assert.equal(outcome.refused, true);
      assert.equal(outcome.recovered, 21);
      assert.equal(outcome.stopped, true);
      assert.equal(outcome.pauseSteps, 0);
      assert.equal(outcome.fruit, 0);
      assert.equal(outcome.length, 3);
      assert.equal(outcome.energyDisplay, 21);
      await page.evaluate(() => resumeGame());
    },
  );
  await check(
    'Snake held pointer and Shift controls release cleanly; training preview identifies only immediate safe moves',
    async () => {
      await page.evaluate(() => {
        setup('snake');
        $('arcadeDrive').value = 'live';
        startArcade('snake');
        clearTimers();
      });
      const button = page.locator('#snakeBoostButton');
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      assert.equal(await page.evaluate(() => state.boosting && state.running), true);
      await page.mouse.up();
      assert.equal(await page.evaluate(() => state.boosting), false);
      await page.keyboard.down('Shift');
      assert.equal(await page.evaluate(() => state.boosting), true);
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => state.boosting), false);
      const outcome = await page.evaluate(() => {
        setup('snake');
        $('arcadeDrive').value = 'step';
        startArcade('snake');
        clearTimers();
        state.snake = [
          { x: 1, y: 1 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ];
        state.rocks = [{ x: 2, y: 1 }];
        state.fruit = { x: 19, y: 19 };
        snakePreview();
        const before = state.steps;
        snakeBoost(true);
        return {
          right: snakeNext('right').safe,
          up: snakeNext('up').safe,
          text: $('snakeForecast').textContent,
          steps: state.steps - before,
          energy: state.energy,
          preview: state.safePreview,
        };
      });
      assert.equal(outcome.right, false);
      assert.equal(outcome.up, true);
      assert.ok(outcome.text.includes('أعلى') && !outcome.text.includes('يمين'));
      assert.equal(outcome.steps, 0);
      assert.equal(outcome.energy, 100);
      assert.equal(outcome.preview, true);
    },
  );
  await check(
    '2048 wide boards merge correctly and undo cannot reroll a spawn or consume randomness while previewing',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('merge');
        $('arcadeBoardSize').value = '5';
        startArcade('merge');
        clearTimers();
        state.board = [2, 2, 2, 2, 2, ...Array(20).fill(0)];
        renderMerge();
        const slide = mergeSlide(state.board, 'left');
        const before = JSON.stringify({
          board: state.board,
          score: state.score,
          cursor: state.spawnCursor,
          tape: state.spawnTape,
          undo: state.undoStack,
        });
        mergeRecommend();
        const unchanged =
          before ===
          JSON.stringify({
            board: state.board,
            score: state.score,
            cursor: state.spawnCursor,
            tape: state.spawnTape,
            undo: state.undoStack,
          });
        const next = Number($('mergeNextTile').textContent);
        mergeMove('left');
        const first = JSON.stringify({
          board: state.board,
          score: state.score,
          cursor: state.spawnCursor,
        });
        const spawn = state.board[state.newTile];
        for (let i = 0; i < 8; i++) {
          mergeUndo();
          mergeMove('left');
        }
        const same =
          first ===
          JSON.stringify({ board: state.board, score: state.score, cursor: state.spawnCursor });
        return {
          row: slide.board.slice(0, 5),
          gained: slide.gained,
          unchanged,
          same,
          next,
          spawn,
          count: $('mergeBoard').children.length,
          moves: state.moves,
          undo: state.undoStack.length,
          gridColumns: getComputedStyle($('mergeBoard')).gridTemplateColumns.split(' ').length,
        };
      });
      assert.deepEqual(outcome.row, [4, 4, 2, 0, 0]);
      assert.equal(outcome.gained, 8);
      assert.equal(outcome.unchanged, true);
      assert.equal(outcome.same, true);
      assert.equal(outcome.next, outcome.spawn);
      assert.equal(outcome.count, 25);
      assert.equal(outcome.moves, 1);
      assert.equal(outcome.undo, 1);
      assert.equal(outcome.gridColumns, 5);
    },
  );
  await check('Snake fruit stays in the reachable side of a rock barrier', async () => {
    const outcome = await page.evaluate(() => {
      setup('snake');
      startArcade('snake');
      clearTimers();
      state.mode = 'classic';
      state.rocks = Array.from({ length: 20 }, (_, y) => ({ x: 10, y }));
      const invalid = [];
      for (let i = 0; i < 100; i++) {
        if (
          !snakeFruit() ||
          state.fruit.x >= 10 ||
          state.snake.some((p) => p.x === state.fruit.x && p.y === state.fruit.y)
        )
          invalid.push(state.fruit);
      }
      return invalid;
    });
    assert.deepEqual(outcome, []);
  });
  await check(
    'Mine question notes are reversible and hidden cells disclose no counts; chord confirmation previews without revealing',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('mines');
        $('arcadeSize').value = '8';
        $('arcadeSafety').value = 'confirm';
        startArcade('mines');
        clearTimers();
        mineMode('question');
        mineTap(2);
        const note = state.questions.has(2) && !state.flags.has(2) && !state.generated;
        mineFlag(2);
        const flagClearsNote = !state.questions.has(2) && state.flags.has(2);
        mineQuestion(2);
        const noteClearsFlag = state.questions.has(2) && !state.flags.has(2);
        state.mines = new Set([0]);
        state.mineCount = 1;
        state.generated = state.clockRunning = true;
        state.board = state.board.map((_, i) =>
          i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
        );
        state.revealed = new Set([1]);
        state.flags = new Set([0]);
        mineMode(false);
        const hiddenCounts = [...document.querySelectorAll('.mine-cell:not(.revealed)')].every(
          (cell) => cell.dataset.count === '',
        );
        mineTap(1);
        const preview = {
          revealed: state.revealed.size,
          pending: state.pendingChord.cells.length,
          highlights: state.highlight.size,
          done: state.done,
        };
        showPause();
        mineConfirmChord();
        const pauseBlocked = state.revealed.size === 1;
        resumeGame();
        mineConfirmChord();
        return {
          note,
          flagClearsNote,
          noteClearsFlag,
          hiddenCounts,
          preview,
          pauseBlocked,
          done: state.done,
          revealed: state.revealed.size,
          questions: state.questions.size,
        };
      });
      assert.equal(outcome.note, true);
      assert.equal(outcome.flagClearsNote, true);
      assert.equal(outcome.noteClearsFlag, true);
      assert.equal(outcome.hiddenCounts, true);
      assert.deepEqual(outcome.preview, { revealed: 1, pending: 4, highlights: 4, done: false });
      assert.equal(outcome.pauseBlocked, true);
      assert.equal(outcome.done, true);
      assert.equal(outcome.revealed, 63);
      assert.equal(outcome.questions, 0);
    },
  );
  await check(
    'Mines confirmation does not pretend incorrect flags are safe and invalidates previews when a flag changes',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('mines');
        $('arcadeSafety').value = 'confirm';
        startArcade('mines');
        clearTimers();
        state.mines = new Set([0]);
        state.mineCount = 1;
        state.generated = state.clockRunning = true;
        state.board = state.board.map((_, i) =>
          i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
        );
        state.revealed = new Set([1]);
        state.flags = new Set([0]);
        mineTap(1);
        mineFlag(0);
        const invalidated = state.pendingChord === null;
        mineFlag(2);
        mineTap(1);
        const warned = $('mineStatus').textContent.includes('لا يضمن السلامة') && !state.done;
        mineConfirmChord();
        return { invalidated, warned, done: state.done, exploded: state.exploded };
      });
      assert.deepEqual(outcome, { invalidated: true, warned: true, done: true, exploded: 0 });
    },
  );
  await check(
    'Every gate key is reachable before its gate across 60 seeded small, medium and large expeditions',
    async () => {
      const outcome = await page.evaluate(() => {
        const failures = [];
        for (const size of [7, 10, 15])
          for (let i = 0; i < 20; i++) {
            const s = {
              id: 'maze',
              size,
              mode: 'keys',
              arcadeRandom: makeSeed(`keys-${size}-${i}`),
            };
            state = s;
            Object.assign(s, mazeGenerate(size));
            s.position = s.width + 1;
            s.exit = (s.width - 2) * s.width + s.width - 2;
            mazeBuildKeys(s);
            const [first, second] = s.originalGates;
            const blocked = new Set(s.gates.keys());
            if (
              !mazePath(s.grid, s.width, s.position, first.key, blocked).length ||
              mazePath(s.grid, s.width, s.position, second.key, blocked).length ||
              mazePath(s.grid, s.width, s.position, s.exit, blocked).length
            )
              failures.push({ size, i, stage: 1 });
            blocked.delete(first.gate);
            if (
              !mazePath(s.grid, s.width, first.key, second.key, blocked).length ||
              mazePath(s.grid, s.width, first.key, s.exit, blocked).length
            )
              failures.push({ size, i, stage: 2 });
            blocked.delete(second.gate);
            if (!mazePath(s.grid, s.width, second.key, s.exit, blocked).length)
              failures.push({ size, i, stage: 3 });
          }
        return failures;
      });
      assert.deepEqual(outcome, []);
    },
  );
  await check(
    'Maze hints never cross locked gates and do not charge twice for an already visible route',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('maze');
        $('arcadeMode').value = 'keys';
        startArcade('maze');
        clearTimers();
        state.hintTarget = state.originalGates[1].key;
        mazeHint();
        const noCharge = state.hints === 0 && state.hintPath.length === 0;
        state.hintTarget = state.originalGates[0].key;
        mazeHint();
        const route = [...state.hintPath],
          gateFree = route.every((i) => !state.gates.has(i));
        mazeHint();
        const duplicateFree = state.hints === 1;
        const next = route[1],
          delta = next - state.position;
        mazeMove(
          delta === 1 ? 'right' : delta === -1 ? 'left' : delta > 0 ? 'down' : 'up',
          false,
          true,
        );
        mazeHint();
        return {
          noCharge,
          gateFree,
          duplicateFree,
          followedFree: state.hints === 1,
          target: state.hintPath.at(-1) === state.originalGates[0].key,
        };
      });
      assert.deepEqual(outcome, {
        noCharge: true,
        gateFree: true,
        duplicateFree: true,
        followedFree: true,
        target: true,
      });
    },
  );
  await check(
    'Lantern expedition explores persistently, guards closed gates, unlocks by key and records one optimal trip',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('maze');
        $('arcadeSize').value = '7';
        $('arcadeMode').value = 'keys';
        $('arcadeVision').value = 'lantern';
        startArcade('maze');
        clearTimers();
        const startSeen = state.seen.size,
          floors = state.grid.filter((v) => !v).length;
        mazeMark();
        const marker = state.markers.has(state.position) && state.moves === 0;
        const gate = state.originalGates[0].gate,
          neighbour = mazeNeighbours(gate)[0],
          actual = state.position;
        state.position = neighbour;
        const dir =
          gate - neighbour === 1
            ? 'right'
            : gate - neighbour === -1
              ? 'left'
              : gate > neighbour
                ? 'down'
                : 'up';
        mazeMove(dir, false, true);
        const gateBlocked = state.position === neighbour && state.moves === 0;
        state.position = actual;
        showPause();
        mazeMark();
        const pausedMarks = state.markers.size;
        resumeGame();
        const history = store.extra.history.length;
        for (const target of [...state.originalStars, state.exit]) {
          const path = mazePath(state.grid, state.width, state.position, target, state.gates);
          for (const next of path.slice(1)) {
            const delta = next - state.position;
            mazeMove(
              delta === 1 ? 'right' : delta === -1 ? 'left' : delta > 0 ? 'down' : 'up',
              false,
              true,
            );
          }
        }
        const points = store.extra.history[0].points;
        mazeFinish();
        return {
          startSeen,
          floors,
          marker,
          gateBlocked,
          pausedMarks,
          explored: state.seen.size,
          gates: state.gates.size,
          keys: state.stars.size,
          done: state.done,
          optimal: state.moves === state.parMoves,
          entries: store.extra.history.length - history,
          points,
          replay: !!$('mazeReplayCanvas'),
        };
      });
      assert.ok(outcome.startSeen < outcome.floors);
      assert.equal(outcome.marker, true);
      assert.equal(outcome.gateBlocked, true);
      assert.equal(outcome.pausedMarks, 1);
      assert.ok(outcome.explored > outcome.startSeen);
      assert.equal(outcome.gates, 0);
      assert.equal(outcome.keys, 0);
      assert.equal(outcome.done, true);
      assert.equal(outcome.optimal, true);
      assert.equal(outcome.entries, 1);
      assert.equal(outcome.points, 70);
      assert.equal(outcome.replay, true);
    },
  );
  await check(
    'All v8 controls work offline at 360px; wide board fits and enlarged mines scroll inside the field',
    async () => {
      await context.setOffline(true);
      await page.setViewportSize({ width: 360, height: 844 });
      await mkdir('/tmp/lamma-arcade-v8', { recursive: true });
      for (const id of ['snake', 'merge', 'mines', 'maze']) {
        await page.evaluate((id) => {
          setup(id);
          if ($('arcadeBoardSize')) $('arcadeBoardSize').value = '5';
          if ($('arcadeVision')) $('arcadeVision').value = 'lantern';
          if ($('arcadeSize') && id === 'mines') $('arcadeSize').value = '16';
          if ($('arcadeMode') && id === 'maze') $('arcadeMode').value = 'keys';
          startArcade(id);
          clearTimers();
          if (id === 'mines') mineZoom(1.5);
        }, id);
        const layout = await page.evaluate((id) => {
          const control = document.querySelector(
            id === 'snake'
              ? '#snakeBoostButton'
              : id === 'merge'
                ? '#mergeUndoButton'
                : id === 'mines'
                  ? '#mineZoom'
                  : '#mazeMarkButton',
          );
          return {
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
            height: control.getBoundingClientRect().height,
            scroll:
              id === 'mines'
                ? document.querySelector('.mines-scroll').scrollWidth >
                  document.querySelector('.mines-scroll').clientWidth
                : true,
          };
        }, id);
        assert.ok(layout.width <= layout.viewport + 1, `${id} overflow: ${JSON.stringify(layout)}`);
        assert.ok(layout.height >= 44, `${id} touch control too small`);
        assert.equal(layout.scroll, true);
        await page.screenshot({ path: `/tmp/lamma-arcade-v8/${id}-360.png`, fullPage: true });
      }
      await context.setOffline(false);
    },
  );
  console.log(`${checks} arcade v8 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
