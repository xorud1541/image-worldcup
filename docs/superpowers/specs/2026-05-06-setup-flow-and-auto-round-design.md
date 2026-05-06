# 2026-05-06 셋업 플로우 정리 + 자동 라운드 진입

## 배경

라운드 메커니즘 배포(`bf2f083`) 후 사용 피드백:
1. 빈 상태에 목표 수량 프리셋이 너무 일찍 노출 (사진 없는 채로 결정해야 함). 사진을 먼저 올리고, 그 후 목표를 정하는 흐름이 자연스럽다.
2. "다음 라운드" 버튼이 없어도 마지막 페이지에서 자연스럽게 진입할 수 있어야 한다 (worldcup 게임 흐름과 일치).
3. 라운드가 자동 진입할 때 사용자가 그 사실을 인지할 수 있는 시각 신호가 필요.

## 변경 1 — 빈 상태 단순화 + 사전 셋업 화면 신설

### 빈 상태

기존 `<div className="empty">` 안의 `<div className="target-presets">` 블록 **전체 제거**. 빈 상태는:

```
사진을 불러와서 시작하세요
JPG, PNG, WebP 형식을 지원합니다.
[파일 선택] [폴더 선택]
```

### 사전 셋업 화면 (신설)

`images.length > 0 && !tournamentStarted` 일 때 그리드 **대신** 렌더. 토너먼트 시작 직전 단계.

레이아웃:
```
{N}장 업로드 완료
몇 장으로 좁힐까요?

[프리셋 1] [프리셋 2] [프리셋 3] [프리셋 4]   [직접 입력 ____]

[이미지 고르기 시작]   ← primary CTA, 비활성 조건: targetCount === 0 또는 targetCount >= images.length
```

`이미지 고르기 시작` 클릭 → `startTournament()` 액션 → `tournamentStarted: true` → 그리드 렌더 시작 (Round 1).

### 스마트 프리셋 규칙

표준 후보: `[1, 2, 5, 10, 20, 50, 100, 200, 500]`. `1 ≤ v < N` 필터, 큰 순으로 4개 선택, 오름차순 정렬해서 표시.

예:
| N | 프리셋 |
|---|---|
| 100 | 5, 10, 20, 50 |
| 50 | 5, 10, 20 |
| 30 | 2, 5, 10, 20 |
| 15 | 1, 2, 5, 10 |
| 7 | 1, 2, 5 |
| 3 | 1, 2 |
| 1 | (없음, 직접 입력만) |

직접 입력은 항상 노출. `targetCount > 0 && targetCount < images.length` 가 유효 범위 — 위반 시 시작 버튼 비활성.

## 변경 2 — "다음 라운드" 버튼 제거

`src/App.jsx` 의 topbar 우측 그룹에서 `<button onClick={advanceRound}>다음 라운드</button>` 한 블록 제거. `advanceRound` 는 store 액션 그대로 유지 (다른 경로에서 호출).

## 변경 3 — 마지막 페이지에서 자동 라운드 진입

`src/store/usePickerStore.js` 의 `nextPage` 액션 수정:

```js
nextPage: () => {
  const { currentPage, images, gridSize } = get();
  const totalPages = Math.max(1, Math.ceil(images.length / gridSize));
  const lastPage = totalPages - 1;

  if (currentPage < lastPage) {
    get().setPage(currentPage + 1);
    return;
  }

  // 이미 마지막 페이지 — 라운드 진입 시도
  get().advanceRound();
},
```

`advanceRound` 의 기존 4가지 no-op 가드(`tournamentComplete`, 빈 풀, 0 선택, 전체 선택) 가 그대로 작동. 따라서:
- 마지막 페이지 + 1 ≤ 선택수 < 풀 크기 → 라운드 진입.
- 마지막 페이지 + 0 선택 → 그대로 머무름 (no-op).
- 마지막 페이지 + 전체 선택 → 머무름 (좁혀지지 않으니).
- 토너먼트 완료 상태 → 머무름.

키보드 Space 와 "다음 페이지" 버튼 모두 같은 store 액션 `nextPage` 거치므로 단일 진입점에서 동작 통일.

## 변경 4 — 라운드 진입 토스트

`currentRound` 가 1 → 2 (또는 N → N+1) 로 증가했을 때, **`tournamentComplete === false` 면** 토스트 "Round N 시작" 을 상단 중앙에 약 2.5초 표시 후 페이드 아웃.

`tournamentComplete === true` 로 advance 한 경우엔 토스트 안 뜸 — 완료 배너가 자체로 충분한 신호.

### App.jsx 구현 패턴

```jsx
const [announcedRound, setAnnouncedRound] = useState(null);
const prevRoundRef = useRef(currentRound);

useEffect(() => {
  if (currentRound > prevRoundRef.current && !tournamentComplete) {
    setAnnouncedRound(currentRound);
    const id = setTimeout(() => setAnnouncedRound(null), 2500);
    prevRoundRef.current = currentRound;
    return () => clearTimeout(id);
  }
  prevRoundRef.current = currentRound;
}, [currentRound, tournamentComplete]);
```

토스트 JSX:

```jsx
{announcedRound != null ? (
  <div className="round-toast" role="status" aria-live="polite">
    Round {announcedRound} 시작
  </div>
) : null}
```

CSS 애니메이션:

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

## 변경 5 — store: `tournamentStarted` state + `startTournament` 액션

### 새 state

```js
tournamentStarted: false,
```

### 새 액션

```js
startTournament: () => {
  const { images, targetCount, tournamentStarted } = get();
  if (tournamentStarted) return;
  if (images.length === 0) return;
  if (targetCount <= 0 || targetCount >= images.length) return;
  set({ tournamentStarted: true });
},
```

### 리셋 경로

`loadFiles` 의 첫 set 블록과 `clearAll` 의 set 블록에 다음 한 줄 추가:

```js
tournamentStarted: false,
```

### snapshot 확장

`buildSnapshot` 와 `restoreSnapshot` 에 `tournamentStarted` 포함 (undo 가 셋업 단계로 되돌릴 수 있도록).

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/store/usePickerStore.js` | `tournamentStarted` state, `startTournament` 액션, `nextPage` 자동 advance 로직, `loadFiles`/`clearAll` 리셋, snapshot 확장 |
| `src/App.jsx` | 빈 상태 프리셋 제거, 사전 셋업 화면 신설, "다음 라운드" 버튼 제거, 라운드 토스트 state/useEffect/JSX |
| `src/styles.css` | `.pre-tournament` (또는 기존 `.empty`/`.target-presets` 재사용), `.round-toast` + keyframes 추가 |

## 비변경 / 의도적 제외

- 토너먼트 시작 후 목표 수량 변경 — 막을지 허용할지 미정. 현재 store `setTargetCount` 은 항상 허용 — 본 spec 에선 손대지 않음. 시작 후 목표를 줄이면 자동 완료 로직이 다음 advance 시점에 적용됨 (의도된 부수효과 아닌 것 같지만 spec 범위 외).
- 사전 셋업 화면에서 사진 다시 올리기 — `App.jsx` 의 ⋯ 메뉴에 "파일 다시 불러오기" 가 이미 있음. 그대로 활용.
- 토스트 위치/스타일 커스터마이징 — 본 spec 의 한 가지 형태로 고정.
- "다음 페이지" 버튼의 disabled 상태가 마지막 페이지일 때 일반 페이징 의미는 없지만 advance 트리거가 가능하므로 활성 유지. 단, 1 선택 < pool 크기일 때만 advance 가 의미 있음 — 이건 store 가 알아서 처리(no-op).

## 수용 기준

- [ ] 빈 상태에 목표 프리셋/입력 없음, 파일/폴더 선택 버튼만.
- [ ] 사진 업로드 후, 그리드 대신 사전 셋업 화면이 노출됨 (스마트 프리셋 + 직접 입력 + 시작 CTA).
- [ ] 시작 CTA 클릭 → 그리드 + Round 1 시작.
- [ ] 시작 CTA 가 `targetCount <= 0 || targetCount >= images.length` 이면 disabled.
- [ ] topbar 에 "다음 라운드" 버튼이 없어졌고, advanceRound 는 마지막 페이지의 next-page 트리거로만 호출됨.
- [ ] 마지막 페이지에서 "다음 페이지" (Space 또는 버튼) → 라운드 진입 (선택 1 ≤ s < pool 시).
- [ ] 위 진입 시 "Round N 시작" 토스트 2.5초 표시 후 사라짐.
- [ ] 자동 진입이 토너먼트 완료를 유발한 경우엔 토스트 대신 완료 배너가 표시됨.
- [ ] `loadFiles` / `clearAll` 가 `tournamentStarted: false` 로 리셋.
- [ ] Undo (Ctrl+Z) 가 셋업 단계 ↔ 그리드 단계 전환을 되돌림 (snapshot 에 `tournamentStarted` 포함).
- [ ] `npm run build` 통과.
