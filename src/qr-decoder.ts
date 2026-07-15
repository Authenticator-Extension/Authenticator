import {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from "@zxing/library";

// Decode a QR code from raw canvas ImageData (RGBA) using @zxing/library.
// Returns the decoded string, or null when no QR is found (equivalent to the
// previous jsQR(...) === null behavior).
//
// Leaf module: imports only @zxing/library (no src/models), so it stays safe to
// share between the popup import flow (QrImport.vue) and the injected content
// script (content.ts) without dragging in the storage <-> otp import cycle.
export function decodeQrFromImageData(imageData: ImageData): string | null {
  const { data, width, height } = imageData;
  const luminances = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    luminances[i] = (r * 0.299 + g * 0.587 + b * 0.114) & 0xff;
  }
  const source = new RGBLuminanceSource(luminances, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return new QRCodeReader().decode(bitmap).getText();
  } catch {
    return null;
  }
}

// Map a CSS-pixel selection (from the content-script drag box) onto the captured
// bitmap's device pixels, clamped to the bitmap bounds. Returns the crop region
// or null when the capture/selection can't yield a non-empty area.
//
// The captured image is the visible viewport rendered at the display's device
// pixel ratio, which we recover from bitmapWidth / windowInnerWidth. A 0-size
// bitmap (failed capture) or a click / 1px drag (empty or out-of-bounds region)
// must be rejected: feeding getImageData a 0/negative-size or out-of-range crop
// throws IndexSizeError and kills the scan silently.
//
// Pure + leaf: no src/models imports, so it stays unit-testable and safe to
// share alongside decodeQrFromImageData without dragging in the storage<->otp
// import cycle.
export function computeQrCropRegion(
  bitmapWidth: number,
  bitmapHeight: number,
  windowInnerWidth: number,
  left: number,
  top: number,
  width: number,
  height: number,
): { sx: number; sy: number; sw: number; sh: number } | null {
  if (!bitmapWidth || !bitmapHeight || !windowInnerWidth) {
    return null;
  }
  const devicePixelRatio = bitmapWidth / windowInnerWidth;
  const sx = Math.max(0, Math.floor(left * devicePixelRatio));
  const sy = Math.max(0, Math.floor(top * devicePixelRatio));
  const sw = Math.min(bitmapWidth - sx, Math.floor(width * devicePixelRatio));
  const sh = Math.min(bitmapHeight - sy, Math.floor(height * devicePixelRatio));
  if (sw <= 0 || sh <= 0) {
    return null;
  }
  return { sx, sy, sw, sh };
}
