# 2026-05-05 기능 묶음 — 브랜드 변경, 빈 상태 목표 설정, 프라이버시 footer, 릴리즈 노트

## 배경

`ohmyweddingday.com` 도메인 적용 직후 작성. 4개의 작은 변경을 한 묶음으로 처리한다. 모두 클라이언트 사이드만 건드리며 배포/인프라는 무관.

## 변경 1 — 브랜드 텍스트 교체

`Wedding Pick` → `ohmyweddingday`.

- `src/App.jsx:225` 의 `<span className="brand">Wedding Pick</span>` 텍스트 변경.
- `index.html:6` 의 `<title>Wedding Pick</title>` 변경.
- 부제 없음. 그냥 `ohmyweddingday` 한 단어.

## 변경 2 — Footer (프라이버시 명시)

페이지 하단에 항상 보이는 footer 추가.

문구: **"사진은 서버에 전송되지 않습니다."**

- 신규 컴포넌트는 만들지 않고 `App.jsx` 최하단에 `<footer className="app-footer">` 인라인.
- 스타일: 작은 폰트, 회색 톤. 그리드/모달 위로 떠있지 않고 자연스러운 페이지 끝에 위치.
- 모바일 반응형: 1줄 유지하되 좁아지면 자동 줄바꿈 허용.

## 변경 3 — 빈 상태(Empty state)에서 목표 수량 미리 설정

### 현재 빈 상태 (`App.jsx:385-405`)
```
사진을 불러와서 시작하세요
JPG, PNG, WebP 형식을 지원합니다.
[파일 선택] [폴더 선택]
```

### 변경 후
```
사진을 불러와서 시작하세요
JPG, PNG, WebP 형식을 지원합니다.

목표 수량
[10] [20] [30] [50]  [직접 입력 ____]

[파일 선택] [폴더 선택]
```

### 동작
- **프리셋 4개**: `[10] [20] [30] [50]`. 클릭 시 store 의 `setTargetCount` 호출. 현재 `targetCount`와 일치하는 프리셋은 active 스타일.
- **직접 입력**: number input. 0 이상 정수. 기존 `setTargetCount` 가 `Math.max(nextValue, 0)` 처리하므로 음수/NaN 방어 OK.
- **현재 값 표시 규칙**: 프리셋 중 하나면 그게 active. 어디에도 매칭 안 되는 임의값이면 직접 입력란에 표시(active 프리셋 없음).
- **기본값**: 20 (store 기본값 유지). 사용자가 아무것도 안 정하고 업로드해도 됨.
- **Topbar 와 양방향 연결**: 같은 store 참조라 자동 동기화. 업로드 후 상단의 `target-button` 으로도 계속 변경 가능 (기존 기능 그대로).

### 마이크로카피
레이블은 `목표 수량` 만. 부가 설명("나중에 변경 가능" 등) 없음.

## 변경 4 — 릴리즈 노트 모달

### 진입점
상단 우측 ⋯ 메뉴(`App.jsx:307-366`) 에 항목 추가:
```
파일 다시 불러오기
폴더 다시 불러오기
─────
실행 취소
─────
단축키 도움말
릴리즈 노트         ← 신규
모두 초기화
```

### 모달
- 기존 `helpOpen` 모달 패턴(`App.jsx:523+`) 을 그대로 따른다.
  - 백드롭 클릭 시 닫힘
  - ESC 키로 닫힘 (`App.jsx:167-184` 의 keyboard handler 에 `releasesOpen` 케이스 추가)
  - 모달 내부에 헤더(`<strong>릴리즈 노트</strong>`) + 본문(아래 changelog 리스트) + 닫기 버튼
- 새 state: `const [releasesOpen, setReleasesOpen] = useState(false);`

### 데이터
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

새 버전을 낼 때 이 배열 맨 위에 항목 한 개 추가하는 방식.

### 표시 형식
형식 (i) — 단순 버전 + 불릿:
```
v0.2.0 — 2026-05-05
• 사용자 정의 목표 수량
• 릴리즈 노트 추가
• 사진이 서버에 전송되지 않음 명시
• ohmyweddingday.com 도메인 적용

v0.1.0 — 2026-04-26
• 초기 릴리즈
```

카테고리 분류(추가/수정/제거 등)는 안 함. "새 버전 있음" 배지/알림도 안 함 (단순화).

## 영향 범위

| 파일 | 변경 종류 |
|---|---|
| `index.html` | title 텍스트 변경 |
| `src/App.jsx` | 브랜드 텍스트, 빈 상태 UI, 메뉴 항목, 릴리즈 모달, footer |
| `src/styles.css` | empty-state 목표 수량 영역, footer, 릴리즈 모달 스타일 |
| `src/data/releases.js` | 신규 파일 (changelog 데이터) |

`src/store/usePickerStore.js` 는 변경 없음 — 기존 `targetCount` / `setTargetCount` 그대로 활용.

## 비변경

- 목표 수량 localStorage 영구 저장: 이번 범위 밖 (b1만 합의).
- 릴리즈 노트의 "새 항목 있음" 배지: 명시적 제외.
- 카테고리/태그 분류: 명시적 제외.
- 다국어: 한국어만.

## 수용 기준

- [ ] `Wedding Pick` 텍스트가 코드/UI/title 어디에도 남지 않는다.
- [ ] 페이지 하단에 "사진은 서버에 전송되지 않습니다." 가 항상 보인다.
- [ ] 빈 상태에서 프리셋 클릭 시 즉시 store 의 `targetCount` 가 변경되며, 그 후 사진을 올리면 상단에 같은 값이 표시된다.
- [ ] 빈 상태에서 직접 입력으로 임의 값(예: 7) 설정 후 업로드 시, 상단 `target-button` 도 7 로 표시된다.
- [ ] ⋯ 메뉴에 "릴리즈 노트" 항목이 있고 클릭 시 모달이 열린다.
- [ ] 릴리즈 모달은 백드롭 / ESC / 닫기 버튼 셋 모두로 닫힌다.
- [ ] `npm run build` (lint + vite) 통과한다.
