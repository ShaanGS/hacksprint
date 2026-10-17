// The bill photo is shrunk on the phone before it is sent: 1600 px on the long side still reads
// clearly, and a few hundred kilobytes upload quickly on shop Wi-Fi.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

/** The photo as a JPEG at most 1600 px on its long side; the original if the phone cannot. */
export async function shrinkPhoto(photo: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const shrunk = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    return shrunk ?? photo;
  } catch {
    return photo;
  }
}
