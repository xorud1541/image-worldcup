# 2026-05-06 이미지 확대/축소 — Loupe UX 강화

## 배경

이미 `loupeOpen` 상태와 모달은 있지만 진입점이 키보드 `Z` 키 하나뿐. 모바일에선 접근 불가, 데스크탑 사용자도 단축키 도움말 안 보면 모름. 또한 확대/축소 컨트롤이 없어 이미지를 자연 사이즈로만 봄.

## 변경 1 — 그리드 타일 확대 버튼

각 그리드 타일 우상단에 작은 🔍 버튼 오버레이.

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

- `event.stopPropagation()` 로 부모 tile button 의 onClick (`toggleByVisibleIndex`) 안 발화
- 클릭 시 해당 인덱스로 focus + loupe 오픈
- 위치: tile 의 우상단, `tile-num`/`tile-check` 와 겹치지 않게
- 크기: 모바일 터치 친화 (32~36px)

## 변경 2 — store: `openLoupeAt` 액션

기존 `toggleLoupe` 는 인덱스 인자 없이 토글. 같은 이미지를 두 번 클릭하면 닫혀버림 + 다른 이미지 열기 어려움. 새 액션 추가:

```js
openLoupeAt: (visibleIndex) => {
  if (!get().tournamentStarted) return;
  const visibleImages = get().getVisibleImages();
  if (!visibleImages[visibleIndex]) return;
  set({ focusedIndex: visibleIndex, loupeOpen: true });
},
```

`toggleLoupe` 와 `closeLoupe` 는 그대로 유지.

## 변경 3 — Loupe 모달의 줌 컨트롤

### state

App.jsx 에 `useState(1)` 로 `loupeZoom` 도입. 0.5 ~ 3.0 범위. step 0.25.

```jsx
const [loupeZoom, setLoupeZoom] = useState(1);
```

### Loupe 열릴 때 자동 1.0 리셋

```jsx
useEffect(() => {
  if (loupeOpen) {
    setLoupeZoom(1);
  }
}, [loupeOpen, loupeImage]);
```

(`loupeImage` 의존성 추가 — 다른 이미지 열 때도 리셋되도록.)

### 헤더 컨트롤 JSX

기존 loupe-header (name + ✕) 사이에 줌 컨트롤 한 그룹 추가:

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

### img 에 인라인 width 적용

기존 `<img src={loupeImage.previewUrl} alt={loupeImage.name} />` 를:

```jsx
<img
  src={loupeImage.previewUrl}
  alt={loupeImage.name}
  style={{ width: `${loupeZoom * 100}%`, height: "auto", maxWidth: "none" }}
/>
```

inline style 이 CSS `.loupe-canvas img` 의 `width: auto; max-width: none` 룰을 override.

### CSS 정리

`.loupe-canvas img` 의 `width: auto; max-width: none` 은 inline style 이 덮으므로 그대로 둬도 됨. 다만 명료성 위해 CSS 의 두 룰 삭제 — img 사이즈는 inline state 가 단일 source 가 됨.

## 변경 4 — 키보드 `+`/`−`/`0`

`Z` 키 (toggleLoupe) 외에 loupe 가 열려있을 때 다음 키 처리:

```js
case "+":
case "=":  // shift 없는 + 키
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

`isTyping` 가드는 기존대로 — input/textarea 포커스 시 동작 안 함.

단축키 도움말 모달의 `keyboardShortcuts` 배열에 다음 항목 추가:

```js
{ keys: ["+", "−", "0"], desc: "확대/축소/원본 (확대 보기 중)" },
```

(이건 옵션 — 현재 단축키는 이미 도움말 안에 있으므로 일관성 위해 추가)

## 변경 5 — CSS

`src/styles.css` 끝에 추가:

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

@media (max-width: 768px) {
  /* 모바일에선 hover 없으므로 항상 보임 */
  .tile-zoom {
    opacity: 1;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.65);
  }
}
```

`.tile` 이 `position: relative` 인지 확인 — 없으면 추가 필요. 기존 `.tile` 룰에 `position: relative` 가 없으면 본 spec 의 변경에 추가.

## 변경 6 — `loupeImage` 시점 안정화

현재 `loupeImage` 는:

```js
const loupeImage = hoverIndexRef.current != null
  ? visibleImages[hoverIndexRef.current]
  : focusedImage;
```

`openLoupeAt` 으로 인덱스 명시 호출 시, `focusedIndex` 가 그 값으로 설정되므로 `focusedImage` 가 정확. 그러나 `hoverIndexRef.current` 가 다른 값이면 그게 우선. 클릭 시점의 `hoverIndexRef` 값에 의존하므로 fragile.

**완화**: spec 본 batch 에선 손대지 않음. 기존 동작 그대로 — hover-우선 로직은 단축키 `Z` 워크플로우와 잘 맞음. 새 zoom 버튼은 stopPropagation + onClick 안에서 `setFocusedIndex` + `loupeOpen=true` 호출하므로, hoverIndexRef 가 가리키는 게 같은 인덱스일 가능성이 높음 (마우스가 그 타일 위에 있으니까). 모바일은 hoverIndexRef 가 null 이라 focusedImage 가 그대로 사용됨.

만약 클릭 후 보이는 이미지가 의도와 어긋나면 향후 fix.

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/store/usePickerStore.js` | `openLoupeAt` 액션 추가 |
| `src/App.jsx` | tile zoom 버튼, loupeZoom state, 헤더 줌 컨트롤, img inline style, keyboard +/-/0, openLoupeAt destructure |
| `src/styles.css` | `.tile-zoom`, `.loupe-zoom`, `.loupe-zoom-value`, mobile media 룰 추가; `.loupe-canvas img` 의 `width: auto; max-width: none` 두 줄 제거 (옵션 — inline 으로 덮어짐) |

## 비변경

- 핀치 줌 (브라우저 native) — 모달 안에서 동작 안 할 가능성 있음. 줌 버튼으로 충분.
- 패닝 — `overflow: auto` 가 그대로 동작. 줌 후 스크롤 가능.
- 더블탭으로 줌 — 추가 안 함, 버튼만으로 충분.
- 줌 기억 — 매번 loupe 열릴 때 1.0 리셋 (의도).

## 수용 기준

- [ ] 그리드 타일에 마우스 호버 시 우상단 🔍 버튼 표시 (모바일에선 항상 표시)
- [ ] 🔍 클릭 시 셀렉트 토글되지 않고 loupe 만 열림
- [ ] Loupe 헤더에 −, %, +, ⟲ 컨트롤 표시
- [ ] +/- 클릭 또는 키보드 시 이미지 크기 0.5x~3x 사이 변경, % 표시 갱신
- [ ] ⟲ 또는 키보드 0 → 100% 복귀
- [ ] 새 이미지 loupe 열 때 자동 1.0 리셋
- [ ] 줌 인 시 이미지가 컨테이너 넘으면 스크롤로 panning 가능
- [ ] `npm run build` 통과
