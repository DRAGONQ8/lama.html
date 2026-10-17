import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
async function assemble() {
  const build = await read('scripts/build.mjs');
  const manifest = (name) =>
    [
      ...build.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].matchAll(/'([^']+)'/g),
    ].map((entry) => entry[1]);
  const [scripts, styles, template] = await Promise.all([
    Promise.all(manifest('scripts').map((name) => read(`src/${name}.js`))),
    Promise.all(manifest('styles').map((name) => read(`src/${name}.css`))),
    read('src/template.html'),
  ]);
  return template
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n'));
}
const html = process.env.LAMMA_TEST_HTML
  ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
  : await assemble();
const server = createServer((_, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;
async function check(name, test) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.extra.motion = false;
      store.sound = false;
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function startSpyDiscussion(page, showCandidates = true) {
  await page.evaluate((showCandidates) => {
    setup('spy');
    $('spystart').value = 'manual';
    $('spycandidates').value = showCandidates ? 'show' : 'hide';
    startExtra('spy');
    for (let i = 0; i < state.players.length; i++) {
      spyReveal();
      spyHide();
    }
    spyDiscuss();
  }, showCandidates);
}
try {
  await check(
    'Simon respects muted and proportional volume without raising user settings',
    async (page) => {
      const result = await page.evaluate(() => {
        const gains = [];
        audioCtx = {
          currentTime: 0,
          destination: {},
          resume() {},
          createOscillator() {
            return { connect() {}, frequency: {}, start() {}, stop() {} };
          },
          createGain() {
            return {
              connect() {},
              gain: {
                setValueAtTime(value) {
                  gains.push(value);
                },
                exponentialRampToValueAtTime() {},
              },
            };
          },
        };
        store.sound = true;
        store.extra.volume = 0;
        padTone(0);
        const silent = gains.length === 0;
        setup('simon');
        $('simoncue').value = 'audio';
        startExtra('simon');
        playSimon();
        const blocked = state.phase === 'idle';
        enableSimonSound(state.run);
        const preserved = store.extra.volume === 0 && gains.length === 0;
        store.extra.volume = 25;
        padTone(0);
        store.extra.volume = 100;
        padTone(0);
        store.sound = false;
        padTone(0);
        return { silent, blocked, preserved, gains };
      });
      assert.deepEqual(result, {
        silent: true,
        blocked: true,
        preserved: true,
        gains: [0.015, 0.06],
      });
    },
  );
  await check(
    'Paid Who questions use public evidence and reject already-deduced answers',
    async (page) => {
      const result = await page.evaluate(() => {
        setup('who');
        startWho();
        const object = questions.findIndex(([tag]) => tag === 'object');
        const animal = questions.findIndex(([tag]) => tag === 'animal');
        state.item = items[state.pool.find((i) => items[i].tags.has('object'))];
        state.inquiries = [{ q: object, yes: true }];
        renderWho();
        const pool = whoEvidenceCandidates();
        const options = whoInquiryOptions();
        const informative = options.every((q) => {
          const yes = pool.filter((i) => items[i].tags.has(questions[q][0])).length;
          return yes > 0 && yes < pool.length;
        });
        const answer = state.item;
        state.item = items[state.pool.find((i) => !items[i].tags.has('object'))];
        const independent = JSON.stringify(options) === JSON.stringify(whoInquiryOptions());
        state.item = answer;
        const select = $('whoQuestion');
        select.add(new Option('سؤال محسوم', String(animal)));
        select.value = String(animal);
        const points = whoPoints();
        askWhoInquiry(1);
        const rejected = state.inquiries.length === 1 && whoPoints() === points;
        const indices = pool.slice(0, 2);
        state.pool = indices;
        state.wrong = [items[indices[0]].name];
        const afterWrongGuess = whoEvidenceCandidates();
        return {
          informative,
          independent,
          rejected,
          excluded: !options.includes(animal),
          afterWrongGuess,
          expected: [indices[1]],
        };
      });
      assert.equal(result.informative, true);
      assert.equal(result.independent, true);
      assert.equal(result.rejected, true);
      assert.equal(result.excluded, true);
      assert.deepEqual(result.afterWrongGuess, result.expected);
    },
  );
  await check(
    'Spy keeps question, answer and candidate search through player changes and pauses',
    async (page) => {
      await startSpyDiscussion(page);
      await page.locator('.spy-candidates summary').click();
      await page.locator('#spycandidatesearch').fill('زرافة');
      await page.locator('#spyquestion').fill('هل تفضله بالليل؟');
      await page.locator('#spyanswer').fill('يفضله في الصباح');
      await page.locator('#spyasker').selectOption('1');
      await page.locator('#spytarget').selectOption('2');
      await page.locator('[onclick="rotateSpyPrompt()"]').click();
      await page.evaluate(() => {
        showPause();
        resumeGame();
      });
      assert.equal(await page.locator('#spyquestion').inputValue(), 'هل تفضله بالليل؟');
      assert.equal(await page.locator('#spyanswer').inputValue(), 'يفضله في الصباح');
      assert.equal(await page.locator('#spycandidatesearch').inputValue(), 'زرافة');
      assert.equal(await page.locator('.spy-candidates').getAttribute('open'), '');
      assert.deepEqual(await page.locator('#spycandidatelist span').allTextContents(), ['زرافة']);
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.deepEqual(await page.evaluate(() => state.questionHistory[0]), {
        asker: 1,
        target: 2,
        text: 'هل تفضله بالليل؟',
        answer: 'يفضله في الصباح',
      });
      assert.equal(await page.locator('#spyquestion').inputValue(), '');
      assert.equal(await page.locator('#spyanswer').inputValue(), '');
      assert.equal(await page.locator('#spycandidatesearch').inputValue(), 'زرافة');
    },
  );
  await check(
    'Spy optional notes are escaped, survive final review, and never change scoring',
    async (page) => {
      await startSpyDiscussion(page, false);
      await page.locator('#spyasker').selectOption('0');
      await page.locator('#spytarget').selectOption('1');
      await page.locator('#spyquestion').fill('سؤال <img src=x>');
      await page.locator('#spyanswer').fill('<img src=x onerror="throw Error(1)"> جواب');
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.equal(await page.locator('.spy-discussion-log img').count(), 0);
      assert.match(await page.locator('.spy-discussion-answer').textContent(), /<img src=x/);
      await page.locator('#spyasker').selectOption('1');
      await page.locator('#spytarget').selectOption('2');
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      assert.equal(
        await page.evaluate(() => Object.hasOwn(state.questionHistory[1], 'answer')),
        false,
      );
      assert.equal(await page.locator('.spy-candidates').count(), 0);
      await page.evaluate(() => {
        startSpyVote();
        for (let i = 0; i < state.players.length; i++) {
          spyVoteReveal();
          castSpyVote((i + 1) % state.players.length, i, state.run);
        }
        spyGuessHandoff();
        spyGuess();
        $('spyguess').value = state.location;
        submitSpyGuess(state.run);
      });
      assert.equal(await page.locator('.spy-discussion-answer').count(), 1);
      assert.equal(await page.locator('.spy-discussion-log img').count(), 0);
      assert.deepEqual(
        await page.evaluate(() => state.players.map((name) => store.scores[name].points)),
        await page.evaluate(() => state.players.map((_, i) => (isSpy(i) ? 40 : 0))),
      );
    },
  );
  await check(
    'Old spy input events cannot replace drafts or search in a later game',
    async (page) => {
      await startSpyDiscussion(page);
      await page.evaluate(() => {
        window.oldSpyQuestion = $('spyquestion');
        window.oldSpyAnswer = $('spyanswer');
        window.oldSpySearch = $('spycandidatesearch');
      });
      await startSpyDiscussion(page);
      const result = await page.evaluate(() => {
        for (const input of [oldSpyQuestion, oldSpyAnswer, oldSpySearch]) {
          input.value = 'مسودة قديمة';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return [state.questionDraft, state.answerDraft, state.candidateQuery];
      });
      assert.deepEqual(result, ['', '', '']);
    },
  );
  await check(
    'Reaction direction shortcuts leave editable text and IME composition alone',
    async (page) => {
      const result = await page.evaluate(() => {
        setup('reaction');
        $('reactionrule').value = 'choice';
        startReaction();
        state.stage = 'ready';
        state.requiredSide = 0;
        state.readyAt = performance.now() - 250;
        renderReaction();
        const editor = document.createElement('div');
        editor.contentEditable = 'true';
        editor.innerHTML = '<span>مسودة</span>';
        $('app').append(editor);
        editor.firstElementChild.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
        );
        const editableSafe = state.stage === 'ready';
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            isComposing: true,
            bubbles: true,
            cancelable: true,
          }),
        );
        const composingSafe = state.stage === 'ready';
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
        );
        return { editableSafe, composingSafe, stage: state.stage, valid: !state.falseStart };
      });
      assert.deepEqual(result, {
        editableSafe: true,
        composingSafe: true,
        stage: 'result',
        valid: true,
      });
    },
  );
  await check(
    'Game progress and board descriptions expose meaningful accessibility roles',
    async (page) => {
      const result = await page.evaluate(() => {
        setup('finder');
        startNumber('finder');
        const finder = $('app').querySelector('[role="progressbar"]');
        const finderProgress = [
          finder.getAttribute('aria-valuenow'),
          finder.getAttribute('aria-valuemin'),
          finder.getAttribute('aria-valuemax'),
        ];
        setup('mind');
        startMind();
        mindAnswer('yes');
        const mindProgress = Number(
          $('app').querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
        );
        setup('connect');
        startExtra('connect');
        const connect = $('app').querySelector('.connect').getAttribute('role');
        const discs = $('app').querySelectorAll('.disc[role="img"][aria-label]').length;
        setup('simon');
        startExtra('simon');
        return {
          finderProgress,
          mindProgress,
          connect,
          discs,
          trace: $('seqtrace').getAttribute('role'),
        };
      });
      assert.deepEqual(result.finderProgress, ['0', '0', '100']);
      assert.ok(result.mindProgress > 0 && result.mindProgress <= 100);
      assert.equal(result.connect, 'group');
      assert.equal(result.discs, 42);
      assert.equal(result.trace, 'group');
    },
  );
  await check(
    'Expanded spy log and discussion controls fit a 320px offline phone',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await page.context().setOffline(true);
      await startSpyDiscussion(page);
      await page.locator('#spyasker').selectOption('0');
      await page.locator('#spytarget').selectOption('1');
      await page.locator('#spyquestion').fill('س'.repeat(180));
      await page.locator('#spyanswer').fill('ج'.repeat(240));
      await page.locator('[onclick="nextSpyPrompt()"]').click();
      await page.locator('.spy-discussion-log summary').click();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
      );
    },
  );
  console.log(`Core and advanced v13: ${passed} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
