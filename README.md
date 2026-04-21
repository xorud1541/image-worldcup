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

이 저장소에는 현재 `node`와 `npm`이 설치되어 있지 않아 여기서 직접 실행 검증은 하지 못했습니다.

로컬에서 실행하려면:

```bash
npm install
npm run dev
```

## 파일 구조

- `src/App.jsx`: 메인 UI와 키보드 인터랙션
- `src/store/usePickerStore.js`: 전역 상태, Undo, ZIP export
- `src/lib/fileUtils.js`: 파일 분류와 preview URL 처리
