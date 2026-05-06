### Summary Verdict

Not ready as-is. The plan mostly covers the feature and the JS/JSX snippets are syntactically plausible, but the tile zoom entry has two blocking UX/HTML issues: the chosen `<span role="button" tabIndex={0}>` is still a focusable interactive descendant inside a `<button>`, and the proposed upper-right CSS overlaps the existing selected checkmark.

### Critical Issues

1. [plan:95](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-06-image-zoom-plan.md:95), [App.jsx:515](/Users/est/Projects/wedding-pick/src/App.jsx:515)  
   `span role="button" tabIndex={0}` inside the tile `<button>` still violates the button content model.  
   Minimal fix: make the tile a non-button `div role="button"` with equivalent click/focus handling, or wrap tile + zoom as sibling controls so the zoom control is not inside the tile button.

2. [plan:300](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-06-image-zoom-plan.md:300), [styles.css:325](/Users/est/Projects/wedding-pick/src/styles.css:325)  
   `.tile-zoom { top: 6px; right: 6px; width: 32px; height: 32px; }` overlaps `.tile-check { top: 8px; right: 8px; width: 26px; height: 26px; }`. On selected tiles, the check can cover the zoom hit target.  
   Minimal fix: offset zoom for selected tiles, move one control, or reserve separate non-overlapping zones with explicit `z-index`.

3. [App.jsx:72](/Users/est/Projects/wedding-pick/src/App.jsx:72), [plan:103](/Users/est/Projects/wedding-pick/docs/superpowers/plans/2026-05-06-image-zoom-plan.md:103)  
   `loupeImage` still prioritizes `hoverIndexRef.current` over the just-set `focusedIndex`. Mouse click usually works because hover equals the clicked tile; keyboard activation can show the wrong image if the mouse is parked over another tile.  
   Minimal fix: in explicit zoom handlers set `hoverIndexRef.current = index` before `openLoupeAt(index)`, or better track an explicit loupe index for `openLoupeAt`.

### Concerns / Suggestions

The span keyboard handler is stopPropagation-friendly for `Enter` and `Space`: it calls `preventDefault()`, `stopPropagation()`, then `openLoupeAt(index)`. The problem is DOM structure, not handler intent.

`0` has no conflict with existing quick-select because current code only handles `"1"` through `"9"` before the switch.

`.tile { position: relative }` already exists at [styles.css:271](/Users/est/Projects/wedding-pick/src/styles.css:271), so Task 4 Step 1 should be a no-op.

The plan includes an obsolete nested `<button>` snippet before the adopted span snippet. Remove it or label it “do not implement” to avoid ambiguity.

### Spec Coverage Table

| Spec Requirement | Plan Task/Step | Status |
|---|---:|---|
| Tile zoom entry shown on grid tiles | Task 2 Step 2, Task 4 Steps 2-3 | Partial: overlap/DOM fixes needed |
| Zoom click must not toggle selection | Task 2 Step 2 | Partial: handler ok, selected-tile overlap blocks UX |
| Add `openLoupeAt(visibleIndex)` | Task 1 Step 1 | Covered |
| Add `loupeZoom` 0.5-3.0 step 0.25 | Task 3 Steps 1, 3, 5 | Covered |
| Reset zoom to 1.0 on open/image change | Task 3 Step 2 | Covered |
| Loupe header controls | Task 3 Step 3, Task 4 Step 2 | Covered |
| Image width driven by zoom + scroll panning | Task 3 Step 4, existing `.loupe-canvas` | Covered |
| Keyboard `+/-/0` | Task 3 Step 5 | Covered |
| Mobile zoom visible/touchable | Task 4 Step 3 | Covered |
| `hoverIndexRef` fragility acknowledged | Spec only, plan leaves as-is | Not sufficiently fixed |

### Acceptance Criteria Check

1. Hover shows 🔍, mobile always visible: covered by Task 4 Steps 2-3.
2. 🔍 click opens loupe without select toggle: not covered until overlap/DOM issue is fixed.
3. Loupe header shows −, %, +, ⟲: covered by Task 3 Step 3.
4. Buttons/keyboard change 0.5x-3x and update %: covered by Task 3 Steps 3 and 5.
5. ⟲ or `0` returns to 100%: covered by Task 3 Steps 3 and 5.
6. New image loupe resets to 1.0: covered by Task 3 Step 2.
7. Zoom overflow scroll/panning works: covered by Task 3 Step 4 plus existing [styles.css:564](/Users/est/Projects/wedding-pick/src/styles.css:564).
8. `npm run build` passes: covered as verification steps, not executed in this review.

### Net Recommendation

APPROVE-WITH-FIXES:

1. Restructure tile zoom so no focusable control is nested inside a button.
2. Reposition `.tile-zoom` so it cannot overlap `.tile-check`.
3. Make explicit `openLoupeAt(index)` immune to stale `hoverIndexRef`.
