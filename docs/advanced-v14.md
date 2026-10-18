# Advanced games: version 14

The advanced module contains 12 existing games. The changes keep their rules,
scoring scales, saved-session format and single-file packaging compatible. No new
network requests or runtime dependencies were introduced.

| Game                        | Changes                                                                                                                                                                                      | Individual Chromium verification                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tic-tac-toe (`ttt`)         | Cells announce row, column and occupancy. The last played coordinate and player stay visible. Home/End move focus to the first/last legal cell.                                              | A complete two-player win through real buttons; occupied-cell exclusion; keyboard navigation; opening the result cannot award points twice.                                       |
| Connect Four (`connect`)    | Column controls describe the row where a piece will land, or a full column. Visible last-action coordinates and Home/End navigation use the actual board.                                    | Six real drops fill one column; it becomes disabled and is skipped by navigation; a complete horizontal win highlights exactly four cells.                                        |
| Safe code (`code`)          | Submitting a valid incomplete solution keeps focus in the quick entry and selects its contents for replacement.                                                                              | Arabic digits, leading zero, repeated-digit rejection, duplicate-aware feedback and successful completion through the form.                                                       |
| Sequence memory (`simon`)   | Completing a stage immediately refreshes counters, clears its completed trace and disables input pads during the transition.                                                                 | Real playback/recall, transition state, pause/restart, another sequence and final-stage completion/review.                                                                        |
| Sliding puzzle (`slide`)    | A second touch cannot replace or cancel the active gesture. Pointer cancellation only clears the matching pointer; gestures from a previous run do not block a new run.                      | A two-step fixture tests two simultaneous pointers, one-move swipe behavior, synthetic-click suppression, undo and keyboard completion.                                           |
| Sudoku (`sudoku`)           | Checking a fresh grid with no player entries explains what to do without deducting five points.                                                                                              | Empty and repeated checks; immutable givens; bulk notes and exact undo; completion of an actual generated unique-solution puzzle.                                                 |
| Scrambled letters (`word`)  | Revealed prefixes normalize each letter separately. The general Arabic answer matcher can no longer remove the article `ال` and bypass that prefix lock.                                     | Replacing a disclosed `ال` is rejected without consuming a guess; three words are submitted through the actual form and finish the round.                                         |
| Arithmetic (`math`)         | Question generation retries duplicate expressions. Typed submissions transfer focus to the next-question button.                                                                             | A five-question missing-operand round, Arabic typed answers, feedback timer freeze, a wrong-answer practice round and no extra practice score.                                    |
| Colour attention (`color`)  | Question generation retries repeated word/ink combinations; small finite pools use bounded retries.                                                                                          | All fifteen questions completed using the live answer buttons, covering ink, word-meaning and shape rules; full-score result.                                                     |
| Number patterns (`pattern`) | Question generation retries duplicate visible sequences, including fixed cube/factorial sequences in long rounds. Typed submissions retain the keyboard path to the next question.           | Eight missing-value questions; workpad only reads visible numbers and charges once; typed completion with the expected three-point deduction.                                     |
| Spy (`spy`)                 | Setup, spy-count eligibility, role selection and voting all use the common game-participant provider. Choosing a search result focuses confirmation without reopening the mobile keyboard.   | Three selected participants from five registered names; private role pause/handoff; three secret ballots; selected-word confirmation and final scores restricted to participants. |
| Forbidden words (`taboo`)   | Each action announces the actual point change, including the five-point streak bonus and a clamped penalty. Scoring-button focus survives card replacement. Undo announces full restoration. | Three correct cards award 35 points; undo restores 20 and a streak of two; every player's turn completes once with expected results.                                              |

The common quiz generator retries at most 16 candidates per question. It reduces
repetition while preserving deterministic seeded challenges; it does not promise
unique questions when a configured round exceeds the available colour pool.

## Browser coverage

Run:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/advanced-v14.mjs
```

The suite assembles the current source modules in memory, validates 14 browser
cases and rejects uncaught browser exceptions. `LAMMA_TEST_HTML=/path/to/file.html`
can instead exercise the generated standalone release. `ADVANCED_CHECK=substring`
filters a case during diagnosis.

The first twelve cases exercise each game separately. A thirteenth checks
reproducible question banks, answer/choice validity and diversity for all three
quiz games. The final case checks every advanced game at a 320-pixel viewport.
Screenshots are saved under `test-results/advanced-v14/`, including a separate mobile
image for each of the twelve games.

The tests use short deterministic puzzle/word/memory fixtures for specific
regressions and real generated Sudoku/quiz content for full game flows. They do
not claim to exhaust every random puzzle, physical touch device, browser engine
or audio device. Existing v7–v9 suites remain relevant for the older mechanics,
accessibility and session restoration paths.
