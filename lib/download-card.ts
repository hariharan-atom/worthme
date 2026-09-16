import type { PublicResult } from "./worth";
export async function downloadCard(result: PublicResult) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const navy = "#091e3b";
  function box(x: number, y: number, w: number, h: number, color: string, radius = 22) {
    ctx!.fillStyle = color; ctx!.beginPath(); ctx!.roundRect(x, y, w, h, radius); ctx!.fill();
  }
  function text(value: string, x: number, y: number, size: number, weight = 700, color = navy, width?: number) {
    ctx!.fillStyle = color; ctx!.font = `${weight} ${size}px Arial`;
    if (width) { while (ctx!.measureText(value).width > width && size > 16) { size--; ctx!.font = `${weight} ${size}px Arial`; } }
    ctx!.fillText(value, x, y, width ?? canvas.width - x - 56);
  }
  function wrap(value: string, x: number, y: number, width: number, size: number, lineHeight: number, maxLines: number) {
    ctx!.fillStyle = navy;
    let lines: string[] = [];
    // Fit long words and portable-card text inside the artwork as well as normal prose.
    for (; size >= 16; size--) {
      ctx!.font = `500 ${size}px Arial`;
      lines = [];
      let line = "";
      for (const character of value) {
        if (line && ctx!.measureText(line + character).width > width) {
          const space = line.lastIndexOf(" ");
          lines.push(space > 0 ? line.slice(0, space) : line);
          line = space > 0 ? line.slice(space + 1) : "";
        }
        line += character;
      }
      if (line.trim()) lines.push(line.trim());
      if (lines.length <= maxLines || size === 16) break;
    }
    if (lines.length > maxLines) {
      let last = lines[maxLines - 1];
      while (ctx!.measureText(last + "...").width > width) last = last.slice(0, -1);
      lines[maxLines - 1] = last.trimEnd() + "...";
    }
    lines.slice(0, maxLines).forEach((line, index) => ctx!.fillText(line, x, y + index * lineHeight));
  }
  async function image(source: string) {
    const img = new Image(); img.src = source;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([img.decode(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Image timeout")), 5000); })]);
      return img;
    } finally { clearTimeout(timeout); }
  }
  box(0, 0, 1080, 1440, "#fffdf7", 0);
  try { const logo = await image("/brand/worthme-logo.png"); ctx.drawImage(logo, 56, 35, 265, 88); }
  catch { text("WorthMe", 56, 100, 58, 900); }
  text("SAME PERSON. BIGGER POTENTIAL.", 570, 87, 19, 700);
  box(56, 160, 305, 340, "#d9eddf");
  text(Array.from(result.name)[0].toUpperCase(), 140, 365, 145, 900);
  if (result.profileImage) {
    try {
      const photo = await image(result.profileImage);
      ctx.save(); ctx.beginPath(); ctx.roundRect(56, 160, 305, 340, 22); ctx.clip();
      const scale = Math.max(305 / photo.width, 340 / photo.height);
      ctx.drawImage(photo, 56 + (305 - photo.width * scale) / 2, 160 + (340 - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
      ctx.restore();
    } catch { /* The initial remains if a photo cannot be decoded. */ }
  }
  text(result.name.toUpperCase(), 395, 200, 48, 900, navy, 625);
  text(result.humanType, 395, 243, 26, 700, "#56667a", 625);
  box(395, 273, 629, 227, "#fff0b0");
  text("WORTH SCORE", 427, 320, 22);
  text(String(result.score), 425, 465, 137, 900);
  text("/ 100", 650, 450, 48);
  box(56, 527, 968, 99, "#d5f4e5");
  text("FICTIONAL ENTERTAINMENT VALUE", 81, 567, 18);
  text(result.valuation, 600, 592, 42, 900, navy, 392);
  const colors = ["#9271dd", "#f29856", "#27ab9b", "#45a4d2", "#e86795"];
  result.scores.forEach((score, i) => {
    const y = 680 + i * 50;
    text(score.label, 65, y, 23, 700, navy, 225);
    box(310, y - 19, 610, 14, "#e6e9ec", 7);
    box(310, y - 19, 610 * score.value / 100, 14, colors[i], 7);
    text(String(score.value), 960, y, 23);
  });
  box(56, 921, 968, 228, "#e7efff");
  text("THE WORTHME VERDICT", 82, 962, 19);
  wrap(result.verdict, 82, 1001, 915, 24, 33, 4);
  box(56, 1170, 968, 164, "#fff0d6");
  text("YOUR NEXT GROWTH AREA", 82, 1206, 17);
  text(result.valueGap, 82, 1246, 28, 900, navy, 915);
  wrap(result.upgrade, 82, 1285, 915, 23, 29, 2);
  text("DISCOVER. LAUGH. IMPROVE.", 56, 1380, 19);
  text("For fun. Never a measure of your human worth.", 570, 1380, 17, 500);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Export failed")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `worthme-${result.slug}.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
