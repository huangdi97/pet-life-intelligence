// R5.6 final Web Twin turntables. Real runtime camera presets only; no vision model.
// Usage:
//   node scripts/r5-6/capture-web-turntables-final.mjs //     --primary-pet-id <uuid> --secondary-pet-id <uuid> [--base-url http://localhost:3100]
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const args = process.argv.slice(2);
const pick = (flag, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const baseUrl = pick("--base-url", "http://localhost:3100");
const primaryPetId = pick("--primary-pet-id", process.env.PLI_PRIMARY_PET_ID || "");
const secondaryPetId = pick("--secondary-pet-id", process.env.PLI_SECONDARY_PET_ID || "");
if (!primaryPetId || !secondaryPetId) {
  throw new Error("Both --primary-pet-id and --secondary-pet-id are required; do not guess demo identity.");
}

const outRoot = resolve(root, "artifacts/r5-6-final/turntable");
const viewport = { width: 390, height: 844 };
const views = [
  ["front", 0],
  ["front-left", 0.35],
  ["side", Math.PI / 2],
  ["rear", Math.PI],
  ["front-right", -0.35],
];

async function devUserId() {
  const api = baseUrl.replace(/:\d+$/, ":8800");
  const response = await fetch(`${api}/api/v1/auth/dev/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@pli.demo" }),
  });
  if (!response.ok) throw new Error(`dev login failed: ${response.status}`);
  const body = await response.json();
  if (!body.user_id) throw new Error("dev login returned no user_id");
  return body.user_id;
}

async function capture(browser, userId, petId, folder, requiredViews) {
  const dir = resolve(outRoot, folder);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport, locale: "zh-CN" });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((uid) => localStorage.setItem("pli_dev_user_id", uid), userId);
  await page.goto(`${baseUrl}/pets/${petId}/life-view`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="pet3d-stage"]', { timeout: 20000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="pet3d-stage"]');
    return el?.getAttribute("data-pet3d") === "ready";
  }, { timeout: 20000 });
  await page.waitForTimeout(2500);

  for (const [name, yaw] of views) {
    if (!requiredViews.includes(name)) continue;
    await page.evaluate((value) => window.__PLI_SET_VIEW?.(value), yaw);
    await page.waitForTimeout(1200);
    const manifest = await page.evaluate(() => window.__PLI_3D_MANIFEST__ ?? null);
    if (!manifest || manifest.petId !== petId) {
      throw new Error(`runtime manifest pet mismatch for ${folder}/${name}`);
    }
    if (
      manifest.ready !== true ||
      manifest.manifestOrigin !== "RUNTIME" ||
      manifest.representation !== "high-fidelity-glb-twin" ||
      manifest.fallbackUsed === true
    ) {
      throw new Error(`non-product runtime representation for ${folder}/${name}`);
    }
    const actualYaw = Number(manifest.camera?.yaw);
    if (!Number.isFinite(actualYaw)) {
      throw new Error(`runtime camera yaw missing for ${folder}/${name}`);
    }
    const yawError = Math.abs(Math.atan2(Math.sin(actualYaw - yaw), Math.cos(actualYaw - yaw)));
    if (yawError > 0.08) {
      throw new Error(
        `runtime camera mismatch for ${folder}/${name}: expected=${yaw.toFixed(3)} actual=${actualYaw.toFixed(3)}`,
      );
    }
    writeFileSync(resolve(dir, `${name}.json`), JSON.stringify(manifest, null, 2) + "\n", "utf8");
    await page.screenshot({ path: resolve(dir, `${name}.png`), fullPage: false });
  }
  await page.close();
}

const browser = await chromium.launch();
try {
  const userId = await devUserId();
  await capture(browser, userId, primaryPetId, "primary", ["front", "front-left", "side", "rear", "front-right"]);
  await capture(browser, userId, secondaryPetId, "secondary", ["front", "front-left", "side", "rear"]);
} finally {
  await browser.close();
}
console.log("R5.6 final runtime turntables captured ->", outRoot);
