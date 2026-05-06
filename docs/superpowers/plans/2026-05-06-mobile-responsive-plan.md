# 2026-05-06 모바일 반응형 (Level B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** `body { min-width: 1024px }` 를 제거하고 768px breakpoint 의 `@media` 룰 + ⋯ 메뉴 alternative 진입점을 추가해 모바일에서도 자연스럽게 사용 가능하게 만든다.

**Architecture:** CSS 우선 + JSX 최소 변경. 새 store state / 새 행동 / 새 의존성 0개.

**Tech Stack:** React 18, Zustand, Vite 5, ESLint 9.

**Reference spec:** `docs/superpowers/specs/2026-05-06-mobile-responsive-design.md`

---

## Task 1: ⋯ 메뉴에 "모두 선택" / "선택 모두 해제" 항목 추가

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 메뉴 항목 추가**

`<div className="menu" role="menu">` 안의 "실행 취소" 버튼 **다음**, `<hr />` (그 다음 단축키 도움말 위) **앞** 에 다음 두 버튼 추가:

```jsx
                <button
                  type="button"
                  onClick={() => {
                    selectAll();
                    setMenuOpen(false);
                  }}
                  disabled={!hasImages || visibleAllSelected || tournamentComplete}
                >
                  모두 선택
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSelections();
                    setMenuOpen(false);
                  }}
                  disabled={visibleSelectedCount === 0 || tournamentComplete}
                >
                  선택 모두 해제
                </button>
```

`selectAll`, `clearSelections`, `hasImages`, `visibleAllSelected`, `visibleSelectedCount`, `tournamentComplete` 모두 이미 컴포넌트 내 derived/destructured 됨 — 추가 import 불필요.

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
feat: add select-all / clear-all entries to overflow menu

Mirror entries provide a single coherent access path that mobile (where direct topbar buttons are hidden) and desktop both rely on.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: topbar-right 의 두 직접 버튼에 `topbar-action` 클래스 부여

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 두 버튼 className 변경**

topbar-right 안의 "모두 선택" 과 "해제" 버튼:

기존:
```jsx
<button className="icon-btn" type="button" onClick={selectAll} disabled={...} title="...">
  모두 선택
</button>
<button className="icon-btn" type="button" onClick={clearSelections} disabled={...} title="...">
  해제
</button>
```

다음으로 (`icon-btn` 옆에 `topbar-action` 추가):

```jsx
<button className="icon-btn topbar-action" type="button" onClick={selectAll} disabled={...} title="...">
  모두 선택
</button>
<button className="icon-btn topbar-action" type="button" onClick={clearSelections} disabled={...} title="...">
  해제
</button>
```

다른 속성 변경 없음. `disabled` / `title` / 텍스트 그대로.

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
chore: tag topbar select/clear buttons with topbar-action class

Allows mobile media query to hide them while keeping desktop layout intact.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `body min-width: 1024px` 삭제 + `@media (max-width: 768px)` 추가

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: body min-width 제거**

`src/styles.css:18` 의 다음 한 줄을 **삭제**:

```css
  min-width: 1024px;
```

`body` 규칙이 `margin: 0; min-height: 100vh; background: #fafafa;` 만 남도록.

- [ ] **Step 2: `@media` 블록 추가**

`src/styles.css` 파일 끝에 다음 추가:

```css
@media (max-width: 768px) {
  .topbar {
    padding: 0 12px;
    height: 52px;
  }

  .brand {
    font-size: 13px;
  }

  .round-info {
    font-size: 12px;
  }

  .round-badge {
    font-size: 11px;
    padding: 2px 8px;
  }

  .topbar-right .topbar-action {
    display: none;
  }

  .grid-pill {
    min-width: 32px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .edge-arrow {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }

  .pre-tournament {
    padding: 16px 12px;
    gap: 12px;
  }

  .pre-tournament h2 {
    font-size: 16px;
  }

  .complete-banner {
    margin: 8px;
    padding: 12px;
  }

  .complete-title {
    font-size: 14px;
  }

  .round-toast {
    top: 64px;
    font-size: 13px;
    padding: 10px 18px;
  }

  .empty {
    padding: 20px;
    gap: 8px;
  }

  .app-footer {
    font-size: 11px;
    padding: 6px 12px;
  }
}
```

- [ ] **Step 3: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "$(cat <<'EOF'
feat: drop desktop-only min-width and add mobile breakpoint

- Remove body { min-width: 1024px } so site reflows on mobile/tablet
- Add @media (max-width: 768px) tweaks: smaller paddings/fonts, larger edge-arrow tap targets, hide topbar-action buttons (overflow menu carries them on mobile)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 최종 회귀 + 수동 검증 + push

- [ ] **Step 1: build 재확인**

Run: `npm run build`. PASS.

- [ ] **Step 2: 수동 검증 (옵션이지만 권장)**

Chrome DevTools 디바이스 툴바에서:

| 디바이스 | 폭 | 기대 |
|---|---|---|
| iPhone 12 Pro | 390 | 가로 스크롤 0, topbar-action 안 보임, ⋯ 메뉴에 모두 선택/해제 보임, edge-arrow ≥ 44px |
| iPad Air | 820 | desktop 레이아웃 유지 (768 초과) |
| Desktop 1920 | 1920 | 기존 UI 그대로 |

각 디바이스에서 빈 상태 → 사진 업로드 → 사전 셋업 → 라운드 → advance → 완료 → ZIP 흐름 정상.

- [ ] **Step 3: Push (controller 측, 사용자 위임)**

```bash
git push origin main
```

push 후 Vercel 자동 재빌드.

---

## Self-Review Notes

스펙(`2026-05-06-mobile-responsive-design.md`) 의 5 변경 + 8 수용 기준 모두 본 plan 의 task 1~3 에 매핑됨.

**Type/이름 일관성:**
- `topbar-action` 클래스 — App.jsx (Task 2) 와 styles.css (Task 3) 일치.
- ⋯ 메뉴의 새 두 버튼의 `disabled` 조건이 topbar 의 동명 버튼과 동일 ((Task 1 vs 기존 코드).

**플레이스홀더 잔재 없음.**
