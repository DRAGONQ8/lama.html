# Core games v14

The eight games in `src/core.js` were reviewed separately. Existing storage keys, score rules, difficulty settings, and direct gameplay function contracts are preserved.

| Game                    | Change                                                                                                                                                                                 | Browser coverage                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| أطلع رقمك (`finder`)    | The maximum remaining guesses now reflects a custom, off-center question followed by optimal midpoint questions. Detached answer controls cannot submit another answer after a render. | Custom question and updated guarantee; undo; rejected false sealed answer; complete sealed search and one recorded result.                            |
| خمن رقمي (`solo`)       | A typed draft survives a hint or board rerender. Accepted guesses clear the field. The existing result review now includes the successful final guess through `soloSearchReviewHTML`.  | Hint draft; free out-of-range rejection; Arabic digit entry; successful search and complete review; stale form rejected in a new round.               |
| شنو في بالك؟ (`mind`)   | The initial candidate pool is computed once, and an empty pool is rejected before replacing setup. Removed notebook fields cannot replace the current search.                          | Unknown answer preserves candidates; stale search rejected; undo restores evidence; questions infer a known item and score once.                      |
| منو أنا؟ (`who`)        | The final incorrect guess is retained. End-of-round review shows all clues, purchased answers, and incorrect guesses.                                                                  | Two-guess loss including the last guess; escaped markup; stale hint rejected; normalized alias wins a new round.                                      |
| تحدي الذاكرة (`memory`) | The board and pair progress expose meaningful accessible names and values. Removed cards cannot flip cards in a replacement view.                                                      | A real mismatch locks then hides; old card rejected; full image/name board completion; pair progress and one recorded result.                         |
| مثّلها (`mime`)         | The skip button visibly disables when the three-skip story budget is exhausted. The result reveals the final uncounted word when a turn ends before that word is answered.             | Three-skip budget and undo; removed scoring button rejected; hidden-word privacy; three-part story bonus; classic uncounted-word review.              |
| كلمة السر (`secret`)    | End-of-turn review retains the question evidence. Question progress has accessible values. A replenished random pool avoids immediately repeating the previous secret.                 | Private handoff; escaped notes; incorrect written guess and undo; ten questions; final canonical/alias answer; evidence review; one award per player. |
| أسرع واحد (`reaction`)  | Orange stop-signal mistakes have their own explanation and trial record. Removed normal/choice controls cannot trigger a later screen or round.                                        | Stale start tap rejected; early penalty; orange penalty and recorded reason; valid response; complete trial review and one recorded result.           |

All eight use a shared guard attached to inline event controls. The guard checks the state object, current screen, and whether the control is still attached to the current application view before its inline handler runs. It retains existing keyboard and direct function APIs.

## Reproduce

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/core-v14.mjs
```

The test assembles current source in memory, serves it over localhost, and uses real Chromium through Playwright. Each check gets a fresh browser context and fails on uncaught browser exceptions. Important transitions are driven through visible buttons and form fields. Hidden targets/timestamps are set in a few checks to make the expected outcome reproducible; this does not test every random arrangement or measure real human reaction speed. The final check opens all eight games offline at a 320 px viewport and checks horizontal overflow.

Verified: all 9 v14 checks passed, followed by all 8 checks in `tests/core-v13.mjs`. The memory image/name board, memory result, and expanded mime result were also captured and visually inspected at 390 px. Cards, results, logs, and actions fit without clipping. Local screenshots are in `test-results/core-v14/` (ignored test artifacts).
