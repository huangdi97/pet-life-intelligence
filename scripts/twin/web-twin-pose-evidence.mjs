// web-twin-pose-evidence.mjs — capture real 3D twin + pose evidence via Playwright.
//
// Serves the exact mobile pet-stage page (apps/mobile/assets/3d/pet-stage.html)
// in real Chromium WebGL, injects a DEMO_SYNTHETIC individual twin descriptor
// (family/morph/texture from the backend pipeline), switches through the 12
// canonical poses, and screenshots each. This is the honest 3D runtime evidence
// path: the Android emulator on this host cannot initialize WebGL (guest
// renderer crashes / unavailable), and the app gracefully falls back to 2.5D —
// see docs/r2p3d-r1/PET_TWIN_ANDROID_ACCEPTANCE.md.
//
// Output: artifacts/r2p3d-r1/web/poses/ + contact sheet inputs.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, "..", "..");
const pageHtml = readFileSync(join(repo, "apps", "mobile", "assets", "3d", "pet-stage.html"), "utf-8");
const outDir = join(repo, "artifacts", "r2p3d-r1", "web", "poses");
const { mkdirSync, writeFileSync } = await import("node:fs");
mkdirSync(outDir, { recursive: true });

const twinDescriptor = {
  family: "corgi-like",
  morph: { body_length: 1.5, leg_length_front: 0.52, tail_curve: 0.35, overall_scale: 1.0 },
  texture: {
    observed: { coat: "#E8C79A", cream: "#FBF6EB", ear: "#C08A4E" },
    inferred: { tail: "#D9A968", paw: "#F2D9AD" },
  },
  version: 1,
  provenance: "DEMO_SYNTHETIC",
};

const poses = ["Idle", "Stand", "Sit", "Lie", "Sleep", "Walk", "Run", "Eat", "Drink", "Play", "Sniff", "Stretch"];

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(pageHtml);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log(`serving pet-stage.html on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  executablePath: "C:\\Users\\Kaiser\\AppData\\Local\\ms-playwright\\chromium-1246\\chrome-win64\\chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
await page.addInitScript(
  ({ twin }) => {
    window.__PLI_IDENTITY = "doudou";
    window.__PLI_INTERACTIVE = false;
    window.__PLI_TWIN = twin;
  },
  { twin: twinDescriptor },
);
await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "load" });
await page.waitForSelector("canvas");
await page.waitForTimeout(1800);
async function shot(name) {
  await page.screenshot({ path: join(outDir, `${name}.png`), omitBackground: true });
  console.log(`shot ${name}`);
}

for (const pose of poses) {
  await page.evaluate((p) => window.__PLI_SET_POSE(p), pose);
  await page.waitForTimeout(900);
  await shot(`pose_${pose}`);
}

// Also capture the twin review-style framing (front/side/back via orbit).
await page.evaluate(() => window.resetView());
await page.waitForTimeout(500);
await shot("twin_front");
await page.evaluate(() => window.__PLI_SET_POSE("Stand"));
await page.waitForTimeout(500);
await shot("twin_stand_front");

await browser.close();
server.close();
console.log("DONE");