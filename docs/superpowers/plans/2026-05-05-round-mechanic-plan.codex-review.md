### Summary verdict

**APPROVE-WITH-FIXES.** Confidence high. The round state machine and cap-revert steps are mostly sound, but the plan is not ready as written because completion ZIP export is broken: `advanceRound` clears selection, while current `exportZip` only zips selected images.

### Critical issues

- [round-mechanic-plan.md](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-05-round-mechanic-plan.md:341) + [usePickerStore.js](/Users/est/Projects/wedding-pick/src/store/usePickerStore.js:285): completed final pool is all `selected: false`, so banner `exportZip` exports nothing and errors. Minimal fix: update `exportZip` to use `tournamentComplete ? images : selectedImages`, or keep final-pool records selected on the completed transition and align UI counts.
- [round-mechanic-plan.md](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-05-round-mechanic-plan.md:428): Task 5 destructures `currentRound` and `advanceRound` before Task 6 uses them. `npm run build` runs ESLint, so Task 5 build fails on unused vars. Minimal fix: Task 5 should add only `tournamentComplete`; add `currentRound`/`advanceRound` in Task 6, or merge Task 5/6 before the build/commit boundary.

### Concerns / suggestions

- Completion banner layout may clip the grid: `.stage` has `overflow: hidden`, and `.grid` has `height: 100%`. Add a flex wrapper or adjust grid height when the banner is present.
- After completion, `currentRound` increments but the banner displays `currentRound - 1`; the top badge would still show the next round. Hide/change the badge on completion or clarify this intended display.
- If “ZIP/restart only” is literal, the plan does not lock grid size, pagination, target editing, loupe, or menus. It only locks selection/round actions.
- Manual QA should explicitly verify completed ZIP contents, not just ZIP existence.

### Spec coverage table

| Spec requirement | Plan task/step | Status |
|---|---:|---|
| Remove `toggleByVisibleIndex` cap guard | Task 1 Step 1 | covered |
| Remove `selectAll` cap slot math | Task 2 Step 1 | covered |
| Remove `App.jsx` `atCap` visual/disable wiring | Task 5 Steps 1-3 | covered |
| Remove `.tile.cap-blocked` CSS | Task 6 Step 4 | covered |
| Preserve page-scoped `selectAll`/`clearSelections` | Task 2, Task 3 | covered |
| Add `currentRound` / `tournamentComplete` state | Task 4 Step 2 | covered |
| Extend snapshots for undo | Task 4 Step 1 | covered |
| Add `advanceRound` narrowing/no-op/reset logic | Task 4 Step 5 | covered |
| Reset round state in `loadFiles` / `clearAll` | Task 4 Steps 3-4 | covered |
| Completion action locks | Tasks 1-4, Task 5 | covered |
| Add next-round button, badge, banner | Task 6 Steps 1-3 | partial |
| Completion ZIP/restart workflow | Task 6 Step 3 | partial |
| Build/manual verification | Task 7 | partial |

### Acceptance criteria check

| # | Criterion | Status | Supporting plan step |
|---:|---|---|---|
| 1 | `toggleByVisibleIndex` ignores cap, locks only on complete | covered | Task 1 Step 1 |
| 2 | `selectAll`/`clearSelections` no cap, lock on complete | covered | Task 2 Step 1, Task 3 Step 1 |
| 3 | “모두 선택” disabled is `!hasImages || visibleAllSelected || tournamentComplete` | covered | Task 5 Step 3 |
| 4 | “다음 라운드” button in topbar with disabled conditions | covered | Task 6 Step 1 |
| 5 | Next round narrows pool, clears selection, resets page/focus, increments round | covered | Task 4 Step 5 |
| 6 | Pool <= target with `targetCount > 0` sets complete | covered | Task 4 Step 5 |
| 7 | Completion banner + ZIP/restart CTA, grid visible, interaction blocked | not covered | ZIP CTA is wired but broken with current `exportZip` |
| 8 | `loadFiles` / `clearAll` reset to Round 1 incomplete | covered | Task 4 Steps 3-4 |
| 9 | Undo restores round transition | covered | Task 4 Step 1 + Step 5 |
| 10 | `npm run build` passes | covered | Task 7 Step 1; Task 5 intermediate build still needs fix |

### Net recommendation

**APPROVE-WITH-FIXES**

Required fixes:
- Add a completed-state export path or preserve selected state for the final pool.
- Fix Task 5’s unused destructuring/build boundary.
