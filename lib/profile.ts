export async function compressProfile(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose a photo smaller than 12 MB.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode().catch(() => { throw new Error("That photo could not be opened. Please choose another."); });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("That photo has no image data.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    for (let edge = 640; edge >= 160; edge = Math.floor(edge * 0.8)) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#fffdf8"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.48]) {
        let data = canvas.toDataURL("image/webp", quality);
        if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", quality);
        // Count base64 overhead too: the whole stored string must fit within 100 KB.
        if (data.length <= 100 * 1024) return data;
      }
    }
    throw new Error("This photo could not be compressed. Please choose a smaller one.");
  } finally { URL.revokeObjectURL(source); }
}