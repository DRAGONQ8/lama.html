import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(new URL('../lamma_universe.html', import.meta.url), 'utf8');
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
let passed = 0;

// Each check gets fresh storage and a new page; reloads within a check preserve its session.
async function check(name, test) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url);
    await page.evaluate(() => {
      store.players = ['أحمد', 'ليلى', 'سالم', 'نورة'];
      store.extra.motion = false;
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
const clickAction = (page, action, scope = '#app') => {
  // Zero-argument test actions may now carry generated run/turn guards in the UI.
  // Explicit arguments identify a particular action and must continue matching exactly.
  const noArguments = /^([A-Za-z_$][\w$]*)\(\)$/.exec(action),
    selector = noArguments
      ? `${scope} button[onclick^="${noArguments[1]}("]`
      : `${scope} button[onclick="${action}"]`;
  return page.locator(selector).filter({ visible: true }).last().click();
};

async function startLab(page, id, level = 'easy') {
  await page.evaluate((id) => setup(id), id);
  await page.locator('#labLevel').selectOption(level);
  await clickAction(page, `startLab('${id}')`);
}
async function solvePipes(page) {
  await page.evaluate(() => {
    for (let i = 0; i < state.board.length && !state.done; i++) {
      for (let turn = 0; turn < 4 && state.board[i] !== state.answer[i] && !state.done; turn++)
        document.querySelector(`#labBoard [data-index="${i}"]`).click();
    }
  });
}
async function startUndercover(page) {
  await page.evaluate(() => setup('undercover'));
  await page.locator('#partyRounds').selectOption('1');
  await page.locator('#partyDuration').selectOption('0');
  await clickAction(page, "startPartyGame('undercover')");
}
async function revealUndercover(page) {
  const count = await page.evaluate(() => state.players.length);
  for (let i = 0; i < count; i++) {
    await clickAction(page, 'undercoverReveal()');
    await clickAction(page, 'undercoverHide()');
  }
  await clickAction(page, 'undercoverDiscuss()');
  await clickAction(page, 'undercoverStartVote()');
}

try {
  await check(
    'The new filter lists exactly the six additions and preserves sorting',
    async (page) => {
      await clickAction(page, "setFilter('new')");
      const ids = await page
        .locator('#catalog .cardstart')
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute('onclick').match(/'([^']+)'/)[1]),
        );
      assert.deepEqual(ids.sort(), [
        'improv',
        'lights',
        'nonogram',
        'pipes',
        'teamcup',
        'undercover',
      ]);
      await page.locator('#catalogsort').selectOption('name');
      await page.reload();
      assert.equal(await page.locator('#catalogsort').inputValue(), 'name');
      assert.equal(await page.evaluate(() => games.length), 34);
    },
  );

  await check(
    'Solo lobby action clears incompatible party, search and favorite filters',
    async (page) => {
      await clickAction(page, "setWorld('party')");
      await page.locator('#search').fill('الدخيلة');
      await clickAction(page, 'toggleFavorites()');
      assert.equal(await page.locator('#catalog .gamecard').count(), 0);
      await clickAction(page, 'chooseSoloLobby()');
      const catalog = await page.evaluate(() => ({
        world,
        filter,
        searchQuery,
        onlyFavorites,
        count: filteredGames().length,
        solo: filteredGames().every(isSolo),
      }));
      assert.equal(catalog.world, 'all');
      assert.equal(catalog.filter, 'solo');
      assert.equal(catalog.searchQuery, '');
      assert.equal(catalog.onlyFavorites, false);
      assert.equal(catalog.solo, true);
      assert.ok(catalog.count > 0);
      assert.equal(await page.locator('#search').inputValue(), '');
    },
  );

  await check(
    'Keyboard favorites retain focus after toggling and removing the last card',
    async (page) => {
      await page.locator('#catalog .fav[data-game="lights"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.game), 'lights');
      assert.equal(
        await page.locator('#catalog .fav[data-game="lights"]').getAttribute('aria-pressed'),
        'true',
      );
      await page.locator('#catalog .fav[data-game="pipes"]').focus();
      await page.keyboard.press('Enter');
      await clickAction(page, 'toggleFavorites()');
      assert.equal(await page.locator('#catalog .gamecard').count(), 2);
      await page.locator('#catalog .fav[data-game="lights"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.game), 'pipes');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#catalog .gamecard').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
    },
  );

  await check(
    'Nonogram solver distinguishes ambiguous, constrained and impossible puzzles',
    async (page) => {
      const results = await page.evaluate(() => {
        const rows = [[1], [1]],
          columns = [[1], [1]];
        return {
          ambiguous: labNonogramSolve(rows, columns, [-1, -1, -1, -1]),
          unique: labNonogramSolve(rows, columns, [1, -1, -1, -1]),
          impossible: labNonogramSolve(rows, columns, [1, 1, -1, -1]),
        };
      });
      assert.equal(results.ambiguous.solutions.length, 2);
      assert.deepEqual(results.unique.solutions, [[1, 0, 0, 1]]);
      assert.equal(results.impossible.solutions.length, 0);
      assert.ok(Object.values(results).every((result) => !result.exhausted));
    },
  );

  await check('Generated logic boards have valid solutions at all three levels', async (page) => {
    const generated = await page.evaluate(() => {
      const outcomes = [];
      for (const level of ['easy', 'normal', 'hard']) {
        setup('nonogram');
        $('labLevel').value = level;
        startLab('nonogram');
        const givens = state.board.map((value, i) => (state.fixed[i] ? Number(value === 1) : -1));
        const found = labNonogramSolve(state.rowClues, state.colClues, givens);
        outcomes.push({
          id: 'nonogram',
          level,
          valid:
            !found.exhausted &&
            found.solutions.length === 1 &&
            found.solutions[0].every((v, i) => v === state.answer[i]),
        });
        setup('lights');
        $('labLevel').value = level;
        startLab('lights');
        const presses = labLightsSolve(state.board, state.size),
          board = [...state.board];
        if (presses) for (const i of presses) labToggleLights(board, i, state.size);
        outcomes.push({ id: 'lights', level, valid: !!presses?.length && !board.some(Boolean) });
        setup('pipes');
        $('labLevel').value = level;
        startLab('pipes');
        const connected = labPipeAnalysis(state.answer, state.size, state.source);
        outcomes.push({
          id: 'pipes',
          level,
          valid:
            connected.solved &&
            connected.connected.size === state.board.length &&
            !labPipeAnalysis(state.board, state.size, state.source).solved,
        });
      }
      home();
      return outcomes;
    });
    assert.equal(generated.length, 9);
    assert.ok(
      generated.every((result) => result.valid),
      JSON.stringify(generated),
    );
  });

  await check(
    'Lights solution length agrees with independent exhaustive 4×4 search',
    async (page) => {
      await startLab(page, 'lights');
      const puzzle = await page.evaluate(() => ({
        board: state.board,
        solution: labLightsSolve(state.board, state.size),
      }));
      const masks = Array.from({ length: 16 }, (_, i) => {
        const row = Math.floor(i / 4),
          column = i % 4;
        const neighbors = [i];
        if (row) neighbors.push(i - 4);
        if (row < 3) neighbors.push(i + 4);
        if (column) neighbors.push(i - 1);
        if (column < 3) neighbors.push(i + 1);
        return neighbors.reduce((mask, cell) => mask | (1 << cell), 0);
      });
      const target = puzzle.board.reduce((mask, value, i) => mask | (value << i), 0);
      const effects = new Uint16Array(65536),
        lengths = new Uint8Array(65536);
      let minimum = Infinity;
      for (let presses = 1; presses < 65536; presses++) {
        const bit = presses & -presses,
          previous = presses ^ bit;
        effects[presses] = effects[previous] ^ masks[Math.log2(bit)];
        lengths[presses] = lengths[previous] + 1;
        if (effects[presses] === target) minimum = Math.min(minimum, lengths[presses]);
      }
      assert.equal(puzzle.solution.length, minimum);
    },
  );

  for (const id of ['nonogram', 'lights', 'pipes']) {
    await check(`${id} finishes through board controls and saves one score`, async (page) => {
      await startLab(page, id);
      const before = await page.evaluate(() => ({ points: totalPoints(), rounds: totalRounds() }));
      if (id === 'nonogram') {
        await page.evaluate(() => {
          for (let i = 0; i < state.answer.length && !state.done; i++)
            if (state.answer[i] && !state.fixed[i])
              document.querySelector(`#labBoard [data-index="${i}"]`).click();
        });
      } else if (id === 'lights') {
        const solution = await page.evaluate(() => labLightsSolve(state.board, state.size));
        for (const index of solution)
          await page.locator(`#labBoard [data-index="${index}"]`).click();
      } else await solvePipes(page);
      assert.equal(await page.locator('#app .success').count(), 1);
      const outcome = await page.evaluate((id) => {
        labFinish('تكرار', 'تكرار');
        result(id, 'تكرار', 'تكرار', 0);
        return {
          done: state.done,
          earned: state.points,
          points: totalPoints(),
          rounds: totalRounds(),
          played: store.extra.played[id],
          timers: timers.length,
        };
      }, id);
      assert.equal(outcome.done, true);
      assert.equal(outcome.rounds - before.rounds, 1);
      assert.equal(outcome.points - before.points, outcome.earned);
      assert.ok(outcome.earned > 0);
      assert.equal(outcome.played, 1);
      assert.equal(outcome.timers, 0);
    });
  }

  await check(
    'Puzzle hints, undo and pause preserve costs and block background input',
    async (page) => {
      await startLab(page, 'lights');
      await clickAction(page, 'labHint()');
      await clickAction(page, 'labHint()');
      assert.equal(await page.evaluate(() => state.hints), 1);
      const initial = await page.evaluate(() => [...state.board]);
      const hint = await page.evaluate(() => state.hintCell);
      await page.locator(`#labBoard [data-index="${hint}"]`).click();
      await clickAction(page, 'labUndo()');
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      assert.equal(await page.evaluate(() => state.hints), 1);
      await page.evaluate(() => openSettings());
      await page.evaluate(() => {
        labLightsTap(0);
        labUndo();
        labHint();
      });
      assert.deepEqual(await page.evaluate(() => state.board), initial);
      assert.equal(await page.evaluate(() => state.hints), 1);
    },
  );

  await check('Team cup rotates all modes and awards each member once', async (page) => {
    await page.evaluate(() => {
      store.players.push('حمد');
      setup('teamcup');
    });
    await page.locator('#partyCycles').selectOption('3');
    await clickAction(page, "startPartyGame('teamcup')");
    const teams = await page.evaluate(() => state.teams);
    assert.equal(new Set(teams.flat()).size, 5);
    assert.ok(Math.abs(teams[0].length - teams[1].length) <= 1);
    for (let turn = 0; turn < 6; turn++) {
      await clickAction(page, 'teamCupBegin()');
      const mode = await page.evaluate(() => state.mode);
      if (mode === 'trivia') {
        const correct = await page.evaluate(() => state.choices.indexOf(state.card.answer));
        await clickAction(page, `teamCupTrivia(${correct})`);
        await page.evaluate((correct) => teamCupTrivia(correct), correct);
      } else {
        await clickAction(page, "teamCupRecord('correct')");
        if (turn === 0) {
          await clickAction(page, "teamCupRecord('skip')");
          assert.equal(await page.evaluate(() => state.turnScore), 8);
          await clickAction(page, 'teamCupUndo()');
          assert.equal(await page.evaluate(() => state.turnScore), 10);
          await clickAction(page, "teamCupRecord('correct')");
        }
      }
      await clickAction(page, 'teamCupEndTurn()');
      await page.evaluate(() => teamCupEndTurn());
      assert.equal(await page.evaluate(() => state.history.length), turn + 1);
      await clickAction(page, 'teamCupAdvance()');
    }
    const result = await page.evaluate(() => {
      finishTeamCup();
      teamCupAdvance();
      return {
        done: state.done,
        scores: state.teamScores,
        results: state.results,
        records: store.scores,
        history: state.history,
        rounds: totalRounds(),
        timers: timers.length,
      };
    });
    assert.equal(result.done, true);
    assert.deepEqual(result.scores, [40, 30]);
    assert.equal(new Set(result.history.map((turn) => turn.mode)).size, 3);
    assert.equal(result.rounds, 5);
    for (const [team, members] of teams.entries())
      for (const name of members) {
        const expected = Math.floor(result.scores[team] / members.length) + (team === 0 ? 10 : 0);
        assert.equal(result.results[name], expected);
        assert.deepEqual(result.records[name], { points: expected, rounds: 1 });
      }
    assert.equal(result.timers, 0);
  });

  await check(
    'Undercover removes paused secrets, keeps ballots private and scores once',
    async (page) => {
      await startUndercover(page);
      await clickAction(page, 'undercoverReveal()');
      assert.equal(await page.locator('.party-secret-word').count(), 1);
      await page.evaluate(() => openSettings());
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      assert.equal(await page.evaluate(() => state.stage), 'reveal-handoff');
      await page.evaluate(() => closeModal());
      assert.equal(await page.locator('.party-secret-word').count(), 0);
      await revealUndercover(page);
      const hidden = await page.evaluate(() => state.hidden[0]);
      for (let voter = 0; voter < 4; voter++) {
        await clickAction(page, 'undercoverOpenVote()');
        await page.evaluate(() => undercoverChoose(state.voteIndex));
        assert.equal(await page.evaluate(() => state.voteChoice), null);
        const choice = voter === hidden ? -1 : hidden;
        await clickAction(page, `undercoverChoose(${choice})`);
        if (voter === 0) {
          await page.evaluate(() => openSettings());
          assert.equal(await page.evaluate(() => state.voteChoice), null);
          assert.equal(await page.locator('.party-ballots').count(), 0);
          await page.evaluate(() => closeModal());
          await clickAction(page, 'undercoverOpenVote()');
          await clickAction(page, `undercoverChoose(${choice})`);
        }
        await clickAction(page, 'undercoverConfirmVote()');
        await page.evaluate(() => undercoverConfirmVote());
        assert.equal(await page.evaluate(() => state.votes.length), voter + 1);
        if (voter < 3) assert.equal(await page.locator('.party-ballots').count(), 0);
      }
      assert.equal(await page.evaluate(() => state.stage), 'round-result');
      const expected = await page.evaluate(() =>
        state.players.map((name, i) => ({ name, points: state.hidden.includes(i) ? 0 : 30 })),
      );
      await clickAction(page, 'undercoverAdvance()');
      const result = await page.evaluate(() => {
        undercoverAdvance();
        finishPartySession('undercover', 'تكرار', false);
        return {
          done: state.done,
          scores: store.scores,
          rounds: totalRounds(),
          timers: timers.length,
        };
      });
      assert.equal(result.done, true);
      assert.equal(result.rounds, 4);
      for (const { name, points } of expected)
        assert.deepEqual(result.scores[name], { points, rounds: 1 });
      assert.equal(result.timers, 0);
    },
  );

  await check(
    'Undercover allows one runoff and resolves a second tie without duplicate awards',
    async (page) => {
      await startUndercover(page);
      await revealUndercover(page);
      for (let ballot = 0; ballot < 2; ballot++) {
        for (let voter = 0; voter < 4; voter++) {
          await clickAction(page, 'undercoverOpenVote()');
          await clickAction(page, `undercoverChoose(${(voter + 1) % 4})`);
          await clickAction(page, 'undercoverConfirmVote()');
        }
        if (!ballot) {
          assert.equal(await page.evaluate(() => state.stage), 'tie');
          assert.equal(await page.evaluate(() => totalRounds()), 0);
          await clickAction(page, 'undercoverRunoff()');
        }
      }
      assert.equal(await page.evaluate(() => state.stage), 'round-result');
      const result = await page.evaluate(() => ({
        hidden: state.hidden[0],
        names: state.players,
        scores: store.scores,
        rounds: totalRounds(),
      }));
      assert.equal(result.rounds, 4);
      assert.equal(result.scores[result.names[result.hidden]].points, 30);
      await clickAction(page, 'undercoverAdvance()');
      assert.equal(await page.evaluate(() => totalRounds()), 4);
    },
  );

  await check(
    'Creative replies remain anonymous, escape HTML and count every vote once',
    async (page) => {
      await page.evaluate(() => setup('improv'));
      await page.locator('#partyRounds').selectOption('3');
      await clickAction(page, "startPartyGame('improv')");
      for (let round = 0; round < 3; round++) {
        await clickAction(page, 'creativeStartAnswers()');
        for (let author = 0; author < 4; author++) {
          await clickAction(page, 'creativeOpenAnswer()');
          const reply =
            author === 0
              ? `<img src=x onerror=alert(1)> فكرة ${round}`
              : `فكرة مبتكرة ${round}-${author}`;
          await page.locator('#creativeAnswer').fill(reply);
          if (!round && !author) {
            await page.evaluate(() => openSettings());
            assert.equal(await page.locator('#creativeAnswer').count(), 0);
            assert.equal(await page.evaluate(() => state.stage), 'answer-handoff');
            await page.evaluate(() => closeModal());
            await clickAction(page, 'creativeOpenAnswer()');
            assert.equal(await page.locator('#creativeAnswer').inputValue(), reply);
          }
          await clickAction(page, 'creativeSubmit()');
          await page.evaluate(() => creativeSubmit());
          assert.equal(await page.evaluate(() => state.entries.length), author + 1);
          if (author < 3) assert.equal(await page.locator('#creativeAnswer').count(), 0);
        }
        const gallery = await page.locator('.party-creative-cards').innerText();
        const names = await page.evaluate(() => state.players);
        assert.ok(names.every((name) => !gallery.includes(name)));
        assert.equal(await page.locator('#app img').count(), 0);
        assert.ok(gallery.includes('<img src=x onerror=alert(1)>'));
        await clickAction(page, 'creativeStartVoting()');
        for (let voter = 0; voter < 4; voter++) {
          await clickAction(page, 'creativeOpenVote()');
          const entry = await page.evaluate(() => {
            creativeChoose(state.entries.findIndex((entry) => entry.author === state.voteIndex));
            return {
              selected: state.voteChoice,
              target: state.entries.findIndex(
                (entry) => entry.author === (state.voteIndex + 1) % state.players.length,
              ),
            };
          });
          assert.equal(entry.selected, null);
          await clickAction(page, `creativeChoose(${entry.target})`);
          await clickAction(page, 'creativeConfirmVote()');
          await page.evaluate(() => creativeConfirmVote());
          assert.equal(await page.evaluate(() => state.votes.length), voter + 1);
        }
        assert.equal(await page.evaluate(() => state.stage), 'creative-result');
        assert.equal(await page.evaluate(() => totalRounds()), 0);
        await clickAction(page, 'creativeAdvance()');
      }
      const result = await page.evaluate(() => {
        creativeAdvance();
        finishPartySession('improv', 'تكرار', true);
        return {
          done: state.done,
          players: state.players,
          scores: store.scores,
          rounds: totalRounds(),
          timers: timers.length,
        };
      });
      assert.equal(result.done, true);
      assert.equal(result.rounds, 4);
      for (const name of result.players)
        assert.deepEqual(result.scores[name], { points: 45, rounds: 1 });
      assert.equal(result.timers, 0);
    },
  );

  await check(
    'A three-station route resumes after reload and persists its final result',
    async (page) => {
      await page.locator('.discover-drawer > summary').click();
      await clickAction(page, "openRoute('explore')");
      await clickAction(page, "startRoute('explore')", '#modal');
      await page.locator('#arcadeMode').selectOption('exit');
      await clickAction(page, "startArcade('maze')");
      await page.evaluate(() => {
        const path = mazePath(state.grid, state.width, state.position, state.exit);
        for (let i = 1; i < path.length; i++) {
          const difference = path[i] - path[i - 1];
          mazeMove(
            difference === 1
              ? 'right'
              : difference === -1
                ? 'left'
                : difference === state.width
                  ? 'down'
                  : 'up',
          );
        }
        result('maze', 'تكرار', 'تكرار', 0);
      });
      const first = await page.evaluate(() => experience().route);
      assert.equal(first.at, 1);
      assert.deepEqual(
        first.results.map((result) => result.id),
        ['maze'],
      );
      await clickAction(page, 'home()');
      await page.reload();
      assert.equal(await page.locator('.continue-route').count(), 1);
      assert.deepEqual(await page.evaluate(() => experience().route), first);
      await clickAction(page, 'continueRoute()');
      await page.locator('#labLevel').selectOption('easy');
      await clickAction(page, "startLab('pipes')");
      await solvePipes(page);
      const second = await page.evaluate(() => experience().route);
      assert.equal(second.at, 2);
      assert.deepEqual(
        second.results.map((result) => result.id),
        ['maze', 'pipes'],
      );
      await clickAction(page, 'continueRoute()');
      await clickAction(page, "startWordsGame('hangman')");
      await page.evaluate(() => {
        for (const letter of [...new Set(state.item.key)])
          [...document.querySelectorAll('.letter-key')]
            .find((button) => button.textContent === letter)
            .click();
      });
      await clickAction(page, 'nextHangman()');
      const complete = await page.evaluate(() => ({
        saved: experience().route,
        best: experience().completed.explore,
        rounds: totalRounds(),
        timers: timers.length,
      }));
      assert.equal(complete.saved, null);
      assert.equal(complete.rounds, 3);
      assert.equal(
        complete.best,
        second.results.reduce((sum, result) => sum + result.points, 0) + 20,
      );
      assert.equal(complete.timers, 0);
      await page.reload();
      assert.equal(await page.evaluate(() => experience().completed.explore), complete.best);
      assert.equal(await page.locator('.continue-route').count(), 0);
    },
  );

  await check(
    'Changing games preserves completed route stations without saving its live puzzle',
    async (page) => {
      await page.evaluate(() => {
        startRoute('master');
        startExtra('code');
        const wrong = [...state.secret];
        [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
        wrong.forEach((digit, i) => ($('digit' + i).value = String(digit)));
        submitCode();
        captureSoloSession();
        home();
      });
      assert.equal(await page.evaluate(() => store.extra.savedSession), null);
      assert.equal(await page.evaluate(() => experience().route.at), 0);
      await page.reload();
      await clickAction(page, 'continueRoute()');
      await clickAction(page, "startExtra('code')");
      assert.equal(await page.evaluate(() => state.attempts.length), 0);
      await page.evaluate(() => {
        for (let i = 0; i < state.length; i++) $('digit' + i).value = String(state.secret[i]);
        submitCode();
        continueRoute();
      });
      const saved = await page.evaluate(() => experience().route);
      assert.equal(saved.at, 1);
      await page.evaluate(() => {
        continueRoute();
        startExtra('math');
        home();
        setup('merge');
      });
      assert.deepEqual(await page.evaluate(() => experience().route), saved);
      assert.equal(await page.evaluate(() => store.extra.savedSession), null);
      await page.reload();
      await clickAction(page, 'continueRoute()');
      assert.equal(await page.evaluate(() => state.id), 'math');
      assert.equal(await page.evaluate(() => screen), 'setup');
    },
  );

  for (const id of ['code', 'slide', 'sudoku']) {
    await check(
      `${id} restores its board and assistance history after home and reload`,
      async (page) => {
        await page.evaluate((id) => {
          setup(id);
          startExtra(id);
        }, id);
        const saved = await page.evaluate((id) => {
          if (id === 'code') {
            const wrong = [...state.secret];
            [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
            wrong.forEach((digit, i) => ($('digit' + i).value = String(digit)));
            submitCode();
            codeHint();
            $('digit1').value = String((state.secret[1] + 1) % 10);
            readCodeDraft();
          } else if (id === 'slide') {
            const next = slideNeighbors(state.empty, state.size).find((i) => {
              const board = [...state.board];
              [board[i], board[state.empty]] = [board[state.empty], board[i]];
              return !slideSolved(board);
            });
            slideMove(next);
          } else {
            toggleSudokuNotes();
            putSudoku(1);
            putSudoku(3);
            toggleSudokuCandidates();
            checkSudoku();
          }
          captureSoloSession();
          const snapshot = structuredClone(store.extra.savedSession);
          home();
          return snapshot;
        }, id);
        assert.equal(saved.id, id);
        await page.reload();
        await clickAction(page, 'resumeSavedGame()');
        const restored = await page.evaluate(() => {
          captureSoloSession();
          return {
            id: screen,
            data: store.extra.savedSession.data,
            done: state.done,
            history: state.history?.length || 0,
          };
        });
        assert.equal(restored.id, id);
        assert.equal(restored.done, false);
        assert.equal(restored.history, 0);
        assert.deepEqual(restored.data, saved.data);
      },
    );
  }

  await check('Invalid checkpoints and duplicate zero-point results are rejected', async (page) => {
    const outcome = await page.evaluate(() => {
      setup('slide');
      startExtra('slide');
      captureSoloSession();
      const malformed = structuredClone(store.extra.savedSession);
      malformed.data.board[0] = malformed.data.board[1];
      const valid = normalizeSavedSession(malformed);
      home();
      setup('snake');
      startArcade('snake');
      result('snake', 'انتهت الجولة', 'صفر', 0);
      result('snake', 'انتهت الجولة', 'صفر', 0);
      return {
        valid,
        rounds: totalRounds(),
        played: store.extra.played.snake,
        points: totalPoints(),
      };
    });
    assert.deepEqual(outcome, { valid: null, rounds: 1, played: 1, points: 0 });
  });

  await check(
    'Arabic canonical forms and browser shortcuts preserve gameplay input',
    async (page) => {
      const input = await page.evaluate(() => {
        setup('merge');
        startArcade('merge');
        state.board = [0, 2, 0, 0, ...Array(12).fill(0)];
        state.history = { board: [4, ...Array(15).fill(0)], score: 4, moves: 1 };
        for (const options of [
          { key: 'ArrowLeft', ctrlKey: true },
          { key: 'z', ctrlKey: true },
          { key: 'ArrowLeft', isComposing: true },
          { key: 'a', altKey: true },
        ])
          document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...options }));
        return {
          board: state.board,
          moves: state.moves,
          history: !!state.history,
          letters: [
            wordsNormalizeKey('و\u0654'),
            wordsNormalizeKey('ي\u0654'),
            wordsNormalizeKey('أإآ'),
          ],
        };
      });
      assert.equal(input.board[1], 2);
      assert.equal(input.moves, 0);
      assert.equal(input.history, true);
      assert.deepEqual(input.letters, ['ؤ', 'ئ', 'ااا']);
    },
  );

  await check('Mobile mine fields retain scroll and keyboard focus across flags', async (page) => {
    await page.setViewportSize({ width: 320, height: 950 });
    const result = await page.evaluate(() => {
      setup('mines');
      $('arcadeSize').value = '16';
      startArcade('mines');
      const scroller = document.querySelector('.mines-scroll');
      scroller.scrollLeft = -120;
      if (!scroller.scrollLeft) scroller.scrollLeft = 120;
      const before = scroller.scrollLeft;
      document.querySelector('.mine-cell[data-index="0"]').focus({ preventScroll: true });
      mineFlag(0);
      document.activeElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'f', repeat: true, bubbles: true }),
      );
      return {
        before,
        after: document.querySelector('.mines-scroll').scrollLeft,
        focused: document.activeElement.dataset.index,
        flag: state.flags.has(0),
      };
    });
    assert.notEqual(result.before, 0);
    assert.equal(result.after, result.before);
    assert.equal(result.focused, '0');
    assert.equal(result.flag, true);
  });

  await check(
    'Target taps score on pointer-down, preserve keyboard focus and count final expiry',
    async (page) => {
      await page.evaluate(() => {
        setup('target');
        startWordsGame('target');
        clearTimers();
      });
      const box = await page.locator('.target-cell.active').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      assert.equal(await page.evaluate(() => state.hits), 1);
      await page.mouse.up();
      assert.equal(await page.evaluate(() => state.hits), 1);
      assert.equal(await page.evaluate(() => state.wrong), 0);
      const keyboard = await page.evaluate(() => {
        setup('target');
        startWordsGame('target');
        clearTimers();
        const button = document.querySelector('.target-cell.active'),
          slot = String(state.slot);
        button.focus();
        button.click();
        return { hits: state.hits, focus: document.activeElement.dataset.index, slot };
      });
      assert.equal(keyboard.hits, 1);
      assert.equal(keyboard.focus, keyboard.slot);
      const expired = await page.evaluate(() => {
        setup('target');
        startWordsGame('target');
        clearTimers();
        state.targetExpires = state.duration * 1000 - 50;
        state.endAt = Date.now() - 1;
        const before = totalRounds();
        finishTarget();
        finishTarget();
        return { misses: state.misses, rounds: totalRounds() - before };
      });
      assert.deepEqual(expired, { misses: 1, rounds: 1 });
    },
  );

  console.log(`\n${passed} expansion and regression checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
