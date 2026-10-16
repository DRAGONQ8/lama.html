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
async function mazeCell(index) {
  const position = await page.evaluate((index) => {
    const box = $('mazeCanvas').getBoundingClientRect();
    return {
      x: box.left + (((index % state.width) + 0.5) / state.width) * box.width,
      y: box.top + ((Math.floor(index / state.width) + 0.5) / state.width) * box.height,
    };
  }, index);
  await page.mouse.click(position.x, position.y);
}
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await check(
    'Snake practice waits for input, repeats straight moves, rejects reversal and respects pause',
    async () => {
      await page.evaluate(() => {
        setup('snake');
        $('arcadeDrive').value = 'step';
        $('arcadeSpeed').value = '90';
        startArcade('snake');
        state.fruit = { x: 19, y: 19 };
        snakeBegin();
      });
      await page.waitForTimeout(360);
      assert.deepEqual(await page.evaluate(() => ({ head: state.snake[0], steps: state.steps })), {
        head: { x: 5, y: 10 },
        steps: 0,
      });
      await page.locator('.arcade-directions .dir-up').click();
      await page.evaluate(() => {
        showPause();
        snakeTurn('left');
      });
      assert.deepEqual(await page.evaluate(() => state.snake[0]), { x: 5, y: 9 });
      await page.locator('.pausebox .primary').click();
      await page.locator('.arcade-directions .dir-left').click();
      await page.locator('.arcade-directions .dir-left').click();
      assert.equal(await page.locator('.arcade-directions .dir-right').isDisabled(), true);
      await page.evaluate(() => snakeTurn('right'));
      assert.deepEqual(
        await page.evaluate(() => ({
          head: state.snake[0],
          steps: state.steps,
          turns: state.turns,
        })),
        { head: { x: 3, y: 9 }, steps: 3, turns: 2 },
      );
      const outcome = await page.evaluate(() => {
        state.fruitCount = 4;
        snakeEnd('نتيجة التدريب');
        return {
          points: store.extra.history[0].points,
          done: state.done,
          snapshot: !!document.querySelector('.arcade-snapshot'),
        };
      });
      assert.deepEqual(outcome, { points: 8, done: true, snapshot: true });
    },
  );
  await check('Snake collision review explains the cause and records the result once', async () => {
    const outcome = await page.evaluate(() => {
      setup('snake');
      $('arcadeDrive').value = 'live';
      startArcade('snake');
      clearTimers();
      snakeBegin();
      state.snake = [
        { x: 19, y: 10 },
        { x: 18, y: 10 },
        { x: 17, y: 10 },
      ];
      state.fruit = { x: 0, y: 0 };
      const history = store.extra.history.length;
      snakeStep();
      snakeEnd('محاولة مكررة');
      return {
        crash: state.crash.kind,
        entries: store.extra.history.length - history,
        advice: document
          .querySelector('.arcade-review')
          .textContent.includes('ابدأ المنعطف قبل الحافة'),
        image: document.querySelector('.arcade-snapshot').src.startsWith('data:image/png'),
      };
    });
    assert.deepEqual(outcome, { crash: 'edge', entries: 1, advice: true, image: true });
  });
  await check(
    '2048 preview preserves the board, score, history and focus, then applies one move',
    async () => {
      await page.evaluate(() => {
        setup('merge');
        startArcade('merge');
        clearTimers();
        state.board = [2, 2, 4, ...Array(13).fill(0)];
        renderMerge();
      });
      await page.locator('.arcade-coach summary').click();
      const before = await page.evaluate(() =>
        JSON.stringify({
          board: state.board,
          score: state.score,
          moves: state.moves,
          undo: state.undoStack,
        }),
      );
      await page.locator('#mergeForecastChoices button').filter({ hasText: 'يسار' }).click();
      const preview = await page.evaluate(() => ({
        values: [...$('mergePreviewBoard').children].map((el) => Number(el.dataset.value)),
        focused: document.activeElement.getAttribute('aria-pressed'),
        actual: JSON.stringify({
          board: state.board,
          score: state.score,
          moves: state.moves,
          undo: state.undoStack,
        }),
      }));
      assert.deepEqual(preview.values, [4, 4, ...Array(14).fill(0)]);
      assert.equal(preview.focused, 'true');
      assert.equal(preview.actual, before);
      await page.evaluate(() => {
        showPause();
        mergeApplyForecast();
        mergeForecast('down');
      });
      assert.equal(await page.evaluate(() => state.moves), 0);
      assert.equal(await page.evaluate(() => state.forecast.dir), 'left');
      await page.locator('.pausebox .primary').click();
      await page.locator('.merge-apply').click();
      assert.deepEqual(
        await page.evaluate(() => ({
          moves: state.moves,
          score: state.score,
          occupied: state.board.filter(Boolean).length,
          undo: state.undoStack.length,
          forecast: state.forecast,
          preview: !!$('mergePreviewBoard'),
        })),
        { moves: 1, score: 4, occupied: 3, undo: 1, forecast: null, preview: false },
      );
    },
  );
  await check(
    'Mine deductions use revealed clues only and ignore even incorrect player flags',
    async () => {
      const outcome = await page.evaluate(() => {
        const cells = [1, 1, 0, -1, 1, 0, 1, 1, 0];
        const revealed = new Set([0, 1]);
        const board = new Proxy(cells, {
          get(target, key) {
            if (/^\d+$/.test(String(key)) && !revealed.has(Number(key)))
              throw new Error('Read a hidden cell');
            return target[key];
          },
        });
        const mines = new Proxy(
          {},
          {
            get() {
              throw new Error('Read hidden mine positions');
            },
          },
        );
        const safe = mineDeduction({ size: 3, board, revealed, flags: new Set([2]), mines });
        const noGuess = mineDeduction({
          size: 3,
          board: [1, ...Array(8).fill(0)],
          revealed: new Set([0]),
          flags: new Set([1, 3]),
          mines,
        });
        return { index: safe.index, kind: safe.kind, clues: safe.clues.sort(), noGuess };
      });
      assert.deepEqual(outcome, { index: 2, kind: 'safe', clues: [0, 1], noGuess: null });
    },
  );
  await check(
    'Mine deductions remain sound across 120 seeded fields of all three sizes',
    async () => {
      const outcome = await page.evaluate(() => {
        let seed = 204812;
        const random = (n) => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed % n;
        };
        const shuffled = (values) => {
          const copy = [...values];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy;
        };
        let proofs = 0;
        const invalid = [];
        for (const size of [8, 12, 16])
          for (let round = 0; round < 40; round++) {
            const cells = Array.from({ length: size * size }, (_, i) => i),
              mines = new Set(shuffled(cells).slice(0, { 8: 10, 12: 24, 16: 48 }[size])),
              board = cells.map((i) =>
                mines.has(i) ? -1 : mineNeighbours(i, size).filter((j) => mines.has(j)).length,
              ),
              safe = shuffled(cells.filter((i) => !mines.has(i))),
              revealed = new Set(
                safe.slice(0, Math.floor(safe.length * (0.15 + random(50) / 100))),
              ),
              flags = new Set(shuffled(cells.filter((i) => !revealed.has(i))).slice(0, 5)),
              proof = mineDeduction({ size, board, revealed, flags });
            if (!proof) continue;
            proofs++;
            if ((proof.kind === 'mine') !== mines.has(proof.index))
              invalid.push({ size, round, proof });
          }
        return { proofs, invalid };
      });
      assert.ok(outcome.proofs > 0, 'Seeded fields should exercise deductions');
      assert.deepEqual(outcome.invalid, []);
    },
  );
  await check(
    'Mine help costs nothing without proof; successful help is charged once and applies safely in flag mode',
    async () => {
      await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        mineHint();
      });
      assert.deepEqual(
        await page.evaluate(() => ({ generated: state.generated, hints: state.hints })),
        { generated: false, hints: 0 },
      );
      await page.evaluate(() => {
        state.mineCount = 1;
        state.mines = new Set([0]);
        state.generated = true;
        state.clockRunning = true;
        state.board = state.board.map((_, i) =>
          i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
        );
        state.revealed = new Set([1, 9]);
        state.flags = new Set([16]);
        state.flagMode = true;
        renderMines();
        mineHint();
        mineHint();
      });
      assert.deepEqual(
        await page.evaluate(() => ({
          hints: state.hints,
          target: state.deduction.index,
          kind: state.deduction.kind,
          exposed: state.revealed.size,
        })),
        { hints: 1, target: 16, kind: 'safe', exposed: 2 },
      );
      await page.evaluate(() => {
        showPause();
        mineApplyHint();
      });
      assert.equal(await page.evaluate(() => state.revealed.size), 2);
      await page.locator('.pausebox .primary').click();
      await page.getByRole('button', { name: 'نفّذ الاستنتاج', exact: true }).click();
      assert.deepEqual(
        await page.evaluate(() => ({
          done: state.done,
          flags: state.flags.size,
          revealed: state.revealed.size,
          points: store.extra.history[0].points,
        })),
        { done: true, flags: 0, revealed: 63, points: 62 },
      );
    },
  );
  await check(
    'Maze taps move one adjacent cell, target a paid hint, and replay the completed route without changing results',
    async () => {
      await page.evaluate(() => {
        setup('maze');
        startArcade('maze');
        clearTimers();
        state.width = 7;
        state.grid = Array(49).fill(1);
        for (const i of [8, 9, 10, 17, 24, 25, 26, 31]) state.grid[i] = 0;
        state.position = 8;
        state.exit = 26;
        state.moves = 0;
        state.trail = new Set([8]);
        state.route = [8];
        state.stars = new Set([24, 31]);
        state.originalStars = [24, 31];
        state.starTotal = 2;
        state.parMoves = 8;
        state.travel = 'corridor';
        renderMaze();
      });
      await mazeCell(9);
      assert.deepEqual(
        await page.evaluate(() => ({ position: state.position, moves: state.moves })),
        { position: 9, moves: 1 },
      );
      await mazeCell(31);
      assert.deepEqual(
        await page.evaluate(() => ({
          target: state.hintTarget,
          hints: state.hints,
          moves: state.moves,
        })),
        { target: 31, hints: 0, moves: 1 },
      );
      await page.locator('#mazeHintButton').click();
      assert.deepEqual(
        await page.evaluate(() => ({ target: state.hintPath.at(-1), hints: state.hints })),
        { target: 31, hints: 1 },
      );
      await page.evaluate(() => {
        mazeMove('right');
        mazeMove('down');
        mazeMove('up');
        mazeMove('right');
      });
      const result = await page.evaluate(() => ({
        done: state.done,
        moves: state.moves,
        at: state.position,
        route: state.route,
        points: store.extra.history[0].points,
      }));
      assert.equal(result.done, true);
      assert.equal(result.moves, 8);
      assert.equal(result.at, 26);
      assert.equal(result.route.length, 9);
      await page.getByRole('button', { name: 'بداية الرحلة', exact: true }).click();
      assert.equal(await page.locator('#mazeReplayRange').inputValue(), '0');
      assert.equal(await page.locator('#mazeReplayLabel').textContent(), 'الخطوة 0 من 8');
      assert.deepEqual(
        await page.evaluate(() => ({
          done: state.done,
          moves: state.moves,
          at: state.position,
          route: state.route,
          points: store.extra.history[0].points,
        })),
        result,
      );
      await page.getByRole('button', { name: 'الوصول للمخرج', exact: true }).click();
      assert.equal(await page.locator('#mazeReplayRange').inputValue(), '8');
    },
  );
  await check(
    'All four arcade games fit 360 and 390 pixel screens, stay interactive offline and preserve readable controls',
    async () => {
      await context.setOffline(true);
      await mkdir('/tmp/lamma-arcade-v7', { recursive: true });
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const id of ['snake', 'merge', 'mines', 'maze']) {
          await page.evaluate((id) => {
            setup(id);
            if ($('arcadeDrive')) $('arcadeDrive').value = 'step';
            startArcade(id);
            clearTimers();
          }, id);
          if (id === 'merge') {
            await page.locator('.arcade-coach summary').click();
            await page.locator('#mergeForecastChoices button:not(:disabled)').first().click();
          }
          if (id === 'mines') {
            await page.evaluate(() => mineTap(27));
          }
          const layout = await page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
            board: document
              .querySelector('canvas, #mergeBoard, .mines-board')
              .getBoundingClientRect().width,
            button: document
              .querySelector('.arcade-directions button, .mine-mode button')
              .getBoundingClientRect().height,
          }));
          assert.ok(
            layout.width <= layout.viewport + 1,
            `${id} overflow on ${width}: ${JSON.stringify(layout)}`,
          );
          assert.ok(layout.button >= 44, `${id} control too small on ${width}`);
          await page.screenshot({
            path: `/tmp/lamma-arcade-v7/${id}-${width}.png`,
            fullPage: true,
          });
        }
      }
      await context.setOffline(false);
    },
  );
  console.log(`${checks} arcade v7 checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
