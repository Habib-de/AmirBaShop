/* ═══════════════════════════════════════════════════════════
   IMAGE HELPERS
   ─────────────────────────────────────────────────────────
   All photos are stored as base64 data URLs in localStorage.
   localStorage is ~5MB per origin, so we compress aggressively.
   
   - Max input size:  10MB per photo (before compression)
   - Max output size: ~150KB per photo (after compression)
   - Max dimensions:  1200x1200 (large enough for full-screen view)
   - Thumbnails:      300x300 for grid display
   - Max photos:      5 per review
   ═══════════════════════════════════════════════════════════ */

export const MAX_PHOTOS = 5;
export const MAX_INPUT_SIZE_MB = 10;
export const MAX_OUTPUT_KB = 150;
export const MAX_DIMENSION = 1200;
export const THUMB_DIMENSION = 300;

/* ═══════════════════════════════════════════════════════════
   Read a File → base64 data URL
   ═══════════════════════════════════════════════════════════ */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════════════
   Load a data URL into an HTMLImageElement
   ═══════════════════════════════════════════════════════════ */
export function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* ═══════════════════════════════════════════════════════════
   Compress an image to target dimensions + quality
   ═══════════════════════════════════════════════════════════ */
export async function compressImage(dataUrl, maxDim = MAX_DIMENSION, quality = 0.75) {
  const img = await loadImage(dataUrl);

  let { width, height } = img;

  // Calculate new dimensions while preserving aspect ratio
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height / width) * maxDim);
      width = maxDim;
    } else {
      width = Math.round((width / height) * maxDim);
      height = maxDim;
    }
  }

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Export as JPEG (smaller than PNG for photos)
  return canvas.toDataURL('image/jpeg', quality);
}

/* ═══════════════════════════════════════════════════════════
   Estimate the byte size of a data URL
   ═══════════════════════════════════════════════════════════ */
export function dataUrlSize(dataUrl) {
  // base64 length × 3/4 = approximate byte count
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

/* ═══════════════════════════════════════════════════════════
   Process a single File object end-to-end:
     File → base64 → compress → thumbnail → size check
   
   Returns { full, thumb, size, name } or throws.
   ═══════════════════════════════════════════════════════════ */
export async function processPhotoFile(file) {
  // Validate type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_INPUT_SIZE_MB) {
    throw new Error(`Image is too large (max ${MAX_INPUT_SIZE_MB}MB)`);
  }

  // File → base64
  const rawDataUrl = await fileToDataURL(file);

  // Compress main image
  let fullDataUrl = await compressImage(rawDataUrl, MAX_DIMENSION, 0.75);

  // If still too big, compress harder
  let attempts = 0;
  while (dataUrlSize(fullDataUrl) > MAX_OUTPUT_KB * 1024 && attempts < 3) {
    fullDataUrl = await compressImage(fullDataUrl, MAX_DIMENSION, 0.6 - attempts * 0.1);
    attempts++;
  }

  // Generate thumbnail
  const thumbDataUrl = await compressImage(fullDataUrl, THUMB_DIMENSION, 0.7);

  return {
    full: fullDataUrl,
    thumb: thumbDataUrl,
    size: dataUrlSize(fullDataUrl),
    name: file.name,
  };
}

/* ═══════════════════════════════════════════════════════════
   Process multiple files at once
   Returns { ok: [...], errors: [...] }
   ═══════════════════════════════════════════════════════════ */
export async function processPhotoFiles(files, currentCount = 0) {
  const results = { ok: [], errors: [] };

  const filesArray = Array.from(files);
  const remaining = MAX_PHOTOS - currentCount;

  if (filesArray.length > remaining) {
    results.errors.push(
      `You can only add ${remaining} more photo${remaining !== 1 ? 's' : ''} (max ${MAX_PHOTOS} per review)`
    );
  }

  const filesToProcess = filesArray.slice(0, remaining);

  for (const file of filesToProcess) {
    try {
      const processed = await processPhotoFile(file);
      results.ok.push(processed);
    } catch (err) {
      results.errors.push(`${file.name}: ${err.message}`);
    }
  }

  return results;
}

/* ═══════════════════════════════════════════════════════════
   Human-readable size formatting
   ═══════════════════════════════════════════════════════════ */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}