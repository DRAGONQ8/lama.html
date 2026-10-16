import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const build = await read('scripts/build.mjs');
const names = (key) =>
  [...build.match(new RegExp(`const ${key} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
const scripts = (await Promise.all(names('scripts').map((name) => read(`src/${name}.js`)))).join(
  '\n',
);
const styles = (await Promise.all(names('styles').map((name) => read(`src/${name}.css`)))).join(
  '\n',
);
const html = (await read('src/template.html'))
  .replace('/* BUILD_SCRIPTS */', () => scripts)
  .replace('/* BUILD_STYLES */', () => styles);
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, test) {
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
    await test(page);
    assert.deepEqual(errors, [], name + ': browser exception');
    console.log('✓ ' + name);
    passed++;
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Word candidates are searchable, paginated, composition safe and reject stale controls',
    async (page) => {
      const count = await page.evaluate(() => {
        setup('wordguess');
        startWordsGame('wordguess');
        state.attempts = [{ word: 'ضضضضض', marks: Array(5).fill('absent') }];
        showWordguessCandidates(state.run);
        return wordguessCandidates(state).length;
      });
      assert.ok(count > 24);
      const first = await page.locator('.wordguess-candidates .chip').first().textContent();
      await page.locator('.wordguess-candidate-pages button').last().click();
      assert.notEqual(
        await page.locator('.wordguess-candidates .chip').first().textContent(),
        first,
      );
      const query = first.slice(0, 2);
      await page.locator('#wordguessCandidateSearch').fill(query);
      assert.equal(
        await page
          .locator('#wordguessCandidateSearch')
          .evaluate((el) => document.activeElement === el),
        true,
      );
      const filtered = await page.locator('.wordguess-candidates .chip').allTextContents();
      assert.ok(filtered.length > 0 && filtered.every((word) => word.includes(query)));
      const result = await page.evaluate(() => {
        const old = document.querySelector('.wordguess-candidates button.chip');
        const beforeComposition = state.candidateQuery;
        $('wordguessCandidateSearch').value = 'م';
        $('wordguessCandidateSearch').dispatchEvent(
          new InputEvent('input', { bubbles: true, isComposing: true }),
        );
        const compositionSafe = state.candidateQuery === beforeComposition;
        state.attempts.push({ ...state.attempts[0] });
        state.entry = '';
        old.onclick();
        const staleSafe = state.entry === '';
        const oldPenalty = state.helperPenalty;
        searchWordguessCandidates('', state.run, state.attempts.length);
        return {
          compositionSafe,
          staleSafe,
          penalty: state.helperPenalty === oldPenalty,
          page: state.candidatePage,
        };
      });
      assert.deepEqual(result, { compositionSafe: true, staleSafe: true, penalty: true, page: 0 });
    },
  );
  await check(
    'Letter keyboards retain focus after re-render and advance past used letters',
    async (page) => {
      await page.evaluate(() => {
        setup('hangman');
        startWordsGame('hangman');
      });
      await page.locator('[data-word-key="ض"]').click();
      assert.equal(
        await page.evaluate(() => document.activeElement.matches('.letter-key:not(:disabled)')),
        true,
      );
      assert.notEqual(await page.evaluate(() => document.activeElement.dataset.wordKey), 'ض');
      await page.evaluate(() => {
        setup('wordguess');
        startWordsGame('wordguess');
      });
      await page.locator('[data-word-key="ق"]').click();
      assert.equal(await page.evaluate(() => document.activeElement.dataset.wordKey), 'ق');
      assert.equal(await page.evaluate(() => state.entry), 'ق');
    },
  );
  await check('Hangman phrase possibilities obey visible word boundaries', async (page) => {
    const result = await page.evaluate(() => {
      const entries = hangmanMissionBank.filter((a) =>
        hangmanMissionBank.some(
          (b) =>
            a.cat === b.cat &&
            a.key.length === b.key.length &&
            a.display
              .split(' ')
              .map((w) => wordsNormalizeKey(w).length)
              .join() !==
              b.display
                .split(' ')
                .map((w) => wordsNormalizeKey(w).length)
                .join(),
        ),
      );
      if (!entries.length) return false;
      return entries.every((item) => {
        const candidates = hangmanCandidates({
          mode: 'mission',
          item,
          guessed: [],
          wordGuesses: [],
        });
        return (
          candidates.length > 0 &&
          candidates.every(
            (candidate) =>
              candidate.display
                .split(' ')
                .map((word) => wordsNormalizeKey(word).length)
                .join() ===
              item.display
                .split(' ')
                .map((word) => wordsNormalizeKey(word).length)
                .join(),
          )
        );
      });
    });
    assert.equal(result, true);
  });
  await check('Trivia assistance keeps keyboard focus on a legal answer', async (page) => {
    await page.evaluate(() => {
      setup('trivia');
      $('triviaTimer').value = '0';
      startWordsGame('trivia');
    });
    await page.locator('.trivia-aid').click();
    assert.equal(
      await page.evaluate(() =>
        document.activeElement.matches('.trivia-choice:not(:disabled):not([hidden])'),
      ),
      true,
    );
  });
  await check(
    'Target grids keep a single tab stop and preserve arrow navigation through updates',
    async (page) => {
      await page.evaluate(() => {
        setup('target');
        $('targetLevel').value = 'hard';
        startWordsGame('target');
      });
      assert.equal(await page.locator('.target-cell[tabindex="0"]').count(), 1);
      await page.locator('.target-cell[data-index="5"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.index)), 6);
      await page.evaluate(() => renderTarget());
      assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.index)), 6);
      assert.equal(await page.locator('.target-cell[tabindex="0"]').count(), 1);
      assert.equal(await page.evaluate(() => state.focusCell), 6);
    },
  );
  await check(
    'Mirror lens reports both columns affected without reading the answer',
    async (page) => {
      const result = await page.evaluate(() => {
        setup('nonogram');
        $('labLevel').value = 'easy';
        $('labRule').value = 'mirror';
        startLab('nonogram');
        state.selected = state.board.findIndex(
          (v, i) => !state.fixed[i] && i % state.size !== (state.size - 1) / 2,
        );
        state.lensOpen = true;
        const answer = state.answer;
        Object.defineProperty(state, 'answer', {
          configurable: true,
          get() {
            throw new Error('lens read answer');
          },
        });
        const before = state.board.join(''),
          data = labMoveLensData();
        renderLab();
        Object.defineProperty(state, 'answer', {
          configurable: true,
          writable: true,
          value: answer,
        });
        return {
          paired: data.mirror.column === state.size - 1 - (state.selected % state.size),
          honest: before === state.board.join('') && state.hints === 0,
          visible: document.querySelector('.lab-mirror-impact').textContent.includes('الخانتين'),
        };
      });
      assert.deepEqual(result, { paired: true, honest: true, visible: true });
    },
  );
  for (const id of ['nonogram', 'lights', 'pipes']) {
    await check(
      `${id} completion includes final board and accurate score breakdown exactly once`,
      async (page) => {
        const result = await page.evaluate((id) => {
          setup(id);
          $('labLevel').value = 'easy';
          startLab(id);
          const before = store.scores[state.name]?.rounds || 0;
          state.moves = 0;
          state.hints = 2;
          state.started = Date.now() - 91000;
          if (id === 'nonogram') state.board = state.answer.map((v) => (v ? 1 : 2));
          else if (id === 'lights') state.board.fill(0);
          else state.board = [...state.answer];
          labCheckWin();
          labCheckWin();
          const board = document.querySelector('.lab-result-board');
          return {
            points: state.points,
            rounds: (store.scores[state.name]?.rounds || 0) - before,
            reviews: document.querySelectorAll('.lab-result-review').length,
            cells: board.children.length,
            size: state.size ** 2,
            text: document.querySelector('.lab-score-breakdown').textContent,
          };
        }, id);
        assert.equal(result.points, 67);
        assert.equal(result.rounds, 1);
        assert.equal(result.reviews, 1);
        assert.equal(result.cells, result.size);
        assert.ok(
          result.text.includes('−16') && result.text.includes('−2') && result.text.includes('67'),
        );
        await page.locator('.lab-result-review summary').click();
        assert.equal(await page.locator('.lab-result-board').isVisible(), true);
      },
    );
  }
  console.log(`${passed} lab and word improvements passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
