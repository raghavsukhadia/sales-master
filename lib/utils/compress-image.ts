const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_BYTES = 800 * 1024;

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
}

/**
 * Resize and compress an image in the browser before uploading to Server Actions.
 * Returns a JPEG File sized for the ~1 MB Server Action limit.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let quality = options.quality ?? DEFAULT_QUALITY;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare image for compression.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
