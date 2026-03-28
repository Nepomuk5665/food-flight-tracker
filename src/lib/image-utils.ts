export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.8,
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Try progressively lower quality until under 200KB
  const MAX_BYTES = 200 * 1024;
  let currentQuality = quality;

  while (currentQuality >= 0.3) {
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: currentQuality,
    });
    if (blob.size <= MAX_BYTES) {
      return blobToDataUrl(blob);
    }
    currentQuality -= 0.1;
  }

  // Final attempt at minimum quality
  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.3,
  });
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
