import { useEffect, useMemo, useRef, useState } from "react";
import { classifyFiles } from "./lib/fileUtils";
import { gridOptions, usePickerStore } from "./store/usePickerStore";
import { releases } from "./data/releases";

const STANDARD_PRESETS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

function smartPresets(poolSize) {
  if (poolSize <= 1) return [];
  return STANDARD_PRESETS
    .filter((value) => value >= 1 && value < poolSize)
    .slice(-4);
}

function App() {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const hoverIndexRef = useRef(null);
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [releasesOpen, setReleasesOpen] = useState(false);
  const [unsupportedDismissed, setUnsupportedDismissed] = useState(false);
  const [announcedRound, setAnnouncedRound] = useState(null);
  const [loupeZoom, setLoupeZoom] = useState(1);

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
    openLoupeAt,
    exportZip,
    tournamentComplete,
    tournamentStarted,
    startTournament,
    currentRound,
  } = usePickerStore();

  const prevRoundRef = useRef(currentRound);

  const visibleImages = usePickerStore((state) => state.getVisibleImages());

  const totalPages = Math.max(1, Math.ceil(images.length / gridSize));
  const selectedCount = images.filter((image) => image.selected).length;
  const visibleSelectedCount = visibleImages.filter((image) => image.selected).length;
  const visibleAllSelected =
    visibleImages.length > 0 && visibleSelectedCount === visibleImages.length;
  const focusedImage = visibleImages[focusedIndex] || visibleImages[0];
  const loupeImage =
    hoverIndexRef.current != null ? visibleImages[hoverIndexRef.current] : focusedImage;
  const hasImages = images.length > 0;

  const keyboardShortcuts = useMemo(
    () => [
      { keys: ["[", "]"], desc: "그리드 조절" },
      { keys: ["1-9"], desc: "빠른 선택" },
      { keys: ["방향키"], desc: "포커스 이동" },
      { keys: ["Enter", "S"], desc: "선택 토글" },
      { keys: ["Space"], desc: "다음 페이지" },
      { keys: ["Shift+Space"], desc: "이전 페이지" },
      { keys: ["Z"], desc: "확대 보기" },
      { keys: ["Ctrl+Z"], desc: "실행 취소" },
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
    setUnsupportedDismissed(false);
  }, [unsupportedFiles]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function handleDocClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [menuOpen]);

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
        case "+":
        case "=":
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
        case "Escape":
          if (helpOpen) {
            setHelpOpen(false);
          } else if (releasesOpen) {
            setReleasesOpen(false);
          } else {
            closeLoupe();
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeLoupe,
    focusedIndex,
    gridSize,
    helpOpen,
    loupeOpen,
    moveFocus,
    nextPage,
    previousPage,
    releasesOpen,
    toggleByVisibleIndex,
    toggleLoupe,
    undo,
  ]);

  useEffect(() => {
    if (currentRound > prevRoundRef.current && !tournamentComplete) {
      setAnnouncedRound(currentRound);
      const id = setTimeout(() => setAnnouncedRound(null), 2500);
      prevRoundRef.current = currentRound;
      return () => clearTimeout(id);
    }
    prevRoundRef.current = currentRound;
  }, [currentRound, tournamentComplete]);

  useEffect(() => {
    if (tournamentComplete) {
      setAnnouncedRound(null);
    }
  }, [tournamentComplete]);

  useEffect(() => {
    if (loupeOpen) {
      setLoupeZoom(1);
    }
  }, [loupeOpen, loupeImage]);

  async function handleInputChange(event) {
    const { accepted, rejected } = classifyFiles(event.target.files);
    await loadFiles(accepted, rejected);
    event.target.value = "";
  }

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleInputChange}
      />
      <input
        ref={folderInputRef}
        className="visually-hidden"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleInputChange}
      />

      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="brand-link" aria-label="Oh My Wedding Day">
            <img src="/logo-horizontal.svg" alt="Oh My Wedding Day" className="brand-logo" />
          </a>
        </div>

        <div className="topbar-center">
          {tournamentStarted && !tournamentComplete ? (
            <div className="progress">
              <span className="round-badge" aria-label={`라운드 ${currentRound}`}>
                Round {currentRound}
              </span>
              <span className="round-info">
                총 {images.length}장 · 선택 {selectedCount}장
              </span>
            </div>
          ) : null}
        </div>

        <div className="topbar-right">
          <div className="grid-toggle" role="group" aria-label="그리드 크기">
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
          <button
            className="icon-btn topbar-action"
            type="button"
            onClick={selectAll}
            disabled={!hasImages || visibleAllSelected || tournamentComplete}
            title="현재 페이지의 모든 사진 선택"
          >
            모두 선택
          </button>
          <button
            className="icon-btn topbar-action"
            type="button"
            onClick={clearSelections}
            disabled={visibleSelectedCount === 0 || tournamentComplete}
            title="현재 페이지의 선택 해제"
          >
            해제
          </button>
          <span className="topbar-divider" aria-hidden="true" />
          <button
            className="icon-btn"
            type="button"
            onClick={exportZip}
            disabled={selectedCount === 0 || zipStatus === "running"}
            title="선택 파일 ZIP 다운로드"
          >
            ZIP ↓
          </button>
          <div className="menu-wrap" ref={menuRef}>
            <button
              className="icon-btn"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="더보기"
              aria-expanded={menuOpen}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  파일 다시 불러오기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    folderInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  폴더 다시 불러오기
                </button>
                <hr />
                <button
                  type="button"
                  onClick={() => {
                    undo();
                    setMenuOpen(false);
                  }}
                >
                  실행 취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectAll();
                    setMenuOpen(false);
                  }}
                  disabled={!hasImages || visibleAllSelected || tournamentComplete}
                >
                  모두 선택
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSelections();
                    setMenuOpen(false);
                  }}
                  disabled={visibleSelectedCount === 0 || tournamentComplete}
                >
                  선택 모두 해제
                </button>
                <hr />
                <button
                  type="button"
                  onClick={() => {
                    setHelpOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  단축키 도움말
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReleasesOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  릴리즈 노트
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    clearAll();
                    setMenuOpen(false);
                  }}
                >
                  모두 초기화
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="stage">
        {loading ? (
          <div className="empty">
            <div className="loading-block">
              <span className="loading-text">이미지 로드 중 · {loadProgress}%</span>
              <div className="progress-track wide">
                <div className="progress-fill" style={{ width: `${loadProgress}%` }} />
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !hasImages ? (
          <div className="empty">
            <h2>사진을 불러와서 시작하세요</h2>
            <p className="muted">JPG, PNG, WebP 형식을 지원합니다.</p>

            <div className="empty-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => folderInputRef.current?.click()}
              >
                폴더 선택
              </button>
            </div>
          </div>
        ) : null}

        {!loading && hasImages ? (
          !tournamentStarted ? (
            <div className="pre-tournament">
              <h2>{images.length}장 업로드 완료</h2>
              <p className="muted">몇 장으로 좁힐까요?</p>

              <div className="target-presets" role="group" aria-label="목표 수량">
                {smartPresets(images.length).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={preset === targetCount ? "preset-pill active" : "preset-pill"}
                    onClick={() => setTargetCount(preset)}
                  >
                    {preset}
                  </button>
                ))}
                <input
                  className="preset-input"
                  type="number"
                  min="1"
                  max={images.length - 1}
                  placeholder="직접 입력"
                  value={smartPresets(images.length).includes(targetCount) ? "" : (targetCount || "")}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTargetCount(Number.isNaN(value) ? 0 : Math.max(value, 0));
                  }}
                />
              </div>

              <button
                className="btn primary pre-tournament-start"
                type="button"
                onClick={startTournament}
                disabled={targetCount <= 0 || targetCount >= images.length}
              >
                이미지 고르기 시작
              </button>
            </div>
          ) : (
            <>
              {tournamentComplete ? (
                <div className="complete-banner" role="status">
                  <span className="complete-title">🏆 토너먼트 완료</span>
                  <span className="complete-meta">
                    Round {currentRound - 1} 끝 — 최종 {images.length}장 선택됨
                  </span>
                  <div className="complete-actions">
                    <button
                      className="btn primary"
                      type="button"
                      onClick={exportZip}
                      disabled={zipStatus === "running"}
                    >
                      ZIP으로 내보내기
                    </button>
                    <button className="btn" type="button" onClick={clearAll}>
                      다시 시작
                    </button>
                  </div>
                </div>
              ) : null}
              <div
                className={`grid grid-${gridSize}`}
                role="grid"
                aria-label="사진 선택 그리드"
              >
                {visibleImages.map((image, index) => (
                  <div
                    key={image.id}
                    role="button"
                    tabIndex={0}
                    className={[
                      "tile",
                      image.selected ? "selected" : "",
                      index === focusedIndex ? "focused" : "",
                    ].join(" ")}
                    onClick={() => toggleByVisibleIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleByVisibleIndex(index);
                      }
                    }}
                    onFocus={() => setFocusedIndex(index)}
                    onMouseEnter={() => {
                      hoverIndexRef.current = index;
                    }}
                    onMouseLeave={() => {
                      hoverIndexRef.current = null;
                    }}
                  >
                    <img src={image.previewUrl} alt={image.name} loading="lazy" />
                    <span className="tile-num">{index + 1}</span>
                    {image.selected ? (
                      <span className="tile-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <button
                      className="tile-zoom"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        hoverIndexRef.current = index;
                        openLoupeAt(index);
                      }}
                      aria-label="확대 보기"
                      title="확대 보기"
                    >
                      🔍
                    </button>
                  </div>
                ))}
              </div>

              {currentPage > 0 ? (
                <button
                  className="edge-arrow left"
                  type="button"
                  onClick={previousPage}
                  aria-label="이전 페이지"
                >
                  ‹
                </button>
              ) : null}
              {(currentPage < totalPages - 1 ||
                (!tournamentComplete && selectedCount >= 1 && selectedCount < images.length)) ? (
                <button
                  className="edge-arrow right"
                  type="button"
                  onClick={nextPage}
                  aria-label="다음 페이지"
                >
                  ›
                </button>
              ) : null}

              <div className="page-indicator">
                {currentPage + 1} / {totalPages}
              </div>
            </>
          )
        ) : null}
      </main>

      {zipStatus === "running" ? (
        <div className="status-toast">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${zipProgress}%` }} />
          </div>
          <span>{zipProgress}% 압축 중</span>
        </div>
      ) : null}

      {error ? <div className="toast error">{error}</div> : null}

      {unsupportedFiles.length > 0 && hasImages && !unsupportedDismissed ? (
        <div className="toast info">
          <span>{unsupportedFiles.length}개 파일이 지원 포맷이 아니라 제외됨</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setUnsupportedDismissed(true)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      ) : null}

      {loupeOpen && loupeImage ? (
        <div
          className="loupe-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeLoupe}
        >
          <div className="loupe-panel" onClick={(event) => event.stopPropagation()}>
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
            <div className="loupe-canvas">
              <img
                src={loupeImage.previewUrl}
                alt={loupeImage.name}
                style={{ width: `${loupeZoom * 100}%`, height: "auto", maxWidth: "none" }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          className="loupe-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setHelpOpen(false)}
        >
          <div className="help-panel" onClick={(event) => event.stopPropagation()}>
            <div className="loupe-header">
              <strong>단축키</strong>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <ul className="shortcut-list">
              {keyboardShortcuts.map((item) => (
                <li key={item.desc}>
                  <span className="kbds">
                    {item.keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {releasesOpen ? (
        <div
          className="loupe-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setReleasesOpen(false)}
        >
          <div className="release-panel" onClick={(event) => event.stopPropagation()}>
            <div className="loupe-header">
              <strong>릴리즈 노트</strong>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setReleasesOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <ul className="release-list">
              {releases.map((release) => (
                <li key={release.version}>
                  <div className="release-meta">
                    <span className="release-version">v{release.version}</span>
                    <span className="release-date">— {release.date}</span>
                  </div>
                  <ul className="release-changes">
                    {release.changes.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {announcedRound != null ? (
        <div className="round-toast" role="status" aria-live="polite">
          Round {announcedRound} 시작
        </div>
      ) : null}

      <footer className="app-footer">
        사진은 서버에 전송되지 않습니다.
      </footer>
    </div>
  );
}

export default App;
