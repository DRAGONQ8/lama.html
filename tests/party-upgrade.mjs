import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

let html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
// Allows this independent suite to run before another agent regenerates the shared artifact.
if (process.env.PARTY_SOURCE === '1') {
  const party = await readFile(new URL('../src/party.js', import.meta.url), 'utf8');
  html = html.replace(
    /\/\/ Source: src\/party\.js\n[\s\S]*?(?=\/\/ Source: src\/lab\.js)/,
    () => `// Source: src/party.js\n${party}\n`,
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
  const context = await browser.newContext();
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
    'Team penalties, stale buttons, hidden actions and undo preserve one card per action',
    async (page) => {
      await page.evaluate(() => setup('teamcup'));
      await click(page, "startPartyGame('teamcup')");
      await click(page, 'teamCupBegin()');
      await click(page, "teamCupRecord('skip')");
      assert.equal(await page.evaluate(() => state.turnScore), -2);
      await click(page, 'teamCupUndo()');
      assert.equal(await page.evaluate(() => state.turnScore), 0);
      const duplicate = await page.evaluate(() => {
        const button = document.querySelector('button[onclick="teamCupRecord(\'correct\')"]');
        button.click();
        button.click();
        return { correct: state.correct, score: state.turnScore };
      });
      assert.deepEqual(duplicate, { correct: 1, score: 10 });
      await page.evaluate(() => {
        const nextButton = document.querySelector('button[onclick="teamCupRecord(\'correct\')"]');
        nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
      });
      assert.equal(await page.evaluate(() => state.correct), 1);
      await page.evaluate(() => {
        const button = document.querySelector('button[onclick="teamCupRecord(\'correct\')"]');
        partyHidePrivate();
        button.click();
        teamCupRecord('correct');
      });
      assert.equal(await page.evaluate(() => state.correct), 1);
      await click(page, 'teamCupToggleCard()');
      await click(page, "teamCupRecord('correct')");
      assert.equal(await page.evaluate(() => state.correct), 2);
      await page.evaluate(() => {
        state.endAt = Date.now() - 1;
        teamCupRecord('correct');
        teamCupEndTurn();
      });
      assert.equal(await page.evaluate(() => state.history.length), 1);
      assert.equal(await page.evaluate(() => state.correct), 2);
    },
  );

  await check('Three-person teams share captain roles across all three modes', async (page) => {
    const captains = await page.evaluate(() => {
      store.players.push('حمد', 'ريم');
      setup('teamcup');
      startPartyGame('teamcup');
      const roles = {};
      for (let turn = 0; turn < 18; turn++) {
        state.turn = turn;
        const info = teamCupInfo();
        (roles[info.captain] ||= []).push(info.mode.id);
      }
      return roles;
    });
    for (const modes of Object.values(captains)) {
      assert.equal(modes.length, 3);
      assert.equal(new Set(modes).size, 3);
    }
  });

  await check(
    'Undercover topic selection, unique roles, rotating first clues and Escape privacy',
    async (page) => {
      await page.evaluate(() => {
        store.players.push('حمد', 'ريم', 'منى', 'عبدالله');
        setup('undercover');
      });
      await page.locator('#partyWordCategory').selectOption('food');
      await page.locator('#partyHiddenCount').selectOption('2');
      await click(page, "startPartyGame('undercover')");
      const initial = await page.evaluate(() => ({
        hidden: state.hidden,
        pairs: state.pairs,
        food: partyPairCategories.food.words,
        first: state.clueOrder[0],
        roles: [...state.roleCounts],
      }));
      assert.equal(new Set(initial.hidden).size, 2);
      assert.ok(initial.pairs.every((pair) => initial.food.includes(pair[0])));
      assert.equal(
        initial.roles.reduce((sum, count) => sum + count, 0),
        2,
      );
      await click(page, 'undercoverReveal()');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      assert.equal(await page.evaluate(() => state.revealIndex), 0);
      const next = await page.evaluate(() => {
        state.round++;
        undercoverRound();
        undercoverTally();
        finishUndercoverRound(state.hidden[0]);
        return { first: state.clueOrder[0], scores: totalRounds() };
      });
      assert.equal(next.first, (initial.first + 1) % 8);
      assert.equal(next.scores, 0);
    },
  );

  await check(
    'Creative formats enforce constraints and temporary hiding preserves empty and nonempty drafts',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyCreativeFormat').selectOption('seven');
      await click(page, "startPartyGame('improv')");
      const prompt = await page.evaluate(() => state.prompt);
      await click(page, 'creativeRefreshPrompt()');
      assert.notEqual(await page.evaluate(() => state.prompt), prompt);
      await click(page, 'creativeStartAnswers()');
      await click(page, 'creativeOpenAnswer()');
      await page.locator('#creativeAnswer').fill('فكرة قصيرة');
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.entries.length), 0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#creativeAnswer').count(), 0);
      await click(page, 'creativeOpenAnswer()');
      assert.equal(await page.locator('#creativeAnswer').inputValue(), 'فكرة قصيرة');
      await page.locator('#creativeAnswer').fill('');
      await page.keyboard.press('Escape');
      await click(page, 'creativeOpenAnswer()');
      assert.equal(await page.locator('#creativeAnswer').inputValue(), '');
      await page.locator('#creativeAnswer').fill('هذه فكرة لطيفة تجعل كل أصدقائي يبتسمون');
      await click(page, 'creativeSubmit()');
      assert.equal(await page.evaluate(() => state.entries.length), 1);
      await page.evaluate(() => creativeTally());
      assert.equal(await page.evaluate(() => state.stage), 'answer-handoff');
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyCreativeFormat').selectOption('short');
      await click(page, "startPartyGame('improv')");
      await click(page, 'creativeStartAnswers()');
      await click(page, 'creativeOpenAnswer()');
      assert.equal(await page.locator('#creativeAnswer').getAttribute('maxlength'), '40');
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
