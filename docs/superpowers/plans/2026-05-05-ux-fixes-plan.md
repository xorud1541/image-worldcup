# 2026-05-05 UX 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "모두 선택" / "모두 해제" 가 현재 페이지 범위에만 작동하도록 바꾸고, 목표 수량 도달 시 추가 선택을 silent block + 시각적으로 비활성화하며, footer 의 경계선을 제거해 페이지에 자연스럽게 녹아들게 한다.

**Architecture:** 모두 store 동작 변경 또는 UI 표시 변경. 새 store action / 새 컴포넌트 / 새 의존성 없음. 기존 `getVisibleImages()` 슬라이스 로직을 selectAll/clearSelections 에 재사용한다.

**Tech Stack:** React 18, Zustand, Vite 5, ESLint 9.

**Reference spec:** `docs/superpowers/specs/2026-05-05-ux-fixes-design.md`

**Note on testing:** 단위 테스트 인프라 없음. 검증은 (1) `npm run build` (lint + vite build), (2) 수동 브라우저 확인. 각 task 끝에 build 검증, batch 끝에 수동 확인.

---

## Task 1: `selectAll` 을 visible-only + cap 룰로 변경

**Files:**
- Modify: `src/store/usePickerStore.js` — `selectAll` (현재 약 199-208 줄)

- [ ] **Step 1: `selectAll` 본체 교체**

기존 함수 본체 전체를 다음으로 교체:

```js
  selectAll: () => {
    const { images, currentPage, gridSize, targetCount } = get();
    if (images.length === 0) {
      return;
    }

    const start = currentPage * gridSize;
    const end = Math.min(start + gridSize, images.length);

    const visibleUnselected = [];
    for (let i = start; i < end; i++) {
      if (!images[i].selected) {
        visibleUnselected.push(i);
      }
    }

    if (visibleUnselected.length === 0) {
      return;
    }

    const selectedTotal = images.filter((image) => image.selected).length;
    const slots =
      targetCount > 0
        ? Math.max(0, targetCount - selectedTotal)
        : visibleUnselected.length;

    const toAdd = Math.min(slots, visibleUnselected.length);
    if (toAdd === 0) {
      return;
    }

    get().pushHistory();
    const nextImages = [...images];
    for (let i = 0; i < toAdd; i++) {
      const idx = visibleUnselected[i];
      nextImages[idx] = { ...nextImages[idx], selected: true };
    }
    set({ images: nextImages });
  },
```

핵심 동작:
- `getVisibleImages()` 의 슬라이스 로직(`currentPage * gridSize` ~ `+ gridSize`)을 인라인으로 재현해서 인덱스를 직접 다룸 (객체 참조가 아닌 인덱스가 필요).
- `targetCount > 0` 일 때만 cap 적용. 0 이면 visible 의 미선택 전부 추가.
- 변경 0건이면 history push / set 호출 안 함.

- [ ] **Step 2: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: scope selectAll to current page with target cap

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `clearSelections` 을 visible-only 로 변경

**Files:**
- Modify: `src/store/usePickerStore.js` — `clearSelections` (현재 약 210-218 줄)

- [ ] **Step 1: `clearSelections` 본체 교체**

기존 함수 본체 전체를 다음으로 교체:

```js
  clearSelections: () => {
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

핵심 동작:
- 현재 페이지 범위 안에서 `selected: true` 인 것만 false 로.
- 다른 페이지의 선택은 그대로.
- 변경 0건이면 history push / set 안 함.

- [ ] **Step 2: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: scope clearSelections to current page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `toggleByVisibleIndex` 에 목표 cap 적용

**Files:**
- Modify: `src/store/usePickerStore.js` — `toggleByVisibleIndex` (현재 약 182-197 줄)

- [ ] **Step 1: `toggleByVisibleIndex` 본체 교체**

기존 함수 본체 전체를 다음으로 교체:

```js
  toggleByVisibleIndex: (visibleIndex) => {
    const { images, currentPage, gridSize, targetCount } = get();
    const absoluteIndex = currentPage * gridSize + visibleIndex;
    if (!images[absoluteIndex]) {
      return;
    }

    const target = images[absoluteIndex];
    const willSelect = !target.selected;

    if (willSelect && targetCount > 0) {
      const selectedTotal = images.filter((image) => image.selected).length;
      if (selectedTotal >= targetCount) {
        return;
      }
    }

    get().pushHistory();
    const nextImages = [...images];
    nextImages[absoluteIndex] = {
      ...target,
      selected: willSelect,
    };

    set({ images: nextImages, focusedIndex: visibleIndex });
  },
```

핵심 동작:
- 해제(`willSelect === false`) 는 cap 신경 안 씀, 항상 허용.
- 선택(`willSelect === true`) 이고 `targetCount > 0` 이고 이미 cap 도달 → silent return.
- `focusedIndex: visibleIndex` 업데이트는 기존 그대로 (silent return 시에는 안 함).

- [ ] **Step 2: Build 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePickerStore.js
git commit -m "$(cat <<'EOF'
feat: block selection when target count reached

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `App.jsx` `atCap` 계산 + 타일 시각 신호 + 버튼 disable 조건 + tooltip

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css` (말미)

- [ ] **Step 1: `atCap` 계산 추가**

`src/App.jsx` 의 `const completion = ...` 줄 직후 (현재 약 51-52 줄 사이) 에 다음 추가:

```jsx
  const atCap = targetCount > 0 && selectedCount >= targetCount;
```

- [ ] **Step 2: 그리드 타일 className 에 `cap-blocked` modifier 추가**

`src/App.jsx` 의 그리드 렌더 부분(약 458-465 줄)의 타일 button 은 현재 다음과 같이 array `.join(" ")` 형식을 사용:

```jsx
<button
  key={image.id}
  type="button"
  className={[
    "tile",
    image.selected ? "selected" : "",
    index === focusedIndex ? "focused" : "",
  ].join(" ")}
  onClick={() => toggleByVisibleIndex(index)}
  ...
>
```

배열에 `cap-blocked` modifier 한 항목 추가:

```jsx
<button
  key={image.id}
  type="button"
  className={[
    "tile",
    image.selected ? "selected" : "",
    index === focusedIndex ? "focused" : "",
    !image.selected && atCap ? "cap-blocked" : "",
  ].join(" ")}
  onClick={() => toggleByVisibleIndex(index)}
  ...
>
```

기존 `.tile.selected` / `.tile.focused` 와 동일 컨벤션 — modifier 명에 `tile-` 접두어 안 붙임. CSS 도 `.tile.cap-blocked` 로 연결.

- [ ] **Step 3: "모두 선택" 버튼 disable / title 변경**

현재 (약 287-291 줄):

```jsx
<button
  className="icon-btn"
  type="button"
  onClick={selectAll}
  disabled={!hasImages}
  title="모두 선택"
>
  모두 선택
</button>
```

다음으로 변경:

```jsx
<button
  className="icon-btn"
  type="button"
  onClick={selectAll}
  disabled={!hasImages || atCap}
  title="현재 페이지의 모든 사진 선택"
>
  모두 선택
</button>
```

- [ ] **Step 4: "선택 모두 해제" 버튼 title 변경**

현재 (약 295-301 줄):

```jsx
<button
  className="icon-btn"
  type="button"
  onClick={clearSelections}
  disabled={selectedCount === 0}
  title="선택 모두 해제"
>
```

`title` 만 변경:

```jsx
  title="현재 페이지의 선택 해제"
```

(`disabled` 조건은 그대로 유지.)

- [ ] **Step 5: `.tile.cap-blocked` CSS 추가 + footer border 제거**

`src/styles.css`:

(a) `.app-footer` 규칙에서 `border-top: 1px solid #ececec;` 한 줄 삭제. 다른 속성은 그대로.

(b) 파일 끝에 다음 추가 (`.tile.cap-blocked` 컴파운드 셀렉터로 기존 modifier 패턴과 일치):

```css
.tile.cap-blocked {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 6: Build 검증**

Run: `npm run build`
Expected: PASS. 특히 `react-hooks/exhaustive-deps` 는 본 task 에서 useEffect 안 건드리므로 영향 없음.

- [ ] **Step 7: 수동 확인 (옵션)**

Run: `npm run dev`
Expected:
- 빈 상태에서 footer 의 위쪽 회색 선이 사라지고 배경에 자연스럽게 녹아들음.
- 사진 로드 후 그리드에서 첫 페이지 "모두 선택" → 첫 페이지 그리드 사진들만 선택됨. 페이지 이동 후 다시 → 그 페이지만 선택, 이전 페이지 선택 유지.
- 목표 5 설정 + 5장 선택 → 미선택 타일들이 흐려지고 마우스 hover 시 not-allowed 커서. "모두 선택" 버튼 비활성화.
- 그 상태에서 선택된 타일 한 장 해제 → 즉시 다른 타일 정상 외관 복귀, "모두 선택" 활성화.
- dev 서버 종료(Ctrl+C).

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "$(cat <<'EOF'
feat: visualize target cap state and remove footer border

- Show grid tiles dimmed/not-allowed when at target count
- Disable selectAll button at cap
- Update select/clear button tooltips for page-scoped semantics
- Drop footer top border so it blends with page background

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 최종 회귀 검증

- [ ] **Step 1: 전체 build 통과 재확인**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: 수용 기준 수동 확인**

Run: `npm run dev`. 다음 시나리오 통과 여부 점검:

1. **Visible-only selectAll**: 첫 페이지에서 "모두 선택" → 첫 페이지만 선택. 페이지 이동 후 동일 동작 — 이전 페이지 선택 유지.
2. **Visible-only clearSelections**: 첫 페이지 일부 선택 + 다음 페이지 일부 선택 → 첫 페이지에서 "선택 모두 해제" → 첫 페이지만 해제, 다음 페이지 선택 유지.
3. **Cap silent block**: 목표 5 설정 + 5장 선택 → **미선택** 사진 클릭 → 아무 일도 안 일어남. 미선택 타일을 향한 키보드 입력 (1~9 / Enter / S) 도 동일하게 차단. 단, **이미 선택된** 타일은 키보드/클릭 어느 쪽이든 항상 해제 가능.
4. **Cap visual signal**: 위 상태의 미선택 타일들이 `opacity: 0.5` + `cursor: not-allowed`. 선택된 타일은 정상.
5. **Cap recovery**: 선택된 타일 한 장 해제 → 즉시 cap 풀림, 시각/동작 모두 정상.
6. **Cap with target=0**: 직접 입력으로 0 설정 → cap 동작 없음 (무제한 선택, 시각 disabled 없음).
7. **Footer**: 빈 상태에서 페이지 하단 텍스트 보이고 위쪽 경계선 없음. 사진 로드 후도 동일.
8. **Undo**: 위 동작들 모두 Undo (Ctrl+Z) 로 복원되는지 — `pushHistory` 호출 보존 확인.
9. **회귀**: 그리드 토글, Loupe, ZIP 내보내기, 단축키, 릴리즈 모달, 단축키 모달 등 기존 기능 정상 동작.

- [ ] **Step 3: Push (수동, 사용자 측)**

작업자는 push 안 함. 사용자가 직접:

```bash
git push origin main
```

push 후 Vercel 자동 재빌드 → `https://ohmyweddingday.com` 반영 확인은 사용자.

---

## Self-Review Notes

스펙(`2026-05-05-ux-fixes-design.md`) 의 3 변경 + 7 수용 기준 모두 본 plan 의 task 1~5 에 매핑됨:

- 변경 1 (visible-only select/clear) → Task 1, 2 (store), Task 4 의 tooltip 갱신 부분
- 변경 2 (footer 정리) → Task 4 Step 5 (a)
- 변경 3 (목표 cap) → Task 3 (toggle), Task 1 의 cap 룰, Task 4 의 시각 신호 + 버튼 disable

**Type/이름 일관성:**
- `atCap` 변수명 App.jsx 안에서만 통일
- `cap-blocked` modifier 명 JSX 배열 ↔ CSS 컴파운드 셀렉터(`.tile.cap-blocked`) 일치, 기존 `.tile.selected` / `.tile.focused` 컨벤션 그대로
- 함수 시그니처 변경 없음 — 호출자는 그대로

**플레이스홀더 잔재 없음.** Task 4 Step 2 의 className 합성은 현재 코드 형태에 맞춰야 한다는 안내가 명시되어 있어 작업자가 실제 코드 보고 동등 변환할 수 있도록 가이드만 제공.
