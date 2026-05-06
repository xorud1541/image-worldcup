# 2026-05-06 셋업 플로우 + 자동 라운드 진입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 빈 상태에서 사진 업로드만 하게 단순화하고, 업로드 후 사전 셋업 화면 (스마트 프리셋 + 직접 입력 + "이미지 고르기 시작" CTA) 거쳐 라운드에 진입. "다음 라운드" 버튼 제거 + 마지막 페이지에서 "다음 페이지" 트리거가 자동 advance. Round 진입 시 토스트 표시.

**Architecture:** store 에 `tournamentStarted` 한 boolean 추가, `startTournament` 액션 추가, `nextPage` 의 last-page 분기에 `advanceRound` 호출 추가. App.jsx 는 setup 화면을 새 conditional render 로 분기, 빈 상태에서 프리셋 제거, "다음 라운드" 버튼 삭제, 라운드 토스트 useState/useEffect/JSX 추가. CSS 는 toast keyframes 신규.

**Tech Stack:** React 18, Zustand, Vite 5, ESLint 9.

**Reference spec:** `docs/superpowers/specs/2026-05-06-setup-flow-and-auto-round-design.md`

**Note on testing:** 단위 테스트 인프라 없음. 검증은 (1) `npm run build`, (2) 수동 브라우저 확인.

---

## Task 1: store — `tournamentStarted` state + snapshot 확장 + 리셋

**Files:**
- Modify: `src/store/usePickerStore.js`

- [ ] **Step 1: snapshot 함수 확장**

`buildSnapshot`:

```js
function buildSnapshot(state) {
  return {
    images: state.images,
    currentPage: state.currentPage,
    focusedIndex: state.focusedIndex,
    targetCount: state.targetCount,
    currentRound: state.currentRound,
    tournamentComplete: state.tournamentComplete,
    tournamentStarted: state.tournamentStarted,
  };
}
```

`restoreSnapshot`:

```js
function restoreSnapshot(snapshot) {
  return {
    images: snapshot.images,
    currentPage: snapshot.currentPage,
    focusedIndex: snapshot.focusedIndex,
    targetCount: snapshot.targetCount,
    currentRound: snapshot.currentRound,
    tournamentComplete: snapshot.tournamentComplete,
    tournamentStarted: snapshot.tournamentStarted,
  };
}
```

- [ ] **Step 2: 초기 state 에 추가**

`tournamentComplete: false,` 줄 다음에:

```js
  tournamentStarted: false,
```

- [ ] **Step 3: `loadFiles` 리셋 추가**

`loadFiles` 의 첫 set 블록의 `tournamentComplete: false,` 옆에:

```js
      tournamentStarted: false,
```

- [ ] **Step 4: `clearAll` 리셋 추가**

`clearAll` 의 set 블록의 `tournamentComplete: false,` 옆에:

```js
      tournamentStarted: false,
```

- [ ] **Step 5: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 6: Commit**

```
feat: add tournamentStarted state and snapshot extension

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: store — `startTournament` 액션

**Files:**
- Modify: `src/store/usePickerStore.js`

- [ ] **Step 1: `startTournament` 액션 추가**

위치: `advanceRound` **직전** (또는 `clearSelections` 와 `advanceRound` 사이). store 의 selection 그룹과 연관.

```js
  startTournament: () => {
    const { images, targetCount, tournamentStarted } = get();
    if (tournamentStarted) {
      return;
    }
    if (images.length === 0) {
      return;
    }
    if (targetCount <= 0 || targetCount >= images.length) {
      return;
    }
    set({ tournamentStarted: true });
  },
```

가드:
- 이미 시작됨 → no-op
- 풀 비어있음 → no-op
- 목표 0 또는 풀 크기 이상 → no-op (UI 가 disabled 시켜도 store-level 방어)

`pushHistory` 안 호출 — 이 단계 전환은 사소하며 undo 가 동작하긴 해야 한다 (snapshot 에 `tournamentStarted` 포함됨). pushHistory 호출하면 시작 직후 Undo 한 번에 셋업 단계로 복귀. **포함하는 게 맞음.** 위 코드에 추가:

수정된 액션:

```js
  startTournament: () => {
    const { images, targetCount, tournamentStarted } = get();
    if (tournamentStarted) {
      return;
    }
    if (images.length === 0) {
      return;
    }
    if (targetCount <= 0 || targetCount >= images.length) {
      return;
    }
    get().pushHistory();
    set({ tournamentStarted: true });
  },
```

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```
feat: add startTournament action

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 3: store — `nextPage` 에 자동 advance 로직

**Files:**
- Modify: `src/store/usePickerStore.js`

- [ ] **Step 1: `nextPage` 본체 교체**

기존:

```js
  nextPage: () => {
    get().setPage(get().currentPage + 1);
  },
```

변경:

```js
  nextPage: () => {
    const { currentPage, images, gridSize } = get();
    const totalPages = Math.max(1, Math.ceil(images.length / gridSize));
    const lastPage = totalPages - 1;

    if (currentPage < lastPage) {
      get().setPage(currentPage + 1);
      return;
    }

    get().advanceRound();
  },
```

`advanceRound` 의 4가지 no-op 가드 (`tournamentComplete`, 빈 풀, 0 선택, 전체 선택) 가 그대로 작동. 사용자가 마지막 페이지에서 트리거해도 라운드가 진행될 조건 안 맞으면 no-op.

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```
feat: auto-advance round when next-page hits last page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 4: App.jsx — 빈 상태 프리셋 제거 + "다음 라운드" 버튼 제거

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 빈 상태의 `<div className="target-presets">` 블록 삭제**

`{!loading && !hasImages ? (` 블록 안의 `<h2>...</h2>`와 `<p className="muted">...</p>` 다음에 있는 `<div className="target-presets" role="group" aria-label="목표 수량">...</div>` **전체** 를 삭제. 빈 상태는 다음 형태가 됨:

```jsx
        {!loading && !hasImages ? (
          <div className="empty">
            <h2>사진을 불러와서 시작하세요</h2>
            <p className="muted">JPG, PNG, WebP 형식을 지원합니다.</p>

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

- [ ] **Step 2: "다음 라운드" 버튼 삭제**

topbar 우측 그룹 (Round Task 6 에서 추가했던 button):

```jsx
          <button
            className="btn primary"
            type="button"
            onClick={advanceRound}
            disabled={...}
            title="선택한 사진들로 다음 라운드 진행"
          >
            다음 라운드
          </button>
```

이 한 블록 전체를 삭제.

`advanceRound` destructure 도 더 이상 직접 호출 안 하므로 제거 가능. 다만 `nextPage` 가 store 내부에서 advanceRound 를 부르므로 export 자체는 유지. **App.jsx 의 destructure 에서 `advanceRound` 한 줄 삭제.**

- [ ] **Step 3: Build 검증**

Run: `npm run build`. PASS — 특히 `no-unused-vars` 가 `advanceRound` 에서 안 터지는지.

- [ ] **Step 4: Commit**

```
refactor: remove empty-state target presets and topbar next-round button

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 5: App.jsx — 사전 셋업 화면 신설

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: store destructure 에 `tournamentStarted`, `startTournament` 추가**

`usePickerStore()` 비구조화 에 두 줄 추가:

```jsx
    tournamentStarted,
    startTournament,
```

- [ ] **Step 2: 스마트 프리셋 헬퍼 함수 추가**

App.jsx 의 module top-level (App 함수 정의 직전), `TARGET_PRESETS` 상수 옆 또는 위에:

```js
const STANDARD_PRESETS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

function smartPresets(poolSize) {
  if (poolSize <= 1) return [];
  return STANDARD_PRESETS
    .filter((value) => value >= 1 && value < poolSize)
    .slice(-4);
}
```

기존 `TARGET_PRESETS = [10, 20, 30, 50]` 상수는 더 이상 사용 안 함 — 빈 상태에서 프리셋 제거됐고 사전 셋업 화면은 동적 프리셋 사용. **`TARGET_PRESETS` 상수 삭제.**

- [ ] **Step 3: 사전 셋업 화면 JSX 추가**

조건: `!loading && hasImages && !tournamentStarted`

`{!loading && hasImages ? (` 블록 안에서 (현재 `<>` fragment 안), 완료 배너와 그리드 모두 **위에** 다음 분기를 추가:

```jsx
{!tournamentStarted ? (
  <div className="pre-tournament">
    <h2>{images.length}장 업로드 완료</h2>
    <p className="muted">몇 장으로 좁힐까요?</p>

    <div className="target-presets" role="group" aria-label="목표 수량">
      {smartPresets(images.length).map((preset) => (
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
        min="1"
        max={images.length - 1}
        placeholder="직접 입력"
        value={smartPresets(images.length).includes(targetCount) ? "" : (targetCount || "")}
        onChange={(event) => {
          const value = Number(event.target.value);
          setTargetCount(Number.isNaN(value) ? 0 : Math.max(value, 0));
        }}
      />
    </div>

    <button
      className="btn primary pre-tournament-start"
      type="button"
      onClick={startTournament}
      disabled={targetCount <= 0 || targetCount >= images.length}
    >
      이미지 고르기 시작
    </button>
  </div>
) : (
  <>
    {tournamentComplete ? (
      /* 완료 배너 — 기존 코드 그대로 */
    ) : null}
    <div className={`grid grid-${gridSize}`} ...>
      ...
    </div>
    /* 그리드 footer (페이지 네비, 진행률 등) — 기존 그대로 */
  </>
)}
```

**핵심 컨텍스트**: `{!tournamentStarted}` 분기를 추가하면서, **기존의 그리드 + 완료 배너 + 페이지 네비 등 모든 "tournament 활성 시" UI 를 `else` 가지로 묶어야 함.** 작업자는 현재 `{!loading && hasImages ? (<>...기존 그리드 컨테이너...</>) : null}` 의 fragment 내용을 보고 적절히 분기.

대안 — 분기를 더 평평하게: 기존 Fragment 안 첫 자식으로 `{!tournamentStarted ? <PreTournamentSetup/> : null}` 을 두고, 같은 Fragment 의 나머지(그리드 등) 는 `{tournamentStarted ? <GridArea/> : null}` 로 감싸기. 가독성 측면에서 평평한 분기가 낫지만 중복 분기 — 작업자 판단.

권장: 사전 셋업과 그리드를 ternary 로 분기 (한 번에 하나만 렌더):

```jsx
{!loading && hasImages ? (
  !tournamentStarted ? (
    <div className="pre-tournament"> ... </div>
  ) : (
    <>
      {tournamentComplete ? <CompleteBanner /> : null}
      <div className="grid ..."> ... </div>
      ...기타 그리드 영역 UI...
    </>
  )
) : null}
```

작업자는 위 권장 패턴으로 실제 JSX 를 재배치. 기존 코드 손실 없도록 careful.

- [ ] **Step 4: CSS 추가**

`src/styles.css` 끝에 `.pre-tournament` 와 `.pre-tournament-start` 스타일 추가:

```css
.pre-tournament {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 16px;
  height: 100%;
}

.pre-tournament h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #1a1a1a;
}

.pre-tournament .muted {
  margin: 0;
  font-size: 13px;
  color: #6a6a6a;
}

.pre-tournament-start {
  margin-top: 12px;
  font-size: 14px;
  padding: 10px 24px;
}
```

- [ ] **Step 5: Build + 수동 확인**

Run: `npm run build`. PASS.

권장 dev 확인:
- 빈 상태 → 파일/폴더 선택만.
- 30장 업로드 → "30장 업로드 완료, 몇 장으로 좁힐까요?" + 프리셋 [2,5,10,20] + 직접 입력 + 시작 버튼.
- 시작 버튼 disabled 가 적절히 동작 (target 0 이거나 ≥ pool).
- 시작 버튼 클릭 → 그리드 + Round 1 배지.

- [ ] **Step 6: Commit**

```
feat: add pre-tournament setup screen with smart presets

- New tournamentStarted gate replaces empty-state preset placement
- Smart presets adapt to upload count (powers/round numbers under N)
- Direct input still available
- "이미지 고르기 시작" CTA enabled only when target is valid

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 6: 라운드 전환 토스트

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: App.jsx — toast 상태 + useEffect**

App 컴포넌트 본문에 `useState`, `useRef` import 가 이미 있음. 기존 useState/useRef 들 옆에 추가:

```jsx
const [announcedRound, setAnnouncedRound] = useState(null);
const prevRoundRef = useRef(currentRound);
```

(`currentRound` destructure 가 이미 있음. `useRef` import 가 없으면 React import 줄에 추가.)

useEffect:

```jsx
useEffect(() => {
  if (currentRound > prevRoundRef.current && !tournamentComplete) {
    setAnnouncedRound(currentRound);
    prevRoundRef.current = currentRound;
    const id = setTimeout(() => setAnnouncedRound(null), 2500);
    return () => clearTimeout(id);
  }
  prevRoundRef.current = currentRound;
}, [currentRound, tournamentComplete]);
```

위치: 다른 useEffect 들 사이.

- [ ] **Step 2: 토스트 JSX 추가**

App return 의 가장 바깥쪽 (모달들과 비슷한 위치, footer 직전 또는 직후):

```jsx
{announcedRound != null ? (
  <div className="round-toast" role="status" aria-live="polite">
    Round {announcedRound} 시작
  </div>
) : null}
```

- [ ] **Step 3: CSS 추가**

`src/styles.css` 끝에 다음 추가:

```css
.round-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(26, 26, 26, 0.92);
  color: #ffffff;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  z-index: 100;
  pointer-events: none;
  animation: round-toast-fade 2.5s ease forwards;
}

@keyframes round-toast-fade {
  0% { opacity: 0; transform: translate(-50%, -10px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  85% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -10px); }
}
```

- [ ] **Step 4: Build 검증**

Run: `npm run build`. PASS — `react-hooks/exhaustive-deps` 가 useEffect 에 만족됨.

- [ ] **Step 5: Commit**

```
feat: add round transition toast on auto-advance

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 7: 최종 회귀 검증 + push

- [ ] **Step 1: build 재확인**

Run: `npm run build`. PASS.

- [ ] **Step 2: 수동 시나리오**

Run: `npm run dev`.

1. **빈 상태**: 파일/폴더 선택 버튼만, 프리셋/입력 없음.
2. **업로드 후 사전 셋업**: 30장 업로드 → "30장 업로드 완료" 화면. 프리셋 `[2, 5, 10, 20]` + 직접 입력 + "이미지 고르기 시작" CTA.
3. **시작 disabled**: 목표 0 또는 ≥ 30 으로 직접 입력 → 시작 버튼 비활성.
4. **시작 → Round 1**: 시작 클릭 → 그리드 + Round 1 배지 표시.
5. **자유 선택**: 목표 5 설정 + 15장 선택 (cap 없음, 자유롭게).
6. **마지막 페이지에서 자동 advance**: 마지막 페이지에서 Space → "Round 2 시작" 토스트 표시 후 페이드. 풀 = 15장, 페이지 0.
7. **0 선택일 때 자동 advance 안 됨**: 마지막 페이지 + 0 선택 + Space → 머무름.
8. **전체 선택일 때 자동 advance 안 됨**: 마지막 페이지 + 전체 선택 + Space → 머무름.
9. **"다음 페이지" 버튼**: 같은 동작 (마지막 페이지에서 advance).
10. **자동 완료**: 라운드 진행하다 풀 ≤ 5 → 토스트 안 뜨고 (대신) 완료 배너.
11. **ZIP 내보내기**: 완료 후 ZIP 파일 수 확인.
12. **Undo (Ctrl+Z)**: 시작 → 셋업 복귀, 라운드 advance → 이전 라운드 풀 복귀.
13. **다시 시작**: 완료 후 "다시 시작" → 빈 상태로 돌아감.
14. **회귀**: 그리드 토글, Loupe, 단축키/릴리즈 모달, footer 정상.

- [ ] **Step 3: Push (controller 측, 사용자 위임)**

```bash
git push origin main
```

push 후 Vercel 자동 재빌드 → `https://ohmyweddingday.com` 반영.

---

## Self-Review Notes

스펙(`2026-05-06-setup-flow-and-auto-round-design.md`) 의 5 변경 + 11 수용 기준 모두 본 plan 의 task 1~6 에 매핑됨.

**Type/이름 일관성:**
- `tournamentStarted`, `startTournament` 모든 위치에서 동일.
- `smartPresets` 함수 이름 통일.
- `announcedRound`, `prevRoundRef` 이름 통일.

**플레이스홀더 잔재 없음.** Task 5 Step 3 의 사전 셋업 JSX 위치 안내는 의도적으로 작업자 판단을 요구하는 부분 (현재 코드 구조 의존) — placeholder 가 아닌 가이드.
