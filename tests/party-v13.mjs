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
    ].map((match) => match[1]);
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
const click = (page, action) => page.locator(`#app button[onclick="${action}"]`).last().click();
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      store.sound = false;
      save();
    });
    await run(page);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function beginUndercover(page, { court = false } = {}) {
  await page.evaluate((court) => {
    setup('undercover');
    $('partyDuration').value = '0';
    $('partyRounds').value = '1';
    $('partyClueRounds').value = '1';
    $('partyUndercoverCourt').value = court ? 'on' : 'off';
    startPartyGame('undercover');
    state.pair = ['دب', 'باندا'];
    state.hidden = [3];
    state.clueOrder = [0, 1, 2, 3];
    for (let i = 0; i < 4; i++) {
      undercoverReveal();
      undercoverHide();
    }
    undercoverDiscuss();
  }, court);
}

try {
  await check(
    'Team decks contain unique answers and relay retires equivalent spellings',
    async (page) => {
      const report = await page.evaluate(() => {
        setup('teamcup');
        $('partyTeamFormat').value = 'relay';
        startPartyGame('teamcup');
        const decks = Object.fromEntries(
          Object.entries(state.decks).map(([mode, cards]) => [
            mode,
            cards.map((card) => partyTeamCardKey(mode, card)),
          ]),
        );
        state.turn = 2;
        teamCupHandoff();
        teamCupBegin();
        // A legacy or future deck may contain equivalent targets on separate cards.
        state.decks.taboo = [
          ['قهوة', 'مشروب', 'فنجان', 'بن', 'كافيين'],
          ['الْقَهْوَة', 'شرب', 'سهر', 'صباح', 'مقهى'],
          ['شاي', 'ورق', 'إبريق', 'كوب', 'ساخن'],
        ];
        state.card = state.decks.taboo[0];
        state.deckIndex.taboo = 1;
        state.boostActive = true;
        state.boostUsed = true;
        state.endAt = Date.now() + 1000;
        teamCupRelay();
        const handoffSafe = !document.querySelector('.party-secret-word');
        teamCupRelayResume();
        return {
          decks,
          handoffSafe,
          target: state.card[0],
          boost: state.boostActive && state.boostUsed,
          remaining: partySeconds(),
        };
      });
      for (const [mode, targets] of Object.entries(report.decks)) {
        assert.ok(targets.length > 20, `${mode}: enough cards`);
        assert.equal(new Set(targets).size, targets.length, `${mode}: duplicate answer`);
      }
      assert.equal(report.handoffSafe, true);
      assert.equal(report.target, 'شاي');
      assert.equal(report.boost, true);
      assert.ok(report.remaining > 0 && report.remaining <= 1);
    },
  );

  await check('Secret matching respects Arabic word and phrase boundaries', async (page) => {
    const report = await page.evaluate(() => ({
      direct: ['دب', 'الدب', 'بالدب', 'والدب', 'للدب', 'رأيت دباً', 'باندا!'].map((text) =>
        partyContainsSecret(text, ['دب', 'باندا']),
      ),
      ordinary: ['أحب الأدب', 'مدببة قليلاً', 'دبيب الماء', 'أقرأ كتاباً عن الأدب'].map((text) =>
        partyContainsSecret(text, ['دب', 'باندا']),
      ),
      phrases: ['أحب كرة القدم', 'ألعب بالكرة القدم', 'كرة، قدم'].map((text) =>
        partyContainsSecret(text, ['كرة قدم', 'قارب']),
      ),
      separate: ['كرة ثم قدم', 'هذا يقارب الوصف', 'كرة وسلة', 'كرة والقدم'].map((text) =>
        partyContainsSecret(text, ['كرة قدم', 'قارب']),
      ),
      possessives: [
        'قلمي',
        'قلمك',
        'قلمه',
        'قلمها',
        'قلمنا',
        'قلمكم',
        'قلمكن',
        'قلمكما',
        'قلمهم',
        'قلمهن',
        'قلمهما',
        'كتابي',
        'بكتابه',
        'وقلمك',
      ].map((text) => partyContainsSecret(text, ['قلم', 'كتاب'])),
      femininePossessives: ['قطتي', 'بقهوته', 'مدرستنا', 'وحقيبتها'].map((text) =>
        partyContainsSecret(text, ['قطة', 'قهوة', 'مدرسة', 'حقيبة']),
      ),
      similarWords: ['كتابة', 'الكتابة', 'كتابات', 'مكتبة', 'قلمية', 'الكتابي', 'أحب الأدب'].map(
        (text) => partyContainsSecret(text, ['كتاب', 'قلم', 'دب']),
      ),
    }));
    assert.deepEqual(report.direct, Array(7).fill(true));
    assert.deepEqual(report.ordinary, Array(4).fill(false));
    assert.deepEqual(report.phrases, Array(3).fill(true));
    assert.deepEqual(report.separate, Array(4).fill(false));
    assert.deepEqual(report.possessives, Array(14).fill(true));
    assert.deepEqual(report.femininePossessives, Array(4).fill(true));
    assert.deepEqual(report.similarWords, Array(7).fill(false));
  });

  await check(
    'Clues, inquiries and court accept ordinary Arabic while blocking either secret',
    async (page) => {
      await beginUndercover(page, { court: true });
      await page.locator('#undercoverClue').fill('أحب الأدب');
      await click(page, 'undercoverNextClue()');
      assert.equal(await page.evaluate(() => state.clueIndex), 1);
      await page.locator('#undercoverClue').fill('باندا');
      await click(page, 'undercoverNextClue()');
      assert.equal(await page.evaluate(() => state.clueIndex), 1);
      await page.locator('#undercoverClue').fill('يرتبط بحكاية');
      await click(page, 'undercoverNextClue()');
      await page.evaluate(() => {
        undercoverNextClue();
        undercoverNextClue();
        undercoverBeginInquiry();
      });
      await page.locator('#undercoverQuestion').fill('هل يرتبط بالأدب؟');
      await page.locator('#undercoverReply').fill('باندا');
      await click(page, 'undercoverRecordInquiry()');
      assert.equal(await page.evaluate(() => state.questions.length), 0);
      await page.locator('#undercoverReply').fill('يظهر في القصص');
      await click(page, 'undercoverRecordInquiry()');
      assert.equal(await page.evaluate(() => state.questions.length), 1);
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) undercoverSkipInquiry();
        undercoverStartVote();
      });
      await page.locator('#courtTarget').selectOption('1');
      await page.locator('#courtReason').fill('تلميحه يرتبط بالأدب');
      await click(page, 'undercoverAccuse()');
      assert.equal(await page.evaluate(() => state.accusationIndex), 1);
      await page.locator('#courtTarget').selectOption('0');
      await page.locator('#courtReason').fill('بالدب');
      await click(page, 'undercoverAccuse()');
      assert.equal(await page.evaluate(() => state.accusationIndex), 1);
      await page.locator('#courtTarget').selectOption('-1');
      await page.locator('#courtReason').fill('');
      await page.evaluate(() => {
        undercoverAccuse();
        undercoverAccuse();
        undercoverAccuse();
      });
      await page.locator('#courtDefense').fill('رأيت باندا');
      await click(page, 'undercoverDefend()');
      assert.equal(await page.evaluate(() => state.defenseIndex), 0);
      await page.locator('#courtDefense').fill('تلميحي عن الأدب');
      await click(page, 'undercoverDefend()');
      assert.equal(await page.evaluate(() => state.stage), 'vote-handoff');
      assert.equal(await page.locator('.party-ballot-review').count(), 0);
      assert.equal(await page.locator('.party-secret-word').count(), 0);
    },
  );

  await check(
    'Runoff reveals both ballots only after closure and archives complete evidence',
    async (page) => {
      await beginUndercover(page);
      await page.evaluate(() => {
        for (const text of ['أحب الأدب', 'وصف لغوي', 'حكاية قديمة', 'خيال لطيف']) {
          state.clueDraft = text;
          undercoverNextClue();
        }
        undercoverBeginInquiry();
        $('undercoverQuestion').value = 'هل يرتبط بالقصص؟';
        $('undercoverReply').value = 'ربما في حكاية قديمة';
        undercoverRecordInquiry();
        for (let i = 0; i < 3; i++) undercoverSkipInquiry();
        undercoverStartVote();
      });
      const first = [1, 0, 3, 2];
      for (let voter = 0; voter < 4; voter++) {
        await page.evaluate(
          ({ voter, target }) => {
            undercoverOpenVote();
            undercoverChoose(target);
            state.voteReason = `<b>الدليل الأول ${voter}</b>`;
            undercoverConfirmVote();
          },
          { voter, target: first[voter] },
        );
        assert.equal(await page.locator('.party-ballot-review').count(), 0);
      }
      assert.equal(await page.evaluate(() => state.stage), 'tie');
      assert.equal(await page.evaluate(() => state.revealed), false);
      await page.evaluate(() => undercoverRunoff());
      for (const target of [1, 0, 0, 0]) {
        await page.evaluate((target) => {
          undercoverOpenVote();
          undercoverChoose(target);
          undercoverConfirmVote();
        }, target);
      }
      assert.equal(await page.evaluate(() => state.stage), 'round-result');
      assert.equal(await page.locator('.party-ballot-review').count(), 2);
      const firstReview = page.locator('.party-ballot-review').filter({ hasText: 'التصويت الأول' });
      assert.match(await firstReview.textContent(), /<b>الدليل الأول 0<\/b>/);
      assert.equal(await firstReview.locator('small b').count(), 0);
      assert.deepEqual(await page.evaluate(() => state.roundPoints), [0, 0, 0, 30]);
      await click(page, 'undercoverAdvance()');
      const archive = page.locator('.party-round-archive');
      assert.equal(await archive.count(), 1);
      assert.match(await archive.textContent(), /أحب الأدب/);
      assert.match(await archive.textContent(), /هل يرتبط بالقصص/);
      assert.match(await archive.textContent(), /ربما في حكاية قديمة/);
      assert.equal(await archive.locator('.party-ballot-review').count(), 2);
      await click(page, 'partyRematch()');
      assert.equal(await page.locator('.party-round-archive,.party-ballot-review').count(), 0);
      assert.equal(await page.evaluate(() => state.revealed), false);
    },
  );

  await check(
    'Private candidate and confidence choices preserve keyboard focus and evidence drafts',
    async (page) => {
      await beginUndercover(page);
      await page.evaluate(() => {
        undercoverStartVote();
        undercoverOpenVote();
      });
      await click(page, 'undercoverChoose(1)');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'undercoverChoose(1)',
      );
      await page.locator('#undercoverReason').fill('هذا دليلي الخاص');
      await click(page, 'undercoverConfidence(3)');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'undercoverConfidence(3)',
      );
      assert.equal(await page.inputValue('#undercoverReason'), 'هذا دليلي الخاص');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'undercoverReason');
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'undercoverConfirmVote()',
      );
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => state.stage), 'vote-handoff');
      assert.equal(await page.locator('#undercoverReason').count(), 0);
    },
  );

  await check(
    'Ranked creative gallery explains both choices and remains usable from the keyboard',
    async (page) => {
      await page.evaluate(() => {
        setup('improv');
        $('partyCreativeBallot').value = 'ranked';
        startPartyGame('improv');
        creativeStartAnswers();
        for (const text of ['فكرة القمر', 'فكرة الحديقة', 'فكرة النجوم', 'فكرة المطر']) {
          creativeOpenAnswer();
          $('creativeAnswer').value = text;
          creativeSubmit();
        }
      });
      assert.match(await page.locator('#app').textContent(), /رداً آخر للتقدير \+2/);
      await click(page, 'creativeGalleryToggle()');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'creativeGalleryToggle()',
      );
      await click(page, 'creativeGalleryMove(1)');
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        'creativeGalleryMove(1)',
      );
      await click(page, 'creativeGalleryMove(1)');
      await click(page, 'creativeGalleryMove(1)');
      assert.equal(
        await page.evaluate(() => document.activeElement.classList.contains('party-focus-card')),
        true,
      );
      await page.setViewportSize({ width: 320, height: 780 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '130%';
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      await page.evaluate(() => {
        creativeStartVoting();
        creativeOpenVote();
      });
      const choices = await page.evaluate(() =>
        state.entries
          .map((entry, i) => (entry.author === state.voteIndex ? -1 : i))
          .filter((i) => i >= 0),
      );
      await click(page, `creativeChoose(${choices[0]})`);
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        `creativeChoose(${choices[0]})`,
      );
      await click(page, `creativeChooseSecond(${choices[1]})`);
      assert.equal(
        await page.evaluate(() => document.activeElement.getAttribute('onclick')),
        `creativeChooseSecond(${choices[1]})`,
      );
      assert.equal(await page.locator('button[onclick="creativeConfirmVote()"]').isEnabled(), true);
      await click(page, 'creativeConfirmVote()');
      assert.equal(await page.evaluate(() => state.stage), 'creative-vote-handoff');
      assert.equal(await page.locator('.party-creative-entry').count(), 0);
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Party v13: ${passed} checks passed.`);
