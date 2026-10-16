import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
if (process.env.PARTY_SOURCE === '1') {
  const source = await readFile(new URL('../src/party.js', import.meta.url), 'utf8');
  html = html.replace(
    /\/\/ Source: src\/party\.js\n[\s\S]*?(?=\/\/ Source: src\/lab\.js)/,
    () => `// Source: src/party.js\n${source}\n`,
  );
}
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const url = `http://127.0.0.1:${server.address().port}`;
const click = (page, action) => page.locator(`#app button[onclick="${action}"]`).last().click();
async function check(name, run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
      save();
    });
    await run(page);
    assert.deepEqual(errors, []);
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}

try {
  await check(
    'Undercover has curated animal, object, famous-country and Gulf decks',
    async (page) => {
      const report = await page.evaluate(() => ({
        decks: Object.fromEntries(
          Object.keys(partyPairCategories).map((id) => [id, partyPairDeck(id)]),
        ),
        original: partyPairs,
      }));
      for (const [id, deck] of Object.entries(report.decks)) {
        assert.ok(deck.length >= 8, `${id} needs a full session of cards`);
        assert.ok(deck.every((pair) => pair.length === 2 && pair[0] !== pair[1]));
        assert.equal(new Set(deck.map((pair) => [...pair].sort().join('|'))).size, deck.length);
      }
      assert.equal(report.decks.animals.length, 18);
      assert.equal(report.decks.objects.length, 20);
      assert.equal(report.decks.countries.length, 24);
      assert.equal(report.decks.gulf.length, 15);
      assert.deepEqual(
        [...new Set(report.decks.gulf.flat())].sort(),
        ['الإمارات', 'البحرين', 'السعودية', 'الكويت', 'عُمان', 'قطر'].sort(),
      );
      for (const word of ['فرنسا', 'ألمانيا', 'إيطاليا', 'أمريكا', 'بريطانيا'])
        assert.ok(report.decks.countries.flat().includes(word), `${word} is available`);
      const general = new Set(report.decks.all.map((pair) => [...pair].sort().join('|')));
      for (const deck of [report.original, ...Object.values(report.decks)])
        assert.ok(deck.every((pair) => general.has([...pair].sort().join('|'))));
      for (const id of ['animals', 'objects', 'countries', 'gulf']) {
        const selected = await page.evaluate((category) => {
          setup('undercover');
          $('partyWordCategory').value = category;
          startPartyGame('undercover');
          return { category: state.wordCategory, deck: state.pairs };
        }, id);
        assert.equal(selected.category, id);
        assert.deepEqual(
          selected.deck.map((pair) => pair.join('|')).sort(),
          report.decks[id].map((pair) => pair.join('|')).sort(),
        );
      }
    },
  );

  await check(
    'Gulf selection persists, hides secrets and keeps voting points intact',
    async (page) => {
      await page.evaluate(() => setup('undercover'));
      await page.locator('#partyWordCategory').selectOption('gulf');
      await page.locator('#partyRounds').selectOption('1');
      await page.locator('#partyDuration').selectOption('0');
      await click(page, "startPartyGame('undercover')");
      const points = await page.evaluate(() => {
        for (let i = 0; i < state.players.length; i++) {
          undercoverReveal();
          undercoverHide();
        }
        undercoverDiscuss();
        undercoverStartVote();
        const hidden = state.hidden[0];
        for (let i = 0; i < state.players.length; i++) {
          const voter = state.voteIndex;
          undercoverOpenVote();
          undercoverChoose(voter === hidden ? -1 : hidden);
          undercoverConfirmVote();
        }
        return { hidden, scores: [...state.roundPoints] };
      });
      for (let i = 0; i < 4; i++) assert.equal(points.scores[i], i === points.hidden ? 0 : 30);
      await click(page, 'undercoverAdvance()');
      await click(page, 'partyRematch()');
      assert.equal(await page.evaluate(() => state.wordCategory), 'gulf');
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      await click(page, 'undercoverReveal()');
      assert.equal(await page.locator('.party-secret-word').count(), 1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      await page.reload();
      await page.evaluate(() => setup('undercover'));
      assert.equal(await page.inputValue('#partyWordCategory'), 'gulf');
    },
  );

  await check(
    'Creative topics filter both modes and fit eight-round sessions without repeats',
    async (page) => {
      const report = await page.evaluate(() => {
        const results = [];
        for (const theme of Object.keys(partyCreativeThemes))
          for (const mode of ['council', 'chain']) {
            setup('improv');
            $('partyCreativeTheme').value = theme;
            $('partyCreativeMode').value = mode;
            $('partyRounds').value = '8';
            startPartyGame('improv');
            results.push({
              theme: state.creativeTheme,
              mode: state.creativeMode,
              prompts: [...state.prompts],
              bank: partyCreativeDeck(theme, mode),
            });
          }
        return results;
      });
      assert.equal(report.length, 12);
      for (const result of report) {
        assert.equal(result.prompts.length, 8);
        assert.equal(new Set(result.prompts).size, 8);
        assert.ok(result.prompts.every((prompt) => result.bank.includes(prompt)));
        assert.equal(
          result.bank.length,
          result.theme === 'all' ? (result.mode === 'chain' ? 64 : 100) : 8,
        );
      }
      for (const width of [320, 390, 768, 1366]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => setup('improv'));
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
      }
    },
  );

  await check(
    'Creative refresh stays in its topic, exhausts safely and remembers the theme',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyCreativeTheme').selectOption('travel');
      await page.locator('#partyRounds').selectOption('3');
      await click(page, "startPartyGame('improv')");
      const prompts = await page.evaluate(() => {
        const seen = [state.prompt];
        for (let i = 0; i < 5; i++) {
          creativeRefreshPrompt();
          seen.push(state.prompt);
        }
        const last = state.prompt;
        creativeRefreshPrompt();
        return {
          seen,
          last,
          after: state.prompt,
          pool: partyCreativeDeck('travel'),
          used: state.usedPrompts,
        };
      });
      assert.equal(new Set(prompts.seen).size, 6);
      assert.ok(prompts.seen.every((prompt) => prompts.pool.includes(prompt)));
      assert.equal(prompts.last, prompts.after);
      assert.equal(new Set(prompts.used).size, 8);
      await page.reload();
      await page.evaluate(() => setup('improv'));
      assert.equal(await page.inputValue('#partyCreativeTheme'), 'travel');
      await page.locator('#partyCreativeMode').selectOption('chain');
      await click(page, "startPartyGame('improv')");
      assert.equal(
        await page.evaluate(() => partyCreativeDeck('travel', 'chain').includes(state.prompt)),
        true,
      );
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
