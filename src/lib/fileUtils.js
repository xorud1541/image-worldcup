const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export function classifyFiles(fileList) {
  const accepted = [];
  const rejected = [];

  Array.from(fileList).forEach((file) => {
    const name = file.name.toLowerCase();
    const isSupported =
      SUPPORTED_TYPES.has(file.type) ||
      SUPPORTED_EXTENSIONS.some((extension) => name.endsWith(extension));

    if (isSupported) {
      accepted.push(file);
    } else {
      rejected.push(file.name);
    }
  });

  return { accepted, rejected };
}

export function createImageRecord(file, index) {
  return {
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    name: file.name,
    path: file.webkitRelativePath || file.name,
    previewUrl: URL.createObjectURL(file),
    selected: false,
  };
}

export function revokePreviews(images) {
  images.forEach((image) => {
    URL.revokeObjectURL(image.previewUrl);
  });
}
