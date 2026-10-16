import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(
  process.env.LAMMA_TEST_HTML || new URL('../lamma_universe.html', import.meta.url),
  'utf8',
);
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
      save();
    });
    await test(page);
    assert.deepEqual(errors, [], `${name}: browser exception`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
try {
  await check(
    'Searching setup by an alias finds the canonical word without changing the round pool',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('mind');
        const before = selectedItems().length;
        $('poolSearch').value = 'شيف';
        refreshPoolList();
        return { before, after: selectedItems().length, text: $('poolList').textContent };
      });
      assert.equal(value.after, value.before);
      assert.match(value.text, /طباخ/);
    },
  );
  await check(
    'All three locks use distinct secrets in a three-number range and record a single reward',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('solo');
        $('numberQuest').value = 'locks';
        $('min').value = '1';
        $('max').value = '2';
        startNumber('solo');
        const rejected = screen === 'setup';
        $('max').value = '3';
        startNumber('solo');
        const secrets = [];
        for (let i = 0; i < 3; i++) {
          secrets.push(state.secret.toString());
          $('guessInput').value = state.secret.toString();
          guessSolo();
          if (i < 2) nextSoloLock();
        }
        return {
          rejected,
          unique: new Set(secrets).size,
          rounds: store.scores[state.name].rounds,
          done: state.done,
        };
      });
      assert.deepEqual(value, { rejected: true, unique: 3, rounds: 1, done: true });
    },
  );
  await check('An old mind-answer control cannot answer the following question', async (page) => {
    const value = await page.evaluate(() => {
      setup('mind');
      startMind();
      const q = state.q,
        version = state.notebookVersion;
      const action = document.querySelector('.answerrow button').getAttribute('onclick');
      mindAnswer('unknown', q, version);
      const before = state.evidence.length;
      mindAnswer('yes', q, version);
      searchMindCandidates('شيف');
      return {
        before,
        after: state.evidence.length,
        action,
        searched: $('mindCandidateMatches').textContent,
      };
    });
    assert.equal(value.after, value.before);
    assert.match(value.action, /mindAnswer\('yes',\d+,\d+\)/);
    assert.match(value.searched, /طباخ/);
  });
  await check(
    'Opening Who aids preserves the typed guess and alias searches stay useful',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('who');
        startWho();
        $('whoInput').value = 'مسودة قبل التلميح';
        whoHint();
        const hint = $('whoInput').value;
        whoCandidates();
        const list = $('whoInput').value;
        askWhoInquiry();
        searchWhoSuspects('شيف');
        return {
          hint,
          list,
          inquiry: $('whoInput').value,
          aliases: $('whoSuspects').textContent,
          attempts: state.attempt,
        };
      });
      assert.equal(value.hint, 'مسودة قبل التلميح');
      assert.equal(value.list, value.hint);
      assert.equal(value.inquiry, value.hint);
      assert.match(value.aliases, /طباخ/);
      assert.equal(value.attempts, 0);
    },
  );
  await check(
    'Memory preview charges one aid, blocks flips, then respects pace and stale card controls',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '4';
        $('memoryPreview').value = '3';
        $('memoryPace').value = '1500';
        startMemory();
        const preview = state.peek && state.locked && state.hintsUsed === 1;
        const version = state.memoryVersion;
        flipCard(0);
        const blocked = state.up.length === 0;
        state.endAt = Date.now() - 1;
        hideMemoryCards(state);
        flipCard(0, version, 0);
        const stale = state.up.length === 0;
        const other = state.deck.findIndex((symbol) => symbol !== state.deck[0]);
        flipCard(0);
        flipCard(other);
        return { preview, blocked, stale, delay: state.endAt - Date.now(), locked: state.locked };
      });
      assert.equal(value.preview, true);
      assert.equal(value.blocked, true);
      assert.equal(value.stale, true);
      assert.equal(value.locked, true);
      assert.ok(value.delay > 1400 && value.delay <= 1500);
    },
  );
  await check('Mime keeps the next word private when scoring while hidden', async (page) => {
    const value = await page.evaluate(() => {
      setup('mime');
      startMime();
      mimeReady();
      toggleMimeWord();
      const previous = state.word;
      mimeAnswer(false);
      const hidden = state.hiddenWord && !$('app').textContent.includes(state.word);
      const next = state.word;
      const score = state.score;
      mimeAnswer('invalid');
      return {
        hidden,
        changed: previous !== next,
        stable: score === state.score && next === state.word,
      };
    });
    assert.deepEqual(value, { hidden: true, changed: true, stable: true });
  });
  await check(
    'Secret private search supports aliases and the canonical answer to a typed alias',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        searchSecretWords('شيف');
        const search = $('secretWordMatches').textContent;
        const cook = state.pool.find((i) => items[i].name === 'طباخ');
        selectSecretWord(cook);
        const selected = state.word === 'طباخ';
        $('customword').value = 'شيف';
        hideSecret();
        secretReady();
        const privateDOM = !$('app').textContent.includes('شيف');
        $('secretGuessInput').value = 'طباخ';
        guessSecret();
        return { search, selected, privateDOM, stage: state.stage };
      });
      assert.match(value.search, /طباخ/);
      assert.equal(value.selected, true);
      assert.equal(value.privateDOM, true);
      assert.equal(value.stage, 'award');
    },
  );
  await check(
    'Secret records the chosen asker, preserves guess drafts and restores an undone wrong guess',
    async (page) => {
      const value = await page.evaluate(() => {
        setup('secret');
        startSecret();
        revealSecret();
        $('customword').value = 'عنقاء';
        hideSecret();
        secretReady();
        chooseSecretAsker(2);
        $('secretGuessInput').value = 'مسودة التخمين';
        $('secretQuestionText').value = 'هل هو حقيقي؟';
        secretQuestion('no');
        const author = state.questionAuthors[0],
          draft = $('secretGuessInput').value;
        $('secretGuessInput').value = 'تخمين خاطئ';
        guessSecret();
        undoSecretQuestion();
        return {
          author,
          draft,
          restored: $('secretGuessInput').value,
          questions: state.questions,
          guesses: state.textGuesses.length,
        };
      });
      assert.deepEqual(value, {
        author: 2,
        draft: 'مسودة التخمين',
        restored: 'تخمين خاطئ',
        questions: 1,
        guesses: 0,
      });
    },
  );
  await check(
    'Reaction ignores secondary clicks and explains penalties in the final review',
    async (page) => {
      await page.evaluate(() => {
        setup('reaction');
        $('trials').value = '3';
        startReaction();
      });
      await page.locator('button.reaction').click({ button: 'right' });
      assert.equal(await page.evaluate(() => state.stage), 'idle');
      const value = await page.evaluate(() => {
        reactionTap();
        reactionTap();
        advanceReaction();
        for (let i = 0; i < 2; i++) {
          state.stage = 'ready';
          state.readyAt = performance.now() - (200 + i * 100);
          reactionTap();
          advanceReaction();
        }
        return {
          done: state.done,
          history: document.querySelector('.reaction-trial-history').textContent,
          meters: document.querySelectorAll('.reaction-trial-history meter').length,
        };
      });
      assert.equal(value.done, true);
      assert.match(value.history, /قبل الإشارة/);
      assert.equal(value.meters, 3);
    },
  );
  await check('New search and review interfaces remain readable offline at 320px', async (page) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.context().setOffline(true);
    for (const id of ['mind', 'who', 'memory', 'secret', 'reaction']) {
      await page.evaluate((id) => {
        setup(id);
        if (id === 'mind') {
          startMind();
          $('mindNotebook').open = true;
        }
        if (id === 'who') {
          startWho();
          whoCandidates();
        }
        if (id === 'memory') {
          $('memoryPreview').value = '5';
          startMemory();
        }
        if (id === 'secret') {
          startSecret();
          revealSecret();
          document.querySelector('.private-word-picker').open = true;
        }
        if (id === 'reaction') {
          startReaction();
          reactionTap();
          reactionTap();
          document.querySelector('.reaction-analysis').open = true;
        }
      }, id);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
        id,
      );
    }
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Core v12: ${passed} browser checks passed.`);
