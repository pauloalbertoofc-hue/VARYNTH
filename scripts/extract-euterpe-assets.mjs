import sharp from "sharp";

const source = "public/music/euterpe/character-reference.png";
const target = "public/music/euterpe";
const crops = [
  { name: "euterpe-full.png", left: 120, top: 0, width: 540, height: 1254 },
  { name: "euterpe-chibi-idle.png", left: 650, top: 298, width: 190, height: 256 },
  { name: "euterpe-chibi-lyre.png", left: 838, top: 298, width: 193, height: 256 },
  { name: "euterpe-chibi-sleep.png", left: 1027, top: 304, width: 215, height: 250 },
];

function distance(data, width, x, y, backgrounds) {
  const i = (y * width + x) * 4;
  return Math.min(...backgrounds.map(([r, g, b]) => Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b)));
}

for (const crop of crops) {
  const { data: pixels, info } = await sharp(source).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const cornerPoints = [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3]];
  const backgrounds = cornerPoints.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  });
  const removed = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let read = 0, write = 0;
  const seed = (x, y) => {
    const idx = y * width + x;
    if (!removed[idx] && distance(pixels, width, x, y, backgrounds) < 56) { removed[idx] = 1; queue[write++] = idx; }
  };
  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }
  while (read < write) {
    const idx = queue[read++], x = idx % width, y = Math.floor(idx / width);
    if (x) seed(x - 1, y); if (x + 1 < width) seed(x + 1, y);
    if (y) seed(x, y - 1); if (y + 1 < height) seed(x, y + 1);
  }
  for (let i = 0; i < width * height; i++) {
    if (!removed[i]) continue;
    const x = i % width, y = Math.floor(i / width), d = distance(pixels, width, x, y, backgrounds);
    const alpha = Math.round(Math.max(0, Math.min(1, (d - 9) / 47)) * 255);
    const p = i * 4;
    if (alpha && alpha < 255) {
      const bg = backgrounds.reduce((best, point) => Math.hypot(pixels[p] - point[0], pixels[p + 1] - point[1], pixels[p + 2] - point[2]) < Math.hypot(pixels[p] - best[0], pixels[p + 1] - best[1], pixels[p + 2] - best[2]) ? point : best, backgrounds[0]);
      for (let c = 0; c < 3; c++) pixels[p + c] = Math.max(0, Math.min(255, Math.round((pixels[p + c] - bg[c] * (1 - alpha / 255)) / (alpha / 255))));
    }
    pixels[p + 3] = alpha;
  }
  await sharp(pixels, { raw: info }).png({ compressionLevel: 9, effort: 6 }).toFile(`${target}/${crop.name}`);
  console.log(`${crop.name}: ${width}x${height}, cleared ${write} connected background pixels`);
}
