import { create } from "zustand";
import JSZip from "jszip";
import { createImageRecord, revokePreviews } from "../lib/fileUtils";

const GRID_OPTIONS = [1, 2, 4, 9, 16];

function buildSnapshot(state) {
  return {
    images: state.images,
    currentPage: state.currentPage,
    focusedIndex: state.focusedIndex,
    targetCount: state.targetCount,
  };
}

function restoreSnapshot(snapshot) {
  return {
    images: snapshot.images,
    currentPage: snapshot.currentPage,
    focusedIndex: snapshot.focusedIndex,
    targetCount: snapshot.targetCount,
  };
}

export const usePickerStore = create((set, get) => ({
  images: [],
  unsupportedFiles: [],
  gridSize: 4,
  currentPage: 0,
  focusedIndex: 0,
  targetCount: 20,
  loupeOpen: false,
  loading: false,
  loadProgress: 0,
  zipStatus: "idle",
  zipProgress: 0,
  error: "",
  history: [],

  loadFiles: async (files, unsupportedFiles) => {
    const previousImages = get().images;
    revokePreviews(previousImages);

    set({
      images: [],
      unsupportedFiles,
      currentPage: 0,
      focusedIndex: 0,
      loadProgress: 0,
      loading: true,
      zipStatus: "idle",
      zipProgress: 0,
      error: "",
      history: [],
    });

    const nextImages = [];

    files.forEach((file, index) => {
      nextImages.push(createImageRecord(file, index));
      set({ loadProgress: Math.round(((index + 1) / files.length) * 100) });
    });

    set({
      images: nextImages,
      loading: false,
      loadProgress: files.length ? 100 : 0,
    });
  },

  clearAll: () => {
    revokePreviews(get().images);
    set({
      images: [],
      unsupportedFiles: [],
      currentPage: 0,
      focusedIndex: 0,
      targetCount: 20,
      loupeOpen: false,
      loading: false,
      loadProgress: 0,
      zipStatus: "idle",
      zipProgress: 0,
      error: "",
      history: [],
    });
  },

  releaseResources: () => {
    revokePreviews(get().images);
  },

  pushHistory: () => {
    const snapshot = buildSnapshot(get());
    const history = [...get().history, snapshot].slice(-50);
    set({ history });
  },

  undo: () => {
    const history = [...get().history];
    const snapshot = history.pop();

    if (!snapshot) {
      return;
    }

    set({
      ...restoreSnapshot(snapshot),
      history,
      loupeOpen: false,
      zipStatus: "idle",
      zipProgress: 0,
      error: "",
    });
  },

  setTargetCount: (value) => {
    const nextValue = Number.parseInt(value, 10);
    set({ targetCount: Number.isNaN(nextValue) ? 0 : Math.max(nextValue, 0) });
  },

  setGridSize: (gridSize) => {
    if (!GRID_OPTIONS.includes(gridSize)) {
      return;
    }

    const pageCount = Math.max(1, Math.ceil(get().images.length / gridSize));
    set({
      gridSize,
      currentPage: Math.min(get().currentPage, pageCount - 1),
      focusedIndex: 0,
    });
  },

  incrementGridSize: () => {
    const currentIndex = GRID_OPTIONS.indexOf(get().gridSize);
    const nextIndex = Math.min(GRID_OPTIONS.length - 1, currentIndex + 1);
    get().setGridSize(GRID_OPTIONS[nextIndex]);
  },

  decrementGridSize: () => {
    const currentIndex = GRID_OPTIONS.indexOf(get().gridSize);
    const nextIndex = Math.max(0, currentIndex - 1);
    get().setGridSize(GRID_OPTIONS[nextIndex]);
  },

  setPage: (currentPage) => {
    const totalPages = Math.max(1, Math.ceil(get().images.length / get().gridSize));
    const clampedPage = Math.min(Math.max(currentPage, 0), totalPages - 1);
    set({ currentPage: clampedPage, focusedIndex: 0 });
  },

  nextPage: () => {
    get().setPage(get().currentPage + 1);
  },

  previousPage: () => {
    get().setPage(get().currentPage - 1);
  },

  setFocusedIndex: (focusedIndex) => {
    const visibleCount = get().getVisibleImages().length;
    if (visibleCount === 0) {
      set({ focusedIndex: 0 });
      return;
    }

    const clamped = Math.min(Math.max(focusedIndex, 0), visibleCount - 1);
    set({ focusedIndex: clamped });
  },

  moveFocus: (delta) => {
    get().setFocusedIndex(get().focusedIndex + delta);
  },

  getVisibleImages: () => {
    const { images, currentPage, gridSize } = get();
    const start = currentPage * gridSize;
    return images.slice(start, start + gridSize);
  },

  toggleByVisibleIndex: (visibleIndex) => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    const absoluteIndex = currentPage * gridSize + visibleIndex;
    if (!images[absoluteIndex]) {
      return;
    }

    get().pushHistory();
    const nextImages = [...images];
    nextImages[absoluteIndex] = {
      ...nextImages[absoluteIndex],
      selected: !nextImages[absoluteIndex].selected,
    };

    set({ images: nextImages, focusedIndex: visibleIndex });
  },

  selectAll: () => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    if (images.length === 0) {
      return;
    }

    const start = currentPage * gridSize;
    const end = Math.min(start + gridSize, images.length);

    let changed = false;
    const nextImages = images.map((image, i) => {
      if (i >= start && i < end && !image.selected) {
        changed = true;
        return { ...image, selected: true };
      }
      return image;
    });

    if (!changed) {
      return;
    }

    get().pushHistory();
    set({ images: nextImages });
  },

  clearSelections: () => {
    if (get().tournamentComplete) {
      return;
    }

    const { images, currentPage, gridSize } = get();
    if (images.length === 0) {
      return;
    }

    const start = currentPage * gridSize;
    const end = Math.min(start + gridSize, images.length);

    let changed = false;
    const nextImages = images.map((image, i) => {
      if (i >= start && i < end && image.selected) {
        changed = true;
        return { ...image, selected: false };
      }
      return image;
    });

    if (!changed) {
      return;
    }

    get().pushHistory();
    set({ images: nextImages });
  },

  toggleLoupe: () => {
    if (get().getVisibleImages().length === 0) {
      return;
    }

    set({ loupeOpen: !get().loupeOpen });
  },

  closeLoupe: () => set({ loupeOpen: false }),

  exportZip: async () => {
    const selectedImages = get().images.filter((image) => image.selected);
    if (selectedImages.length === 0) {
      set({ error: "선택된 사진이 없어 ZIP을 만들 수 없습니다." });
      return;
    }

    set({ zipStatus: "running", zipProgress: 0, error: "" });

    try {
      const zip = new JSZip();
      const usedNames = new Map();

      selectedImages.forEach((image) => {
        const duplicateCount = usedNames.get(image.name) || 0;
        usedNames.set(image.name, duplicateCount + 1);

        const finalName =
          duplicateCount === 0
            ? image.name
            : image.name.replace(/(\.[^.]+)?$/, ` (${duplicateCount})$1`);

        zip.file(finalName, image.file);
      });

      const blob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          set({ zipProgress: Math.round(metadata.percent) });
        },
      );

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "wedding-pick-selected.zip";
      anchor.click();
      URL.revokeObjectURL(downloadUrl);

      set({ zipStatus: "done", zipProgress: 100 });
    } catch (error) {
      set({
        zipStatus: "error",
        error: error instanceof Error ? error.message : "ZIP 생성에 실패했습니다.",
      });
    }
  },
}));

export const gridOptions = GRID_OPTIONS;
