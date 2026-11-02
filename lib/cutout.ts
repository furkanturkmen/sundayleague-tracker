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

// The runtime logs its start-up notes ("INFO: Created TensorFlow Lite XNNPACK delegate…") through console.error,
// which the Next.js dev overlay shows as an error. Those notes are dropped; real errors still get through.
async function segment(canvas: HTMLCanvasElement) {
  const s = await loadSegmenter();
  const error = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    error(...args);
  };
  try {
    return s.segment(canvas);
  } finally {
    console.error = error;
  }
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

/**
 * The person in the picture on a transparent background, cropped to them, as a PNG data URL no bigger than maxPx.
 * Null when there's nobody clear enough to cut out; the caller keeps the photo as it was. A picture that is
 * already see-through comes back unchanged.
 */
export async function cutOut(src: string, maxPx: number): Promise<string | null> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  if (hasTransparency(ctx, w, h)) return canvas.toDataURL("image/png");

  const result = await segment(canvas);
  const background = result.confidenceMasks?.[0];
  if (!background) return null;
  const mw = background.width;
  const mh = background.height;
  const bg = background.getAsFloat32Array();
  result.close();

  // The mask as alpha: soft only across the uncertain band, so edges are clean but not jagged.
  const mask = document.createElement("canvas");
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext("2d")!;
  const alpha = mctx.createImageData(mw, mh);
  const fg = new Float32Array(bg.length);
  for (let i = 0; i < bg.length; i++) fg[i] = smoothstep(0.3, 0.7, 1 - bg[i]);
  const keep = largestShape(fg, mw, mh);
  let kept = 0;
  for (let i = 0; i < fg.length; i++) {
    const a = keep[i] ? fg[i] : 0;
    alpha.data[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.5) kept++;
  }
  // Under 4% of the picture is too little to be a player (a crest, a landscape, a dark photo).
  if (kept < bg.length * 0.04) return null;
  mctx.putImageData(alpha, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingQuality = "high";
  // A touch of blur so a low-resolution mask doesn't leave stair-stepped edges.
  ctx.filter = "blur(0.75px)";
  ctx.drawImage(mask, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";

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
