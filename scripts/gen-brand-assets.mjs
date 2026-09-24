// PLI Android brand asset generator — Stage R.1 Phase H.
//
// Deterministic, dependency-free PNG rendering (pure Node zlib). Produces:
//   apps/mobile/assets/icon.png           1024x1024  (app icon, full-bleed design)
//   apps/mobile/assets/adaptive-icon.png  1024x1024  (adaptive foreground, transparent bg,
//                                                     mark inside the Android safe zone)
//   apps/mobile/assets/splash.png         1284x2778  (portrait splash, width >= 1024)
//
// Design language (see reports/ANDROID_BRANDING_REPORT.md):
//   warm + intelligent + clean + premium, non-medical, non-game.
//   Cream canvas (#FAF8F5 family), warm terracotta gradient mark, white paw
//   print. Deliberately no medical cross, no robot avatar, no swirl, no neon.
import { deflateSync } from "node:zlib";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "apps", "mobile", "assets");
mkdirSync(OUT, { recursive: true });

// --- palette (aligned with @pli/ui-tokens / scripts/gen-assets.mjs) ---
const CREAM = [250, 248, 245]; // #FAF8F5 canvas
const CREAM_DEEP = [244, 233, 222]; // warm cream gradient end
const WARM_A = [233, 184, 139]; // #E9B88B
const WARM_B = [197, 107, 70]; // #C56B46 terracotta
const INK_SHADOW = [74, 54, 44]; // warm brown (subtle shadow)
const WHITE = [255, 255, 255];

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const lerp = (a, b, t) => a + (b - a) * t;

// --- PNG encoder (RGBA, filter 0, zlib) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, getPix) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPix(x, y);
      const o = rowStart + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- shape math (signed distances, 1px anti-aliasing via coverage) ---
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}
// superellipse "pad": softer than an ellipse, closer to a paw pad
function sdSuperEllipse(x, y, cx, cy, a, b, p) {
  return a * b * (Math.pow(Math.abs((x - cx) / a), p) + Math.pow(Math.abs((y - cy) / b), p) - 1);
}
function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}
const cov = (d) => clamp(0.5 - d); // 0..1 coverage

/** Coverage of a paw print (main pad + 4 toes) centered at (cx, cy), scale s. */
function pawCoverage(x, y, s, cx, cy) {
  const main = sdSuperEllipse(x, y, cx, cy + 52 * s, 172 * s, 128 * s, 2.1);
  const toes = [
    sdCircle(x, y, cx - 150 * s, cy - 150 * s, 58 * s),
    sdCircle(x, y, cx - 52 * s, cy - 198 * s, 58 * s),
    sdCircle(x, y, cx + 52 * s, cy - 198 * s, 58 * s),
    sdCircle(x, y, cx + 150 * s, cy - 150 * s, 58 * s),
  ];
  let c = cov(main);
  for (const d of toes) c += cov(d);
  return Math.min(c, 1);
}

/** Draw the paw mark (optional warm drop shadow under it) into a buffer. */
function paintPaw(buf, w, h, s, cx, cy, withShadow) {
  if (withShadow) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = pawCoverage(x, y, s, cx, cy + 16 * s);
        if (c > 0) buf.set(x, y, INK_SHADOW[0], INK_SHADOW[1], INK_SHADOW[2], Math.round(c * 130));
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = pawCoverage(x, y, s, cx, cy);
      if (c > 0) buf.set(x, y, WHITE[0], WHITE[1], WHITE[2], Math.round(c * 255));
    }
  }
}

/** RGBA accumulator; (w, h) are the real image dimensions (row stride = w). */
function makeBuf(w, h) {
  const px = new Float32Array(w * h * 4);
  return {
    px,
    set(x, y, r, g, b, a) {
      const o = (y * w + x) * 4;
      if (a <= 0) return;
      const na = a / 255;
      const da = (1 - na) * (px[o + 3] / 255);
      const oa = na + da;
      if (oa <= 0) return;
      px[o] = clamp((r * na + px[o] * da) / oa);
      px[o + 1] = clamp((g * na + px[o + 1] * da) / oa);
      px[o + 2] = clamp((b * na + px[o + 2] * da) / oa);
      px[o + 3] = clamp(oa * 255);
    },
  };
}

function exportPng(name, w, h, buf) {
  writeFileSync(join(OUT, name), encodePng(w, h, (x, y) => {
    const o = (y * w + x) * 4;
    return [buf.px[o], buf.px[o + 1], buf.px[o + 2], buf.px[o + 3]];
  }));
}

// --- 1) icon.png 1024x1024 (full-bleed) ---
{
  const S = 1024;
  const buf = makeBuf(S, S);
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    const r = Math.round(lerp(CREAM[0], CREAM_DEEP[0], t * 0.7));
    const g = Math.round(lerp(CREAM[1], CREAM_DEEP[1], t * 0.7));
    const b = Math.round(lerp(CREAM[2], CREAM_DEEP[2], t * 0.7));
    for (let x = 0; x < S; x++) buf.set(x, y, r, g, b, 255);
  }
  const cx = S / 2;
  const cy = S / 2;
  // warm rounded card behind the mark
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = cov(sdRoundRect(x, y, cx, cy, 436, 436, 212));
      if (c > 0) {
        const t = (y - (cy - 436)) / 872;
        const r = Math.round(lerp(WARM_A[0], WARM_B[0], t * 0.85));
        const g = Math.round(lerp(WARM_A[1], WARM_B[1], t * 0.85));
        const b = Math.round(lerp(WARM_A[2], WARM_B[2], t * 0.85));
        buf.set(x, y, r, g, b, Math.round(c * 255));
      }
    }
  }
  paintPaw(buf, S, S, 0.62, cx, cy - 6, true);
  exportPng("icon.png", S, S, buf);
}

// --- 2) adaptive-icon.png 1024x1024 (transparent foreground, safe zone) ---
{
  const S = 1024;
  const buf = makeBuf(S, S);
  const cx = S / 2;
  const cy = S / 2;
  // Android safe zone = central ~66% of the 108dp canvas (diameter ~66dp),
  // so the mark must stay inside a centered circle of radius ~305px here.
  // Unscaled mark spans ~436px vertically; 0.82 keeps it well inside.
  paintPaw(buf, S, S, 0.82, cx, cy - 12, false);
  exportPng("adaptive-icon.png", S, S, buf);
}

// --- 3) splash.png 1284x2778 (portrait, width >= 1024) ---
{
  const W = 1284;
  const H = 2778;
  const buf = makeBuf(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const r = Math.round(lerp(CREAM[0], CREAM_DEEP[0], t * 0.55));
    const g = Math.round(lerp(CREAM[1], CREAM_DEEP[1], t * 0.55));
    const b = Math.round(lerp(CREAM[2], CREAM_DEEP[2], t * 0.55));
    for (let x = 0; x < W; x++) buf.set(x, y, r, g, b, 255);
  }
  const cx = W / 2;
  const cy = H * 0.44;
  // soft warm halo behind the mark
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const a = Math.max(0, 1 - d / 620) * 70;
      if (a > 0) buf.set(x, y, WARM_A[0], WARM_A[1], WARM_A[2], Math.round(a));
    }
  }
  paintPaw(buf, W, H, 0.5, cx, cy, false);
  exportPng("splash.png", W, H, buf);
}

console.log("Generated brand assets into", OUT);
for (const f of ["icon.png", "adaptive-icon.png", "splash.png"]) {
  const p = join(OUT, f);
  console.log(`  ${f}  ${statSync(p).size} bytes`);
}