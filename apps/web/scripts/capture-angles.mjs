// capture-angles.mjs — R2-P3D evidence: Life View stage BEFORE drag (angle A)
// and AFTER drag (angle B), same page, real gesture, saved as core evidence.
// Uses page-level clip screenshots because the 3D canvas repaints every frame.
// Run with: node capture-angles.mjs <webBaseUrl> <petId> <outDir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const petId = process.argv[3];
const outDir = resolve(process.argv[4] ?? "artifacts/r2p3d/core");
if (!petId) {
  console.error("usage: node capture-angles.mjs <base> <petId> [outDir]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const API_BASE = process.env.PLI_E2E_API ?? "http://localhost:8800/api/v1";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Dev login (same pattern as tests/e2e-browser/specs/helpers.ts).
const login = await fetch(`${API_BASE}/auth/dev/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@pli.demo" }),
});
const uid = (await login.json()).user_id;
await page.addInitScript((id) => window.localStorage.setItem("pli_dev_user_id", id), uid);
await page.addInitScript((id) => window.localStorage.setItem("pli_current_pet", id), petId);

await page.goto(base + `/pets/${petId}/life-view`, { waitUntil: "load" });
const stage = page.locator('[data-testid="pet3d-stage"]').first();
await stage.waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(1800); // let the 3D scene settle

const box = await stage.boundingBox();
if (!box) throw new Error("stage has no box");
const clip = { x: box.x, y: box.y, width: Math.round(box.width), height: Math.round(box.height) };
const shot = (file) => page.screenshot({ path: resolve(outDir, file), clip, animations: "allow" });

await shot("04_life_view_angle_A.png");
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.5 + 220, box.y + box.height * 0.5 + 60, { steps: 16 });
await page.mouse.up();
await page.waitForTimeout(500);
await shot("05_life_view_angle_B.png");

const yaw = await stage.getAttribute("data-orientation");
console.log(`angles written to ${outDir}; yaw after drag=${yaw}`);
await browser.close();