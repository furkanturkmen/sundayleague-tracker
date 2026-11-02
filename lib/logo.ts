import sharp from "sharp";

// Club crests often come as a JPEG or PNG on a white (or other flat) square, which shows as a box on the dark pages.
// This lifts that background off: it fills in from the edges through every pixel close to the edge colour, so white
// inside the crest (enclosed by its outline) stays, softens the cut so the edge isn't jagged, and trims the empty
// border so every crest fills its spot the same. Crests that already have transparency, or that aren't on a flat
// colour (a photo), are left as they are.

const NEAR = 40; // colour distance still counted as background
const EDGE = 90; // up to this distance an edge pixel is part background, for a soft cut

export async function clearBackground(input: Buffer, type: string): Promise<{ body: Uint8Array<ArrayBuffer>; type: string }> {
  const original = { body: Uint8Array.from(input), type };
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(type)) return original;
  try {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    if (w < 8 || h < 8 || w * h > 4_000_000) return original;
    const px = (i: number) => i * 4;

    // The edge: already transparent, or one flat colour?
    const edge: number[] = [];
    for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
    for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);
    let clear = 0;
    for (const i of edge) if (data[px(i) + 3] < 128) clear++;
    if (clear > edge.length * 0.3) return original;
    const bg = [0, 1, 2].map((c) => median(edge.map((i) => data[px(i) + c])));
    const dist = (i: number) => {
      const p = px(i);
      return Math.hypot(data[p] - bg[0], data[p + 1] - bg[1], data[p + 2] - bg[2]);
    };
    // A crest may touch the frame (a tall shield), so the corners have to be background and the edge only in part.
    const corners = [0, w - 1, (h - 1) * w, w * h - 1];
    if (corners.filter((i) => dist(i) <= NEAR).length < 3 || edge.filter((i) => dist(i) <= NEAR).length < edge.length * 0.4) return original;

    // Fill in from the edge.
    const out = new Uint8Array(w * h); // 1 = background
    const queue: number[] = [];
    for (const i of edge) if (!out[i] && dist(i) <= NEAR) { out[i] = 1; queue.push(i); }
    while (queue.length) {
      const i = queue.pop()!;
      const x = i % w;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n < 0 || n >= w * h || out[n] || dist(n) > NEAR) continue;
        out[n] = 1;
        queue.push(n);
      }
    }

    // Background goes; the pixels just inside it fade by how close they are to the background colour, with that
    // colour taken back out so no white fringe is left.
    for (let i = 0; i < w * h; i++) {
      const p = px(i);
      if (out[i]) { data[p + 3] = 0; continue; }
      const x = i % w;
      const touches = (x > 0 && out[i - 1]) || (x < w - 1 && out[i + 1]) || (i >= w && out[i - w]) || (i + w < w * h && out[i + w]);
      if (!touches) continue;
      const a = Math.min(1, Math.max(0, (dist(i) - NEAR) / (EDGE - NEAR)));
      if (a >= 1) continue;
      const alpha = Math.max(a, 0.05);
      for (let c = 0; c < 3; c++) data[p + c] = Math.round(Math.min(255, Math.max(0, (data[p + c] - bg[c] * (1 - alpha)) / alpha)));
      data[p + 3] = Math.round(data[p + 3] * a);
    }

    const cut = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
    return { body: Uint8Array.from(cut), type: "image/png" };
  } catch {
    return original;
  }
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}
