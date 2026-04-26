# Wedding Pick

데스크톱 브라우저에서 웨딩 사진을 빠르게 셀렉하기 위한 React MVP입니다.

## 포함된 기능

- 다중 파일 선택과 폴더 불러오기
- `JPG/JPEG` 우선 지원, `PNG/WebP` best-effort 지원
- `1 / 2 / 4 / 9 / 16` 그리드 전환
- 숫자키, 방향키, `Enter`, `S`, `Space`, `Z`, `Ctrl+Z` 기반 키보드 셀렉
- 목표 수량 표시와 전체 선택/해제
- Loupe 확대 보기
- 선택 원본 ZIP 다운로드

## 실행

로컬에서 실행하려면:

```bash
npm install
npm run dev
```

배포와 동일한 게이트를 로컬에서 확인하려면:

```bash
npm run lint
npm run build
```

## 배포

이 앱은 Vercel에서 정적 Vite SPA로 배포합니다. GitHub 저장소를 Vercel 프로젝트에 연결하면 `main` 브랜치에 push 또는 merge될 때 production 배포가 실행되고, PR이나 연결된 브랜치 push마다 preview 배포가 생성됩니다.

- Hosting provider: Vercel
- Production URL: `<project>.vercel.app` (첫 배포 후 실제 URL로 교체)
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Build gate: `npm run build`가 `eslint . && vite build`를 실행하므로 lint 실패 시 배포가 중단됩니다.

### 환경 변수

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `VITE_GA4_MEASUREMENT_ID` | Vercel Production only | Yes for analytics, no for app runtime | 공개 production 사이트에서만 GA4를 로드합니다. |

Preview와 local development에는 `VITE_GA4_MEASUREMENT_ID`를 설정하지 않아 GA4 트래픽이 섞이지 않도록 합니다. 예시 값은 `.env.example`에 있습니다.

### 롤백

런타임 회귀가 발생하면 Vercel 대시보드에서 프로젝트의 Deployments 탭을 열고, 직전 성공 배포를 선택한 뒤 `Promote to Production`을 실행합니다. 코드 변경 없이 이전 배포를 production으로 되돌릴 수 있습니다.

## 파일 구조

- `src/App.jsx`: 메인 UI와 키보드 인터랙션
- `src/store/usePickerStore.js`: 전역 상태, Undo, ZIP export
- `src/lib/fileUtils.js`: 파일 분류와 preview URL 처리
