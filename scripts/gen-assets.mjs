// Generate PLI brand/visual assets (PNG) with pure Node (zlib), matching @pli/ui-tokens palette.
// Assets: app icon 512/192, apple-touch-icon 180, favicon 32, OG image 1200x630,
// default pet avatar 256, empty illustration 400x280, error illustration 400x280.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "apps", "web", "public");
mkdirSync(join(outDir, "icons"), { recursive: true });
mkdirSync(join(outDir, "illustrations"), { recursive: true });

// ---- palette (matches tokens.json) ----
const PAL = {
  sage500: [97, 121, 92], // #61795C primary
  sage600: [78, 99, 73],
  sage700: [61, 79, 58],
  sage200: [201, 212, 195],
  cream: [250, 248, 245], // canvas
  ink: [43, 39, 35],
  inkMuted: [124, 115, 105],
  surface: [255, 255, 255],
  accent: [201, 138, 61],
  emergency: [180, 35, 24],
  line: [232, 226, 217],
};

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ---- tiny PNG encoder ----
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
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (width * 4 + 1) + 1 + x * 4;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      raw[di + 3] = rgba[si + 3];
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

// ---- drawing helpers ----
function makeCanvas(w, h, fill) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = fill[0];
    px[i * 4 + 1] = fill[1];
    px[i * 4 + 2] = fill[2];
    px[i * 4 + 3] = 255;
  }
  return px;
}
function blend(px, w, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= w || y >= px.length / 4 / w) return;
  const i = (y * w + x) * 4;
  const a = alpha;
  px[i] = clamp(px[i] * (1 - a) + color[0] * a);
  px[i + 1] = clamp(px[i + 1] * (1 - a) + color[1] * a);
  px[i + 2] = clamp(px[i + 2] * (1 - a) + color[2] * a);
  px[i + 3] = 255;
}
function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}
function fillCircle(px, w, h, cx, cy, r, color, alpha = 1) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = dist(x + 0.5, y + 0.5, cx, cy);
      const aa = clamp((r - d + 0.5) * 255);
      if (aa <= 0) continue;
      blend(px, w, x, y, color, alpha * (aa / 255));
    }
}
function fillRoundRect(px, w, h, x, y, rw, rh, radius, color) {
  for (let yy = y; yy < y + rh; yy++)
    for (let xx = x; xx < x + rw; xx++) {
      const nearestX = Math.max(x + radius, Math.min(xx, x + rw - radius));
      const nearestY = Math.max(y + radius, Math.min(yy, y + rh - radius));
      if (dist(xx, yy, nearestX, nearestY) <= radius) {
        blend(px, w, xx, yy, color, 1);
      }
    }
}
function verticalGradient(px, w, h, from, to) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const c = [0, 1, 2].map((i) => clamp(from[i] + (to[i] - from[i]) * t));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
}

// ---- paw mark ----
// cx,cy = palm center; r = palm radius; toes at angle offsets
function drawPaw(px, w, h, cx, cy, palmR, color, alpha = 1) {
  fillCircle(px, w, h, cx, cy, palmR, color, alpha);
  const toeR = palmR * 0.52;
  const toeDist = palmR * 0.92;
  const toes = [
    [0, -1, -0.35], // top
    [-0.62, -0.2, 0.15],
    [0.62, -0.2, 0.15],
    [-0.3, 0.85, 0.62], // side little
    [0.3, 0.85, 0.62],
  ];
  for (const [dx, dy, ang] of toes) {
    fillCircle(px, w, h, cx + dx * toeDist, cy + dy * toeDist, toeR, color, alpha);
  }
}

function writePng(name, w, h, px) {
  const file = join(outDir, name);
  writeFileSync(file, encodePng(w, h, px));
  console.log("wrote", name, `${w}x${h}`);
}

// ---- app icon (rounded-square sage gradient + cream paw) ----
function appIcon(size) {
  const px = makeCanvas(size, size, [0, 0, 0, 0]);
  // transparent bg, rounded square inset
  const margin = Math.round(size * 0.02);
  const radius = Math.round(size * 0.22);
  const grad = [PAL.sage600, PAL.sage500];
  const rect = makeCanvas(size, size, [0, 0, 0, 0]);
  verticalGradient(rect, size, size, grad[0], grad[1]);
  // mask rounded rect
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const inRect =
        x >= margin && y >= margin && x < size - margin && y < size - margin;
      if (!inRect) continue;
      const nearestX = Math.max(margin + radius, Math.min(x, size - margin - radius));
      const nearestY = Math.max(margin + radius, Math.min(y, size - margin - radius));
      if (dist(x, y, nearestX, nearestY) <= radius) {
        const i = (y * size + x) * 4;
        px[i] = rect[i];
        px[i + 1] = rect[i + 1];
        px[i + 2] = rect[i + 2];
        px[i + 3] = rect[i + 3];
      }
    }
  const cx = size / 2;
  const cy = size * 0.56;
  const palmR = size * 0.17;
  drawPaw(px, size, size, cx, cy, palmR, PAL.cream, 0.98);
  return px;
}

writePng("icons/icon-512.png", 512, 512, appIcon(512));
writePng("icons/icon-192.png", 192, 192, appIcon(192));
writePng("icons/apple-touch-icon.png", 180, 180, appIcon(180));
writePng("icons/favicon.png", 32, 32, appIcon(32));
writePng("icons/favicon-16.png", 16, 16, appIcon(16));

// ---- default pet avatar (canvas bg + paw outline) ----
function petAvatar(size) {
  const px = makeCanvas(size, size, PAL.surface);
  const radius = Math.round(size * 0.18);
  fillRoundRect(px, size, size, 0, 0, size, size, radius, PAL.surface);
  // soft border
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nearestX = Math.max(radius, Math.min(x, size - radius));
      const nearestY = Math.max(radius, Math.min(y, size - radius));
      if (dist(x, y, nearestX, nearestY) >= radius && dist(x, y, nearestX, nearestY) <= radius + 2) {
        blend(px, size, x, y, PAL.line, 0.8);
      }
    }
  const cx = size / 2;
  const cy = size * 0.52;
  drawPaw(px, size, size, cx, cy, size * 0.16, PAL.sage500, 0.16);
  drawPaw(px, size, size, cx, cy, size * 0.16, PAL.sage500, 0);
  fillCircle(px, size, size, cx, cy, size * 0.16, PAL.sage500, 0.16);
  // toes tint
  const toeR = size * 0.083;
  const toeDist = size * 0.148;
  const toes = [[0, -1], [-0.62, -0.2], [0.62, -0.2]];
  for (const [dx, dy] of toes) {
    fillCircle(px, size, size, cx + dx * toeDist, cy + dy * toeDist, toeR, PAL.sage500, 0.16);
  }
  return px;
}
writePng("default-pet-avatar.png", 256, 256, petAvatar(256));

// ---- OG share image 1200x630 ----
function ogImage() {
  const w = 1200, h = 630;
  const px = makeCanvas(w, h, PAL.cream);
  verticalGradient(px, w, h, PAL.cream, PAL.sage200);
  // left panel with sage block + paw
  fillRoundRect(px, w, h, 0, 0, 560, h, 0, PAL.sage600);
  const cx = 280, cy = 315;
  drawPaw(px, w, h, cx, cy, 110, PAL.cream, 1);
  // text block simulated with rounded bars
  fillRoundRect(px, w, h, 640, 200, 460, 40, 8, PAL.ink);
  fillRoundRect(px, w, h, 640, 262, 380, 22, 8, PAL.inkMuted);
  fillRoundRect(px, w, h, 640, 300, 320, 22, 8, PAL.inkMuted);
  fillRoundRect(px, w, h, 640, 356, 240, 40, 10, PAL.accent);
  return px;
}
writePng("og-image.png", 1200, 630, ogImage());

// ---- empty illustration (400x280): open card + paw ----
function emptyIllustration() {
  const w = 400, h = 280;
  const px = makeCanvas(w, h, PAL.cream);
  fillRoundRect(px, w, h, 60, 80, 280, 130, 24, PAL.surface);
  fillRoundRect(px, w, h, 92, 96, 90, 12, 6, PAL.sage200);
  fillRoundRect(px, w, h, 92, 122, 140, 10, 5, PAL.line);
  fillRoundRect(px, w, h, 92, 144, 110, 10, 5, PAL.line);
  fillRoundRect(px, w, h, 92, 166, 60, 10, 5, PAL.line);
  const cx = 320, cy = 196;
  drawPaw(px, w, h, cx, cy, 40, PAL.sage500, 0.25);
  return px;
}
writePng("illustrations/empty.png", 400, 280, emptyIllustration());

// ---- error illustration (400x280): triangle + paw ----
function errorIllustration() {
  const w = 400, h = 280;
  const px = makeCanvas(w, h, PAL.cream);
  // warning triangle
  const apex = [200, 60];
  const base = 170;
  for (let y = 60; y < 60 + 140; y++) {
    const t = (y - 60) / 140;
    const half = base * (1 - t) * 0.5 + 6;
    for (let x = Math.round(apex[0] - half); x <= Math.round(apex[0] + half); x++) {
      blend(px, w, x, y, PAL.accent, 1);
    }
  }
  fillRoundRect(px, w, h, 192, 96, 16, 50, 4, PAL.cream);
  fillRoundRect(px, w, h, 192, 160, 16, 16, 4, PAL.cream);
  const cx = 300, cy = 216;
  drawPaw(px, w, h, cx, cy, 34, PAL.sage500, 0.25);
  return px;
}
writePng("illustrations/error.png", 400, 280, errorIllustration());

console.log("asset generation complete");