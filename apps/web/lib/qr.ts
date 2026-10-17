import QRCode from "qrcode";

/**
 * A QR code as one SVG path, one square per dark module, so the page draws it with no images.
 * Medium error correction still scans from a projector across a room.
 */
export function qrPath(text: string): { size: number; path: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const squares: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) squares.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { size: modules.size, path: squares.join("") };
}
