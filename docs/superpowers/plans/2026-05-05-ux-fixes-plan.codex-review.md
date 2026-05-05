### Summary verdict
**Ready to execute with minor fixes.** Confidence is high: the plan maps to the current React/Zustand code, the proposed code blocks should compile, and the cap behavior is centralized for actual selection toggles. Main issue: Task 5’s keyboard verification wording is too broad because `Enter`/`S` should still deselect selected tiles at cap.

### Critical issues
None.

### Concerns / suggestions
- [docs/superpowers/plans/2026-05-05-ux-fixes-plan.md](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-05-ux-fixes-plan.md:397): “키보드 1~9 / Enter / S 도 모두 차단” should say “when targeting unselected images”; deselection remains allowed by spec and Task 3.
- [docs/superpowers/plans/2026-05-05-ux-fixes-plan.md](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-05-ux-fixes-plan.md:318): heading says `.tile-cap-blocked`, but actual JSX/CSS uses `.tile.cap-blocked`. Body is correct; fix heading to avoid confusion.
- [docs/superpowers/plans/2026-05-05-ux-fixes-plan.md](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-05-ux-fixes-plan.md:348): Task 4 has two commit snippets. Keep only the revised one.
- Line ranges are mostly accurate. Only Task 4 Step 1 says `completion` is around 51-52, but it is currently [src/App.jsx](/Users/est/Projects/wedding-pick/src/App.jsx:55). Not blocking.
- Reducing `targetCount` below existing selections is handled implicitly: `atCap` becomes true, additional selections block, deselection remains allowed, no retroactive trimming. This matches the spec’s “block additional selection” scope.

### Spec coverage table
| Spec requirement | Plan task/step | Status |
|---|---|---|
| `selectAll` only affects current page | Task 1 Step 1 | covered |
| `selectAll` applies cap using remaining slots | Task 1 Step 1 | covered |
| `selectAll` no-op skips history/set | Task 1 Step 1 | covered |
| `clearSelections` only affects current page | Task 2 Step 1 | covered |
| `clearSelections` no-op skips history/set | Task 2 Step 1 | covered |
| Preserve Undo by calling `pushHistory()` before mutation | Tasks 1-3 Step 1 | covered |
| Update select/clear button titles only | Task 4 Steps 3-4 | covered |
| Remove only footer `border-top` | Task 4 Step 5(a) | covered |
| `toggleByVisibleIndex` blocks selecting at cap silently | Task 3 Step 1 | covered |
| Deselect always allowed at cap | Task 3 Step 1 | covered |
| `targetCount === 0` means unlimited | Task 1 Step 1, Task 3 Step 1, Task 4 Step 1 | covered |
| Add `cap-blocked` class to unselected tiles at cap | Task 4 Step 2 | covered |
| Add `.tile.cap-blocked` opacity/cursor CSS | Task 4 Step 5(b) | covered |
| Disable “모두 선택” at cap | Task 4 Step 3 | covered |
| No new dependencies/store actions | Overall architecture; code blocks preserve signatures | covered |
| Keyboard toggle paths inherit cap | Task 3 Step 1, Task 5 Step 2 | covered with wording fix |
| Loupe toggle path, if present | Current code has no Loupe selection toggle | covered / not applicable |

### Acceptance criteria check
- **covered** — Page 1 “모두 선택” selects only page 1; page 2 later selects only page 2 while page 1 remains selected: Task 1 Step 1, Task 5 Step 2.1.
- **covered** — Page-scoped “선택 모두 해제”: Task 2 Step 1, Task 5 Step 2.2.
- **covered** — Target 20, 19 selected, one click reaches 20, next unselected click no-ops, blocked visual shown: Task 3 Step 1, Task 4 Steps 1-2/5, Task 5 Step 2.3-2.4.
- **covered** — Deselect at cap works and `.cap-blocked` clears immediately: Task 3 Step 1, Task 4 Step 2, Task 5 Step 2.5.
- **covered** — Target 0 disables cap behavior and visuals: Task 1 Step 1, Task 3 Step 1, Task 4 Step 1, Task 5 Step 2.6.
- **covered** — Footer remains visible without top border in empty and loaded states: Task 4 Step 5(a), Task 5 Step 2.7.
- **covered** — `npm run build` passes: Tasks 1-4 build steps and Task 5 Step 1.

### Net recommendation
**APPROVE-WITH-FIXES**

Fix:
- Clarify Task 5 keyboard verification to apply only to unselected targets.
- Rename Task 4 Step 5 heading to `.tile.cap-blocked`.
- Remove the duplicate Task 4 commit snippet.
