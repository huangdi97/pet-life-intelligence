// capture-web-turntable.mjs — R4.2 web turntable evidence: real camera yaw
// presets (front 0 / front-left 0.35 / side pi/2 / rear pi / front-right -0.35)
// driven through the runtime __PLI_SET_VIEW handler. No vision model.
// Usage: node scripts/r2p3d-r4-2/capture-web-turntable.mjs [--base-url http://localhost:3100]
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const args = process.argv.slice(2);
const baseUrl = (args[args.indexOf("--base-url") + 1]) || "http://localhost:3100";
const outRoot = resolve(root, "artifacts/r2p3d-r4-2/web/turntable");

const VIEWPORT = { width: 390, height: 844 };
const YAWS = [
  ["front", 0],
  ["front-left", 0.35],
  ["side", Math.PI / 2],
  ["rear", Math.PI],
  ["front-right", -0.35],
];

async function capturePet(browser, petPath, petDir) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  // dev login + switch to the target pet
  await page.evaluate(() => {
    localStorage.setItem("pli_dev_user_id", "e3c3b857-1574-481f-b4d9-cc87999d865f");
  });
  await page.goto(petPath, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="pet3d-stage"]', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="pet3d-stage"]');
    return !el || el.getAttribute("data-pet3d") === "ready" || el.getAttribute("data-pet3d") === "failed";
  }).catch(() => {});
  await page.waitForTimeout(4000);
  for (const [name, yaw] of YAWS) {
    await page.evaluate((y) => window.__PLI_SET_VIEW?.(y), yaw).catch(() => {});
    await page.waitForTimeout(1200);
    const shot = resolve(petDir, `${name}.png`);
    await page.screenshot({ path: shot });
    const manifest = await page.evaluate(() => window.__PLI_3D_MANIFEST__ || null).catch(() => null);
    writeFileSync(resolve(petDir, `${name}.json`), JSON.stringify(manifest, null, 2), "utf8");
    console.log(`  captured ${name} yaw=${yaw.toFixed(3)}`);
  }
  await page.close();
}

const browser = await chromium.launch();
const petId = "f122ca7b-bc1c-4ae6-a746-40107a920c6d";
const mimiId = "f4755c3a-2c59-4fcf-a73e-508011d19679";
mkdirSync(resolve(outRoot, "doudou"), { recursive: true });
mkdirSync(resolve(outRoot, "mimi"), { recursive: true });
console.log("doudou turntable");
await capturePet(browser, `${baseUrl}/pets/${petId}/life-view`, resolve(outRoot, "doudou"));
console.log("mimi turntable (switch pet)");
const page = await browser.newPage({ viewport: VIEWPORT });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.evaluate((u) => localStorage.setItem("pli_dev_user_id", u), "e3c3b857-1574-481f-b4d9-cc87999d865f");
// Today has the multipet switch; switch to mimi then life-view
await page.goto(`${baseUrl}/pets/${mimiId}/life-view`, { waitUntil: "domcontentloaded" });
await page.close();
await capturePet(browser, `${baseUrl}/pets/${mimiId}/life-view`, resolve(outRoot, "mimi"));
await browser.close();
console.log("done ->", outRoot);
