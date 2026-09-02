/**
 * Downscale + re-encode an image File in the browser before upload.
 *
 * Vercel serverless functions reject request bodies larger than ~4.5 MB, so a
 * raw phone photo (often 3–8 MB) fails `/api/upload` with a multipart parse
 * error ("no boundary found"). Progress photos don't need full resolution, so
 * we cap the longest edge and re-encode as JPEG to land well under the limit.
 *
 * Falls back to the original file if anything goes wrong (non-image, decode
 * failure, or a browser without canvas).
 */

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.82;
// Only bother compressing files above this size (bytes).
const SKIP_BELOW = 1_000_000;

export async function compressImage(
  file: File,
  maxDim: number = DEFAULT_MAX_DIM,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  // HEIC can't be decoded by <img>/canvas in most browsers — leave it to the
  // server (it's usually already reasonably sized, and iOS Safari handles it).
  if (file.type === "image/heic" || file.type === "image/heif") return file;
  if (file.size < SKIP_BELOW) return file;

  try {
    const dataUrl = await readAsDataURL(file);
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // If compression didn't actually help, keep the original.
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}
