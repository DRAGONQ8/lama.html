import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
let html;
if (process.env.LAMMA_TEST_HTML) html = await readFile(process.env.LAMMA_TEST_HTML, 'utf8');
else if (process.argv.includes('--built')) html = await read('lamma_universe.html');
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
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, hasTouch: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let checks = 0;
async function check(name, fn) {
  await fn();
  assert.deepEqual(errors, [], `${name}: browser exceptions`);
  checks++;
  console.log(`✓ ${name}`);
}
const source = `http://127.0.0.1:${server.address().port}`;
async function start(id, options = {}) {
  await page.evaluate(
    ({ id, options }) => {
      setup(id);
      for (const [name, value] of Object.entries(options)) $(name).value = String(value);
      startArcade(id);
      clearTimers();
    },
    { id, options },
  );
}
async function tapCell(canvasID, x, y, size) {
  await page.locator(`#${canvasID}`).scrollIntoViewIfNeeded();
  const rect = await page.locator(`#${canvasID}`).boundingBox();
  await page.touchscreen.tap(
    rect.x + ((x + 0.5) * rect.width) / size,
    rect.y + ((y + 0.5) * rect.height) / size,
  );
}
try {
  await page.goto(source);
  await check(
    'Snake training accepts one adjacent tap, rejects reverse/distant taps, and describes the updated board',
    async () => {
      await start('snake', { arcadeDrive: 'step' });
      await page.locator('#snakeStart button').click();
      await page.evaluate(() => {
        state.fruit = { x: 6, y: 10 };
        snakeDraw();
      });
      await tapCell('snakeCanvas', 6, 10, 20);
      assert.deepEqual(await page.evaluate(() => [state.snake[0], state.fruitCount, state.steps]), [
        { x: 6, y: 10 },
        1,
        1,
      ]);
      const description = await page.locator('#snakeNavigation').textContent();
      assert.match(description, /الرأس: الصف 11، العمود 7/);
      assert.equal(
        await page.locator('#snakeCanvas').getAttribute('aria-description'),
        description,
      );
      await tapCell('snakeCanvas', 5, 10, 20);
      await tapCell('snakeCanvas', 15, 10, 20);
      assert.equal(await page.evaluate(() => state.steps), 1);
      await page.keyboard.press('ArrowUp');
      assert.deepEqual(await page.evaluate(() => state.snake[0]), { x: 6, y: 9 });
      await page.evaluate(() => showPause());
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => state.steps), 2);
      await page.locator('.pausebox .primary').click();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => state.steps), 3);
    },
  );
  await check(
    'Snake collision previews match real tail, wrap, rock, body and edge outcomes; results record once',
    async () => {
      await start('snake', { arcadeDrive: 'step', arcadeMode: 'wrap' });
      const tail = await page.evaluate(() => {
        snakeBegin();
        state.snake = [
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 0, y: 2 },
          { x: 0, y: 1 },
        ];
        state.direction = 'up';
        state.fruit = { x: 8, y: 8 };
        const safe = snakeNext('left').safe;
        snakeTurn('left');
        return { safe, done: state.done, head: state.snake[0] };
      });
      assert.deepEqual(tail, { safe: true, done: false, head: { x: 0, y: 1 } });
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => state.snake[0].x), 19);
      for (const kind of ['edge', 'rock', 'body']) {
        await start('snake', { arcadeDrive: 'step' });
        const before = await page.evaluate((kind) => {
          snakeBegin();
          state.direction = 'right';
          state.snake =
            kind === 'edge'
              ? [
                  { x: 19, y: 10 },
                  { x: 18, y: 10 },
                  { x: 17, y: 10 },
                ]
              : kind === 'body'
                ? [
                    { x: 5, y: 10 },
                    { x: 5, y: 9 },
                    { x: 6, y: 9 },
                    { x: 6, y: 10 },
                    { x: 7, y: 10 },
                  ]
                : [
                    { x: 5, y: 10 },
                    { x: 4, y: 10 },
                    { x: 3, y: 10 },
                  ];
          state.rocks = kind === 'rock' ? [{ x: 6, y: 10 }] : [];
          state.fruit = { x: 8, y: 8 };
          return { safe: snakeNext('right').safe, count: store.extra.history.length };
        }, kind);
        assert.equal(before.safe, false);
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(
          await page.evaluate(() => [
            state.done,
            state.crash.kind,
            document.querySelectorAll('.arcade-snapshot').length,
          ]),
          [true, kind, 1],
        );
        await page.evaluate(() => snakeEnd('duplicate'));
        assert.equal(await page.evaluate(() => store.extra.history.length), before.count + 1);
      }
    },
  );
  await check(
    'Snake courier carries the correct type, updates its target to the depot, and finishes three deliveries',
    async () => {
      await start('snake', { arcadeDrive: 'step', arcadeMission: 'courier' });
      const result = await page.evaluate(() => {
        snakeBegin();
        let target;
        for (let delivery = 0; delivery < 3; delivery++) {
          state.snake = [
            { x: 1, y: 3 },
            { x: 0, y: 3 },
            { x: 0, y: 4 },
          ];
          state.direction = 'right';
          state.turnQueue = [];
          state.foods = [{ x: 2, y: 3, kind: state.deliveryOrders[delivery] }];
          state.fruit = state.foods[0];
          snakeTurn('right');
          target = $('snakeNavigation').textContent;
          if (state.cargoKind !== state.deliveryOrders[delivery]) throw new Error('Wrong cargo');
          snakeTurn('up');
        }
        return {
          target,
          deliveries: state.deliveries,
          done: state.done,
          wrong: state.wrongPickups,
          points: store.extra.history[0].points,
        };
      });
      assert.match(result.target, /المستودع: الصف 3، العمود 3/);
      assert.deepEqual(
        [result.deliveries, result.done, result.wrong, result.points],
        [3, true, 0, 50],
      );
    },
  );
  await check(
    '2048 forecast controls stay mounted, applying with Enter returns focus safely, and undo restores the random cursor',
    async () => {
      await start('merge');
      await page.evaluate(() => {
        state.board = [2, 2, 4, ...Array(13).fill(0)];
        renderMerge();
      });
      await page.locator('.arcade-coach summary').click();
      await page.evaluate(() => {
        window.v14Choice = $('mergeForecastChoices').firstElementChild;
      });
      await page.locator('#mergeForecastChoices [data-direction="left"]').click();
      const original = await page.evaluate(() => ({
        board: [...state.board],
        cursor: state.spawnCursor,
      }));
      await page.locator('.merge-apply').focus();
      await page.keyboard.press('Enter');
      const focused = await page.evaluate(() => ({
        action: document.activeElement.getAttribute('onclick'),
        same: window.v14Choice === $('mergeForecastChoices').firstElementChild,
        moves: state.moves,
      }));
      assert.deepEqual(focused, { action: "mergeForecast('left')", same: true, moves: 1 });
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.moves), 1);
      assert.equal(await page.locator('#mergePreviewBoard').count(), 1);
      await page.keyboard.press('z');
      assert.deepEqual(
        await page.evaluate(() => ({ board: state.board, cursor: state.spawnCursor })),
        original,
      );
      assert.match(
        await page.locator('#mergeBoard').getAttribute('aria-label'),
        /الصف 1 من اليسار: 2، 2، 4، فارغة/,
      );
      assert.match(
        await page
          .locator('#mergeForecastChoices [data-direction="left"]')
          .getAttribute('aria-label'),
        /4 نقاط دمج/,
      );
    },
  );
  await check(
    '2048 wins, continues and records once; workshop crates keep separate accessible layer counts',
    async () => {
      await start('merge', { arcadeGoal: '1024' });
      await page.evaluate(() => {
        state.board = [512, 512, ...Array(14).fill(0)];
        state.spawnTape[state.spawnCursor] = { position: 999999999, value: 2 };
        renderMerge();
      });
      await page.locator('.arcade-directions .dir-left').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => state.won), true);
      await page.locator('[onclick="mergeContinue()"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.continuing), true);
      assert.equal(
        await page.evaluate(() => document.activeElement.closest('.arcade-directions') !== null),
        true,
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.classList.contains('dir-left')),
        true,
      );
      await page.locator('[onclick="mergeEnd()"]').click();
      const count = await page.evaluate(() => store.extra.history.length);
      await page.evaluate(() => mergeEnd());
      assert.equal(await page.evaluate(() => store.extra.history.length), count);
      await start('merge', { arcadeGoal: '1024' });
      const fallback = await page.evaluate(() => {
        state.board = [512, 512, ...Array(14).fill(0)];
        state.spawnTape[state.spawnCursor] = { position: 0, value: 2 };
        renderMerge();
        const original = document.querySelector('.arcade-directions .dir-left');
        original.focus();
        mergeMove('left');
        mergeContinue();
        return {
          originalDisabled: original.disabled,
          changed: document.activeElement !== original,
          usable: document.activeElement.matches('.arcade-directions button:not(:disabled)'),
        };
      });
      assert.deepEqual(fallback, { originalDisabled: true, changed: true, usable: true });
      await start('merge', { arcadeMission: 'workshop', arcadeBoardSize: '5' });
      const workshop = await page.evaluate(() => {
        state.crateHP[6] = 1;
        state.crateHP[8] = 2;
        renderMerge();
        return {
          label: $('mergeBoard').getAttribute('aria-label'),
          length: state.board.length,
          total: state.crateTotal,
        };
      });
      assert.match(workshop.label, /صندوق بطبقات 1، فارغة، صندوق بطبقات 2/);
      assert.deepEqual([workshop.length, workshop.total], [25, 4]);
    },
  );
  await check(
    '2048 conserves tile value and obeys one-merge rules in every direction and board size',
    async () => {
      const cases = await page.evaluate(() => {
        const failures = [];
        for (const size of [4, 5])
          for (const dir of Object.keys(arcadeDelta)) {
            const board = Array(size * size).fill(0);
            const indices =
              dir === 'left'
                ? [0, 1, 2, 3]
                : dir === 'right'
                  ? [size - 1, size - 2, size - 3, size - 4]
                  : dir === 'up'
                    ? [0, size, size * 2, size * 3]
                    : [size * (size - 1), size * (size - 2), size * (size - 3), size * (size - 4)];
            indices.forEach((index) => {
              board[index] = 2;
            });
            const result = mergeSlide(board, dir);
            if (
              result.gained !== 8 ||
              result.merged.length !== 2 ||
              result.board.reduce((a, b) => a + b, 0) !== 8 ||
              result.board.filter((v) => v === 4).length !== 2
            )
              failures.push({ size, dir, result });
          }
        return failures;
      });
      assert.deepEqual(cases, []);
    },
  );
  await check(
    'Mines first click and all eight neighbors are safe for every field size',
    async () => {
      for (const size of [8, 12, 16]) {
        await start('mines', { arcadeSize: size });
        const center = Math.floor(size / 2) * size + Math.floor(size / 2);
        await page.locator(`.mine-cell[data-index="${center}"]`).click();
        const result = await page.evaluate(
          (center) => ({
            generated: state.generated,
            safe: [center, ...mineNeighbours(center)].every(
              (i) => !state.mines.has(i) && state.revealed.has(i),
            ),
            mines: state.mines.size,
            all: state.board.length,
          }),
          center,
        );
        assert.deepEqual(result, {
          generated: true,
          safe: true,
          mines: { 8: 10, 12: 24, 16: 48 }[size],
          all: size * size,
        });
      }
    },
  );
  await check(
    'Mines Home/End/Page navigation preserves state and safe inspection outlines only visible clue neighbors',
    async () => {
      await start('mines', { arcadeSize: '16' });
      await page.evaluate(() => {
        mineMode('inspect');
        state.selected = 100;
        mineSelectionUI();
        document.querySelector('[data-index="100"]').focus();
      });
      for (const [key, selected] of [
        ['Home', 96],
        ['End', 111],
        ['PageUp', 15],
        ['PageDown', 255],
      ]) {
        await page.keyboard.press(key);
        assert.deepEqual(
          await page.evaluate(() => [
            state.selected,
            state.revealed.size,
            state.generated,
            document.activeElement.dataset.index,
          ]),
          [selected, 0, false, String(selected)],
        );
      }
      const result = await page.evaluate(() => {
        state.selected = 17;
        state.revealed = new Set([17]);
        state.board[17] = 1;
        state.flags = new Set([0]);
        const original = state.board;
        state.board = new Proxy(original, {
          get(target, key) {
            if (/^\d+$/.test(String(key)) && !state.revealed.has(Number(key)))
              throw new Error('Inspection read hidden board');
            return target[key];
          },
        });
        mineSelectionUI();
        state.board = original;
        return {
          marked: [...document.querySelectorAll('.mine-selected-neighbour')].map((el) =>
            Number(el.dataset.index),
          ),
          expected: mineNeighbours(17),
          text: $('mineSelectionInfo').textContent,
        };
      });
      assert.deepEqual(result.marked, result.expected);
      assert.match(result.text, /عدد الأعلام يطابق الرقم؛ راجع أماكنها/);
    },
  );
  await check(
    'Mines completes a generated safe field through actual cell clicks and exposes a bomb in a fresh loss',
    async () => {
      await start('mines');
      await page.locator('.mine-cell[data-index="27"]').click();
      const safe = await page.evaluate(() =>
        state.board
          .map((v, i) => (v >= 0 && !state.revealed.has(i) ? i : null))
          .filter((i) => i !== null),
      );
      for (const index of safe) {
        if (await page.evaluate(() => state.done)) break;
        await page.locator(`.mine-cell[data-index="${index}"]`).click();
      }
      assert.deepEqual(
        await page.evaluate(() => [state.done, state.revealed.size, store.extra.history[0].points]),
        [true, 54, 70],
      );
      await start('mines');
      await page.locator('.mine-cell[data-index="27"]').click();
      const bomb = await page.evaluate(() => [...state.mines][0]);
      await page.locator(`.mine-cell[data-index="${bomb}"]`).click();
      assert.deepEqual(await page.evaluate(() => [state.done, state.exploded]), [true, bomb]);
      assert.equal(await page.locator('.mine-cell.exploded').count(), 1);
    },
  );
  await check(
    'Mines survey scans avoid duplicate charges and extraction requires all four real relics',
    async () => {
      await start('mines', { arcadeMission: 'survey' });
      await page.evaluate(() => {
        state.arcadeRandom = makeSeed('arcade-survey-v14');
      });
      await page.locator('.mine-cell[data-index="27"]').click();
      await page.locator('[onclick="mineScan()"]').click();
      await page.locator('[onclick="mineScan()"]').click();
      assert.equal(await page.evaluate(() => state.scans), 1);
      assert.equal(await page.locator('[onclick="mineExtract()"]').isDisabled(), true);
      const relics = await page.evaluate(() => [...state.relics]);
      for (const index of relics) {
        if (await page.evaluate((index) => state.revealed.has(index), index)) continue;
        await page.locator(`.mine-cell[data-index="${index}"]`).click();
      }
      assert.equal(await page.evaluate(() => state.foundRelics.size), 4);
      assert.equal(await page.evaluate(() => state.done), false);
      await page.locator('[onclick="mineExtract()"]').click();
      assert.deepEqual(
        await page.evaluate(() => [state.done, state.extracted, store.extra.history[0].points]),
        [true, true, 54],
      );
    },
  );
  await check(
    'Maze lantern targets shown by a hint accept taps; hiding and restoring the same route costs no extra hint',
    async () => {
      await start('maze', { arcadeSize: '7', arcadeMode: 'exit', arcadeVision: 'lantern' });
      assert.equal(await page.locator('#mazeHintVisibility').isDisabled(), true);
      await page.locator('#mazeHintButton').click();
      const target = await page.evaluate(() => ({
        index: state.exit,
        x: state.exit % state.width,
        y: Math.floor(state.exit / state.width),
        size: state.width,
        seen: state.seen.has(state.exit),
        path: [...state.hintPath],
      }));
      assert.equal(target.seen, false);
      await tapCell('mazeCanvas', target.x, target.y, target.size);
      assert.equal(await page.evaluate(() => state.hintTarget), target.index);
      await page.locator('#mazeHintVisibility').click();
      assert.deepEqual(
        await page.evaluate(() => [state.showHint, state.hints, mazeVisible(state.exit)]),
        [false, 1, false],
      );
      await page.locator('#mazeHintVisibility').click();
      assert.deepEqual(
        await page.evaluate(() => [state.showHint, state.hints, mazeVisible(state.exit)]),
        [true, 1, true],
      );
      await page.locator('#mazeHintButton').click();
      assert.deepEqual(await page.evaluate(() => [state.hints, state.hintPath]), [1, target.path]);
    },
  );
  await check(
    'Every Maze mode reaches its legal finish on a generated map and replay restores the first and last step',
    async () => {
      for (const mode of ['exit', 'stars', 'keys', 'courier']) {
        await start('maze', { arcadeSize: '7', arcadeMode: mode, arcadeVision: 'lantern' });
        const result = await page.evaluate(() => {
          const walk = (target) => {
            const path = mazePath(state.grid, state.width, state.position, target, state.gates);
            if (!path.length) throw new Error('Target unreachable');
            for (const next of path.slice(1)) {
              const delta = next - state.position;
              mazeMove(
                delta === 1 ? 'right' : delta === -1 ? 'left' : delta > 0 ? 'down' : 'up',
                false,
                true,
              );
            }
          };
          const first = state.position;
          if (state.mode === 'courier')
            for (let parcel = 0; parcel < 3; parcel++) {
              walk(state.courierStations[parcel]);
              walk(state.base);
            }
          else {
            while (state.stars.size) {
              const target = [...state.stars].find(
                (index) =>
                  mazePath(state.grid, state.width, state.position, index, state.gates).length,
              );
              if (target === undefined) throw new Error('No accessible objective');
              walk(target);
            }
            walk(state.exit);
          }
          mazeReplay(0);
          const beginning = $('mazeReplayRange').value;
          mazeReplay(-1);
          return {
            done: state.done,
            position: state.position,
            exit: state.exit,
            moves: state.moves,
            steps: state.route.length - 1,
            first,
            beginning,
            end: Number($('mazeReplayRange').value),
            delivered: state.delivered,
            gates: state.gates.size,
            stars: state.stars.size,
          };
        });
        assert.equal(result.done, true, mode);
        assert.equal(result.position, result.exit, mode);
        assert.equal(result.steps, result.moves, mode);
        assert.equal(result.beginning, '0', mode);
        assert.equal(result.end, result.steps, mode);
        assert.equal(result.stars, 0, mode);
        if (mode === 'keys') assert.equal(result.gates, 0);
        if (mode === 'courier') assert.equal(result.delivered, 3);
      }
    },
  );
  await check(
    'All four arcade games fit a 390px touch viewport and retain playable controls',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const screenshotDirectory = new URL('../test-results/arcade-v14/', import.meta.url);
      await mkdir(screenshotDirectory, { recursive: true });
      for (const id of ['snake', 'merge', 'mines', 'maze']) {
        await start(
          id,
          id === 'snake' ? { arcadeDrive: 'step' } : id === 'mines' ? { arcadeSize: '16' } : {},
        );
        if (id === 'snake') await page.locator('#snakeStart button').click();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(overflow, false, `${id}: horizontal page overflow`);
        await page.screenshot({
          path: fileURLToPath(new URL(`${id}-mobile.png`, screenshotDirectory)),
          fullPage: true,
        });
        if (id !== 'mines')
          assert.equal(await page.locator('.arcade-directions button').count(), 4);
        else assert.equal(await page.locator('.mine-cell').count(), 256);
      }
    },
  );
  console.log(`Arcade v14: ${checks} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
