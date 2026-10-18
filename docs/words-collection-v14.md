# Words and knowledge games: v14 review

The review covers each game registered by `src/words.js` and `src/collection.js`. It keeps the existing local data, game IDs, scores, settings and offline HTML contract.

| Game                     | Change                                                                                                                                                                                                                           | Browser verification                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| كنز المعلومات (`trivia`) | Focus moves to the current question at start and between questions, then to Next when an answer or deadline locks the question. This closes the keyboard navigation gap after DOM replacement.                                   | Classic, confidence with half-options, and fact-check modes; correct answers; timed expiry; keyboard Next and question focus.                                                                                                           |
| اكشف الكلمة (`hangman`)  | The clue receives initial focus; a full-word guess returns focus to readable feedback, and completing a word leads directly to Next.                                                                                             | Classic, rescue and phrase missions; native Arabic input; repeated wrong full-word guesses do not cost twice; correct guesses and final scoring.                                                                                        |
| كلمة في ست (`wordguess`) | Submitted tiles show ✓, ↔ or × as well as their color. Tile and keyboard labels describe a gray repeated letter accurately. Native submission leads to the next turn's feedback; wins lead to the result button.                 | Diacritic normalization, accepted/rejected guesses, feedback labels and pseudo-element shapes, duplicate-letter evaluation, native Enter and final result. Existing inference, hypothesis and candidate-notebook regressions also pass. |
| صياد الأهداف (`target`)  | Keyboard focus enters the playing grid or moving arena immediately, and the grid has a named group linked to its feedback.                                                                                                       | Real pointer and keyboard input in speed, precision, sequence, memory and moving-intercept modes; bomb penalties, ordered paths, memory bonus, stale-click rejection and result.                                                        |
| من العلم؟ (`flags`)      | Answer feedback compares the chosen and correct flags, country names and continents so similar flags can be learned visually.                                                                                                    | Both question directions, six choices, Gulf filter, wrong-answer comparison, single-answer locking, final review and seeded choices.                                                                                                    |
| صح أو خطأ (`truefalse`)  | Any statement can be marked for later review, including a correct answer. The score-free practice includes marked statements and mistakes.                                                                                       | Marked-state persistence after answering, detached old control rejection, practice of a correctly answered statement, unchanged recorded scores/history, seeded questions.                                                              |
| رتّبها (`order`)         | Tap a card name and its destination to move directly across the list. Repeating the same card cancels selection. Full snapshots make both direct moves and arrows undoable. Arrow shortcuts leave unrelated page controls alone. | Touch selection/cancel/relocation, exact undo, keyboard arrows, a full UI-solved sequence, locked controls, scoring, seeded normal/reversed questions.                                                                                  |

Numeric progress and score ratios use isolated left-to-right spans inside the Arabic interface, keeping `1 / 3` and `0 / 100` in their intended visual order. Labels keep the page’s right-to-left direction. This final display-only adjustment does not change values or scoring.

Collection shuffling now uses `gameRand` where available, matching the existing seeded-randomness contract used by the other game modules. This does not add the collection games to the daily or tournament menus.

## Validation

Run browser checks with:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/words-collection-v14.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/words-lab-v13.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/collection-v13.mjs
```

Recorded Chromium results: **9/9 v14 grouped checks**, **12/12 words-lab v13 regression checks**, and **7/7 collection v13 regression checks** passed. The v14 mobile check passed all **14 game/theme Axe scans** without WCAG A/AA violations or horizontal overflow. The wordguess, picked ordering-card and flag-comparison screenshots were visually inspected at 320px; the controls and Arabic text fit their panels.

The new suite assembles the current source modules in memory, serves them locally, and launches real Chromium with Playwright. It checks each game separately. Its last check runs all seven games offline at a 320px viewport with the 130% text preference, in both themes, using Axe WCAG A/AA checks. Screenshots of those seven dark-theme states are saved to `test-results/words-collection-v14/` for visual inspection.

The target-input test freezes the repeating timer after observing the real memory-preview transition so exact browser clicks can be asserted without CPU scheduling races. It still uses actual pointer/keyboard events, the game's collision/penalty/path logic, and the real result flow. Selected deterministic words and one-question ordering decks make the changed behavior reproducible; existing suites exercise full multi-question rounds and review/practice paths.

These checks cover the listed flows and Chromium's emulated mobile/touch input. They are not exhaustive proof of every device, physical Arabic input method, screen reader or possible interaction sequence.
