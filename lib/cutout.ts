"use client";

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

// Cuts the player out of a photo in the browser, so they can stand on the page like the shirt does. MediaPipe's
// selfie model finds the person (hair, skin, clothes) against everything else. Nothing leaves the device: the
// model and its runtime are downloaded once, and only the finished PNG is saved.

const VERSION = "1.1.1";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

let segmenter: Promise<ImageSegmenter> | null = null;

function loadSegmenter() {
  segmenter ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    return ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  })().catch((e) => {
    // Let the next try start over (a dropped connection shouldn't break cut-outs for the rest of the visit).
    segmenter = null;
    throw e;
  });
  return segmenter;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  return img;
}

/** Whether any pixel is see-through: a PNG that is already a cut-out stays as it is. */
function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

/**
 * The one connected shape with the most of the person in it. The model sometimes keeps a scrap of background
 * (a sign, a hand behind them) as a separate island; those go.
 */
function largestShape(fg: Float32Array, w: number, h: number): Uint8Array {
  const label = new Int32Array(fg.length);
  const stack: number[] = [];
  let best = 0;
  let bestSize = 0;
  let next = 0;
  for (let start = 0; start < fg.length; start++) {
    if (fg[start] <= 0.05 || label[start]) continue;
    next++;
    let size = 0;
    label[start] = next;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      if (fg[i] > 0.5) size++;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
        if (j >= 0 && j < fg.length && !label[j] && fg[j] > 0.05) {
          label[j] = next;
          stack.push(j);
        }
    }
    if (size > bestSize) {
      bestSize = size;
      best = next;
    }
  }
  const keep = new Uint8Array(fg.length);
  for (let i = 0; i < fg.length; i++) keep[i] = label[i] === best ? 1 : 0;
  return keep;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The photo drawn at no more than maxPx on a side. */
function drawn(img: HTMLImageElement, maxPx: number) {
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

/** The model's confidence per pixel for each class: background, hair, body skin, face skin, clothes, other. */
async function segment(canvas: HTMLCanvasElement) {
  const result = (await loadSegmenter()).segment(canvas);
  const masks = result.confidenceMasks ?? [];
  const out = { w: masks[0]?.width ?? 0, h: masks[0]?.height ?? 0, masks: masks.map((m) => m.getAsFloat32Array()) };
  result.close();
  return out;
}

/** Cuts the canvas down to the alpha in `fg` (mask-sized, 0 to 1). */
function applyAlpha(ctx: CanvasRenderingContext2D, w: number, h: number, fg: Float32Array, mw: number, mh: number) {
  const mask = document.createElement("canvas");
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext("2d")!;
  const alpha = mctx.createImageData(mw, mh);
  for (let i = 0; i < fg.length; i++) alpha.data[i * 4 + 3] = Math.round(fg[i] * 255);
  mctx.putImageData(alpha, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingQuality = "high";
  // A touch of blur so a low-resolution mask doesn't leave stair-stepped edges.
  ctx.filter = "blur(0.75px)";
  ctx.drawImage(mask, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
}

/**
 * The person in the picture on a transparent background, cropped to them, as a PNG data URL no bigger than maxPx.
 * Null when there's nobody clear enough to cut out; the caller keeps the photo as it was. A picture that is
 * already see-through comes back unchanged.
 */
export async function cutOut(src: string, maxPx: number): Promise<string | null> {
  const { canvas, ctx, w, h } = drawn(await loadImage(src), maxPx);
  if (hasTransparency(ctx, w, h)) return canvas.toDataURL("image/png");

  const { w: mw, h: mh, masks } = await segment(canvas);
  const bg = masks[0];
  if (!bg) return null;
  // The mask as alpha: soft only across the uncertain band, so edges are clean but not jagged.
  const fg = new Float32Array(bg.length);
  for (let i = 0; i < bg.length; i++) fg[i] = smoothstep(0.3, 0.7, 1 - bg[i]);
  const keep = largestShape(fg, mw, mh);
  let kept = 0;
  for (let i = 0; i < fg.length; i++) {
    if (!keep[i]) fg[i] = 0;
    if (fg[i] > 0.5) kept++;
  }
  // Under 4% of the picture is too little to be a player (a crest, a landscape, a dark photo).
  if (kept < bg.length * 0.04) return null;
  applyAlpha(ctx, w, h, fg, mw, mh);

  // Crop to the person, with a little air at the top and sides. The bottom stays where the photo ends.
  const data = ctx.getImageData(0, 0, w, h).data;
  let top = h, left = w, right = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 40) {
        if (y < top) top = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  if (right < 0) return null;
  const pad = Math.round(Math.max(w, h) * 0.03);
  const cx = Math.max(0, left - pad);
  const cy = Math.max(0, top - pad);
  const cw = Math.min(w, right + pad + 1) - cx;
  const ch = h - cy;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out.toDataURL("image/png");
}

// The head picture is HEAD_WIDTH face widths across and ends NECK face widths below the chin (widths, as a beard
// makes a face look longer than it is).
const HEAD_WIDTH = 2.4;
const NECK = 0.75;

/**
 * Just the head (hair, face and the neck under it) on a transparent background, to sit in the collar of the shirt.
 * Always the same number of face widths across, centred on the face, and ending the same way below the chin, so
 * every player's head comes out the same size and in the same place on the shirt. Null when no face is found.
 * Works on a photo with its background and on one already cut out.
 */
export async function headOut(src: string, maxPx: number): Promise<string | null> {
  const { canvas, ctx, w, h } = drawn(await loadImage(src), maxPx);
  // A cut-out is see-through; the model reads a person on grey better than on black.
  const flat = document.createElement("canvas");
  flat.width = w;
  flat.height = h;
  const fctx = flat.getContext("2d")!;
  fctx.fillStyle = "#808080";
  fctx.fillRect(0, 0, w, h);
  fctx.drawImage(canvas, 0, 0);

  const { w: mw, h: mh, masks } = await segment(flat);
  const [, hair, body, face] = masks;
  if (!face) return null;
  const fg = new Float32Array(face.length);
  // A tighter edge than the full cut-out: a light background left round a face shows up as a halo on the dark pages.
  for (let i = 0; i < fg.length; i++) fg[i] = smoothstep(0.5, 0.9, hair[i] + face[i]);
  const keep = largestShape(fg, mw, mh);

  // The face's box sets the size and place of everything else.
  let fx0 = mw, fx1 = -1, fy0 = mh, fy1 = -1, facePx = 0;
  for (let i = 0; i < fg.length; i++)
    if (keep[i] && face[i] > 0.5) {
      const x = i % mw, y = (i - x) / mw;
      if (x < fx0) fx0 = x;
      if (x > fx1) fx1 = x;
      if (y < fy0) fy0 = y;
      if (y > fy1) fy1 = y;
      facePx++;
    }
  if (facePx < fg.length * 0.004) return null;
  const fw = fx1 - fx0 + 1;
  // The chin is the bottom of the head straight under the face: a beard counts as hair, not face, and hangs lower.
  for (let i = 0; i < fg.length; i++) {
    const x = i % mw, y = (i - x) / mw;
    if (keep[i] && fg[i] > 0.5 && y > fy1 && x > fx0 + fw * 0.3 && x < fx1 - fw * 0.3) fy1 = y;
  }
  const fh = fy1 - fy0 + 1;
  const sx = w / mw, sy = h / mh;
  // A face this small (a full-length photo from far off) would be a blur once it's on the shirt.
  if (fw * sx < 40) return null;

  // The skin colour, from the middle of the face, for the neck below.
  const px = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < fg.length; i++)
    if (keep[i] && face[i] > 0.85) {
      const x = i % mw, y = (i - x) / mw;
      const j = (Math.min(h - 1, Math.round(y * sy)) * w + Math.min(w - 1, Math.round(x * sx))) * 4;
      r += px[j];
      g += px[j + 1];
      b += px[j + 2];
      n++;
    }
  // Can run past the bottom of the photo (a close crop that ends at the chin); the drawn neck fills that in.
  const neckEnd = Math.round(fy1 + fw * NECK);

  // The head, plus the skin straight under the chin as the neck (not the shoulders or a hand off to the side).
  // A close-up photo (or a cut-out of one) cuts the head off at its edges; fade those so it doesn't end in a straight line.
  const edge = Math.max(2, Math.round(Math.min(mw, mh) * 0.05));
  let top = mh;
  for (let i = 0; i < fg.length; i++) {
    const x = i % mw, y = (i - x) / mw;
    let a = keep[i] ? fg[i] : 0;
    if (y > fy0 + fh / 2 && x > fx0 + fw * 0.1 && x < fx1 - fw * 0.1) a = Math.max(a, smoothstep(0.3, 0.7, body[i] + face[i]));
    if (y >= neckEnd) a = 0;
    a *= Math.min(1, (x + 0.5) / edge, (mw - x - 0.5) / edge, (y + 0.5) / edge, (mh - y - 0.5) / edge);
    fg[i] = a;
    if (a > 0.15 && y < top) top = y;
  }
  applyAlpha(ctx, w, h, fg, mw, mh);

  // Mask to picture coordinates, then the fixed frame around the face.
  const cw = Math.round(fw * sx * HEAD_WIDTH);
  const cx = Math.round(((fx0 + fx1 + 1) / 2) * sx - cw / 2);
  const cy = Math.max(0, Math.round((top - fh * 0.04) * sy));
  const ch = Math.round(neckEnd * sy) - cy;
  if (cw < 8 || ch < 8) return null;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d")!;
  octx.drawImage(canvas, -cx, -cy);

  // A neck under the head, in their skin colour, so the head doesn't float above the collar when the photo shows
  // none (a beard, a high collar, a crop at the chin). It goes behind, so a real neck in the photo stays on top.
  // Shaded under the chin and down the sides so it reads as round.
  if (n) {
    const neck = document.createElement("canvas");
    neck.width = cw;
    neck.height = ch;
    const nctx = neck.getContext("2d")!;
    const mid = cw / 2;
    const half = fw * sx * 0.25;
    const nTop = (fy1 - fh * 0.35) * sy - cy, chin = fy1 * sy - cy;
    nctx.fillStyle = `rgb(${r / n} ${g / n} ${b / n})`;
    nctx.beginPath();
    nctx.moveTo(mid - half, nTop);
    nctx.lineTo(mid + half, nTop);
    nctx.lineTo(mid + half * 1.15, ch);
    nctx.lineTo(mid - half * 1.15, ch);
    nctx.closePath();
    nctx.fill();
    nctx.globalCompositeOperation = "source-atop";
    const under = nctx.createLinearGradient(0, chin, 0, ch);
    under.addColorStop(0, "rgb(0 0 0 / 0.55)");
    under.addColorStop(0.5, "rgb(0 0 0 / 0.15)");
    under.addColorStop(1, "rgb(0 0 0 / 0.3)");
    nctx.fillStyle = under;
    nctx.fillRect(0, chin, cw, ch - chin);
    const sides = nctx.createLinearGradient(mid - half * 1.15, 0, mid + half * 1.15, 0);
    sides.addColorStop(0, "rgb(0 0 0 / 0.4)");
    sides.addColorStop(0.3, "rgb(0 0 0 / 0)");
    sides.addColorStop(0.7, "rgb(0 0 0 / 0)");
    sides.addColorStop(1, "rgb(0 0 0 / 0.4)");
    nctx.fillStyle = sides;
    nctx.fillRect(0, nTop, cw, ch - nTop);
    octx.globalCompositeOperation = "destination-over";
    octx.filter = "blur(0.6px)";
    octx.drawImage(neck, 0, 0);
  }
  return out.toDataURL("image/png");
}
