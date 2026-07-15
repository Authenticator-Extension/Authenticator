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
