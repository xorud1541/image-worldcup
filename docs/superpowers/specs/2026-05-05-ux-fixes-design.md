# 2026-05-05 UX 수정 — visible-only select/clear, footer 정리, 목표 초과 방지

## 배경

직전 배포 (`76ab928`) 직후 사용 피드백 3건. 모두 작은 동작/스타일 수정. 새 의존성/store 액션 추가 없이 기존 동작 변경만.

## 변경 1 — 모두 선택 / 모두 해제는 현재 페이지에만 적용

### 현재
- `selectAll` (`usePickerStore.js:199`): `images` 전체에 대해 `selected: true`.
- `clearSelections` (`usePickerStore.js:210`): 모든 `images` 의 selected 를 false 로.
- 상단 "모두 선택" / "선택 모두 해제" 버튼이 호출.

### 변경 후
- **`selectAll`**: `getVisibleImages()` 가 반환하는 현재 페이지(`currentPage * gridSize` ~ +`gridSize`) 범위만 처리. 그 안의 미선택 사진들을 선택. 다만 변경 3 의 cap 룰(i) 적용 — `targetCount > 0` 이면 `targetCount - 현재 선택 수` 만큼만 추가.
- **`clearSelections`**: 현재 페이지 범위 안에서 선택된 것만 false 로. 다른 페이지의 선택 상태는 그대로 유지.
- `pushHistory()` 호출은 변경 직전에 그대로 (Undo 보존).
- 변경 사항이 0건이면 history push 도 set 도 하지 않음 (no-op).

### UI 라벨/툴팁
- 상단 "모두 선택" / "선택 모두 해제" 버튼의 텍스트는 그대로 유지 (변경 안 함).
- `title` 속성만 갱신:
  - "모두 선택" → `title="현재 페이지의 모든 사진 선택"`
  - "선택 모두 해제" → `title="현재 페이지의 선택 해제"`

## 변경 2 — Footer 정리

### 현재
`.app-footer` 에 `border-top: 1px solid #ececec` 가 있어 위 콘텐츠와 분리되어 보이고, 빈 상태에서 어울리지 않음.

### 변경 후
- `border-top` 선언만 제거. 나머지 padding/text-align/font-size/color/background 그대로.
- 결과: 배경(`#fafafa`)이 페이지 배경과 동일하므로 경계 없이 자연스럽게 녹아듦. 빈 상태/사진 로드 후 모두 잘 어울림.

위치/조건 변경 없음. 이미 모든 상태(empty, loaded, modal 비활성 시)에서 표시 중이며, footer 자체는 그대로.

## 변경 3 — 목표 초과 방지

### 룰
- `atCap = targetCount > 0 && selectedCount >= targetCount`
- `targetCount === 0` 이면 무제한 (cap 미적용).

### Store 변경 — `toggleByVisibleIndex` (`usePickerStore.js:182`)
현재 동작: 인덱스 유효성 체크 후 selected 토글.

변경 후 동작:
1. `images[absoluteIndex]` 존재 확인.
2. 새 selected 값(`willSelect = !target.selected`) 계산.
3. **`willSelect === true && targetCount > 0`** 인 경우, 현재 선택 수가 `targetCount` 이상이면 **silent return**.
4. 그렇지 않으면 기존대로 `pushHistory` + 토글 + `set`.

해제(deselect) 는 항상 허용 — cap 신경 안 씀.

### Store 변경 — `selectAll`
변경 1에서 명시한 (i) 룰을 다시 정리:
- 추가 가능한 슬롯 = `Math.max(0, targetCount - selectedCount)` (단 `targetCount > 0` 일 때만)
- 추가 가능한 슬롯 = `Infinity` (즉 무제한, `targetCount === 0` 일 때)
- 현재 페이지 미선택 사진들 중, **앞에서부터** 슬롯 수만큼 선택.
- 슬롯이 0이거나 페이지에 미선택이 없으면 no-op.

### 시각적 신호 — `App.jsx` + `styles.css`

`App.jsx`:
- `atCap` 계산을 컴포넌트 본문에서 (이미 `selectedCount`, `targetCount` 보유):
  ```js
  const atCap = targetCount > 0 && selectedCount >= targetCount;
  ```
- 그리드 타일 렌더 시 `image.selected === false && atCap` 이면 `cap-blocked` modifier 추가 (기존 `.tile.selected` / `.tile.focused` 와 동일 컨벤션 — 배열 `.join(" ")` 의 한 항목).
- 상단 "모두 선택" 버튼의 `disabled` 조건:
  ```jsx
  disabled={!hasImages || (atCap === false ? false : true) && /* visible 에 미선택이 있어도 슬롯 0 */ false}
  ```
  실제로는 다음 두 조건 OR 로 disable:
  - 사진 없음 (`!hasImages`) — 기존 동일
  - `atCap` (목표 도달) AND 현재 페이지에 미선택 사진이 있어도 슬롯이 0
  단순화: `disabled={!hasImages || (atCap && /* visible 미선택 존재 여부 무관 */ true)}` — atCap 이면 그냥 disable.

  최종 disable 조건:
  ```jsx
  disabled={!hasImages || atCap}
  ```
  (atCap 이면 어차피 추가 불가능. 좀 더 보수적 — visible 미선택이 0일 때도 disable 하지만 cap 도달 시 항상 의미 명확.)

`styles.css` 새 규칙 — 컴파운드 셀렉터로 기존 modifier 패턴(`.tile.selected`, `.tile.focused`)과 일치:
```css
.tile.cap-blocked {
  opacity: 0.5;
  cursor: not-allowed;
}
```

이 클래스는 호버/클릭 동작 차단 효과를 주지 않음 — 클릭 자체는 store 의 silent return 으로 막음. CSS 는 시각적 신호만 담당.

### Edge cases
- 사용자가 cap 도달 후 한 장 해제 → `atCap === false` 즉시 → 차단 해제, 다른 사진 선택 가능.
- 키보드 단축키(`1`~`9`, `Enter`, `S`)도 `toggleByVisibleIndex` 거치므로 자동으로 cap 적용됨.
- Loupe 안에서의 토글(있다면)도 같은 path 거치므로 자동 적용.

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/store/usePickerStore.js` | `selectAll`, `clearSelections`, `toggleByVisibleIndex` 수정 |
| `src/App.jsx` | `atCap` 계산, 그리드 타일 className 확장, "모두 선택" 버튼 disable 조건, 두 버튼 title 갱신 |
| `src/styles.css` | `.app-footer` 의 `border-top` 제거, `.tile-cap-blocked` 추가 |

## 비변경 / 의도적 제외

- "선택 모두 해제" 버튼은 항상 활성. 페이지에 선택된 사진이 없어도 비활성화 안 함 (기존 동작 유지: `disabled={selectedCount === 0}` — 단 selectedCount 의미를 page-scope 로 바꾸지 않음, total 그대로 사용. **단순화 위해 기존 disabled 조건 그대로 유지**).
- 토스트/배너로 "목표 도달" 알림 — 명시적 제외 (silent + 시각적 신호로 충분).
- 라벨 변경 ("모두 선택" → "페이지 선택" 등) — 기존 muscle memory 유지를 위해 유보.
- FIFO 교체 등 복잡 동작 — 명시적 제외.

## 수용 기준

- [ ] 페이지 1에서 "모두 선택" 클릭 → 페이지 1의 사진만 선택됨. 페이지 이동 후 페이지 2에서 다시 클릭 → 페이지 2 사진만 선택, 페이지 1 선택 유지.
- [ ] 페이지 1에서 일부 선택 후 "선택 모두 해제" → 페이지 1의 선택만 해제, 다른 페이지 선택 유지.
- [ ] 목표 20장 설정 + 19장 선택 상태에서 미선택 사진 클릭 → 20장 됨. 그 후 다른 미선택 사진 클릭 → 아무 일도 일어나지 않음. 미선택 타일들이 `opacity 0.5` + `not-allowed` 커서.
- [ ] 위 상태에서 선택된 사진 한 장 클릭 → 해제됨 (cap 무시). `.cap-blocked` 클래스가 미선택 타일에서 즉시 사라져 정상 외관 복귀.
- [ ] 목표 0 (미설정) 상태에서는 cap 동작 없음 (무제한 선택 가능, 시각적 disabled 표시도 안 뜸).
- [ ] Footer 가 빈 상태와 사진 로드 후 모두 표시되며, 위 콘텐츠와 경계선 없이 자연스럽게 녹아듦.
- [ ] `npm run build` 통과.
