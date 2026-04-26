# Wedding Pick — Deployment Pipeline Design

**Date:** 2026-04-26
**Status:** Approved (pending implementation plan)
**Repo:** `xorud1541/image-worldcup`

## Goal

Wedding Pick(정적 Vite + React SPA)을 공개 사이트로 배포하기 위한 CI/CD 파이프라인을 구축한다. 코드 push만으로 자동 빌드/배포되며, PR마다 프리뷰 URL이 생성되고, 빌드 전 lint 게이트가 통과해야 배포된다.

## Non-Goals

- 백엔드/서버 함수 (앱이 클라이언트 전용)
- 자동 테스트 파이프라인 (현재 범위 밖, 추후 검토)
- 커스텀 도메인 연결 (도메인 이름 미정, 후속 작업)
- 에러 추적 도구(Sentry 등)
- TypeScript 마이그레이션

## Architecture

```
GitHub repo (xorud1541/image-worldcup)
        │
        ├── PR 생성/업데이트 ──► Vercel Preview (랜덤 URL, 자동 PR 코멘트)
        │
        └── main push ──────────► Vercel Production (<project>.vercel.app)
                                    │
                                    ├── 빌드: `eslint . && vite build` → dist/
                                    ├── 정적 호스팅 + Vercel CDN
                                    └── 클라이언트에서 GA4 로드 (prod only)
```

**핵심 결정:**
- Vercel이 GitHub repo와 직접 연결, 별도 GitHub Actions 없음 (YAGNI)
- `main` 브랜치만 production, 그 외 모든 브랜치/PR은 preview
- ESLint 실패는 빌드 실패로 이어져 배포 차단

## Components

### 1. ESLint
- 의존성: `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`
- 설정 파일: `eslint.config.js` (flat config, ESLint 9 형식)
- 룰셋: `@eslint/js` recommended + React + React Hooks recommended
- `package.json` scripts:
  - `"lint": "eslint ."`
  - `"build": "eslint . && vite build"` ← 게이트
- **목적**: 명백한 버그 패턴(미사용 변수, 잘못된 hook 사용 등) 방지

### 2. GA4 통합
- 신규 파일: `src/lib/analytics.js`
  - `initAnalytics()` 함수 export
  - `import.meta.env.VITE_GA4_MEASUREMENT_ID`가 truthy일 때만 gtag.js 동적 로드 + `gtag('config', id)` 호출
  - 없으면 no-op (프리뷰/로컬에서는 측정 안 됨)
- `src/main.jsx`에서 앱 마운트 직후 `initAnalytics()` 호출
- 신규 파일: `.env.example`
  - `VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX`
  - 주석으로 "Production scope only on Vercel" 명시
- `.gitignore`에 `.env.local`, `.env*.local` 포함 확인 (없으면 추가)

### 3. Vercel 프로젝트 설정
- Framework Preset: `Vite` (자동 감지)
- Build Command: `npm run build` (기본 유지)
- Output Directory: `dist` (기본 유지)
- Root Directory: `./` (기본)
- `vercel.json` **불필요** — 단일 라우트 SPA, Vite preset으로 충분
- 환경변수: `VITE_GA4_MEASUREMENT_ID` → **Production scope만** 체크

### 4. 문서
- `README.md`에 "배포" 섹션 추가:
  - Vercel 연결 절차 요약 (또는 별도 `docs/deployment.md` 링크)
  - 환경변수 명세
  - 롤백 방법 (Vercel 대시보드 Promote)

## Environments

| 환경 | 트리거 | URL | GA4 |
|---|---|---|---|
| Production | `main` push | `<project>.vercel.app` (커스텀 도메인은 후속) | ✅ |
| Preview | 모든 PR/브랜치 push | `<project>-<hash>.vercel.app` | ❌ |
| Development | `vercel dev` 또는 `npm run dev` | localhost | ❌ |

GA4 측정 ID를 Production scope에만 등록함으로써, 프리뷰/개발 트래픽이 분석 데이터에 섞이지 않도록 한다.

## Data Flow

1. 개발자가 브랜치 push → Vercel 웹훅 수신
2. Vercel이 `npm install` → `npm run build` 실행
3. `eslint .` 실패 시 빌드 중단, GitHub PR에 실패 표시
4. 성공 시 `dist/` 산출물 → Vercel CDN 배포
5. PR이면 프리뷰 URL을 PR에 자동 코멘트
6. `main`이면 production 별칭(`<project>.vercel.app`)이 새 배포로 스왑
7. 사용자 브라우저에서 앱 로드 → `analytics.js`가 환경변수 보고 GA4 로드 결정 → 페이지뷰 전송

## Failure / Rollback

- **빌드 실패**: Vercel 대시보드에 빨간 X, 로그 노출. 로컬에서 `npm run build`로 재현 → 수정 → 재push.
- **런타임 회귀**: Vercel Deployments 화면에서 직전 성공 배포 선택 → "Promote to Production" 클릭. 수 초 내 이전 버전으로 복구. 이력은 보존됨.
- **GA4 누락**: `VITE_GA4_MEASUREMENT_ID` 미설정 시 앱은 정상 동작, 측정만 누락. 콘솔 에러 없음.

## Initial Setup (one-time, manual)

1. Vercel 계정 생성/로그인 (GitHub OAuth)
2. "New Project" → `xorud1541/image-worldcup` import
3. Framework Preset이 `Vite`로 자동 감지되는지 확인
4. 환경변수 `VITE_GA4_MEASUREMENT_ID` 추가, Production scope만 체크
   - GA4 측정 ID는 Google Analytics 콘솔에서 속성 생성 후 발급받음 (`G-` prefix)
5. 첫 배포 트리거 → `<project>.vercel.app` URL 발급 확인
6. README의 배포 섹션에 발급된 URL 기록

## Out of Scope (메모)

- **커스텀 도메인**: 도메인 이름 결정 후 별도 작업. Vercel 대시보드 Domains 탭 + 가비아/등록처 DNS에 CNAME 추가.
- **테스트 파이프라인**: 코드 규모가 늘어나면 Vitest + GitHub Actions 도입 검토.
- **에러 추적**: 사용자 보고 의존, 필요시 Sentry 추가.
- **번들 분석/성능 예산**: 현재 규모에선 불필요.
