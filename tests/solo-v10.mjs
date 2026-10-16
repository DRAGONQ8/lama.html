import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8'),
  manifest = await read('scripts/build.mjs'),
  names = (kind) =>
    [
      ...manifest
        .match(new RegExp(`const ${kind} = \\[([\\s\\S]*?)\\];`))[1]
        .matchAll(/'([^']+)'/g),
    ].map((m) => m[1]);
const scripts = await Promise.all(names('scripts').map((name) => read(`src/${name}.js`))),
  styles = await Promise.all(names('styles').map((name) => read(`src/${name}.css`))),
  sourceHTML = (await read('src/template.html'))
    .replace('/* BUILD_SCRIPTS */', () => scripts.join('\n'))
    .replace('/* BUILD_STYLES */', () => styles.join('\n')),
  html = process.env.LAMMA_TEST_HTML
    ? await readFile(process.env.LAMMA_TEST_HTML, 'utf8')
    : sourceHTML;
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`,
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
let passed = 0;
async function check(name, test) {
  if (process.env.SOLO_CHECK && !name.includes(process.env.SOLO_CHECK)) return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم'];
      store.sound = false;
      store.extra.motion = false;
      save();
      home('top');
    });
    await test(page, context);
    assert.deepEqual(errors, [], `${name}: browser exceptions`);
    passed++;
    console.log(`✓ ${name}`);
  } finally {
    await context.close();
  }
}
async function begin(page, options = {}) {
  await page.evaluate((options) => {
    openSoloHub(options.name || 'ليلى');
    for (const [field, value] of Object.entries({
      soloSkill: 'numbers',
      soloRounds: '3',
      soloMode: 'practice',
      soloLevel: 'normal',
      ...options.fields,
    }))
      $(field).value = value;
    startSoloSession();
  }, options);
}
async function completeStation(page, correct = true) {
  await page.evaluate((correct) => {
    if (['math', 'pattern', 'color'].includes(state.id)) {
      startExtra(state.id);
      while (!state.done) {
        const q = state.questions[state.index],
          choice = q.choices.findIndex((v) => quizAnswerCorrect(q, v));
        answerQuiz(correct ? choice : q.choices.findIndex((v, i) => i !== choice));
        nextQuiz();
      }
    } else if (state.id === 'solo') {
      startNumber('solo');
      $('guessInput').value = state.secret.toString();
      guessSolo();
    } else if (state.id === 'memory') {
      startMemory();
      for (const symbol of [...new Set(state.deck)])
        state.deck
          .map((v, i) => (v === symbol ? i : -1))
          .filter((i) => i >= 0)
          .forEach((i) => flipCard(i));
    } else throw Error('Unsupported test station ' + state.id);
  }, correct);
}
try {
  await check(
    'Legacy progress loads; invalid station checkpoints are rejected safely and strictly',
    async (page) => {
      const value = await page.evaluate(() => {
        const old = normalizeExtra({ history: [], preferences: {}, sound: false }),
          base = normalizeSoloProgress({ version: 1, profiles: [{ name: 'ليلى' }] });
        const profile = base.profiles[0];
        profile.active = {
          token: 'test-solo-1',
          name: 'ليلى',
          queue: { length: 3 },
          at: 0,
          mode: 'practice',
          level: 'normal',
          adaptive: true,
          started: Date.now(),
          results: [],
        };
        const cleaned = normalizeSoloProgress(base);
        let rejected = false;
        try {
          normalizeSoloProgress(base, true);
        } catch {
          rejected = true;
        }
        return {
          games: games.length,
          legacy: old.solo,
          active: cleaned.profiles[0].active,
          rejected,
        };
      });
      assert.equal(value.games, 37);
      assert.deepEqual(value.legacy, { version: 1, profiles: [] });
      assert.equal(value.active, null);
      assert.equal(value.rejected, true);
    },
  );
  await check(
    'A full adaptive practice session records three personal stations without ranked scores, history or badges',
    async (page) => {
      const before = await page.evaluate(() => ({
        scores: store.scores,
        played: store.extra.played,
        best: store.extra.best,
        earned: store.extra.earned,
        history: store.extra.history,
        daily: store.extra.daily,
      }));
      await begin(page);
      assert.equal(await page.evaluate(() => $('player').selectedOptions[0].textContent), 'ليلى');
      assert.equal(await page.evaluate(() => $('player').disabled), true);
      await completeStation(page);
      assert.match(await page.locator('.celebrate .chip').innerText(), /تدريب/);
      assert.equal(await page.locator('.celebrate button[onclick^="setup("]').count(), 0);
      await page.evaluate(() => continueSoloSession());
      assert.equal(await page.evaluate(() => $('level').value), 'hard');
      await completeStation(page, false);
      await page.evaluate(() => continueSoloSession());
      assert.equal(await page.evaluate(() => soloRound.level), 'normal');
      await completeStation(page);
      const value = await page.evaluate(() => {
        const p = soloProfile('ليلى');
        const stable = JSON.stringify(p);
        result('solo', 'stale', 'stale', 100);
        continueSoloSession();
        return {
          stable: stable === JSON.stringify(soloProfile('ليلى')),
          sessions: p.sessions,
          rounds: p.rounds,
          practice: p.practiceRounds,
          active: p.active,
          personal: p.recent.length,
          days: p.days[dayKey()],
          scores: store.scores,
          played: store.extra.played,
          best: store.extra.best,
          earned: store.extra.earned,
          history: store.extra.history,
          daily: store.extra.daily,
        };
      });
      assert.equal(value.sessions, 1);
      assert.equal(value.rounds, 3);
      assert.equal(value.practice, 3);
      assert.equal(value.active, null);
      assert.equal(value.personal, 3);
      assert.equal(value.days, 3);
      assert.equal(value.stable, true);
      for (const key of Object.keys(before))
        assert.deepEqual(value[key], before[key], `${key} changed during practice`);
    },
  );
  await check(
    'Ranked sessions award the selected player once and retain stations across refresh',
    async (page) => {
      await begin(page, { fields: { soloMode: 'ranked', soloAdaptive: 'no' } });
      await completeStation(page);
      assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), { points: 100, rounds: 1 });
      const token = await page.evaluate(() => soloProfile('ليلى').active.token);
      await page.evaluate(() => continueSoloSession());
      await page.evaluate(() => startExtra('pattern'));
      await page.reload();
      const restored = await page.evaluate(() => {
        openSoloHub('ليلى');
        const p = soloProfile('ليلى');
        return {
          token: p.active.token,
          at: p.active.at,
          results: p.active.results,
          snapshot: store.extra.savedSession,
          scores: store.scores['ليلى'],
          other: store.scores['أحمد'] || null,
          prefs: p.prefs,
        };
      });
      assert.equal(restored.token, token);
      assert.equal(restored.at, 1);
      assert.equal(restored.results[0].points, 100);
      assert.equal(restored.snapshot, null);
      assert.equal(restored.other, null);
      assert.equal(restored.prefs.adaptive, false);
      await page.locator('.solo-resume button[onclick="continueSoloSession()"]').click();
      assert.equal(await page.evaluate(() => state.id), 'pattern');
      assert.equal(await page.evaluate(() => $('level').value), 'normal');
      await completeStation(page);
      assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), { points: 200, rounds: 2 });
    },
  );
  await check(
    'Browser back returns to the hub and detaches scoring while preserving the saved station',
    async (page) => {
      await page.locator('.dock button[onclick="openSoloHub()"]').click();
      assert.equal(
        await page.locator('.dock button[onclick="openSoloHub()"]').getAttribute('aria-current'),
        'page',
      );
      await page.selectOption('#soloSkill', 'numbers');
      await page.locator('button[onclick="startSoloSession()"]').click();
      await page.evaluate(() => startExtra('math'));
      await page.goBack();
      await page.waitForFunction(() => screen === 'solo-hub');
      assert.equal(await page.evaluate(() => soloRound), null);
      assert.equal(await page.evaluate(() => soloProfile().active.at), 0);
      await page.goForward();
      await page.waitForFunction(() => screen === 'setup');
      assert.equal(await page.evaluate(() => soloRound.mode), 'practice');
      assert.equal(await page.evaluate(() => state.soloSessionToken === soloRound.token), true);
      await completeStation(page);
      assert.equal(await page.evaluate(() => totalRounds()), 0);
      await page.goBack();
      await page.waitForFunction(() => screen === 'solo-hub');
      await page.goBack();
      await page.waitForFunction(() => screen === 'home');
      assert.equal(await page.evaluate(() => totalRounds()), 0);
    },
  );
  await check(
    'Daily, routes, tournaments and ordinary launches detach training without consuming a station',
    async (page) => {
      for (const action of ['daily', 'route', 'tournament', 'ordinary']) {
        await begin(page);
        const result = await page.evaluate((action) => {
          const name = soloHubName,
            token = soloProfile(name).active.token;
          if (action === 'daily') startDaily('math');
          if (action === 'route') startRoute('focus');
          if (action === 'tournament') {
            openTournament();
            startTournament();
          }
          if (action === 'ordinary') setup('memory');
          return {
            round: soloRound,
            token: soloProfile(name).active.token,
            at: soloProfile(name).active.at,
            daily: !!dailyRun,
            route: !!activeRoute,
            tour: !!tourney?.active,
            initial: token,
          };
        }, action);
        assert.equal(result.round, null, action);
        assert.equal(result.token, result.initial);
        assert.equal(result.at, 0);
        if (action === 'daily') assert.equal(result.daily, true);
        if (action === 'route') assert.equal(result.route, true);
        if (action === 'tournament') assert.equal(result.tour, true);
        await page.evaluate(() => home());
      }
    },
  );
  await check(
    'Merge repairs a lost writer event once and does not recount events evicted from a full log',
    async (page) => {
      const result = await page.evaluate(() => {
        const blank = () => normalizeSoloProgress({ version: 1, profiles: [{ name: 'ليلى' }] }),
          event = (rid, at) => ({
            rid,
            id: 'math',
            points: 70,
            at,
            mode: 'practice',
            level: 'normal',
            seconds: 2,
            day: dayKey(),
            complete: false,
          }),
          apply = (data, e) => {
            soloApplyEvent(data.profiles[0], e);
            data.profiles[0].recent.unshift(e);
          },
          local = blank(),
          remote = blank();
        apply(local, event('round-local-1', 1001));
        apply(remote, event('round-remote-1', 1002));
        const repaired = mergeSoloProgress(local, local, remote),
          twice = mergeSoloProgress(repaired, repaired, repaired);
        const old = blank(),
          full = blank();
        apply(old, event('round-old-1', 10));
        for (let i = 0; i < 120; i++) apply(full, event('round-new-' + i, 1000 + i));
        const stale = mergeSoloProgress(old, old, full);
        return {
          repaired: repaired.profiles[0].rounds,
          twice: twice.profiles[0].rounds,
          stale: stale.profiles[0].rounds,
          total: repaired.profiles[0].total,
          practice: repaired.profiles[0].practiceRounds,
        };
      });
      assert.deepEqual(result, { repaired: 2, twice: 2, stale: 120, total: 140, practice: 2 });
    },
  );
  await check(
    'Two tabs cannot award or count the same saved ranked station twice',
    async (page, context) => {
      await begin(page, { fields: { soloMode: 'ranked' } });
      const other = await context.newPage();
      await other.goto(url);
      await other.evaluate(() => {
        openSoloHub('ليلى');
        continueSoloSession();
        startExtra('math');
      });
      await completeStation(page);
      if (process.env.SOLO_DEBUG)
        console.log(
          await page.evaluate(() => ({
            tag: 'first',
            score: store.scores['ليلى'],
            p: soloProfile('ليلى'),
            baseline: storageBaseline.extra.solo,
            ledger: storageLedger.scores,
            text: JSON.parse(localStorage.getItem(KEY)).extra.solo,
          })),
        );
      if (process.env.SOLO_DEBUG)
        console.log(
          await other.evaluate(() => ({
            tag: 'other-before',
            score: store.scores['ليلى'],
            round: soloRound,
            p: soloProfile('ليلى'),
            baseline: storageBaseline.extra.solo,
            ledger: storageLedger.scores,
            linked: !!soloLinkedRound(),
          })),
        );
      await other.evaluate(() => {
        while (!state.done) {
          const q = state.questions[state.index];
          answerQuiz(q.choices.findIndex((v) => quizAnswerCorrect(q, v)));
          nextQuiz();
        }
        save();
      });
      await page.evaluate(() => save());
      if (process.env.SOLO_DEBUG)
        console.log(
          await other.evaluate(() => ({
            tag: 'other-after',
            score: store.scores['ليلى'],
            round: soloRound,
            p: soloProfile('ليلى'),
            baseline: storageBaseline.extra.solo,
            ledger: storageLedger.scores,
          })),
        );
      const result = await page.evaluate(() => ({
        score: store.scores['ليلى'],
        rounds: soloProfile('ليلى').rounds,
        at: soloProfile('ليلى').active.at,
      }));
      assert.deepEqual(result, { score: { points: 100, rounds: 1 }, rounds: 1, at: 1 });
      await other.close();
    },
  );
  await check(
    'Goals and preferences survive reload; player removal refreshes hub and archived files can be managed',
    async (page) => {
      await page.evaluate(() => {
        openSoloHub('ليلى');
        $('soloGoal').value = '4';
        $('soloRounds').value = '8';
        $('soloSkill').value = 'words';
        saveSoloOptions();
      });
      await page.reload();
      await page.evaluate(() => openSoloHub('ليلى'));
      assert.equal(await page.inputValue('#soloGoal'), '4');
      assert.equal(await page.inputValue('#soloRounds'), '8');
      assert.equal(await page.inputValue('#soloSkill'), 'words');
      await page.evaluate(() => {
        openPeople();
        $('name1').value = '';
        savePeople();
      });
      assert.equal(await page.evaluate(() => soloHubName), 'أحمد');
      assert.equal(await page.locator('#soloPlayer option').count(), 2);
      const value = await page.evaluate(() => {
        openSoloProfiles();
        const index = soloManageNames.indexOf('ليلى');
        confirmSoloProfileRemoval(index);
        const notice = $('modal').textContent;
        removeSoloProfile(soloPendingRemoval.token);
        return { notice, deleted: !soloProfile('ليلى', false), scores: totalRounds() };
      });
      assert.match(value.notice, /حذف سجل/);
      assert.equal(value.deleted, true);
      assert.equal(value.scores, 0);
    },
  );
  await check(
    'Training controls leave ordinary remembered game settings unchanged',
    async (page) => {
      await page.evaluate(() => {
        setup('memory');
        $('difficulty').value = '24';
        rememberSetup();
        home();
      });
      const before = await page.evaluate(() => store.extra.preferences.memory);
      await begin(page, { fields: { soloSkill: 'memory' } });
      const token = await page.evaluate(() => {
        const token = soloRound.token;
        resetGamePreferences('memory');
        return token;
      });
      assert.equal(await page.evaluate(() => soloRound.token), token);
      await page.selectOption('#difficulty', '4');
      await page.locator('button[onclick="startMemory()"]').click();
      await page.evaluate(() => {
        for (const symbol of [...new Set(state.deck)])
          state.deck
            .map((v, i) => (v === symbol ? i : -1))
            .filter((i) => i >= 0)
            .forEach((i) => flipCard(i));
      });
      assert.deepEqual(await page.evaluate(() => store.extra.preferences.memory), before);
      await page.evaluate(() => {
        home();
        setup('memory');
      });
      assert.equal(await page.inputValue('#difficulty'), '24');
    },
  );
  await check(
    'Managing player names during station setup preserves practice mode and edited controls',
    async (page) => {
      await begin(page);
      const token = await page.evaluate(() => soloRound.token);
      await page.evaluate(() => {
        $('quizcount').value = '10';
        openPeople();
        savePeople();
      });
      assert.equal(await page.evaluate(() => soloRound.token), token);
      assert.equal(await page.evaluate(() => state.soloSessionToken), token);
      assert.equal(await page.inputValue('#quizcount'), '10');
      assert.equal(await page.evaluate(() => $('player').selectedOptions[0].textContent), 'ليلى');
      assert.equal(await page.evaluate(() => soloRound.mode), 'practice');
      await completeStation(page);
      assert.equal(await page.evaluate(() => totalRounds()), 0);
      assert.equal(await page.evaluate(() => soloProfile('ليلى').rounds), 1);
      await page.evaluate(() => {
        openSoloHub('ليلى');
        continueSoloSession();
        openPeople();
        $('name1').value = '';
        savePeople();
      });
      assert.equal(await page.evaluate(() => screen), 'solo-hub');
      assert.equal(await page.evaluate(() => soloRound), null);
      assert.equal(await page.evaluate(() => soloHubName), 'أحمد');
      assert.equal(await page.evaluate(() => soloProfile('ليلى', false).active.at), 1);
    },
  );
  await check(
    'Skill recommendations use the latest personal results across practice and independent ranked play',
    async (page) => {
      const result = await page.evaluate(() => {
        const p = soloProfile('ليلى');
        p.recent = Array.from({ length: 8 }, (_, i) => ({
          rid: 'older-training-' + i,
          id: 'math',
          points: 10,
          at: Date.now() - 100000 - i,
          mode: 'practice',
          level: 'normal',
          seconds: 1,
          day: dayKey(),
          complete: false,
        }));
        store.extra.history = Array.from({ length: 8 }, (_, i) => ({
          rid: 'new-ranked-' + i,
          name: 'ليلى',
          id: 'math',
          points: 100,
          at: Date.now() - i,
        }));
        return soloSample(
          p,
          soloSkills.find((s) => s.id === 'numbers'),
        );
      });
      assert.deepEqual(result, { count: 8, average: 100 });
    },
  );
  await check(
    'Station scores use the same 100-point scale in the personal log and ranked board',
    async (page) => {
      await begin(page, { fields: { soloSkill: 'memory', soloMode: 'ranked', soloLevel: 'easy' } });
      await completeStation(page);
      await page.waitForFunction(() => state.resultShown === true);
      assert.equal(await page.evaluate(() => soloProfile('ليلى').recent[0].points), 100);
      assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), { points: 100, rounds: 1 });
      await page.evaluate(() => {
        openSoloHub('ليلى');
        const p = soloProfile('ليلى');
        p.active = {
          token: storageToken(),
          name: p.name,
          queue: ['hangman', 'word', 'wordguess'],
          at: 0,
          results: [],
          mode: 'ranked',
          level: 'normal',
          adaptive: true,
          started: Date.now(),
        };
        save();
        continueSoloSession();
        startWordsGame('hangman');
        readHangmanDraft(state.item.word, state.run, state.index);
        submitHangmanWord(state.run, state.index);
        nextHangman(state.run, state.index);
      });
      assert.equal(await page.evaluate(() => soloProfile('ليلى').recent[0].points), 100);
      assert.deepEqual(await page.evaluate(() => store.scores['ليلى']), { points: 200, rounds: 2 });
      assert.match(await page.locator('.celebrate .chip').innerText(), /100/);
      assert.equal(await page.evaluate(() => soloRoundPoints('target', 800)), 100);
    },
  );
  await check(
    'A detached delete confirmation cannot remove a different player profile',
    async (page) => {
      const value = await page.evaluate(() => {
        openSoloHub('ليلى');
        soloProfile('أحمد');
        save();
        openSoloProfiles();
        confirmSoloProfileRemoval(soloManageNames.indexOf('ليلى'));
        const token = soloPendingRemoval.token;
        openSoloProfiles();
        confirmSoloProfileRemoval(soloManageNames.indexOf('أحمد'));
        const before = JSON.stringify(store.extra.solo);
        removeSoloProfile(token);
        return JSON.stringify(store.extra.solo) === before;
      });
      assert.equal(value, true);
    },
  );
  await check(
    'Every generated station launches in solo mode with the correct profile and training lifecycle',
    async (page) => {
      for (const id of [
        'memory',
        'simon',
        'code',
        'lights',
        'pipes',
        'nonogram',
        'slide',
        'math',
        'pattern',
        'solo',
        'word',
        'hangman',
        'wordguess',
        'color',
        'target',
      ]) {
        const value = await page.evaluate((id) => {
          openSoloHub('ليلى');
          const p = soloProfile('ليلى');
          p.active = {
            token: storageToken(),
            name: p.name,
            queue: [id, id, id],
            at: 0,
            results: [],
            mode: 'practice',
            level: 'easy',
            adaptive: true,
            started: Date.now(),
          };
          save();
          continueSoloSession();
          if (id === 'memory') startMemory();
          else if (id === 'solo') startNumber('solo');
          else if (['lights', 'pipes', 'nonogram'].includes(id)) startLab(id);
          else if (['hangman', 'wordguess', 'target'].includes(id)) startWordsGame(id);
          else startExtra(id);
          return {
            screen,
            name: state.name,
            token: state.soloSessionToken,
            expected: p.active.token,
            solo: !state.duo,
            linked: !!soloLinkedRound(),
            fixed: !!(dailyRun || tourney?.active),
          };
        }, id);
        assert.equal(value.screen, id);
        assert.equal(value.name, 'ليلى');
        assert.equal(value.token, value.expected);
        assert.equal(value.solo, true);
        assert.equal(value.linked, true);
        assert.equal(value.fixed, false);
      }
    },
  );
  await check(
    'The full hub and all five session categories remain usable offline at 320px',
    async (page, context) => {
      await page.setViewportSize({ width: 320, height: 760 });
      await context.setOffline(true);
      for (const skill of ['all', 'memory', 'logic', 'numbers', 'words', 'focus']) {
        await begin(page, { fields: { soloSkill: skill, soloRounds: '8' } });
        const value = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          queue: soloProfile('ليلى').active.queue,
          mode: soloRound.mode,
        }));
        assert.equal(value.overflow, false, skill);
        assert.equal(value.queue.length, 8);
        assert.equal(value.mode, 'practice');
        assert.equal(
          value.queue.some((id, i) => i && id === value.queue[i - 1]),
          false,
        );
        await page.evaluate(() => openSoloHub());
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
      }
    },
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Solo v10: ${passed} browser checks passed.`);
