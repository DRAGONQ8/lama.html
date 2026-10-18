# Arcade v14 review

The four arcade games were inspected and updated in order: Snake, Merge 2048,
Minesweeper, then Maze. No storage schema, scoring cap, seeded competition rule,
or public game ID was changed.

## Snake

- Training accepts a tap on a cell adjacent to the head. Each tap moves exactly
  one cell; reverse directions and remote taps remain ignored. Existing swipe,
  direction-button, and keyboard controls remain available.
- A readable board description gives the head and fruit coordinates. A carried
  orchard order changes its target to the depot. Training announces updates;
  continuous play uses `aria-live="off"` to avoid announcing every moving frame.
- The real move and the training safety preview now use the same collision
  predicate, including wraparound, rocks, growth, and the vacating tail.
- Removed the write-only `nextDirection` and `queued` fields; the authoritative
  direction and two-entry turn queue remain.

## Merge 2048

- Forecast direction buttons remain mounted when a move redraws the board.
  Applying a forecast and continuing from a goal return keyboard focus to an
  available control. A second Enter can preview another move without silently
  advancing the game.
- The board's accessible description names each row from left to right and
  reports each crate's own layer count. Forecast controls describe their visible
  merge score and workshop damage without consuming the spawn stream.
- Existing no-op, five-level undo, deterministic spawn, workshop, 4×4, 5×5,
  win/continue, and score behavior remain unchanged.

## Minesweeper

- Safe inspection outlines the eight neighbors of the selected revealed clue,
  making large fields easier to read without exposing any hidden cell values.
- Matching flag totals explicitly warn that flag positions still need checking
  before opening neighbors.
- Home/End move to either end of the current row; PageUp/PageDown move to either
  end of the current column. These controls update focus and selection without
  generating, revealing, flagging, or charging a hint. The instructions document
  these keys. Enter retains its documented explicit reveal behavior.

## Maze

- A star or exit illuminated by a hint can be selected by touch. Previously the
  renderer showed it while the tap handler rejected it as undiscovered.
- One visibility predicate now controls both drawing and tap eligibility.
- A persistent control hides and restores the current hint route for free.
  Restoring the identical route through the hint button also costs no additional
  hint. Following or leaving a route keeps its existing path behavior, and
  lantern exploration is recorded separately from temporary illumination.

## Browser verification

Run `CHROMIUM_PATH=/usr/bin/chromium node tests/arcade-v14.mjs`.
The test assembles the current sources in memory unless `LAMMA_TEST_HTML` or
`--built` specifies an artifact. It uses real Chromium, browser keyboard, touch,
button, and cell-click events; deterministic browser-side fixtures exercise
rare collision, courier, and merge transitions. Maze completion walks generated
maps through the actual game move handler in each of its four modes.

The v14 checks cover every game separately, including Snake collision types and
three deliveries; Merge forecast focus, undo, win and continuation; Mines first
click safety on all sizes, public-data inspection, win/loss, survey scans and
extraction; Maze exit/stars/keys/courier completion, legal gates, hint visibility,
and replay. A 390px touch viewport checks all four games for page overflow and
saves screenshots under `test-results/arcade-v14/`.

These are finite regression scenarios, not a proof that every possible random
board, browser, or device is defect-free. No claim of exhaustive error freedom
is made.

Verified in Chromium: v14 **13/13**, v13 **7/7**, v12 arcade reliability
**6/6**, and v8 **12/12** checks passed against assembled current sources.
The four mobile screenshots were also opened and reviewed visually.
