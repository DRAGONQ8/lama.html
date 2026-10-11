import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
let html;
if (process.argv.includes('--source')) {
  const build = await read('scripts/build.mjs');
  const names = (key) =>
    JSON.parse(
      build
        .match(new RegExp(`const ${key} = (\\[[\\s\\S]*?\\]);`))[1]
        .replace(/'/g, '"')
        .replace(/,\s*]/g, ']'),
    );
  const scripts = await Promise.all(names('scripts').map((name) => read(`src/${name}.js`)));
  const styles = await Promise.all(
    names('styles').map((name) => read(`src/${name}.css`).catch(() => '')),
  );
  html = (await read('src/template.html'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n'))
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'));
} else html = await read('lamma_universe.html');

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
  checks++;
  console.log(`✓ ${name}`);
}

try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await check(
    'Snake buffers two turns safely and ignores redundant or reverse inputs',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('snake');
        startArcade('snake');
        clearTimers();
        snakeTurn('right');
        snakeTurn('left');
        const ignored = state.turnQueue.length;
        snakeTurn('up');
        snakeTurn('left');
        snakeTurn('down');
        const queued = [...state.turnQueue];
        state.fruit = { x: 19, y: 19 };
        snakeStep();
        const first = { ...state.snake[0] };
        snakeStep();
        return { ignored, queued, first, second: state.snake[0], direction: state.direction };
      });
      assert.equal(outcome.ignored, 0);
      assert.deepEqual(outcome.queued, ['up', 'left']);
      assert.deepEqual(outcome.first, { x: 5, y: 9 });
      assert.deepEqual(outcome.second, { x: 4, y: 9 });
      assert.equal(outcome.direction, 'left');
    },
  );

  await check(
    'Snake permits the departing tail cell and escalates speed only when selected',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('snake');
        startArcade('snake');
        clearTimers();
        state.running = true;
        state.snake = [
          { x: 5, y: 5 },
          { x: 5, y: 6 },
          { x: 4, y: 6 },
          { x: 4, y: 5 },
        ];
        state.direction = 'left';
        state.turnQueue = [];
        state.fruit = { x: 19, y: 19 };
        snakeStep();
        const tailSafe = !state.done && state.snake[0].x === 4 && state.snake[0].y === 5;
        state.fruitCount = 4;
        state.fruit = { x: 3, y: 5 };
        snakeStep();
        const progressive = { count: state.fruitCount, level: state.level, speed: state.stepMs };
        setup('snake');
        $('arcadePace').value = 'steady';
        startArcade('snake');
        clearTimers();
        state.running = true;
        state.fruitCount = 4;
        state.fruit = { x: 6, y: 10 };
        snakeStep();
        return { tailSafe, progressive, steady: state.stepMs };
      });
      assert.equal(outcome.tailSafe, true);
      assert.deepEqual(outcome.progressive, { count: 5, level: 2, speed: 135 });
      assert.equal(outcome.steady, 150);
    },
  );

  await check(
    '2048 reaches the selected target and resumes with the same mounted board',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('merge');
        $('arcadeGoal').value = '1024';
        startArcade('merge');
        clearTimers();
        const board = $('mergeBoard');
        const button = document.querySelector('.arcade-directions .dir-left');
        button.focus();
        state.board = [512, 512, ...Array(14).fill(0)];
        mergeMove('left');
        const won = state.won;
        const targetShown = $('mergeOverlay').textContent.includes('1024');
        mergeContinue();
        const mounted = board === $('mergeBoard');
        const focused = document.activeElement === button;
        return { won, targetShown, mounted, focused, continuing: state.continuing };
      });
      assert.deepEqual(outcome, {
        won: true,
        targetShown: true,
        mounted: true,
        focused: true,
        continuing: true,
      });
    },
  );

  await check(
    '2048 retains exactly five undo states and restores scores and move counts',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('merge');
        startArcade('merge');
        clearTimers();
        state.board = [2, ...Array(15).fill(0)];
        const snapshots = [];
        for (const dir of ['right', 'down', 'left', 'up', 'right', 'down']) {
          snapshots.push({ board: [...state.board], score: state.score, moves: state.moves });
          mergeMove(dir);
        }
        const depth = state.undoStack.length;
        for (let i = 0; i < 5; i++) mergeUndo();
        const actual = { board: state.board, score: state.score, moves: state.moves };
        return { depth, expected: snapshots[1], actual, history: state.history };
      });
      assert.equal(outcome.depth, 5);
      assert.deepEqual(outcome.actual, outcome.expected);
      assert.equal(outcome.history, null);
    },
  );

  await check(
    'A long 2048 swipe makes one move and invalid directions never alter the board',
    async () => {
      await page.evaluate(() => {
        setup('merge');
        startArcade('merge');
        clearTimers();
        state.board = [0, 0, 0, 2, ...Array(12).fill(0)];
        renderMerge();
      });
      const box = await page.locator('#mergeBoard').boundingBox();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 12 });
      await page.mouse.up();
      const outcome = await page.evaluate(() => ({
        moves: state.moves,
        invalid: mergeSlide(state.board, 'invalid'),
        board: [...state.board],
      }));
      assert.equal(outcome.moves, 1);
      assert.equal(outcome.invalid.changed, false);
      assert.deepEqual(outcome.invalid.board, outcome.board);
    },
  );

  await check(
    'Mines show incomplete chord guidance, then reveal safe neighbours with correct flags',
    async () => {
      const outcome = await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        state.mineCount = 1;
        state.mines = new Set([0]);
        state.generated = true;
        state.clockRunning = true;
        state.board = state.board.map((_, i) =>
          i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
        );
        state.revealed = new Set([9]);
        mineTap(9);
        const highlighted = document.querySelectorAll('.mine-neighbour').length;
        const guided = $('mineStatus').textContent.includes('وضعت 0');
        const closed = state.revealed.size;
        mineFlag(0);
        mineTap(9);
        return {
          highlighted,
          guided,
          closed,
          revealed: state.revealed.size,
          safe: !state.revealed.has(0),
          done: state.done,
        };
      });
      assert.equal(outcome.highlighted, 8);
      assert.equal(outcome.guided, true);
      assert.equal(outcome.closed, 1);
      assert.equal(outcome.revealed, 63);
      assert.equal(outcome.safe, true);
      assert.equal(outcome.done, true);
    },
  );

  await check('Wrong mine flags retain real risk when chording', async () => {
    const outcome = await page.evaluate(() => {
      setup('mines');
      startArcade('mines');
      clearTimers();
      state.mineCount = 1;
      state.mines = new Set([0]);
      state.generated = true;
      state.clockRunning = true;
      state.board = state.board.map((_, i) =>
        i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
      );
      state.revealed = new Set([9]);
      mineFlag(1);
      mineTap(9);
      return { exploded: state.exploded, done: state.done };
    });
    assert.deepEqual(outcome, { exploded: 0, done: true });
  });

  await check('Touch hold flags once and movement cancels a hold before scrolling', async () => {
    await page.evaluate(() => {
      setup('mines');
      startArcade('mines');
      clearTimers();
      document.querySelector('.mine-cell[data-index="0"]').dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'touch',
          pointerId: 8,
          isPrimary: true,
          clientX: 50,
          clientY: 50,
        }),
      );
    });
    await page.waitForTimeout(500);
    const held = await page.evaluate(() => {
      mineTap(0);
      return { flagged: state.flags.has(0), revealed: state.revealed.has(0) };
    });
    assert.deepEqual(held, { flagged: true, revealed: false });
    await page.evaluate(() => {
      const cell = document.querySelector('.mine-cell[data-index="1"]');
      cell.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'touch',
          pointerId: 9,
          isPrimary: true,
          clientX: 50,
          clientY: 50,
        }),
      );
      cell.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'touch',
          pointerId: 9,
          isPrimary: true,
          clientX: 75,
          clientY: 50,
        }),
      );
    });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => state.flags.has(1)), false);
  });

  await check('Maze corridor movement follows bends and stops at stars and junctions', async () => {
    const outcome = await page.evaluate(() => {
      setup('maze');
      startArcade('maze');
      clearTimers();
      state.width = 7;
      state.grid = Array(49).fill(1);
      for (const i of [8, 9, 10, 17, 24, 25, 26, 31]) state.grid[i] = 0;
      state.position = 8;
      state.exit = 26;
      state.stars = new Set([24]);
      state.starTotal = 1;
      state.travel = 'corridor';
      state.hintPath = [8, 9, 10, 17, 24, 25, 26];
      mazeMove('right');
      const star = {
        position: state.position,
        moves: state.moves,
        remaining: state.stars.size,
        path: [...state.hintPath],
      };
      mazeMove('down');
      const deadEnd = state.position;
      mazeMove('up');
      return { star, deadEnd, junction: state.position, moves: state.moves };
    });
    assert.deepEqual(outcome.star, { position: 24, moves: 4, remaining: 0, path: [24, 25, 26] });
    assert.equal(outcome.deadEnd, 31);
    assert.equal(outcome.junction, 24);
    assert.equal(outcome.moves, 6);
  });

  await check(
    'Maze shortest complete route includes detours to stars before the exit',
    async () => {
      const outcome = await page.evaluate(() => {
        const grid = Array(49).fill(1);
        for (const i of [8, 9, 10, 17, 24, 25, 26, 31]) grid[i] = 0;
        return {
          exitOnly: mazeBestRoute(grid, 7, 8, [], 26),
          collectStar: mazeBestRoute(grid, 7, 8, [31], 26),
          twoStars: mazeBestRoute(grid, 7, 8, [24, 31], 26),
        };
      });
      assert.deepEqual(outcome, { exitOnly: 6, collectStar: 8, twoStars: 8 });
    },
  );
  console.log(`${checks} arcade upgrade checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
