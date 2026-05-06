# 2026-05-06 모바일 반응형 — Level B

## 배경

현재 `body { min-width: 1024px }` 가 강제되어 모바일/태블릿 사용 불가. `@media` 쿼리 0개. 사용자 결정에 따라 **Level B (mobile-friendly)** 로 진행 — 데스크탑 1급, 모바일에서도 자연스럽게 사용 가능한 수준.

## 디자인 원칙

- **CSS 우선**, JSX 변경 최소화. 기존 동작/상태머신 그대로.
- **breakpoint 1개**: `@media (max-width: 768px)`. 이 미만은 mobile, 이상은 desktop (기존 그대로).
- 하위 액션은 **⋯ overflow 메뉴**로 일관되게 접근 — desktop 도 menu 가 alternative 경로로 동작.
- 터치 타겟 최소 **40px** 권장.

## 변경 1 — `body min-width` 제거

`src/styles.css:18` 의 `min-width: 1024px;` 줄 **삭제**. 이걸로 모바일 가로 스크롤 사라짐.

## 변경 2 — `⋯ overflow 메뉴`에 "모두 선택" / "해제" 항목 추가

현재 메뉴 구조 (App.jsx, ⋯ 메뉴):
```
파일 다시 불러오기
폴더 다시 불러오기
─
실행 취소
─
단축키 도움말
릴리즈 노트
모두 초기화
```

다음으로 변경 — `실행 취소` 와 단축키 도움말 `─` 사이에 두 항목 삽입:

```
파일 다시 불러오기
폴더 다시 불러오기
─
실행 취소
모두 선택              ← 신규
선택 모두 해제          ← 신규
─
단축키 도움말
릴리즈 노트
모두 초기화
```

각 신규 메뉴 버튼:
- onClick: `selectAll()` / `clearSelections()` + `setMenuOpen(false)`
- disabled 조건은 topbar 의 동명 버튼과 **동일** (`!hasImages || visibleAllSelected || tournamentComplete` / `visibleSelectedCount === 0 || tournamentComplete`)

이로써 desktop 에서도 menu 안에 alternative 진입점 확보 — 일관성 ↑. 그리고 변경 3 에서 mobile 시 topbar 의 직접 버튼은 숨김.

## 변경 3 — `@media (max-width: 768px)` 규칙

`src/styles.css` 끝 (또는 적절한 위치) 에 다음 추가:

```css
@media (max-width: 768px) {
  /* topbar 압축 */
  .topbar {
    padding: 0 12px;
    height: 52px;
  }

  .brand {
    font-size: 13px;
  }

  /* 라운드 정보 텍스트 약간 축소 */
  .round-info {
    font-size: 12px;
  }

  .round-badge {
    font-size: 11px;
    padding: 2px 8px;
  }

  /* topbar-right 의 직접 액션 버튼 숨김 — ⋯ 메뉴 경로 사용 */
  .topbar-right .topbar-action {
    display: none;
  }

  /* 그리드 토글 약간 축소 */
  .grid-pill {
    min-width: 32px;
    padding: 6px 10px;
    font-size: 12px;
  }

  /* edge arrow 터치 친화적 */
  .edge-arrow {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }

  /* 사전 셋업 화면 패딩 축소 */
  .pre-tournament {
    padding: 16px 12px;
    gap: 12px;
  }

  .pre-tournament h2 {
    font-size: 16px;
  }

  /* 완료 배너 폭 / 패딩 */
  .complete-banner {
    margin: 8px;
    padding: 12px;
  }

  .complete-title {
    font-size: 14px;
  }

  /* 토스트 위치 — 상단 가깝게 */
  .round-toast {
    top: 64px;
    font-size: 13px;
    padding: 10px 18px;
  }

  /* 빈 상태 패딩 */
  .empty {
    padding: 20px;
    gap: 8px;
  }

  /* footer 텍스트 약간 축소 */
  .app-footer {
    font-size: 11px;
    padding: 6px 12px;
  }
}
```

## 변경 4 — JSX: topbar-right 직접 버튼에 `topbar-action` 클래스 추가

현재 topbar-right 의 "모두 선택" / "해제" 버튼은 `className="icon-btn"`. 모바일에서 숨길 수 있도록 추가 클래스 부여:

```jsx
<button className="icon-btn topbar-action" type="button" onClick={selectAll} ...>
  모두 선택
</button>
<button className="icon-btn topbar-action" type="button" onClick={clearSelections} ...>
  해제
</button>
```

또한 그리드 토글 그룹 (`<div className="grid-toggle">`) 도 폭 좁아지면 우선순위 낮음 — 같은 클래스로 묶어 함께 모바일에서 숨길지 결정. **유지** 권장 (그리드 토글은 모바일에서도 유용 — 단, 9/16 은 화면 좁아 비효율적).

이 spec 에선 그리드 토글은 **유지**, 단 변경 3 의 `.grid-pill` 축소 룰만 적용.

## 변경 5 — `.edge-arrow` 기본 크기 점검

현재 CSS 의 `.edge-arrow` 가 desktop 에서 어떤 크기인지 확인 후 mobile 의 44px 와 자연스럽게 호환되는지 확인. 깨짐 시 spec 의 mobile 룰 조정.

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/styles.css` | `body min-width: 1024px` 삭제, `@media (max-width: 768px)` 블록 신규 |
| `src/App.jsx` | ⋯ 메뉴에 "모두 선택" / "선택 모두 해제" 버튼 2개 추가, topbar 의 두 직접 버튼에 `topbar-action` 클래스 추가 |

## 비변경 / 의도적 제외

- 스와이프 제스처 (Level C 영역).
- topbar 레이아웃의 grid template 변경 — 1fr auto 1fr 그대로.
- 모달/Loupe 의 모바일 최적화 — 이미 `width: min(440px, 92vw)` 형태로 자체 반응형 ✅.
- iOS Safari 의 100vh 이슈 (주소창 포함 등) — 우선순위 낮음, 향후 필요시 별도.
- 그리드 9/16 의 모바일에서의 가독성 — 사용자 선택 영역. spec 범위 외.
- 키보드 단축키 — 모바일에서 무관, 그대로 둠.

## 수용 기준

- [ ] 모바일 폭 (예: Chrome DevTools iPhone 12 Pro 390×844) 에서 가로 스크롤 발생 안 함.
- [ ] 모바일에서 topbar 의 "모두 선택" / "해제" 직접 버튼이 안 보이고, ⋯ 메뉴에서 동일 동작 가능.
- [ ] 데스크탑(≥ 1024px) 에서 기존 UI 변동 없음 (직접 버튼 + 메뉴 안 alternative 둘 다 보임).
- [ ] 모바일 edge-arrow 가 터치하기 충분한 크기 (≥ 40px).
- [ ] 모바일 사전 셋업 화면이 가로 스크롤 없이 깔끔하게 표시됨.
- [ ] 모바일 그리드(1/2/4) 가 셀 크기 적정 (1열 = full-width, 2열 = 절반, 4열 = 약 1/4).
- [ ] 토너먼트 전체 흐름 (업로드 → 셋업 → 라운드 → advance → 완료 → ZIP) 모바일에서 keyboard 없이 터치만으로 정상 동작.
- [ ] `npm run build` 통과.
