# 2026-05-05 라운드 메커니즘 — image worldcup 정통 narrowing

## 배경

직전 UX batch (`195875f` ~ `bdb0639`) 에서 "목표 도달 시 추가 선택 차단" cap 정책을 도입했지만, 본 앱의 의도(이미지 월드컵)와 충돌함. 정통 worldcup 은 한 라운드에 자유롭게 선호 사진을 고르고, 그 다음 라운드에 선택된 것들만으로 다시 좁혀가는 방식. 사용자 명시적 결정으로 cap 정책을 **완전히 걷어내고** 라운드 메커니즘을 도입함.

## 사용자 모델

1. 사용자가 사진들을 올린다 (예: 100장).
2. 목표 수량 설정 (예: 20). 
3. **Round 1 시작.** 풀(pool) = 100장. 사용자는 좋아하는 사진들을 선택 (1장 이상, 풀 크기 미만).
4. **"다음 라운드"** 클릭. 풀 ← 선택된 것들. 선택 해제. 페이지 0 으로. Round 2 진입.
5. 이를 반복하다 풀 크기 ≤ 목표 수량이 되면 **토너먼트 완료**. 풀이 곧 최종 선택.
6. 완료 후엔 ZIP 내보내기 / 다시 시작만 가능. 추가 선택/해제 불가.

## 변경 1 — 직전 UX batch 의 cap 관련 회수

### Revert: `toggleByVisibleIndex` cap block

`src/store/usePickerStore.js` 의 `toggleByVisibleIndex` 안의 다음 가드를 제거:

```js
if (willSelect && targetCount > 0) {
  const selectedTotal = images.filter((image) => image.selected).length;
  if (selectedTotal >= targetCount) {
    return;
  }
}
```

(완료 lock 은 변경 3 에서 별도로 추가.)

### Revert: `selectAll` 의 cap 슬롯 계산

`selectAll` 의 `slots = targetCount > 0 ? Math.max(0, targetCount - selectedTotal) : ...` 로직 제거. 단순히 visible 의 미선택 전부 선택. (clearSelections 와 대칭.)

### Revert: `App.jsx` 의 `atCap` 시각/동작 신호

- `const atCap = ...` 한 줄 제거.
- 그리드 타일 className 배열에서 `!image.selected && atCap ? "cap-blocked" : ""` 항목 제거.
- "모두 선택" 버튼 `disabled` 조건에서 `atCap` 항목 제거 (`!hasImages || visibleAllSelected` 만 남김).
- "해제" 버튼 `disabled={visibleSelectedCount === 0}` **유지** — 페이지 스코프 정상 동작.

### Revert: `.tile.cap-blocked` CSS

`src/styles.css` 의 `.tile.cap-blocked` 규칙 제거.

### 유지

- Footer `border-top` 제거 (Task 4 작업분).
- 두 버튼의 갱신된 `title` (페이지 스코프 명시).
- `visibleImages` 기반의 `visibleSelectedCount`, `visibleAllSelected` 파생값.
- `selectAll`, `clearSelections` 의 visible-only 동작 (라운드 안에서도 페이지 단위 빠른 토글에 유용).

## 변경 2 — 라운드 store state + 액션

`src/store/usePickerStore.js`:

### 새 state

```js
currentRound: 1,
tournamentComplete: false,
```

### snapshot 확장

`buildSnapshot` 와 `restoreSnapshot` 에 `currentRound` 와 `tournamentComplete` 포함. Undo 가 라운드 전환을 되돌릴 수 있도록.

### 새 액션 — `advanceRound`

```js
advanceRound: () => {
  const { images, targetCount, tournamentComplete } = get();
  if (tournamentComplete) return;
  if (images.length === 0) return;

  const selected = images.filter((image) => image.selected);
  if (selected.length === 0) return;          // 아무것도 선택 안 함
  if (selected.length === images.length) return; // 모두 선택 — 좁혀지지 않음

  get().pushHistory();

  const nextImages = selected.map((image) => ({ ...image, selected: false }));
  const completed = targetCount > 0 && nextImages.length <= targetCount;

  set({
    images: nextImages,
    currentPage: 0,
    focusedIndex: 0,
    currentRound: get().currentRound + 1,
    tournamentComplete: completed,
  });
},
```

핵심 동작:
- 선택된 것들만 새 풀로. 나머지 폐기 (`revokePreviews` 는 호출 안 함 — undo 로 되돌릴 수 있어야 하므로 폐기 직후 메모리 해제는 안 함. 다만 새 풀 객체에서 `selected: false` 로 리셋).
  - **메모: `revokePreviews` 미호출의 영향**: 폐기된 이미지의 ObjectURL 이 살아있어 Undo 시 미리보기 정상 표시됨. 단점은 메모리 보유 — 100장 → 50장 narrow 후에도 50장의 ObjectURL 유지. Undo 가 history (최대 50개 snapshot) 에 묶여있고, snapshot 이 빠지면 GC 되도록 React 의 image element 가 dispose. 단순화 위해 본 spec 에선 적극적 revoke 안 함.
- 페이지 0, 포커스 0 으로 리셋 (새 풀의 첫 화면부터).
- 라운드 카운터 증가.
- 새 풀이 목표 이하면 `tournamentComplete: true`. `targetCount === 0` 이면 자동 완료 안 함 (사용자가 무한 narrowing 가능 — UX 상 비추지만 spec 상 허용).

### `loadFiles` 수정

기존 `set({ ..., history: [] })` 에 다음 추가:

```js
currentRound: 1,
tournamentComplete: false,
```

새 사진 로드 시 라운드 1 부터 시작.

### `clearAll` 수정

기존 `set({ ..., history: [] })` 에 다음 추가:

```js
currentRound: 1,
tournamentComplete: false,
```

### `toggleByVisibleIndex` 완료 시 lock

함수 진입부에 추가:

```js
if (get().tournamentComplete) {
  return;
}
```

### `selectAll`, `clearSelections` 완료 시 lock

각 함수 진입부 (기존 `images.length === 0` 가드 다음) 에 추가:

```js
if (get().tournamentComplete) {
  return;
}
```

## 변경 3 — UI

### "다음 라운드" 버튼

`src/App.jsx` 의 topbar 우측 그룹 (현재 "모두 선택" / "해제" / 구분선 / "내보내기" 가 있는 영역) 에 추가. 위치: "내보내기" **앞**.

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

`btn primary` 클래스 사용 — empty state 의 "파일 선택" 과 같은 시각 강조. 토너먼트의 핵심 액션이므로 prominent.

### 라운드 카운터

상단 진행률 영역 (`.progress` 부근) 에 작은 라운드 표시 추가. 위치는 진행률 바 좌측 또는 위에 작은 배지:

```jsx
<span className="round-badge" aria-label={`라운드 ${currentRound}`}>
  Round {currentRound}
</span>
```

CSS: 작은 회색 칩 형태. 토너먼트 완료 시 다른 표시 (변경 4).

### 완료 배너

`tournamentComplete === true` 일 때 그리드 영역 위에 (또는 빈 상태 자리에) 배너 렌더:

```jsx
{tournamentComplete ? (
  <div className="complete-banner" role="status">
    <span className="complete-title">🏆 토너먼트 완료</span>
    <span className="complete-meta">
      Round {currentRound - 1} 끝 — 최종 {images.length}장 선택됨
    </span>
    <div className="complete-actions">
      <button className="btn primary" type="button" onClick={exportZip} disabled={zipStatus === "running"}>
        ZIP으로 내보내기
      </button>
      <button className="btn" type="button" onClick={clearAll}>
        다시 시작
      </button>
    </div>
  </div>
) : null}
```

위치: 그리드 위, topbar 아래. 그리드는 그대로 보임 (최종 선택을 시각적으로 확인 가능).

### CSS 추가

```css
.round-badge {
  font-size: 12px;
  font-weight: 500;
  color: #4a4a4a;
  background: #f3f3f3;
  border-radius: 999px;
  padding: 2px 10px;
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

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/store/usePickerStore.js` | `toggleByVisibleIndex`/`selectAll`/`clearSelections` cap 회수 + lock 추가, `currentRound`/`tournamentComplete` state, `advanceRound` 액션, `loadFiles`/`clearAll` 리셋, snapshot 확장 |
| `src/App.jsx` | `atCap` 회수, 타일 className 회수, "모두 선택" disabled 회수, "다음 라운드" 버튼 추가, 라운드 카운터, 완료 배너 |
| `src/styles.css` | `.tile.cap-blocked` 회수, `.round-badge`/`.complete-banner` 등 추가 |

## 비변경 / 의도적 제외

- 라운드별 "되돌리기" 별도 UI — 기본 `Ctrl+Z` (undo) 가 snapshot 기반이라 라운드 전환도 되돌림. 추가 UI 없음.
- 라운드 진행 히스토리 표시 (라운드 1: 100→50, 라운드 2: 50→25 ...) — 명시적 제외, 단순화.
- 자동 라운드 종료 트리거 — 사용자가 명시적으로 "다음 라운드" 클릭해야만 진행. 자동 안 함.
- 한 라운드 안에 선택 수가 이미 목표 이하인데 자동 완료 — 안 함. "다음 라운드" 클릭이 라운드 전환 조건. 사용자가 의도적으로 라운드를 끝내야 함.
- `tournamentComplete` 후 ZIP/다시시작 외 모든 인터랙션 차단 — 의도적. 키보드 단축키도 store-level 에서 lock.

## 수용 기준

- [ ] `toggleByVisibleIndex` 가 cap 무시하고 토글, 단 `tournamentComplete === true` 일 때만 silent return.
- [ ] `selectAll`/`clearSelections` 가 cap 미적용, 그러나 `tournamentComplete` 시 lock.
- [ ] "모두 선택" 버튼 `disabled` 가 `!hasImages || visibleAllSelected || tournamentComplete` (atCap 제거).
- [ ] "다음 라운드" 버튼이 topbar 에 추가, 적절한 disabled 조건.
- [ ] "다음 라운드" 클릭 시 풀이 선택된 것들로 좁혀지고, 선택 해제, 페이지/포커스 리셋, 라운드 카운터 증가.
- [ ] 풀 ≤ 목표 (`targetCount > 0`) 시 `tournamentComplete: true` 자동 set.
- [ ] 완료 시 배너 + ZIP/다시시작 CTA 표시. 그리드는 보이되 인터랙션 차단.
- [ ] `loadFiles` / `clearAll` 시 라운드 1 + 미완료 상태로 리셋.
- [ ] Undo (Ctrl+Z) 가 라운드 전환을 되돌리는 데도 작동 (snapshot 확장).
- [ ] `npm run build` 통과.
