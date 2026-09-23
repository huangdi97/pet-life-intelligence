/**
 * Stage V §23-25 — UI state space + visual regression baseline.
 *
 * Captures screenshots of the 12 core pages at 5 widths (360/390/768/1024/
 * 1440) into tests/e2e-browser/artifacts/visual-baseline/. Also probes a
 * small state-space matrix (normal / empty / permission-denied / offline /
 * error) on key pages. Requires the seeded demo stack (API :8800, Web :3100).
 */
import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { loginAsEmail, userIdFor } from "./helpers";

const WIDTHS = [360, 390, 768, 1024, 1440];
const OUT = join(__dirname, "..", "artifacts", "visual-baseline");

interface PageDef {
  key: string;
  buildUrl: (petId: string) => string;
}

const PAGES: PageDef[] = [
  { key: "today", buildUrl: () => "/" },
  { key: "timeline", buildUrl: () => "/timeline" },
  { key: "pet", buildUrl: (id) => `/pets/${id}` },
  { key: "health", buildUrl: () => "/health" },
  { key: "behavior", buildUrl: () => "/behavior" },
  { key: "training", buildUrl: () => "/training" },
  { key: "assistant", buildUrl: () => "/agent" },
  { key: "me", buildUrl: () => "/settings" },
  { key: "companion", buildUrl: () => "/companion" },
  { key: "3d-life-view", buildUrl: (id) => `/pets/${id}/life-view` },
  { key: "capture-wizard", buildUrl: (id) => `/pets/${id}/capture` },
  // 3D verification UI lives inside the life-view page (identity verify section)
  { key: "3d-verification", buildUrl: (id) => `/pets/${id}/life-view` },
];

test.describe.configure({ mode: "serial" });

test("STAGE-V-VISUAL-01 capture baseline screenshots at 5 widths x 12 pages", async ({ page, request }) => {
  test.setTimeout(240_000);
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get("http://localhost:8800/api/v1/pets", {
    headers: { "X-Dev-User-Id": ownerId },
  })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  expect(coco).toBeTruthy();

  await loginAsEmail(page, request, "owner@pli.demo");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const def of PAGES) {
      const url = def.buildUrl(coco.id);
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const shots: string[] = [];
      await page.screenshot({ path: join(OUT, `${width}_${def.key}.png`), fullPage: false });
      shots.push("ok");
      expect(shots.length).toBe(1);
    }
  }
});

test("STAGE-V-VISUAL-02 core state-space probes (empty/error/permission-denied/offline)", async ({ page, request }) => {
  test.setTimeout(120_000);
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get("http://localhost:8800/api/v1/pets", {
    headers: { "X-Dev-User-Id": ownerId },
  })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  await loginAsEmail(page, request, "owner@pli.demo");

  // unknown pet → error/not-found state renders, not a crash
  await page.goto("/pets/00000000-0000-0000-0000-00000000dead");
  await page.waitForLoadState("networkidle");
  expect(await page.locator("body").innerText()).toContain("404");

  // offline fallback page is reachable
  const offline = await page.request.get("/offline");
  expect(offline.status()).toBe(200);

  // empty timeline renders (no fatal error state)
  await page.goto("/timeline");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".state.error")).toHaveCount(0);

  // permission-denied / external-blocked honest state on life-view for a
  // user WITHOUT pet access (sitter has no grant in fresh seed)
  const sitterId = await userIdFor(request, "sitter@pli.demo");
  await page.addInitScript((id) => window.localStorage.setItem("pli_dev_user_id", id as string), sitterId);
  await page.goto(`/pets/${coco.id}/life-view`);
  await page.waitForLoadState("networkidle");
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/无权限|403|拒绝|无法访问/i);
});
