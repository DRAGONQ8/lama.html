import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
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
    'Snake explains queued turns, blocks reverse controls and releases them as each turn executes',
    async () => {
      const result = await page.evaluate(() => {
        setup('snake');
        startArcade('snake');
        clearTimers();
        const reverseDisabled = document.querySelector('.dir-left').disabled;
        snakeTurn('up');
        snakeTurn('left');
        const queued = [...state.turnQueue];
        const full = [...document.querySelectorAll('.arcade-directions button')].every(
          (button) => button.disabled,
        );
        const plan = $('snakeTurnPlan').textContent;
        snakeStep();
        const next = {
          queue: [...state.turnQueue],
          left: document.querySelector('.dir-left').disabled,
          right: document.querySelector('.dir-right').disabled,
        };
        snakeStep();
        return {
          reverseDisabled,
          queued,
          full,
          plan,
          next,
          finalQueue: [...state.turnQueue],
          controls: [...document.querySelectorAll('.arcade-directions button')].filter(
            (button) => !button.disabled,
          ).length,
        };
      });
      assert.equal(result.reverseDisabled, true);
      assert.deepEqual(result.queued, ['up', 'left']);
      assert.equal(result.full, true);
      assert.match(result.plan, /2\/2/);
      assert.deepEqual(result.next, { queue: ['left'], left: false, right: true });
      assert.deepEqual(result.finalQueue, []);
      assert.equal(result.controls, 3);
    },
  );
  await check(
    '2048 highlights only effective directions and celebrates a goal even when its final spawn fills the board',
    async () => {
      const result = await page.evaluate(() => {
        setup('merge');
        $('arcadeGoal').value = '1024';
        startArcade('merge');
        clearTimers();
        state.board = [2, ...Array(15).fill(0)];
        renderMerge();
        const disabled = ['up', 'left', 'right', 'down'].map(
          (dir) => document.querySelector('.dir-' + dir).disabled,
        );
        state.board = [512, 512, 2, 4, 8, 16, 32, 64, 128, 256, 512, 2, 4, 8, 16, 32];
        state.spawnTape[state.spawnCursor] = { position: 999999999, value: 2 };
        mergeMove('left');
        const reached = {
          won: state.won,
          over: state.over,
          message: $('mergeOverlay').textContent,
          heading: $('mergeOverlay').querySelector('h3').textContent,
        };
        mergeUndo();
        return {
          disabled,
          reached,
          undone: [state.won, state.over, state.moves, state.board[0], state.board[1]],
        };
      });
      assert.deepEqual(result.disabled, [true, true, false, false]);
      assert.equal(result.reached.won, true);
      assert.equal(result.reached.over, true);
      assert.match(result.reached.heading, /1024/);
      assert.match(result.reached.message, /حققت هدف الجولة/);
      assert.deepEqual(result.undone, [false, false, 0, 512, 512]);
    },
  );
  await check(
    'Mines safe selection never reveals or reads hidden values, while Enter always performs its documented reveal',
    async () => {
      const result = await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        mineMode('inspect');
        mineTap(27);
        const before = $('mineSelectionInfo').textContent;
        state.board[27] = 8;
        mineSelectionUI();
        const after = $('mineSelectionInfo').textContent;
        return {
          generated: state.generated,
          revealed: state.revealed.size,
          before,
          after,
          selected: state.selected,
          active: document
            .querySelector('.mine-cell[data-index="27"]')
            .classList.contains('mine-scan-selected'),
        };
      });
      assert.deepEqual(
        [result.generated, result.revealed, result.selected, result.active],
        [false, 0, 27, true],
      );
      assert.equal(result.before, result.after);
      assert.match(result.before, /خانة مغلقة/);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.generated && state.revealed.has(27)), true);
      await page.evaluate(() => {
        const next = state.board.findIndex(
          (value, index) => value > 0 && !state.revealed.has(index),
        );
        mineMode(true);
        state.selected = next;
        mineSelectionUI();
      });
      const selected = await page.evaluate(() => state.selected);
      assert.ok(selected >= 0);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate((index) => state.revealed.has(index), selected), true);
      assert.equal(await page.evaluate(() => state.flags.size), 0);
    },
  );
  await check(
    'Mines selection details and highlight follow keyboard navigation without changing any cells',
    async () => {
      await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        mineMode('inspect');
        mineNavigate('right');
      });
      assert.equal(await page.evaluate(() => state.selected), 1);
      assert.match(await page.locator('#mineSelectionInfo').innerText(), /الصف 1، العمود 2/);
      assert.equal(await page.locator('.mine-scan-selected').count(), 1);
      assert.equal(await page.evaluate(() => state.revealed.size), 0);
    },
  );
  await check(
    'Maze zoom keeps its map inside the mobile viewport; panning never moves the explorer',
    async () => {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.evaluate(() => {
        setup('maze');
        $('arcadeSize').value = '15';
        startArcade('maze');
        clearTimers();
        mazeZoom(2);
      });
      const before = await page.evaluate(() => ({ position: state.position, moves: state.moves }));
      await page.locator('#mazeViewport').scrollIntoViewIfNeeded();
      const bounds = await page.locator('#mazeViewport').boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 70);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 - 70, bounds.y + 70, { steps: 5 });
      await page.mouse.up();
      const result = await page.evaluate(() => ({
        position: state.position,
        moves: state.moves,
        width: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        canvas: $('mazeCanvas').getBoundingClientRect().width,
        map: $('mazeViewport').clientWidth,
        touch: getComputedStyle($('mazeCanvas')).touchAction,
        blocked: document.querySelectorAll('.arcade-directions button:disabled').length,
      }));
      assert.deepEqual({ position: result.position, moves: result.moves }, before);
      assert.ok(result.width <= result.viewport + 1);
      assert.ok(result.canvas >= result.map * 1.9);
      assert.match(result.touch, /pan-x/);
      assert.ok(result.blocked > 0);
      await page.evaluate(() => {
        const viewport = $('mazeViewport');
        viewport.scrollLeft = viewport.scrollWidth;
        viewport.scrollTop = viewport.scrollHeight;
        mazeCenterView();
      });
      assert.ok(
        await page.evaluate(
          () => $('mazeViewport').scrollLeft < 5 && $('mazeViewport').scrollTop < 5,
        ),
      );
    },
  );
  await check('All arcade play controls fit both narrow and wide layouts', async () => {
    for (const width of [320, 390, 1100]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['snake', 'merge', 'mines', 'maze']) {
        await page.evaluate((id) => {
          setup(id);
          startArcade(id);
          clearTimers();
          if (id === 'mines') mineMode('inspect');
          if (id === 'maze') mazeZoom(2);
        }, id);
        const sizes = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        assert.ok(sizes[0] <= sizes[1] + 1, `${id} overflow at ${width}: ${sizes}`);
      }
    }
  });
  console.log(`Arcade v12: ${checks} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
