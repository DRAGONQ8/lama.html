import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Assemble the release sources without changing generated artifacts. An external
// standalone build can also be checked with LAMMA_TEST_HTML=/path/to/file.html.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) => {
    const match = build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    assert.ok(match, `Missing ${name} build manifest`);
    return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  };
  const scriptNames = manifest('scripts'),
    styleNames = manifest('styles');
  if (!styleNames.includes('advanced')) styleNames.push('advanced');
  const scripts = (await Promise.all(scriptNames.map((name) => read(`src/${name}.js`)))).join('\n');
  const styles = (
    await Promise.all(
      styleNames.map((name) =>
        read(`src/${name}.css`).catch((error) => {
          if (error.code === 'ENOENT' && name !== 'styles' && name !== 'advanced') return '';
          throw error;
        }),
      ),
    )
  ).join('\n');
  const html = (await read('src/template.html'))
    .replace('/* BUILD_SCRIPTS */', () => scripts)
    .replace('/* BUILD_STYLES */', () => styles);
  await writeFile('/tmp/lamma-advanced-v9.html', html);
  const fingerprint = createHash('sha256').update(html).digest('hex').slice(0, 16);
  const advancedFingerprint = createHash('sha256')
    .update(await read('src/advanced.js'))
    .digest('hex')
    .slice(0, 16);
  console.log(`Source HTML ${fingerprint}; advanced.js ${advancedFingerprint}`);
  return html;
}
const html = process.env.LAMMA_TEST_HTML
  ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
  : await assemble();
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
async function check(name, test, viewport = { width: 1280, height: 900 }) {
  if (process.env.ADVANCED_CHECK && !name.includes(process.env.ADVANCED_CHECK)) return;
  const context = await browser.newContext({ viewport }),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      store.sound = false;
      save();
      home();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exception`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function start(page, id, options = {}) {
  await page.evaluate(
    ({ id, options }) => {
      setup(id);
      for (const [key, value] of Object.entries(options)) {
        const control = $(key);
        if (!control) throw new Error(`Missing setup control: ${key}`);
        control.value = String(value);
      }
      startExtra(id);
    },
    { id, options },
  );
}
async function pressDigit(page, digit, alphabet = '٠١٢٣٤٥٦٧٨٩') {
  await page.evaluate((key) => {
    (document.activeElement || document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  }, alphabet[digit]);
}

try {
  await check(
    'Avoid-line tic-tac-toe inverts winners and strong search follows the actual objective',
    async (page) => {
      await start(page, 'ttt', { opponent: 'friend', second: 1, tttrule: 'misere', first: 0 });
      await page.evaluate(() => {
        for (const i of [0, 3, 1, 4, 2]) boardMove(i);
      });
      assert.deepEqual(await page.evaluate(() => [state.winner, state.series.wins]), [2, [0, 1]]);
      assert.match(await page.locator('.variant-rules').innerText(), /يخسر/);
      assert.equal(await page.evaluate(() => store.scores[state.names[0]].points), 0);
      const proof = await page.evaluate(() => {
        const cache = new Map(),
          cases = new Map();
        function value(b, p) {
          const key = b.join('') + p;
          if (cache.has(key)) return cache.get(key);
          const raw = tttWinner(b);
          if (raw) return raw.p === 0 ? 0 : 3 - raw.p === p ? 1 : -1;
          let best = -2;
          for (let i = 0; i < 9; i++)
            if (!b[i]) {
              b[i] = p;
              best = Math.max(best, -value(b, 3 - p));
              b[i] = 0;
            }
          cache.set(key, best);
          return best;
        }
        function visit(b, p) {
          const key = b.join('') + p;
          if (cases.has(key) || tttWinner(b)) return;
          cases.set(key, { board: [...b], p });
          for (let i = 0; i < 9; i++)
            if (!b[i]) {
              b[i] = p;
              visit(b, 3 - p);
              b[i] = 0;
            }
        }
        visit(Array(9).fill(0), 1);
        let checked = 0;
        for (const { board, p } of cases.values())
          if (board.filter(Boolean).length >= 5) {
            const before = board.join(''),
              best = value(board, p),
              pos = tttBest(board, p, true);
            if (board[pos]) throw Error('Occupied suggestion');
            if (board.join('') !== before) throw Error('Search mutated board');
            board[pos] = p;
            if (-value(board, 3 - p) !== best)
              throw Error('Search optimized classic instead of avoid-line');
            checked++;
          }
        return checked;
      });
      assert.ok(proof > 1000);
      await start(page, 'ttt', { opponent: 'bot', level: 'hard', tttrule: 'misere' });
      await page.evaluate(() => {
        clearTimers();
        state.board = [2, 2, 0, 1, 1, 0, 1, 0, 0];
        state.turn = 1;
        state.moves = 5;
        state.waiting = false;
        scheduleBot();
      });
      await page.waitForFunction(() => !state.waiting);
      assert.ok(await page.evaluate(() => tttWinner(state.board)?.p !== 2));
    },
  );
  await check(
    'Both boards preview gravity and immediate risks without moving, then apply exactly once',
    async (page) => {
      for (const id of ['ttt', 'connect']) {
        await start(page, id, { opponent: 'friend', second: 1 });
        const before = await page.evaluate(() => [...state.board]);
        await page.locator('[onclick="toggleBoardPreview()"]').click();
        await page.evaluate(() => previewBoardMove(3, state.run));
        assert.deepEqual(await page.evaluate(() => state.board), before);
        assert.deepEqual(await page.evaluate(() => [state.turn, state.moves]), [0, 0]);
        const place = id === 'ttt' ? 3 : 38;
        assert.equal(await page.evaluate((place) => state.preview.board[place], place), 1);
        await page.evaluate(() => {
          applyBoardPreview(state.run);
          applyBoardPreview(state.run);
        });
        assert.equal(await page.evaluate(() => state.moves), 1);
        assert.equal(await page.evaluate((place) => state.board[place], place), 1);
        await page.evaluate(() => {
          pauseClock();
          toggleBoardPreview();
        });
        assert.equal(await page.evaluate(() => state.previewMode), false);
      }
    },
  );
  await check(
    'Code positional notes filter candidates independently of the hidden secret and can recover contradictions',
    async (page) => {
      await start(page, 'code', { codelength: 3, repeatdigits: 'no' });
      const data = await page.evaluate(() => {
        const base = codeCandidates(3, false, [], {}, 20),
          notes = [[0, 1, 2, 3, 4, 5, 6, 7, 8], [9], []];
        const filtered = codeCandidates(3, false, [], {}, 20, notes);
        state.slotExclusions = notes;
        state.secret = [7, 6, 5];
        suggestCode();
        const first = [...state.draft];
        state.secret = [0, 1, 2];
        suggestCode();
        return {
          base: base.count,
          count: filtered.count,
          valid: filtered.samples.every((a) => a[0] === 9 && a[1] !== 9),
          first,
          second: [...state.draft],
          resources: [state.hints, state.attempts.length],
        };
      });
      assert.equal(data.base, 720);
      assert.equal(data.count, 72);
      assert.equal(data.valid, true);
      assert.deepEqual(data.first, data.second);
      assert.deepEqual(data.resources, [0, 0]);
      await page.evaluate(() => {
        state.slotExclusions = [Array.from({ length: 10 }, (_, i) => i), [], []];
        analyzeCode();
      });
      assert.equal(await page.evaluate(() => state.analysis), 0);
      await page.evaluate(() => {
        clearCodeExclusions(state.run);
        analyzeCode();
      });
      assert.equal(await page.evaluate(() => state.analysis), 720);
    },
  );
  await check(
    'Audio-only Simon hides its visual cue, pauses during recall, and accepts input only after the recall window',
    async (page) => {
      await start(page, 'simon', { simoncue: 'audio' });
      await page.evaluate(() => {
        playSimon();
      });
      assert.equal(await page.evaluate(() => state.phase), 'idle');
      await page.evaluate(() => {
        store.sound = true;
        padTone = () => {};
        state.sequence = [2];
        state.speed = 40;
        playSimon();
      });
      await page.waitForFunction(
        () =>
          state.phase === 'show' &&
          document.getElementById('seqstatus').textContent.includes('استمع للنغمة'),
      );
      assert.equal(await page.locator('.sequencepad .lit').count(), 0);
      assert.ok(!(await page.locator('#seqstatus').innerText()).includes('أزرق'));
      await page.waitForFunction(() => state.phase === 'recall');
      await page.evaluate(() => simonTap(2));
      assert.equal(await page.evaluate(() => state.input), 0);
      await page.evaluate(() => pauseClock());
      assert.equal(await page.evaluate(() => state.phase), 'idle');
      await page.evaluate(() => {
        resumeClock();
        playSimon();
      });
      await page.waitForFunction(() => state.phase === 'input');
      await page.locator('#pad2').click();
      assert.equal(await page.evaluate(() => state.completed), 1);
    },
  );
  await check(
    'Slide pins only solved leading rows and its shortest hint preserves those pins',
    async (page) => {
      await start(page, 'slide', { size: 3 });
      await page.evaluate(() => {
        state.board = [1, 2, 3, 4, 0, 6, 7, 5, 8];
        state.empty = 4;
        state.path = [8, 7];
        state.history = [];
        state.moves = 0;
        renderSlide();
        pinSlideRows(state.run);
      });
      assert.equal(await page.evaluate(() => state.lockedRows), 1);
      assert.equal(await page.locator('.puzzle .pinned').count(), 3);
      await page.evaluate(() => slideMove(1));
      assert.equal(await page.evaluate(() => state.moves), 0);
      const route = await page.evaluate(() => solveSlide(state.board, 3, 35000, state.lockedRows));
      assert.deepEqual(route, [7, 8]);
      await page.evaluate(() => slideHint());
      assert.deepEqual(await page.evaluate(() => state.board.slice(0, 3)), [1, 2, 3]);
      assert.equal(await page.evaluate(() => state.empty), 7);
      await page.evaluate(() => {
        undoSlide();
        restartSlide();
      });
      assert.equal(await page.evaluate(() => state.lockedRows), 0);
    },
  );
  await check(
    'Sudoku cell evidence names actual conflicting peers and never consults the stored solution',
    async (page) => {
      await start(page, 'sudoku');
      const notes = await page.evaluate(() => {
        state.board = Array(81).fill(0);
        state.board[0] = 5;
        state.board[3] = 5;
        state.board[9] = 5;
        state.selected = 0;
        state.given = Array(81).fill(false);
        renderSudoku();
        inspectSudokuCell(state.run);
        const first = state.cellEvidence;
        state.solution = Array(81).fill(9);
        inspectSudokuCell(state.run);
        return { first, second: state.cellEvidence, hints: state.hints, checks: state.checks };
      });
      assert.match(notes.first, /صف 1، عمود 4/);
      assert.match(notes.first, /صف 2، عمود 1/);
      assert.equal(notes.first, notes.second);
      assert.deepEqual([notes.hints, notes.checks], [0, 0]);
      await page.evaluate(() => {
        selectSudoku(1);
        inspectSudokuCell(state.run);
      });
      assert.match(await page.evaluate(() => state.cellEvidence), /المسموح/);
    },
  );
  await check(
    'Missing-operand math, shape attention rules and visible-only pattern workpad use their stated answers and costs',
    async (page) => {
      await start(page, 'math', { mathmode: 'missing' });
      const q = await page.evaluate(() => state.questions[0]);
      assert.equal(q.missingOperand, true);
      assert.match(q.text, /□/);
      await page.locator('#mathanswer').fill(String(q.answer));
      await page.locator('#mathanswer').press('Enter');
      assert.equal(await page.evaluate(() => state.correct), 1);
      await start(page, 'color', { colorrule: 'shape', colormode: 'mixed' });
      const color = await page.evaluate(() => state.questions[0]);
      assert.equal(color.rule, 'shape');
      assert.equal(color.answer, color.shape);
      assert.equal(await page.locator('.shape-legend span').count(), color.choices.length);
      await page.evaluate(() =>
        answerQuiz(state.questions[0].choices.indexOf(state.questions[0].answer)),
      );
      assert.equal(await page.evaluate(() => state.correct), 1);
      await start(page, 'pattern', { patternmode: 'missing' });
      const differences = await page.evaluate(() => {
        state.questions[0].seq = [2, 4, null, 8, 10, 12];
        openPatternWorkpad(state.run, state.index);
        openPatternWorkpad(state.run, state.index);
        return { rows: patternDifferences(state.questions[0].seq), cost: state.reasoningPenalty };
      });
      assert.deepEqual(differences.rows[0], [2, null, null, 2, 2]);
      assert.equal(differences.cost, 3);
      assert.match(await page.locator('.difference-rows').innerText(), /؟/);
    },
  );
  await check(
    'Word prefix aid locks its disclosed letters, resets drafting and charges only the stated resources',
    async (page) => {
      await start(page, 'word');
      await page.evaluate(() => {
        state.item = { name: 'كتاب', cat: 'objects', hints: ['شيء تقرأه'] };
        state.scrambled = ['ب', 'ك', 'ا', 'ت'];
        state.wordDraft = 'بت';
        state.usedLetters = usedWordLetters(state.wordDraft, state.scrambled);
        renderWord();
        revealWordPrefix(state.run);
      });
      assert.deepEqual(
        await page.evaluate(() => [state.wordDraft, state.wordPrefix, state.prefixHints]),
        ['ك', 'ك', 1],
      );
      await page.evaluate(() => {
        selectWordSlot(0);
        removeWordSlot();
        eraseWordLetter();
      });
      assert.equal(await page.evaluate(() => state.wordDraft), 'ك');
      await page.locator('#wordanswer').fill('باب');
      assert.equal(await page.evaluate(() => state.wordDraft), 'ك');
      await page.locator('#wordanswer').fill('كتاب');
      await page.evaluate(() => guessWord());
      assert.deepEqual(
        await page.evaluate(() => [state.correct, state.points, state.tries]),
        [1, 11, 1],
      );
      const left = await page.evaluate(() => secondsLeft());
      await page.waitForTimeout(1050);
      assert.equal(await page.evaluate(() => secondsLeft()), left);
    },
  );
  await check(
    'Spy private evidence disappears on pause and vote confidence preserves one-person-one-vote',
    async (page) => {
      await start(page, 'spy');
      await page.evaluate(() => {
        for (let i = 0; i < state.players.length; i++) {
          spyReveal();
          spyHide();
        }
        spyDiscuss();
        startSpyVote();
        spyVoteReveal();
      });
      await page.locator('#spyreason').fill('دليل خاص لا يراه الباقون');
      await page.locator('#spyconfidence').selectOption('sure');
      await page.evaluate(() => pauseClock());
      assert.equal(await page.locator('#spyreason').count(), 0);
      assert.ok(!(await page.locator('#app').innerText()).includes('دليل خاص'));
      await page.evaluate(() => {
        resumeClock();
        spyVoteReveal();
      });
      assert.equal(await page.locator('#spyreason').inputValue(), 'دليل خاص لا يراه الباقون');
      await page.evaluate(() => {
        const run = state.run;
        castSpyVote(1, 0, run);
        castSpyVote(1, 0, run);
        for (let i = 1; i < state.players.length; i++) {
          spyVoteReveal();
          castSpyVote((i + 1) % state.players.length, i, run);
        }
      });
      assert.equal(await page.evaluate(() => state.votes.length), 3);
      assert.equal(await page.evaluate(() => state.counts.reduce((a, b) => a + b, 0)), 3);
      await page.locator('.spy-ballot-review summary').click();
      assert.match(await page.locator('.spy-ballot-review').innerText(), /دليل خاص/);
    },
  );
  await check(
    'Taboo skip quotas guard the card and undo restores both allowance and scoring',
    async (page) => {
      await start(page, 'taboo', { tabooskips: 3 });
      await page.evaluate(() => {
        tabooReady();
        for (let i = 0; i < 3; i++) tabooAnswer('skip');
      });
      const card = await page.evaluate(() => state.card[0]);
      await page.evaluate(() => tabooAnswer('skip'));
      assert.deepEqual(await page.evaluate(() => [state.skips, state.card[0]]), [3, card]);
      await page.evaluate(() => undoTaboo());
      assert.equal(await page.evaluate(() => state.skips), 2);
      await page.evaluate(() => tabooAnswer('skip'));
      assert.equal(await page.evaluate(() => state.skips), 3);
      await page.evaluate(() => {
        pauseClock();
        tabooAnswer('correct');
      });
      assert.equal(await page.evaluate(() => state.cardHidden), true);
      assert.equal(await page.locator('.forbidden span').count(), 0);
    },
  );
  await check(
    'New options cannot alter fixed challenge content or activate aids under stale runs',
    async (page) => {
      for (const id of ['ttt', 'simon', 'math', 'color']) {
        const snapshots = [];
        for (const custom of [false, true])
          snapshots.push(
            await page.evaluate(
              ({ id, custom }) => {
                setup(id);
                if (custom) {
                  const fields = {
                    ttt: [['tttrule', 'misere']],
                    simon: [['simoncue', 'audio']],
                    math: [['mathmode', 'missing']],
                    color: [['colorrule', 'shape']],
                  }[id];
                  for (const [key, value] of fields) $(key).value = value;
                }
                dailyRun = { id, date: '2026-10-13' };
                startExtra(id);
                return JSON.stringify({
                  rule: state.rule,
                  cue: state.cue,
                  math: state.mathMode,
                  color: state.colorRule,
                  questions: state.questions,
                  sequence: state.sequenceBank,
                });
              },
              { id, custom },
            ),
          );
        assert.equal(snapshots[0], snapshots[1], id);
      }
      await start(page, 'code');
      const old = await page.evaluate(() => state.run);
      await start(page, 'code');
      await page.evaluate((old) => {
        excludeCodePosition(0, old);
        selectCodeSlot(1, old);
      }, old);
      assert.deepEqual(
        await page.evaluate(() => [state.codeSlot, state.slotExclusions.flat().length]),
        [0, 0],
      );
    },
  );
  await check(
    'All v9 game mechanics fit narrow screens',
    async (page) => {
      for (const id of [
        'ttt',
        'connect',
        'code',
        'simon',
        'slide',
        'sudoku',
        'word',
        'math',
        'color',
        'pattern',
        'spy',
        'taboo',
      ]) {
        const options =
          id === 'ttt'
            ? { tttrule: 'misere', opponent: 'friend', second: 1 }
            : id === 'math'
              ? { mathmode: 'missing' }
              : id === 'color'
                ? { colorrule: 'shape' }
                : id === 'simon'
                  ? { simoncue: 'audio' }
                  : {};
        await start(page, id, options);
        await page.evaluate((id) => {
          if (id === 'code') {
            document.querySelector('.code-position').open = true;
          }
          if (id === 'word') revealWordPrefix(state.run);
          if (id === 'sudoku') inspectSudokuCell(state.run);
          if (id === 'pattern') openPatternWorkpad(state.run, state.index);
          if (id === 'taboo') tabooReady();
          if (id === 'spy') {
            for (let i = 0; i < state.players.length; i++) {
              spyReveal();
              spyHide();
            }
            spyDiscuss();
            startSpyVote();
            spyVoteReveal();
          }
        }, id);
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 844 });
          const d = await page.evaluate(() => [
            document.documentElement.scrollWidth,
            document.documentElement.clientWidth,
          ]);
          assert.ok(d[0] <= d[1] + 1, `${id} overflow ${d}`);
        }
      }
    },
    { width: 390, height: 844 },
  );
  await check(
    'Checkpoint roundtrip preserves positional code exclusions and valid pinned slide rows after reload',
    async (page) => {
      await start(page, 'code', { codelength: 4, repeatdigits: 'no' });
      const code = await page.evaluate(() => {
        state.slotExclusions = [[0, 1], [2], [], [3, 4]];
        state.codeSlot = 2;
        state.digitNotes[8] = 1;
        captureSoloSession();
        const snapshot = JSON.parse(JSON.stringify(store.extra.savedSession));
        const invalid = JSON.parse(JSON.stringify(snapshot));
        invalid.data.slotExclusions[0] = [1, 1];
        invalid.data.codeSlot = 99;
        const sanitized = normalizeSavedSession(invalid);
        return {
          secret: [...state.secret],
          exclusions: state.slotExclusions,
          slot: state.codeSlot,
          invalidExclusions: sanitized.data.slotExclusions,
          invalidSlot: sanitized.data.codeSlot,
        };
      });
      assert.deepEqual(code.invalidExclusions, [[], [], [], []]);
      assert.equal(code.invalidSlot, 0);
      await page.reload();
      await page.evaluate(() => resumeSavedGame());
      assert.deepEqual(
        await page.evaluate(() => ({
          secret: state.secret,
          exclusions: state.slotExclusions,
          slot: state.codeSlot,
          note: state.digitNotes[8],
        })),
        { secret: code.secret, exclusions: code.exclusions, slot: code.slot, note: 1 },
      );
      await page.evaluate(() => analyzeCode());
      assert.ok(await page.evaluate(() => state.analysis > 0));
      await start(page, 'slide', { size: 3 });
      const slide = await page.evaluate(() => {
        state.board = [1, 2, 3, 4, 0, 6, 7, 5, 8];
        state.empty = 4;
        state.path = [8, 7];
        state.moves = 0;
        state.lineMode = true;
        state.history = [];
        state.initial = { board: [...state.board], empty: state.empty, path: [...state.path] };
        renderSlide();
        pinSlideRows(state.run);
        captureSoloSession();
        const snapshot = JSON.parse(JSON.stringify(store.extra.savedSession));
        const excessive = JSON.parse(JSON.stringify(snapshot));
        excessive.data.lockedRows = 2;
        const unsolved = JSON.parse(JSON.stringify(snapshot));
        unsolved.data.board = [1, 0, 3, 4, 2, 6, 7, 5, 8];
        unsolved.data.empty = 1;
        unsolved.data.path = [8, 7, 4];
        return {
          board: state.board,
          lockedRows: snapshot.data.lockedRows,
          excessive: normalizeSavedSession(excessive).data.lockedRows,
          unfinishedPin: normalizeSavedSession(unsolved).data.lockedRows,
        };
      });
      assert.equal(slide.lockedRows, 1);
      assert.equal(slide.excessive, 0);
      assert.equal(slide.unfinishedPin, 0);
      await page.reload();
      await page.evaluate(() => resumeSavedGame());
      assert.deepEqual(
        await page.evaluate(() => [state.board, state.empty, state.lockedRows, state.lineMode]),
        [slide.board, 4, 1, true],
      );
      await page.evaluate(() => slideMove(1));
      assert.equal(
        await page.evaluate(() => state.moves),
        0,
        'restored pinned row must reject movement',
      );
      await page.evaluate(() => slideHint());
      assert.deepEqual(
        await page.evaluate(() => [state.board.slice(0, 3), state.empty, state.lockedRows]),
        [[1, 2, 3], 7, 1],
      );
    },
  );
  console.log(`Advanced v9: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
