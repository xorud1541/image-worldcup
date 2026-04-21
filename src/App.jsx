import { useEffect, useMemo, useRef } from "react";
import { classifyFiles } from "./lib/fileUtils";
import { gridOptions, usePickerStore } from "./store/usePickerStore";

function App() {
  const folderInputRef = useRef(null);
  const hoverIndexRef = useRef(null);

  const {
    images,
    unsupportedFiles,
    gridSize,
    currentPage,
    focusedIndex,
    targetCount,
    loupeOpen,
    loading,
    loadProgress,
    zipStatus,
    zipProgress,
    error,
    loadFiles,
    clearAll,
    releaseResources,
    setTargetCount,
    setGridSize,
    nextPage,
    previousPage,
    setFocusedIndex,
    moveFocus,
    toggleByVisibleIndex,
    selectAll,
    clearSelections,
    undo,
    toggleLoupe,
    closeLoupe,
    exportZip,
  } = usePickerStore();

  const visibleImages = usePickerStore((state) => state.getVisibleImages());

  const totalPages = Math.max(1, Math.ceil(images.length / gridSize));
  const selectedCount = images.filter((image) => image.selected).length;
  const completion = targetCount > 0 ? Math.min((selectedCount / targetCount) * 100, 100) : 0;
  const focusedImage = visibleImages[focusedIndex] || visibleImages[0];
  const loupeImage =
    hoverIndexRef.current != null ? visibleImages[hoverIndexRef.current] : focusedImage;

  const keyboardShortcuts = useMemo(
    () => [
      "`[` / `]` 그리드 조절",
      "`1-9` 빠른 선택",
      "`방향키` 포커스 이동",
      "`Enter` / `S` 선택 토글",
      "`Space` 다음 페이지",
      "`Shift + Space` 이전 페이지",
      "`Z` 확대 보기",
      "`Ctrl + Z` 실행 취소",
    ],
    [],
  );

  useEffect(() => {
    if (!folderInputRef.current) {
      return;
    }

    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, []);

  useEffect(() => () => releaseResources(), [releaseResources]);

  useEffect(() => {
    function handleKeyDown(event) {
      const activeTag = document.activeElement?.tagName;
      const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA";

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        toggleByVisibleIndex(Number(event.key) - 1);
        return;
      }

      switch (event.key) {
        case "[":
          event.preventDefault();
          usePickerStore.getState().decrementGridSize();
          break;
        case "]":
          event.preventDefault();
          usePickerStore.getState().incrementGridSize();
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocus(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(-1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveFocus(-Math.max(1, Math.round(Math.sqrt(gridSize))));
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocus(Math.max(1, Math.round(Math.sqrt(gridSize))));
          break;
        case "Enter":
          event.preventDefault();
          toggleByVisibleIndex(focusedIndex);
          break;
        case "s":
        case "S":
          event.preventDefault();
          toggleByVisibleIndex(focusedIndex);
          break;
        case " ":
          event.preventDefault();
          if (event.shiftKey) {
            previousPage();
          } else {
            nextPage();
          }
          break;
        case "z":
        case "Z":
          event.preventDefault();
          toggleLoupe();
          break;
        case "Escape":
          closeLoupe();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeLoupe, focusedIndex, gridSize, moveFocus, nextPage, previousPage, toggleByVisibleIndex, toggleLoupe, undo]);

  async function handleInputChange(event) {
    const { accepted, rejected } = classifyFiles(event.target.files);
    await loadFiles(accepted, rejected);
    event.target.value = "";
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Desktop Wedding Selector</p>
          <h1>Wedding Pick</h1>
          <p className="hero-copy">
            수천 장의 웨딩 사진을 로컬에서 빠르게 골라내는 데스크톱 셀렉 툴입니다.
          </p>
        </div>
        <div className="hero-actions">
          <label className="button primary">
            파일 여러 개 불러오기
            <input
              className="visually-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleInputChange}
            />
          </label>
          <label className="button secondary">
            폴더 불러오기
            <input
              ref={folderInputRef}
              className="visually-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleInputChange}
            />
          </label>
          <button className="button ghost" type="button" onClick={clearAll}>
            초기화
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <section className="panel">
            <h2>작업 상태</h2>
            <div className="stat-row">
              <span>전체 파일</span>
              <strong>{images.length}</strong>
            </div>
            <div className="stat-row">
              <span>선택 완료</span>
              <strong>{selectedCount}</strong>
            </div>
            <div className="stat-row">
              <span>현재 페이지</span>
              <strong>
                {images.length === 0 ? 0 : currentPage + 1} / {totalPages}
              </strong>
            </div>
            <label className="field">
              <span>목표 수량</span>
              <input
                type="number"
                min="0"
                value={targetCount}
                onChange={(event) => setTargetCount(event.target.value)}
              />
            </label>
            <div className="progress-block">
              <div className="progress-meta">
                <span>진행률</span>
                <span>
                  {selectedCount} / {targetCount}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${completion}%` }} />
              </div>
              {selectedCount > targetCount && targetCount > 0 ? (
                <p className="warning">목표 수량을 초과했습니다. 더 추려도 괜찮아요.</p>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <h2>빠른 작업</h2>
            <div className="button-stack">
              <button className="button secondary" type="button" onClick={selectAll}>
                모두 선택
              </button>
              <button className="button secondary" type="button" onClick={clearSelections}>
                모두 해제
              </button>
              <button className="button secondary" type="button" onClick={undo}>
                마지막 작업 취소
              </button>
              <button className="button primary" type="button" onClick={exportZip}>
                선택 파일 ZIP 다운로드
              </button>
            </div>
            {zipStatus === "running" ? (
              <div className="mini-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${zipProgress}%` }} />
                </div>
                <span>{zipProgress}% 압축 중</span>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <h2>그리드</h2>
            <div className="grid-toggle">
              {gridOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === gridSize ? "grid-pill active" : "grid-pill"}
                  onClick={() => setGridSize(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>단축키</h2>
            <ul className="shortcut-list">
              {keyboardShortcuts.map((shortcut) => (
                <li key={shortcut}>{shortcut}</li>
              ))}
            </ul>
          </section>

          {unsupportedFiles.length > 0 ? (
            <section className="panel">
              <h2>제외된 파일</h2>
              <p className="muted">{unsupportedFiles.length}개 파일이 지원 포맷이 아니어서 제외되었습니다.</p>
              <div className="unsupported-list">
                {unsupportedFiles.slice(0, 8).map((fileName) => (
                  <span key={fileName}>{fileName}</span>
                ))}
                {unsupportedFiles.length > 8 ? <span>외 {unsupportedFiles.length - 8}개</span> : null}
              </div>
            </section>
          ) : null}
        </aside>

        <section className="stage">
          <div className="stage-bar">
            <div>
              <h2>셀렉 화면</h2>
              <p className="muted">현재 페이지에서 숫자키와 방향키로 빠르게 셀렉하세요.</p>
            </div>
            <div className="pager">
              <button className="button ghost" type="button" onClick={previousPage}>
                이전
              </button>
              <button className="button ghost" type="button" onClick={nextPage}>
                다음
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <strong>이미지 로드 중</strong>
              <div className="progress-track large">
                <div className="progress-fill" style={{ width: `${loadProgress}%` }} />
              </div>
              <span>{loadProgress}% 완료</span>
            </div>
          ) : null}

          {!loading && images.length === 0 ? (
            <div className="empty-state">
              <strong>사진을 불러오면 셀렉 보드가 시작됩니다.</strong>
              <span>JPG/JPEG를 우선 지원하고 PNG, WebP도 함께 받을 수 있어요.</span>
            </div>
          ) : null}

          {!loading && images.length > 0 ? (
            <div
              className={`grid stage-grid grid-${gridSize}`}
              role="grid"
              aria-label="사진 선택 그리드"
            >
              {visibleImages.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={[
                    "tile",
                    image.selected ? "selected" : "",
                    index === focusedIndex ? "focused" : "",
                  ].join(" ")}
                  onClick={() => toggleByVisibleIndex(index)}
                  onFocus={() => setFocusedIndex(index)}
                  onMouseEnter={() => {
                    hoverIndexRef.current = index;
                  }}
                  onMouseLeave={() => {
                    hoverIndexRef.current = null;
                  }}
                >
                  <span className="tile-number">{index + 1}</span>
                  <img src={image.previewUrl} alt={image.name} loading="lazy" />
                  <span className="tile-name">{image.name}</span>
                  {image.selected ? <span className="tile-badge">선택됨</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      {error ? <div className="toast error">{error}</div> : null}

      {loupeOpen && loupeImage ? (
        <div className="loupe-backdrop" role="dialog" aria-modal="true" onClick={closeLoupe}>
          <div className="loupe-panel" onClick={(event) => event.stopPropagation()}>
            <div className="loupe-header">
              <strong>{loupeImage.name}</strong>
              <button className="button ghost" type="button" onClick={closeLoupe}>
                닫기
              </button>
            </div>
            <div className="loupe-canvas">
              <img src={loupeImage.previewUrl} alt={loupeImage.name} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
