# 2026-05-06 이미지 확대/축소 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Loupe 진입점을 그리드 타일 🔍 버튼으로 노출하고, Loupe 안에 −/+/⟲ 줌 컨트롤 + 키보드 +/−/0 단축키 추가. 모바일에서도 터치만으로 확대/축소 가능.

**Architecture:** store 에 `openLoupeAt` 액션 한 개 추가. App.jsx 는 `loupeZoom` 로컬 state + 한 useEffect (loupe 열릴 때 1.0 리셋) + 키보드 핸들러 확장. CSS 는 tile-zoom 오버레이 + loupe-zoom 컨트롤 스타일 추가.

**Reference spec:** `docs/superpowers/specs/2026-05-06-image-zoom-design.md`

---

## Task 1: store — `openLoupeAt` 액션

**Files:**
- Modify: `src/store/usePickerStore.js`

- [ ] **Step 1: 액션 추가**

`toggleLoupe` 와 `closeLoupe` 사이 (또는 `closeLoupe` 직후) 에 다음 추가:

```js
  openLoupeAt: (visibleIndex) => {
    if (!get().tournamentStarted) {
      return;
    }
    const visibleImages = get().getVisibleImages();
    if (!visibleImages[visibleIndex]) {
      return;
    }
    set({ focusedIndex: visibleIndex, loupeOpen: true });
  },
```

기존 `toggleLoupe` 와 `closeLoupe` 는 그대로 유지.

- [ ] **Step 2: Build 검증**

`npm run build` PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: add openLoupeAt action for tile-level loupe entry

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: App.jsx — tile 의 🔍 버튼 + openLoupeAt destructure

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: store destructure 에 `openLoupeAt` 추가**

`usePickerStore()` 비구조화 의 `toggleLoupe` 옆 또는 `closeLoupe` 옆에:

```jsx
    openLoupeAt,
```

- [ ] **Step 2: 그리드 타일에 🔍 버튼 자식 추가**

타일 button 의 `</button>` 직전에 다음 child 추가 (다른 자식들 — `<img>`, `tile-num`, `tile-check` — 와 함께):

```jsx
                  <button
                    className="tile-zoom"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openLoupeAt(index);
                    }}
                    aria-label="확대 보기"
                    title="확대 보기"
                  >
                    🔍
                  </button>
```

⚠️ 부모 button 안에 자식 button 을 두면 HTML 표준상 invalid (interactive content nested). React 는 동작은 하지만 콘솔 경고 가능. 대안:
- (a) tile button 을 `<div role="button">` 으로 변경
- (b) tile-zoom 을 button 이 아닌 `<span role="button" tabIndex={0} onClick=... onKeyDown=...>` 로

**(b) 채택** — 영향 범위 최소. 다음으로 작성:

```jsx
                  <span
                    className="tile-zoom"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      openLoupeAt(index);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        openLoupeAt(index);
                      }
                    }}
                    aria-label="확대 보기"
                    title="확대 보기"
                  >
                    🔍
                  </span>
```

`stopPropagation` 으로 부모 button 의 onClick (`toggleByVisibleIndex(index)`) 안 발화.

- [ ] **Step 3: Build 검증**

`npm run build` PASS — `react/jsx-no-comment-textnodes` 등 위반 없는지.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
feat: add tile zoom entry point that opens loupe

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: App.jsx — loupeZoom state + 헤더 컨트롤 + img inline style + 키보드

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: `loupeZoom` state 추가**

다른 useState 들 옆에:

```jsx
const [loupeZoom, setLoupeZoom] = useState(1);
```

- [ ] **Step 2: Loupe 열릴 때 자동 1.0 리셋 useEffect**

다른 useEffect 들 옆에:

```jsx
useEffect(() => {
  if (loupeOpen) {
    setLoupeZoom(1);
  }
}, [loupeOpen, loupeImage]);
```

- [ ] **Step 3: Loupe 헤더에 줌 컨트롤 추가**

기존 loupe-header (`<strong>name</strong>` + `<button>✕</button>`) 사이에 zoom 컨트롤 div 삽입:

```jsx
            <div className="loupe-header">
              <strong>{loupeImage.name}</strong>
              <div className="loupe-zoom">
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setLoupeZoom((z) => Math.max(0.5, z - 0.25))}
                  disabled={loupeZoom <= 0.5}
                  aria-label="축소"
                >
                  −
                </button>
                <span className="loupe-zoom-value">{Math.round(loupeZoom * 100)}%</span>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setLoupeZoom((z) => Math.min(3, z + 0.25))}
                  disabled={loupeZoom >= 3}
                  aria-label="확대"
                >
                  +
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setLoupeZoom(1)}
                  disabled={loupeZoom === 1}
                  aria-label="원본 크기"
                >
                  ⟲
                </button>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={closeLoupe}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
```

- [ ] **Step 4: Loupe img 인라인 width 적용**

기존:
```jsx
<img src={loupeImage.previewUrl} alt={loupeImage.name} />
```

다음으로:
```jsx
<img
  src={loupeImage.previewUrl}
  alt={loupeImage.name}
  style={{ width: `${loupeZoom * 100}%`, height: "auto", maxWidth: "none" }}
/>
```

- [ ] **Step 5: 키보드 핸들러에 +/-/0 추가**

기존 keydown switch 의 `case "Escape":` 직전 또는 다른 적절한 위치에 다음 케이스 추가:

```jsx
        case "+":
        case "=":
          if (loupeOpen) {
            event.preventDefault();
            setLoupeZoom((z) => Math.min(3, z + 0.25));
          }
          break;
        case "-":
        case "_":
          if (loupeOpen) {
            event.preventDefault();
            setLoupeZoom((z) => Math.max(0.5, z - 0.25));
          }
          break;
        case "0":
          if (loupeOpen) {
            event.preventDefault();
            setLoupeZoom(1);
          }
          break;
```

useEffect 의존성 배열에 `loupeOpen` 이 이미 있는지 확인 — 있으면 그대로, 없으면 추가. `setLoupeZoom` 은 setState 함수라 안정적, deps 불필요.

- [ ] **Step 6: Build 검증**

`npm run build` PASS — 특히 `react-hooks/exhaustive-deps` 가 useEffect (`[loupeOpen, loupeImage]`) 와 keyboard useEffect 모두 만족하는지.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
feat: add zoom controls (−/+/⟲) and keyboard shortcuts in loupe

- loupeZoom state, resets to 1 on each open
- Header − % + ⟲ buttons, range 0.5x~3x step 0.25
- Keyboard +/=, -/_, 0 while loupe open
- Image inline width tracks zoom

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: CSS — tile-zoom 오버레이 + loupe-zoom 스타일

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: `.tile` 의 position 확인**

`.tile` 룰에 `position: relative` 가 있는지 확인. 없으면 추가:

```css
.tile {
  /* ... 기존 속성 ... */
  position: relative;
}
```

(이미 있으면 skip.)

- [ ] **Step 2: 새 규칙 추가**

`src/styles.css` 끝 (또는 .tile 관련 섹션 뒤) 에 다음 추가:

```css
.tile-zoom {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  user-select: none;
}

.tile:hover .tile-zoom,
.tile:focus-within .tile-zoom {
  opacity: 1;
}

.tile-zoom:hover {
  background: rgba(0, 0, 0, 0.75);
}

.loupe-zoom {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loupe-zoom-value {
  font-size: 12px;
  color: #4a4a4a;
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: 모바일 media query 안에 tile-zoom 항상 표시 + 더 큰 사이즈 추가**

기존 `@media (max-width: 768px) { ... }` 블록 안에 다음 추가:

```css
  /* 모바일에선 hover 없음 — tile-zoom 항상 표시 + 큰 터치 영역 */
  .tile-zoom {
    opacity: 1;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.65);
  }
```

- [ ] **Step 4: Build 검증**

`npm run build` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "$(cat <<'EOF'
feat: tile-zoom overlay and loupe-zoom control styles with mobile rules

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 최종 회귀 + push

- [ ] **Step 1: build 재확인**

`npm run build` PASS.

- [ ] **Step 2: 수동 검증 (권장)**

`npm run dev`. 다음 확인:

1. 빈 상태 → 사진 업로드 → 사전 셋업 → "이미지 고르기 시작" → Round 1
2. 그리드 타일 호버 시 🔍 버튼 노출 (데스크탑)
3. 🔍 클릭 → loupe 열림, 셀렉트 안 토글
4. Loupe 헤더에 −/% / + / ⟲ / ✕ 보임
5. + 클릭 시 이미지 확대, − 시 축소, % 갱신
6. 줌 한도 도달 시 해당 버튼 disabled
7. ⟲ 또는 0 키 → 100% 복귀
8. 키보드 +/-/0 작동
9. 다른 이미지 loupe 열면 줌 1.0 리셋
10. 모바일 viewport (DevTools 디바이스 모드) 에서 🔍 항상 보이고 터치 가능
11. 모바일에서 줌 컨트롤 모두 터치로 작동
12. ESC 또는 ✕ 또는 backdrop 클릭 → 닫기
13. 회귀: 그리드 셀렉트 (스페이스 안 누르고 사진 클릭), 라운드 advance, 완료 배너 등

- [ ] **Step 3: Push (controller)**

```bash
git push origin main
```

---

## Self-Review Notes

스펙(`2026-05-06-image-zoom-design.md`) 의 6 변경 + 8 수용 기준 모두 plan 의 task 1~4 에 매핑됨.

**Type/이름 일관성:**
- `openLoupeAt` 모든 위치 일치
- `loupeZoom` / `setLoupeZoom` 일치
- CSS 클래스 `.tile-zoom`, `.loupe-zoom`, `.loupe-zoom-value` 일치

**플레이스홀더 잔재 없음.**
