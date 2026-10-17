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
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
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
    'Repeated keyboard activation of Mines modes keeps focus and never reveals a cell',
    async () => {
      await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        document.querySelector('[onclick="mineMode(true)"]').focus();
      });
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      const result = await page.evaluate(() => ({
        focused: document.activeElement.getAttribute('onclick'),
        flagMode: state.flagMode,
        generated: state.generated,
        revealed: state.revealed.size,
      }));
      assert.deepEqual(result, {
        focused: 'mineMode(true)',
        flagMode: true,
        generated: false,
        revealed: 0,
      });
    },
  );
  await check(
    'A disappearing Mines helper moves focus to safe inspection rather than BODY',
    async () => {
      await page.evaluate(() => {
        setup('mines');
        startArcade('mines');
        clearTimers();
        state.generated = state.clockRunning = true;
        state.mineCount = 1;
        state.mines = new Set([0]);
        state.board = state.board.map((_, i) =>
          i === 0 ? -1 : mineNeighbours(i).filter((j) => j === 0).length,
        );
        state.revealed = new Set([9]);
        state.deduction = { index: 1, kind: 'safe', clues: [9] };
        renderMines();
        document.querySelector('[onclick="mineApplyHint()"]').focus();
      });
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        "mineMode('inspect')",
      );
      const revealed = await page.evaluate(() => state.revealed.size);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.revealed.size), revealed);
      assert.equal(await page.evaluate(() => state.inspectMode), true);
    },
  );
  await check(
    'Public mine totals prove safe cells without reading any hidden square or trusting flags',
    async () => {
      const proof = await page.evaluate(() => {
        const revealed = new Set([0]);
        const board = new Proxy([1, -1, 1, 1, 1, 1, 0, 0, 0], {
          get(target, key) {
            if (/^\d+$/.test(String(key)) && !revealed.has(Number(key)))
              throw new Error('Read a hidden value');
            return target[key];
          },
        });
        const mines = new Proxy(
          {},
          {
            get() {
              throw new Error('Read hidden mines');
            },
          },
        );
        return mineDeduction({
          size: 3,
          board,
          revealed,
          flags: new Set([2, 3]),
          mineCount: 1,
          mines,
        });
      });
      assert.equal(proof.kind, 'safe');
      assert.ok([2, 5, 6, 7, 8].includes(proof.index));
      assert.equal(proof.total, true);
      assert.deepEqual(proof.clues, [0]);
      assert.match(proof.explanation, /إجمالي الحقل المعلن/);
    },
  );
  await check(
    'Chained subset constraints find a proof that no single clue comparison can provide',
    async () => {
      const proof = await page.evaluate(() =>
        mineDeduction({
          size: 4,
          board: [1, 2, 3, 2, 2, -1, -1, -1, -1, 5, 4, 3, -1, 3, -1, 1],
          revealed: new Set([0, 2, 4, 10, 13]),
          flags: new Set(),
        }),
      );
      assert.equal(proof.index, 12);
      assert.equal(proof.kind, 'mine');
      assert.deepEqual(
        proof.clues.sort((a, b) => a - b),
        [0, 4, 13],
      );
      assert.equal(proof.total, false);
    },
  );
  await check(
    'The strengthened coach remains sound on 120 seeded fields and completes promptly',
    async () => {
      const result = await page.evaluate(() => {
        let seed = 130813;
        const random = (n) => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed % n;
        };
        const shuffle = (values) => {
          for (let i = values.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [values[i], values[j]] = [values[j], values[i]];
          }
          return values;
        };
        const failures = [];
        let proofs = 0;
        const start = performance.now();
        for (const size of [8, 12, 16])
          for (let round = 0; round < 40; round++) {
            const indices = Array.from({ length: size * size }, (_, i) => i),
              mineCount = { 8: 10, 12: 24, 16: 48 }[size],
              mines = new Set(shuffle([...indices]).slice(0, mineCount)),
              board = indices.map((i) =>
                mines.has(i) ? -1 : mineNeighbours(i, size).filter((j) => mines.has(j)).length,
              ),
              safe = shuffle(indices.filter((i) => !mines.has(i))),
              revealed = new Set(safe.slice(0, Math.floor(safe.length * (0.1 + random(50) / 100)))),
              flags = new Set(shuffle([...indices]).slice(0, 8)),
              proof = mineDeduction({ size, board, revealed, flags, mineCount });
            if (proof) {
              proofs++;
              if ((proof.kind === 'mine') !== mines.has(proof.index))
                failures.push({ size, round, proof });
            }
          }
        return { failures, proofs, elapsed: performance.now() - start };
      });
      assert.deepEqual(result.failures, []);
      assert.ok(result.proofs >= 80);
      assert.ok(result.elapsed < 10000, `Coach took ${result.elapsed}ms`);
    },
  );
  await check(
    'Maze live directions describe only the local passages, locked gates and current marker',
    async () => {
      const result = await page.evaluate(() => {
        setup('maze');
        $('arcadeMode').value = 'keys';
        $('arcadeVision').value = 'lantern';
        startArcade('maze');
        clearTimers();
        const start = state.position;
        mazeMark();
        const initial = $('mazeNavigation').textContent;
        const neighbour = mazeNeighbours(start)[0];
        state.gates.set(neighbour, { number: 9 });
        mazeNavigationUI();
        return {
          initial,
          label: $('mazeCanvas').getAttribute('aria-label'),
          gated: $('mazeNavigation').textContent,
          sameDescription:
            $('mazeCanvas').getAttribute('aria-description') === $('mazeNavigation').textContent,
          live: $('mazeNavigation').getAttribute('aria-live'),
          seen: state.seen.size,
          total: state.grid.length,
        };
      });
      assert.match(result.initial, /الصف 2، العمود 2/);
      assert.match(result.initial, /الممرات المفتوحة/);
      assert.match(result.initial, /العلامة 1/);
      assert.match(result.label, /المفتاحين/);
      assert.match(result.gated, /بوابة 9/);
      assert.equal(result.sameDescription, true);
      assert.equal(result.live, 'polite');
      assert.ok(result.seen < result.total);
      assert.doesNotMatch(result.initial, /موقع المفتاح|موقع المخرج/);
    },
  );
  await check(
    'Maze replay restores marker placement and removal at their historical steps',
    async () => {
      const result = await page.evaluate(() => {
        setup('maze');
        $('arcadeMode').value = 'exit';
        startArcade('maze');
        clearTimers();
        const first = state.position;
        mazeMark();
        const next = mazeNeighbours(first)[0],
          direction =
            next === first + 1
              ? 'right'
              : next === first - 1
                ? 'left'
                : next > first
                  ? 'down'
                  : 'up';
        mazeMove(direction, false, true);
        mazeMark();
        const second = state.position;
        const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[direction];
        mazeMove(back, false, true);
        mazeMark();
        const atStart = [...mazeMarkersAt(0)],
          atMiddle = [...mazeMarkersAt(1)],
          atEnd = [...mazeMarkersAt(2)],
          live = [...state.markers];
        // Exercise the real renderer: labels drawn in replay must match its step.
        const drawn = [],
          context = $('mazeCanvas').getContext('2d'),
          fillText = context.fillText;
        context.fillText = function (value, ...args) {
          drawn.push(String(value));
          return fillText.call(this, value, ...args);
        };
        mazeDraw('mazeCanvas', 0);
        context.fillText = fillText;
        return {
          first,
          second,
          atStart,
          atMiddle,
          atEnd,
          live,
          drawn,
          events: state.markerEvents.length,
        };
      });
      assert.deepEqual(result.atStart, [[result.first, 1]]);
      assert.deepEqual(result.atMiddle, [
        [result.first, 1],
        [result.second, 2],
      ]);
      assert.deepEqual(result.atEnd, [[result.second, 2]]);
      assert.deepEqual(result.live, result.atEnd);
      assert.equal(result.events, 3);
      assert.ok(result.drawn.includes('1'));
      assert.ok(!result.drawn.includes('2'));
    },
  );
  console.log(`Arcade v13: ${checks} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
