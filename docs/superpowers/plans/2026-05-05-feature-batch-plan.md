# 2026-05-05 기능 묶음 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** wedding-pick 의 브랜드 텍스트를 `ohmyweddingday` 로 교체하고, 빈 상태에 목표 수량 프리셋 UI 를 추가하고, 프라이버시 footer 와 릴리즈 노트 모달을 도입한다.

**Architecture:** 모두 클라이언트 사이드 React 변경. 새 store 액션이나 새 의존성 없이 기존 `usePickerStore.setTargetCount` 와 `helpOpen` 모달 패턴을 재사용. 신규 파일은 changelog 데이터 파일 하나(`src/data/releases.js`).

**Tech Stack:** React 18, Zustand, Vite 5, ESLint 9 (build gate `eslint . && vite build`).

**Note on testing:** 본 프로젝트는 단위 테스트 인프라가 없다. 검증은 (1) `npm run build` 통과 (lint + vite), (2) `npm run dev` 로 띄워 수동 브라우저 확인을 사용한다. TDD 단계 대신 각 task 끝에 build/수동 확인 단계를 둔다.

**Reference spec:** `docs/superpowers/specs/2026-05-05-feature-batch-design.md`

---

## Task 1: 브랜드 텍스트 교체

**Files:**
- Modify: `index.html:6`
- Modify: `src/App.jsx:225`

- [ ] **Step 1: `index.html` title 변경**

`index.html:6` 의 `<title>Wedding Pick</title>` 를 다음으로 변경:

```html
<title>ohmyweddingday</title>
```

- [ ] **Step 2: `src/App.jsx` 브랜드 span 변경**

`src/App.jsx:225` 의 `<span className="brand">Wedding Pick</span>` 를 다음으로 변경:

```jsx
<span className="brand">ohmyweddingday</span>
```

- [ ] **Step 3: 잔여 검색**

다음 명령으로 `Wedding Pick` 문자열이 코드/마크업에 남았는지 확인:

```bash
grep -rn "Wedding Pick" src/ index.html
```

Expected: no output (빈 결과). 만약 나오면 그 위치도 같이 `ohmyweddingday` 로 변경.

- [ ] **Step 4: Build 검증**

Run: `npm run build`
Expected: PASS (eslint + vite build 모두 통과). dist 출력에 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add index.html src/App.jsx
git commit -m "chore: rebrand to ohmyweddingday in title and header"
```

---

## Task 2: 프라이버시 Footer 추가

**Files:**
- Modify: `src/App.jsx:557` 부근 (컴포넌트 return 의 최하단)
- Modify: `src/styles.css` (말미)

- [ ] **Step 1: Footer JSX 추가**

`src/App.jsx` 의 컴포넌트 return 안, 가장 바깥 `<div>` 의 닫는 태그 직전(`App.jsx:557` 의 `</div>` 위)에 다음 추가:

```jsx
      <footer className="app-footer">
        사진은 서버에 전송되지 않습니다.
      </footer>
```

위치 컨텍스트 (변경 후 끝 부분):
```jsx
      ) : null}

      <footer className="app-footer">
        사진은 서버에 전송되지 않습니다.
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Footer CSS 추가**

`src/styles.css` 파일 끝에 다음 추가:

```css
.app-footer {
  padding: 8px 16px;
  text-align: center;
  font-size: 12px;
  color: #6a6a6a;
  border-top: 1px solid #ececec;
  background: #fafafa;
}
```

- [ ] **Step 3: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: 수동 확인 (옵션)**

Run: `npm run dev`
Expected: 페이지 하단에 회색조 작은 텍스트로 "사진은 서버에 전송되지 않습니다." 가 보인다. 빈 상태에서도, 사진 로드 후에도 항상 보인다. (참고: 모달/Loupe 가 열려있을 때는 풀스크린 백드롭이 footer 위에 깔리므로 가려지는 것이 정상.) dev 서버 종료(Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: add privacy footer noting photos stay client-side"
```

---

## Task 3: 빈 상태 목표 수량 프리셋

**Files:**
- Modify: `src/App.jsx` (empty state 블록, 약 386-405 줄)
- Modify: `src/styles.css` (말미)

- [ ] **Step 1: Empty state JSX 확장**

`src/App.jsx:385-405` 의 empty state 블록을 다음으로 교체:

```jsx
        {!loading && !hasImages ? (
          <div className="empty">
            <h2>사진을 불러와서 시작하세요</h2>
            <p className="muted">JPG, PNG, WebP 형식을 지원합니다.</p>

            <div className="target-presets" role="group" aria-label="목표 수량">
              <span className="target-presets-label">목표 수량</span>
              {[10, 20, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={preset === targetCount ? "preset-pill active" : "preset-pill"}
                  onClick={() => setTargetCount(preset)}
                >
                  {preset}
                </button>
              ))}
              <input
                className="preset-input"
                type="number"
                min="0"
                placeholder="직접 입력"
                value={[10, 20, 30, 50].includes(targetCount) ? "" : targetCount}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setTargetCount(Number.isNaN(value) ? 0 : Math.max(value, 0));
                }}
              />
            </div>

            <div className="empty-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => folderInputRef.current?.click()}
              >
                폴더 선택
              </button>
            </div>
          </div>
        ) : null}
```

핵심 변경:
- `<div className="target-presets">` 블록 추가 (h2/muted 다음, empty-actions 직전).
- 프리셋 버튼 4개 (10/20/30/50). 현재 `targetCount` 와 일치하는 프리셋이 `active`.
- 직접 입력 number input. 프리셋 중 하나면 input value 는 빈 문자열(placeholder 만 보임), 임의 값이면 그 값 표시.
- `setTargetCount` 호출 시 store 의 기존 검증(`Math.max(value, 0)`) 을 다시 한번 확인 — store 의 `setTargetCount` 는 이미 같은 처리를 하므로 input onChange 의 가드는 방어적 중복이지만 명시적으로 둔다.

- [ ] **Step 2: 프리셋 CSS 추가**

`src/styles.css` 파일 끝에 다음 추가:

```css
.target-presets {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.target-presets-label {
  font-size: 13px;
  color: #4a4a4a;
  margin-right: 4px;
}

.preset-pill {
  min-width: 40px;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #d4d4d4;
  border-radius: 999px;
  background: #ffffff;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.preset-pill:hover {
  background: #f3f3f3;
}

.preset-pill.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #ffffff;
}

.preset-input {
  width: 96px;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: #ffffff;
  color: #1a1a1a;
}

.preset-input:focus {
  outline: none;
  border-color: #1a1a1a;
}
```

- [ ] **Step 3: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: 수동 확인**

Run: `npm run dev`
Expected:
- 빈 상태에서 "목표 수량" 옆에 [10][20][30][50] 알약 버튼 + 직접 입력란이 보인다.
- 첫 진입 시 `[20]` 이 active (검정 배경).
- `[30]` 클릭 → `[30]` 이 active 로 변경. 직접 입력란은 빈 상태.
- 직접 입력란에 `7` 입력 → 모든 프리셋이 inactive, 입력란에 `7` 표시.
- 사진을 올린 뒤 상단의 `target-button` 도 `7` 로 표시되는지 확인.
- dev 서버 종료(Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: add target count presets to empty state"
```

---

## Task 4: 릴리즈 데이터 파일

**Files:**
- Create: `src/data/releases.js`

- [ ] **Step 1: 데이터 파일 생성**

새 디렉터리 + 파일:

```bash
mkdir -p src/data
```

`src/data/releases.js`:

```js
export const releases = [
  {
    version: "0.2.0",
    date: "2026-05-05",
    changes: [
      "사용자 정의 목표 수량 (10 / 20 / 30 / 50 / 직접 입력)",
      "릴리즈 노트 추가",
      "사진이 서버에 전송되지 않음 명시",
      "ohmyweddingday.com 도메인 적용",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-04-26",
    changes: ["초기 릴리즈"],
  },
];
```

- [ ] **Step 2: Lint 검증**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/releases.js
git commit -m "feat: add releases changelog data"
```

---

## Task 5: 릴리즈 노트 모달 + 메뉴 진입점

**Files:**
- Modify: `src/App.jsx` (import, state, ESC handler, 메뉴 항목, 모달 렌더)
- Modify: `src/styles.css` (말미)

- [ ] **Step 1: import 와 state 추가**

`src/App.jsx:1-3` 의 import 직후, 다음 import 추가:

```jsx
import { releases } from "./data/releases";
```

`src/App.jsx:11-14` 의 state 선언부에 다음 한 줄 추가 (helpOpen 옆):

```jsx
const [releasesOpen, setReleasesOpen] = useState(false);
```

변경 후 컨텍스트:
```jsx
const [menuOpen, setMenuOpen] = useState(false);
const [editingTarget, setEditingTarget] = useState(false);
const [helpOpen, setHelpOpen] = useState(false);
const [releasesOpen, setReleasesOpen] = useState(false);
const [unsupportedDismissed, setUnsupportedDismissed] = useState(false);
```

- [ ] **Step 2: ESC 키 핸들러 확장**

`src/App.jsx:166-172` 의 `case "Escape":` 블록을 다음으로 교체:

```jsx
        case "Escape":
          if (helpOpen) {
            setHelpOpen(false);
          } else if (releasesOpen) {
            setReleasesOpen(false);
          } else {
            closeLoupe();
          }
          break;
```

그리고 `src/App.jsx:180-191` 의 useEffect 의존성 배열에 `releasesOpen` 추가:

```jsx
  }, [
    closeLoupe,
    focusedIndex,
    gridSize,
    helpOpen,
    moveFocus,
    nextPage,
    previousPage,
    releasesOpen,
    toggleByVisibleIndex,
    toggleLoupe,
    undo,
  ]);
```

(알파벳 순 유지: `helpOpen` 다음, `toggleByVisibleIndex` 앞.)

- [ ] **Step 3: ⋯ 메뉴에 "릴리즈 노트" 항목 추가**

`src/App.jsx` 의 "단축키 도움말" 버튼 (약 348-356 줄) **바로 아래** 에 다음 버튼 추가:

```jsx
                <button
                  type="button"
                  onClick={() => {
                    setReleasesOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  릴리즈 노트
                </button>
```

변경 후 컨텍스트 (메뉴 끝부분):
```jsx
                <button type="button" onClick={() => { setHelpOpen(true); setMenuOpen(false); }}>
                  단축키 도움말
                </button>
                <button type="button" onClick={() => { setReleasesOpen(true); setMenuOpen(false); }}>
                  릴리즈 노트
                </button>
                <button type="button" className="danger" onClick={() => { clearAll(); setMenuOpen(false); }}>
                  모두 초기화
                </button>
```

- [ ] **Step 4: 릴리즈 노트 모달 렌더 추가**

`src/App.jsx` 의 helpOpen 모달 닫는 `) : null}` (약 556 줄) **바로 다음**, footer 위에 다음 모달 추가:

```jsx
      {releasesOpen ? (
        <div
          className="loupe-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setReleasesOpen(false)}
        >
          <div className="release-panel" onClick={(event) => event.stopPropagation()}>
            <div className="loupe-header">
              <strong>릴리즈 노트</strong>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setReleasesOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <ul className="release-list">
              {releases.map((release) => (
                <li key={release.version}>
                  <div className="release-meta">
                    <span className="release-version">v{release.version}</span>
                    <span className="release-date">— {release.date}</span>
                  </div>
                  <ul className="release-changes">
                    {release.changes.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
```

배치 순서 컨텍스트 (App.jsx 컴포넌트 끝부분 — 아래 `…` 는 위 단계에서 정의된 코드를 가리키는 비복사 표시이며 그대로 붙여넣지 말 것):
```jsx
      {helpOpen ? ( … 단축키 모달 코드 그대로 … ) : null}

      {releasesOpen ? ( … Step 4 의 릴리즈 모달 코드 … ) : null}

      <footer className="app-footer"> … Task 2 의 footer JSX … </footer>
    </div>
```

- [ ] **Step 5: 모달 CSS 추가**

`src/styles.css` 파일 끝에 다음 추가:

```css
.release-panel {
  width: min(520px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px;
  border-radius: 8px;
  background: #ffffff;
}

.release-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.release-list > li {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.release-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.release-version {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.release-date {
  font-size: 12px;
  color: #6a6a6a;
}

.release-changes {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #4a4a4a;
}
```

- [ ] **Step 6: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: 수동 확인**

Run: `npm run dev`
Expected:
- 우측 상단 ⋯ 메뉴 클릭 → "단축키 도움말" 아래 "릴리즈 노트" 항목이 보인다.
- "릴리즈 노트" 클릭 → 모달이 뜨고 v0.2.0 / v0.1.0 두 항목이 표시된다.
- 백드롭 클릭, ✕ 버튼, ESC 키 셋 모두 모달을 닫는다.
- "단축키 도움말" 모달도 그대로 동작한다 (ESC 핸들러 회귀 없음).
- dev 서버 종료(Ctrl+C).

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: add release notes modal triggered from overflow menu"
```

---

## Task 6: 최종 회귀 검증

- [ ] **Step 1: 전체 build 통과 재확인**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: 잔여 `Wedding Pick` 잔재 재검색**

Run: `grep -rn "Wedding Pick" src/ index.html`
Expected: 출력 없음 (빈 결과). 출현 시 해당 위치를 `ohmyweddingday` 로 수정.

(검색 범위는 코드/UI/title 만으로 한정한다. `docs/superpowers/specs/`, `docs/superpowers/plans/`, `README.md` 는 본 변경의 대상이 아니므로 의도적으로 제외한다 — 해당 문서는 "Wedding Pick" 을 historical reference 로 포함할 수 있다.)

- [ ] **Step 3: 수동 종합 확인 (배포 전 마지막 점검)**

Run: `npm run dev`

체크리스트:
- 상단 좌측: `ohmyweddingday` 텍스트
- 빈 상태: 목표 수량 프리셋 4개 + 직접 입력 표시
- 프리셋 클릭 시 active 토글 정상
- 직접 입력으로 임의값 입력 후 사진 업로드 → 상단 진행률 영역의 숫자도 같은 값
- 우측 상단 ⋯ 메뉴 → 릴리즈 노트 항목 → 모달 정상 동작
- 페이지 하단 footer: "사진은 서버에 전송되지 않습니다."
- 단축키 모달 (도움말) 회귀 없음
- 토너먼트/그리드 토글/Loupe/Undo/ZIP 등 기존 기능 회귀 없음
- 브라우저 콘솔에 에러 없음

- [ ] **Step 4: Push (수동, 사용자 측)**

작업자가 push 하지 않는다. 사용자가 직접:

```bash
git push origin main
```

push 후 Vercel 자동 재빌드 → `https://ohmyweddingday.com` 에 변경 반영 확인은 사용자 책임.

---

## Self-Review Notes

스펙(`2026-05-05-feature-batch-design.md`) 의 4개 변경 + 수용 기준 7개 모두 본 plan 의 task 1~5 에 매핑됨:

- 변경 1 (브랜드) → Task 1
- 변경 2 (footer) → Task 2
- 변경 3 (empty state 프리셋) → Task 3
- 변경 4 (릴리즈 노트) → Task 4 (데이터) + Task 5 (모달/메뉴)
- 수용 기준 "build 통과" → Task 1~5 의 build 단계 + Task 6

**Type/이름 일관성 확인:**
- `setReleasesOpen` 모든 위치에서 동일 명칭
- `releases` 배열명 데이터 파일과 import 일치
- CSS 클래스 `release-panel` / `release-list` / `release-meta` / `release-version` / `release-date` / `release-changes` 일관

**플레이스홀더 잔재 없음.** 모든 코드 블록은 실제 적용 가능한 완성 코드.
