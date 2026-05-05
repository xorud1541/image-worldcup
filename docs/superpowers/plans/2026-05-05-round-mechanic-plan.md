# 2026-05-05 라운드 메커니즘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** image worldcup 정통 narrowing 모델 도입. 직전 batch 의 cap 정책을 회수하고, 한 라운드 동안 자유 선택 → "다음 라운드" 클릭으로 풀 좁힘 → 풀 ≤ 목표 시 자동 완료. 완료 후 인터랙션 lock.

**Architecture:** 기존 zustand store 에 `currentRound`/`tournamentComplete` state 와 `advanceRound` 액션 추가. UI 에 "다음 라운드" 버튼, 라운드 카운터, 완료 배너 추가. 직전 cap 관련 코드는 surgical 제거 (배포된 footer/title 변경, page-scoped 파생값은 유지).

**Tech Stack:** React 18, Zustand, Vite 5, ESLint 9.

**Reference spec:** `docs/superpowers/specs/2026-05-05-round-mechanic-design.md`

**Note on testing:** 단위 테스트 인프라 없음. 검증은 (1) `npm run build`, (2) 수동 브라우저 확인. 각 task 끝에 build, batch 끝에 수동 시나리오.

---

## Task 1: `toggleByVisibleIndex` 의 cap block 회수 + 완료 lock

**Files:**
- Modify: `src/store/usePickerStore.js` — `toggleByVisibleIndex`

- [ ] **Step 1: 함수 본체 교체**

기존 함수를 다음으로 교체 (cap 가드 삭제, 완료 lock 가드 추가):

```js
  toggleByVisibleIndex: (visibleIndex) => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    const absoluteIndex = currentPage * gridSize + visibleIndex;
    if (!images[absoluteIndex]) {
      return;
    }

    get().pushHistory();
    const nextImages = [...images];
    nextImages[absoluteIndex] = {
      ...nextImages[absoluteIndex],
      selected: !nextImages[absoluteIndex].selected,
    };

    set({ images: nextImages, focusedIndex: visibleIndex });
  },
```

핵심:
- `tournamentComplete === true` 면 즉시 return.
- 그 외엔 cap 무시하고 단순 토글 (Task 1 of UX batch 이전 상태와 동일).

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS 확인. (`tournamentComplete` 는 다음 task 에서 정의되지만, `get()` 결과에 없으면 `undefined` 라 falsy 처리되어 정상 동작. 다만 ESLint 경고 가능성은 없음 — destructuring 안 쓰니 미정의 키 접근만 발생.)

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
refactor: drop target cap from toggleByVisibleIndex, prepare for round lock

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `selectAll` 의 cap 슬롯 회수 + 완료 lock

**Files:**
- Modify: `src/store/usePickerStore.js` — `selectAll`

- [ ] **Step 1: 함수 본체 교체**

기존 함수를 다음으로 교체:

```js
  selectAll: () => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    if (images.length === 0) {
      return;
    }

    const start = currentPage * gridSize;
    const end = Math.min(start + gridSize, images.length);

    let changed = false;
    const nextImages = images.map((image, i) => {
      if (i >= start && i < end && !image.selected) {
        changed = true;
        return { ...image, selected: true };
      }
      return image;
    });

    if (!changed) {
      return;
    }

    get().pushHistory();
    set({ images: nextImages });
  },
```

핵심:
- `targetCount`/`selectedTotal`/`slots`/`toAdd` 계산 모두 제거.
- 단순히 visible 의 미선택 전부 선택. `clearSelections` 와 대칭 구조.
- `tournamentComplete` 시 lock.

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
refactor: drop target cap from selectAll, prepare for round lock

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `clearSelections` 에 완료 lock 가드 추가

**Files:**
- Modify: `src/store/usePickerStore.js` — `clearSelections`

- [ ] **Step 1: 함수 진입부에 가드 추가**

기존 함수의 첫 줄(`const { images, currentPage, gridSize } = get();`) 위에 다음 한 블록 추가:

```js
    if (get().tournamentComplete) {
      return;
    }

```

함수 전체 (변경 후):

```js
  clearSelections: () => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    if (images.length === 0) {
      return;
    }

    const start = currentPage * gridSize;
    const end = Math.min(start + gridSize, images.length);

    let changed = false;
    const nextImages = images.map((image, i) => {
      if (i >= start && i < end && image.selected) {
        changed = true;
        return { ...image, selected: false };
      }
      return image;
    });

    if (!changed) {
      return;
    }

    get().pushHistory();
    set({ images: nextImages });
  },
```

- [ ] **Step 2: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: lock clearSelections when tournament complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 라운드 store state, 액션, snapshot 확장, 리셋 경로

**Files:**
- Modify: `src/store/usePickerStore.js`

- [ ] **Step 1: `buildSnapshot` / `restoreSnapshot` 확장**

`buildSnapshot` 본체:

```js
function buildSnapshot(state) {
  return {
    images: state.images,
    currentPage: state.currentPage,
    focusedIndex: state.focusedIndex,
    targetCount: state.targetCount,
    currentRound: state.currentRound,
    tournamentComplete: state.tournamentComplete,
  };
}
```

`restoreSnapshot` 본체:

```js
function restoreSnapshot(snapshot) {
  return {
    images: snapshot.images,
    currentPage: snapshot.currentPage,
    focusedIndex: snapshot.focusedIndex,
    targetCount: snapshot.targetCount,
    currentRound: snapshot.currentRound,
    tournamentComplete: snapshot.tournamentComplete,
  };
}
```

- [ ] **Step 2: 새 state 추가**

`usePickerStore` 의 초기 state 객체(약 25-38 줄) 의 `history: [],` 직전에 다음 두 줄 추가:

```js
  currentRound: 1,
  tournamentComplete: false,
```

위치 컨텍스트 (변경 후 발췌):

```js
  zipProgress: 0,
  error: "",
  currentRound: 1,
  tournamentComplete: false,
  history: [],
```

- [ ] **Step 3: `loadFiles` 리셋 추가**

`loadFiles` 안의 첫 번째 `set({ ... history: [], })` 블록 (약 44-55 줄) 에 `history: [],` 옆에 다음 두 줄 추가:

```js
      currentRound: 1,
      tournamentComplete: false,
```

변경 후 (해당 set 객체):

```js
    set({
      images: [],
      unsupportedFiles,
      currentPage: 0,
      focusedIndex: 0,
      loadProgress: 0,
      loading: true,
      zipStatus: "idle",
      zipProgress: 0,
      error: "",
      currentRound: 1,
      tournamentComplete: false,
      history: [],
    });
```

- [ ] **Step 4: `clearAll` 리셋 추가**

`clearAll` 안의 `set({ ... history: [], })` (약 71-87 줄) 에 `history: [],` 위에 다음 추가:

```js
      currentRound: 1,
      tournamentComplete: false,
```

변경 후 (해당 set 객체):

```js
    set({
      images: [],
      unsupportedFiles: [],
      currentPage: 0,
      focusedIndex: 0,
      targetCount: 20,
      loupeOpen: false,
      loading: false,
      loadProgress: 0,
      zipStatus: "idle",
      zipProgress: 0,
      error: "",
      currentRound: 1,
      tournamentComplete: false,
      history: [],
    });
```

- [ ] **Step 5: `advanceRound` 액션 추가**

기존 액션들 사이 — `clearSelections` 와 `undo` 사이가 자연스러움. 단, 본 plan 시점엔 `selectAll`/`clearSelections` 가 store 끝 부근에 있고 그 사이에 다른 액션들도 있음. **위치는 `clearSelections` 직후, `undo` 가 있다면 그 전.** 현재 파일 구조 확인 후 적절히 배치.

```js
  advanceRound: () => {
    const { images, targetCount, tournamentComplete } = get();
    if (tournamentComplete) {
      return;
    }
    if (images.length === 0) {
      return;
    }

    const selected = images.filter((image) => image.selected);
    if (selected.length === 0) {
      return;
    }
    if (selected.length === images.length) {
      return;
    }

    get().pushHistory();

    const completed = targetCount > 0 && selected.length <= targetCount;
    const nextImages = selected.map((image) => ({
      ...image,
      selected: completed,
    }));

    set({
      images: nextImages,
      currentPage: 0,
      focusedIndex: 0,
      currentRound: get().currentRound + 1,
      tournamentComplete: completed,
    });
  },
```

핵심:
- 완료 lock, 빈 풀, 0 선택, 전체 선택 — 4가지 no-op 가드.
- 새 풀은 선택된 것들의 **deep-copy** — 원본 객체는 history snapshot 에 남아있어 undo 시 복원 가능.
- **선택 상태**: 완료 시(`completed === true`) 새 풀의 모든 항목을 `selected: true` 로 유지 (최종 선택 = 풀 그 자체이므로 ZIP 내보내기가 정상 동작). 미완료 라운드 진행 시는 `selected: false` 로 리셋해 다음 라운드 자유 선택.
- `revokePreviews` 호출 안 함 — undo 호환을 위해 ObjectURL 보존.
- `currentPage`, `focusedIndex` 모두 0 으로.
- 풀 크기가 목표 이하 (`targetCount > 0` 일 때만) 면 `tournamentComplete: true`.

- [ ] **Step 6: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: add round state, advanceRound action, snapshot extensions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `App.jsx` 의 cap 관련 회수 + atCap 시각/disable 제거

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: `atCap` 변수 선언 제거**

`completion` 직후의 다음 줄 삭제:

```jsx
  const atCap = targetCount > 0 && selectedCount >= targetCount;
```

`visibleSelectedCount` / `visibleAllSelected` 두 줄은 **유지** (Task 4-fix 에서 추가, 라운드 모드에서도 "모두 선택" / "해제" 의 disable 조건에 계속 사용).

- [ ] **Step 2: 그리드 타일 className 의 `cap-blocked` 항목 제거**

타일 button 의 className 배열에서 다음 줄 삭제:

```jsx
    !image.selected && atCap ? "cap-blocked" : "",
```

배열은 다시 3개 항목으로:

```jsx
className={[
  "tile",
  image.selected ? "selected" : "",
  index === focusedIndex ? "focused" : "",
].join(" ")}
```

- [ ] **Step 3: "모두 선택" 버튼 disabled 에서 `atCap` 제거**

기존 (Task 4-fix 후):

```jsx
disabled={!hasImages || atCap || visibleAllSelected}
```

다음으로 교체:

```jsx
disabled={!hasImages || visibleAllSelected || tournamentComplete}
```

(`tournamentComplete` 추가로 완료 시 자동 비활성. 다음 task 에서 `tournamentComplete` 를 store 에서 destructure 해야 함 — 본 task 에서는 disable 조건만 작성, destructure 는 다음 task 6 와 묶을지 / 본 task 에 포함할지 결정. **본 task 에 포함** — `tournamentComplete` destructure 도 같이.)

- [ ] **Step 4: store destructure 에 `tournamentComplete` 만 추가**

`usePickerStore()` 비구조화 (약 16-45 줄 부근) 에 다음 한 줄만 추가:

```jsx
    tournamentComplete,
```

(`currentRound` / `advanceRound` 는 Task 6 에서 UI 가 실제로 사용할 때 destructure 에 추가. ESLint `no-unused-vars` 회피 — 본 task 의 build 가 안전하게 통과.)

- [ ] **Step 5: "해제" 버튼 disabled 에 `tournamentComplete` 추가**

기존:

```jsx
disabled={visibleSelectedCount === 0}
```

다음으로:

```jsx
disabled={visibleSelectedCount === 0 || tournamentComplete}
```

- [ ] **Step 6: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
refactor: remove atCap UI and lock action buttons on tournament complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: "다음 라운드" 버튼 + 라운드 카운터 + 완료 배너

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] **Step 0: store destructure 에 `currentRound`, `advanceRound` 추가**

Task 5 에서 `tournamentComplete` 만 추가했으므로, Task 6 에서 UI 가 사용할 두 이름을 마저 추가:

```jsx
    currentRound,
    advanceRound,
```

`tournamentComplete` 옆/근처에. 본 task 의 다음 step 들이 둘 다 사용하므로 unused 경고 없음.

- [ ] **Step 1: "다음 라운드" 버튼 추가**

topbar 우측 그룹에서 "해제" 버튼과 `<span className="topbar-divider" aria-hidden="true" />` 사이 (Export 버튼 앞) 에 다음 추가:

```jsx
          <button
            className="btn primary"
            type="button"
            onClick={advanceRound}
            disabled={
              !hasImages ||
              tournamentComplete ||
              selectedCount === 0 ||
              selectedCount === images.length
            }
            title="선택한 사진들로 다음 라운드 진행"
          >
            다음 라운드
          </button>
```

(`selectedCount` 와 `images` 는 이미 컴포넌트 안에 있음.)

- [ ] **Step 2: 라운드 카운터 배지 추가**

`.progress` 컨테이너 (현재 약 229-263 줄 부근) 의 `<div className="progress-track">` **앞** 에 다음 추가 (완료 시 숨김 — 배너의 `Round N-1` 표기와 헷갈리지 않게):

```jsx
            {!tournamentComplete ? (
              <span className="round-badge" aria-label={`라운드 ${currentRound}`}>
                Round {currentRound}
              </span>
            ) : null}
```

위치 컨텍스트 (변경 후 progress 영역):

```jsx
        <div className="topbar-center">
          <div className="progress">
            <span className="round-badge" aria-label={`라운드 ${currentRound}`}>
              Round {currentRound}
            </span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${completion}%` }} />
            </div>
            ...
```

- [ ] **Step 3: 완료 배너 추가**

그리드 영역 (`{!loading && hasImages ? (` 블록) **위**, 즉 빈 상태 블록 직후 / 로딩 블록 직후 적절한 위치에 다음 추가:

```jsx
        {tournamentComplete ? (
          <div className="complete-banner" role="status">
            <span className="complete-title">🏆 토너먼트 완료</span>
            <span className="complete-meta">
              Round {currentRound - 1} 끝 — 최종 {images.length}장 선택됨
            </span>
            <div className="complete-actions">
              <button
                className="btn primary"
                type="button"
                onClick={exportZip}
                disabled={zipStatus === "running"}
              >
                ZIP으로 내보내기
              </button>
              <button className="btn" type="button" onClick={clearAll}>
                다시 시작
              </button>
            </div>
          </div>
        ) : null}
```

위치 정확화: `{!loading && hasImages ? (` 의 `<>` fragment 의 **첫 번째 자식**, 그리드 (`<div className="grid grid-N">`) 보다 **앞**. 배너는 `.stage` 의 `overflow: hidden` 안쪽이 아니라 같은 콘텐츠 영역의 위쪽에 위치하도록. 만약 빌드 후 시각 확인에서 배너가 잘리거나 그리드가 안 보이면 별도 wrapper `<div className="content-with-banner">` 로 감싸 flex column 처리.

- [ ] **Step 4: CSS 추가 — `.tile.cap-blocked` 제거**

`src/styles.css` 에서 `.tile.cap-blocked { opacity: 0.5; cursor: not-allowed; }` 규칙 한 블록 삭제.

- [ ] **Step 5: CSS 추가 — `.round-badge`, `.complete-banner`**

`src/styles.css` 끝에 다음 추가:

```css
.round-badge {
  font-size: 12px;
  font-weight: 500;
  color: #4a4a4a;
  background: #f3f3f3;
  border-radius: 999px;
  padding: 2px 10px;
  margin-right: 8px;
}

.complete-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fff8e7;
  border: 1px solid #f0d68c;
  border-radius: 8px;
  margin: 12px 16px;
}

.complete-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.complete-meta {
  font-size: 13px;
  color: #6a6a6a;
}

.complete-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
```

- [ ] **Step 6: Build 검증**

Run: `npm run build`. PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "$(cat <<'EOF'
feat: add round button, round counter, completion banner

- Topbar "다음 라운드" button advances round on click
- Round badge in progress area
- Tournament completion banner with ZIP/restart CTAs
- Drop now-unused .tile.cap-blocked rule

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 최종 회귀 검증

- [ ] **Step 1: 전체 build 통과 재확인**

Run: `npm run build`. PASS.

- [ ] **Step 2: 수동 시나리오**

Run: `npm run dev`. 다음 점검:

1. **빈 상태**: 풋터 경계선 없음, 목표 수량 프리셋 + 직접 입력 정상.
2. **사진 로드 + Round 1 시작**: Round 1 배지 표시. 그리드 정상.
3. **자유 선택**: 목표 초과해서 선택해도 silent 차단 없음 (예: 목표 5, 사진 30 → 15장 선택 가능).
4. **"다음 라운드" disabled 조건**: 0 선택 / 전체 선택 / 사진 없음 시 비활성. 1 ≤ 선택 < 전체일 때만 활성.
5. **라운드 진행**: "다음 라운드" 클릭 → 풀 = 선택된 것들, 모두 미선택, 페이지 0, Round 카운터 +1.
6. **자동 완료**: 풀 ≤ 목표 도달 시 완료 배너 표시, 그리드는 보이되 클릭/키보드 토글 차단.
7. **완료 시 버튼 lock**: "모두 선택" / "해제" / "다음 라운드" 모두 disabled. "ZIP 으로 내보내기" / "다시 시작" 정상.
8. **Undo (Ctrl+Z)**: 라운드 전환 직후 Undo → 이전 풀 + 라운드 카운터 -1 + tournamentComplete 복원.
9. **다시 시작**: "다시 시작" → 빈 상태로 (clearAll 동작), Round 1, 미완료.
10. **새 사진 로드**: 진행 중 새 파일 업로드 → loadFiles 가 라운드/완료 리셋.
11. **완료 시 ZIP 내용 검증**: 완료 후 "ZIP으로 내보내기" → 다운로드된 zip 안에 풀의 모든 사진 (즉 최종 선택) 이 포함되는지 직접 unzip 또는 archive viewer 로 확인. (단순히 "다운로드 됐다" 가 아니라 **파일 수가 풀 크기와 일치** 하는지.)
12. **회귀**: 그리드 토글, Loupe, 단축키 모달, 릴리즈 모달, footer, ZIP 등 기존 기능 정상.

- [ ] **Step 3: Push (수동, 사용자 측)**

작업자는 push 안 함. 사용자 직접:

```bash
git push origin main
```

직전 UX batch 의 5 commits 도 함께 push 됨 (아직 push 안 됨).

---

## Self-Review Notes

스펙(`2026-05-05-round-mechanic-design.md`) 의 3 변경 + 10 수용 기준 모두 본 plan 의 task 1~6 에 매핑됨:

- 변경 1 (cap 회수) → Task 1, 2, 5 의 회수 step 들
- 변경 2 (store state + advanceRound) → Task 4
- 변경 3 (UI 추가) → Task 6

**Type/이름 일관성:**
- `currentRound`, `tournamentComplete`, `advanceRound` 모든 위치에서 동일 명칭.
- snapshot 의 두 새 키 buildSnapshot ↔ restoreSnapshot 일치.
- React state destructure 와 store state 키 일치.

**플레이스홀더 잔재 없음.** 모든 코드 블록은 실제 적용 가능한 완성 코드.

**라인 번호 정확성:** 본 plan 의 라인 번호는 cap 회수 task 들이 적용된 후 변동되므로, 라인 매칭보다 텍스트 매칭에 의존. 작업자는 각 step 에서 텍스트 컨텍스트를 정확히 확인 후 적용.
