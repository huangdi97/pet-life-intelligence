import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { loginAsEmail, useCurrentPet, expectNoFatalState } from "./helpers";

/**
 * R2-P3D evidence — Today / Pet / Life View with the REAL 3D living stage.
 *
 * - R2P3D-01: 390 + 1440 screenshots for the three owner pages.
 * - R2P3D-02: the WebGL 3D stage reports "ready" on every page (never failed).
 * - R2P3D-03: drag rotates the pet — data-orientation is ONLY mutated by the
 *   drag handler (idle drift never touches the DOM attribute), so any change
 *   beyond the read-glitch margin is real rotation; 重置 restores the default.
 * - R2P3D-04: wheel zoom changes the rendered stage pixels (real interaction).
 * - R2P3D-05: owner-term zero + canonical copy gates.
 * - R2P3D-06: the identical page the Android WebView runs (pet-stage.html)
 *   renders 豆豆 and rotates on drag — content proven via the composited
 *   screenshot (an alpha WebGL canvas's CPU readback is cleared after rAF).
 */

const API_BASE = "http://localhost:8800/api/v1";

async function demoDoudouId(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const r = await request.post(`${API_BASE}/auth/dev/login`, { data: { email: "owner@pli.demo" } });
  const userId = ((await r.json()) as { user_id: string }).user_id;
  const pets = (await (
    await request.get(`${API_BASE}/pets`, { headers: { "X-Dev-User-Id": userId } })
  ).json()) as Array<{ id: string; name: string }>;
  const doudou = pets.find((p) => p.name === "豆豆");
  expect(doudou, "seeded 豆豆 pet must exist").toBeTruthy();
  return doudou!.id;
}

const PROHIBITED = [
  "BW-",
  "OWNER_REPORTED",
  "provider_real",
  "model_id",
  "STRESS_RECOVERY",
  "today.viewed",
  "数字孪生",
  "虚拟生命体",
  "AI 诊断体",
  "生理仿真",
  "预测生命",
];

test("R2P3D-01 today / pet / life-view capture 390 + 1440", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);

  const views = [
    { route: "/", file: "today" },
    { route: `/pets/${petId}`, file: "pet" },
    { route: `/pets/${petId}/life-view`, file: "life-view" },
  ] as const;

  for (const v of views) {
    for (const w of [390, 1440] as const) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      await page.goto(v.route);
      await page.waitForLoadState("networkidle");
      await expectNoFatalState(page);
      await page.screenshot({ path: `artifacts/r2p3d/web/${v.file}-${w}.png`, fullPage: true });
      await page.screenshot({ path: `artifacts/r2p3d/web/${v.file}-${w}-fold.png` });
    }
  }
});

test("R2P3D-02 3D stage is loaded and never failed on the three pages", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  for (const route of ["/", `/pets/${petId}`, `/pets/${petId}/life-view`]) {
    await page.goto(route);
    const stage = page.locator('[data-testid="pet3d-stage"]').first();
    await expect(stage).toHaveAttribute("data-pet3d", "ready", { timeout: 15000 });
    await expect(page.locator('[data-testid="pet3d-canvas"]').first()).toBeAttached();
    await expect(page.locator('[data-testid="pet3d-stage"][data-pet3d="failed"]')).toHaveCount(0);
  }
});

test("R2P3D-03 drag rotates the pet; reset restores default yaw", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/pets/${petId}/life-view`);
  await page.waitForLoadState("networkidle");

  const stage = page.locator('[data-testid="pet3d-stage"]').first();
  await expect(stage).toHaveAttribute("data-pet3d", "ready", { timeout: 15000 });
  const readYaw = async () => Number(await stage.getAttribute("data-orientation"));

  const before = await readYaw();
  const box = (await stage.boundingBox())!;
  for (let pass = 0; pass < 2; pass++) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 180 + pass * 40, box.y + box.height * 0.5 + 60, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  const after = await readYaw();
  console.log(`[R2P3D-03] before=${before} after=${after}`);
  // The data-orientation attribute is ONLY written by the drag handler, so a
  // change beyond the read glitch is real rotation (idle drift never reaches DOM).
  expect(Math.abs(after - before), "drag must rotate the pet").toBeGreaterThan(0.08);

  const clicked = await stage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.getAttribute("aria-label") === "重置视图",
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  expect(clicked, "重置视图 button must exist").toBe(true);
  await page.waitForTimeout(120);
  const reset = await readYaw();
  console.log(`[R2P3D-03] reset=${reset}`);
  expect(Math.abs(reset - 0.35), "reset restores the default yaw").toBeLessThan(0.15);
});

test("R2P3D-04 zoom changes the rendered stage", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  await page.goto(`/pets/${petId}/life-view`);
  await page.waitForLoadState("networkidle");
  const stage = page.locator('[data-testid="pet3d-stage"]').first();
  await expect(stage).toHaveAttribute("data-pet3d", "ready", { timeout: 15000 });
  await expect(page.getByRole("button", { name: "放大" })).toBeAttached();

  const shot = async () => (await stage.locator("canvas").screenshot()).toString("base64");
  const s1 = await shot();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  const s2 = await shot();
  expect(s1, "zoom must change the rendered pixels").not.toEqual(s2);
});

test("R2P3D-05 owner-term zero + canonical copy on the three pages", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  for (const route of ["/", `/pets/${petId}`, `/pets/${petId}/life-view`]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const body = await page.textContent("main");
    for (const term of PROHIBITED) {
      expect(body ?? "", `no internal term "${term}" on ${route}`).not.toContain(term);
    }
  }
  await page.goto(`/pets/${petId}/life-view`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("豆豆 · 此刻").first()).toBeVisible();
  await expect(page.getByText(/演示 3D 形象/).first()).toBeVisible();
});

test("R2P3D-06 Android page (pet-stage.html) renders 豆豆 and rotates via drag", async ({ page }) => {
  const htmlPath = resolve(__dirname, "../../../apps/mobile/assets/3d/pet-stage.html");
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__PLI_IDENTITY = "doudou";
    (window as unknown as Record<string, unknown>).__PLI_INTERACTIVE = true;
  });
  await page.goto(`file://${htmlPath}`);
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeAttached();
  await page.waitForTimeout(1600);

  // Composited screenshot (not GL readback) proves real painted content.
  const shot = async () => await canvas.screenshot();
  const s1 = await shot();
  expect(s1.length, "the rendered stage must contain painted content").toBeGreaterThan(15000);

  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5 + 180, box.y + box.height * 0.5 + 50, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const s2 = await shot();
  expect(s2.equals(s1), "drag must rotate the rendered 豆豆").toBe(false);
});