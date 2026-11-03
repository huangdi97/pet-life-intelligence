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
    // Seeded CI pets use demo/template Twins. Accessibility copy must disclose
    // that truth too; screen-reader users must not hear a real-pet identity claim.
    await expect(stage).toHaveAttribute("aria-label", /示例 3D 形象|演示模板|演示/);
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
  // Canonical copy has three honest states: an explicitly labelled demo Twin,
  // an owner-confirmed real candidate, or the graceful simplified fallback.
  // None may masquerade as LIVE or leak raw internal terms.
  await expect(
    page.getByTestId("pli.lifeview.model-status"),
  ).toBeVisible();
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

test("R2P3D-R1-01 individual twin renders and pose switching changes pixels", async ({ page }) => {
  const htmlPath = resolve(__dirname, "../../../apps/mobile/assets/3d/pet-stage.html");
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__PLI_IDENTITY = "doudou";
    w.__PLI_INTERACTIVE = false;
    w.__PLI_TWIN = {
      family: "corgi-like",
      morph: { body_length: 1.5, leg_length_front: 0.52, tail_curve: 0.35, overall_scale: 1.0 },
      texture: {
        observed: { coat: "#E8C79A", cream: "#FBF6EB", ear: "#C08A4E" },
        inferred: { tail: "#D9A968", paw: "#F2D9AD" },
      },
      version: 1,
      provenance: "DEMO_SYNTHETIC",
    };
  });
  await page.goto(`file://${htmlPath}`);
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeAttached();
  await page.waitForTimeout(1800);

  const shot = async () => await canvas.screenshot();
  const idle = await shot();
  expect(idle.length, "the individual twin must be painted").toBeGreaterThan(15000);

  // Sit is a substantially different joint pose from Idle — pixels must change.
  await page.evaluate(() => (window as unknown as Record<string, unknown>).__PLI_SET_POSE?.("Sit"));
  await page.waitForTimeout(700);
  const sit = await shot();
  expect(sit.equals(idle), "Sit pose must change rendered pixels (real joint animation)").toBe(false);

  // Walk is a gait cycle — differs from Sit.
  await page.evaluate(() => (window as unknown as Record<string, unknown>).__PLI_SET_POSE?.("Walk"));
  await page.waitForTimeout(700);
  const walk = await shot();
  expect(walk.equals(sit), "Walk pose must differ from Sit").toBe(false);
});

test("R7 viewport layout: Life View fits phone and Review controls precede the 3D stage", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);

  // Geometry checks use actual browser DOM bounds, not CSS-string assertions
  // or a vision model. A stage partially off the phone is an owner-facing bug.
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/pets/${petId}/life-view`);
    const life = page.getByTestId("pli.lifeview.stage");
    await expect(life).toBeVisible();
    const lifeBounds = await life.boundingBox();
    expect(lifeBounds, "life stage bounds exist").not.toBeNull();
    expect(lifeBounds!.x, "life view left edge is on-screen").toBeGreaterThanOrEqual(-1);
    expect(lifeBounds!.x + lifeBounds!.width, "life stage fits the phone").toBeLessThanOrEqual(width + 1);

    await page.goto(`/pets/${petId}/twin/review?version=1`);
    const stage = page.getByTestId("pli.twinreview.stage");
    await expect(stage).toBeVisible();
    const stageBounds = await stage.boundingBox();
    expect(stageBounds).not.toBeNull();
    for (const angle of ["front", "side", "back"]) {
      const button = page.getByTestId(`pli.twinreview.view.${angle}`);
      await expect(button).toBeVisible();
      const bounds = await button.boundingBox();
      expect(bounds, `${angle} has measured bounds`).not.toBeNull();
      expect(bounds!.y + bounds!.height, `${angle} control before model`).toBeLessThan(stageBounds!.y + 1);
      expect(bounds!.x, `${angle} left edge on screen`).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width, `${angle} right edge on screen`).toBeLessThanOrEqual(width + 1);
      expect(bounds!.height, `${angle} tap target`).toBeGreaterThanOrEqual(44);
    }
  }
});


test("R7 Timeline keeps the life stream near the first phone viewport, with optional filters", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/timeline");
  await page.waitForLoadState("networkidle");

  const refine = page.locator(".v7-timeline-refine");
  await expect(refine).toBeVisible();
  await expect(page.locator(".v7-timeline-search input")).toBeVisible();
  await expect(page.locator('[data-testid="pli.timeline.filter.all"]')).toBeVisible();
  await expect(refine.locator(".v5-timeline-primary-tools")).toBeHidden();

  const stream = page.getByTestId("pli.timeline.stream");
  await expect(stream).toBeVisible();
  const streamBox = await stream.boundingBox();
  expect(streamBox, "real event stream must have bounds").not.toBeNull();
  expect(streamBox!.y, "the life stream should not be hidden under a filter form").toBeLessThan(620);

  await refine.locator("summary").click();
  await expect(refine.locator(".v5-timeline-primary-tools")).toBeVisible();
  await expect(refine.getByLabel("回到那一天")).toBeVisible();
  await expect(refine.getByLabel("按事件类型过滤")).toBeVisible();
  await expect(refine.getByRole("group", { name: "按来源筛选" })).toBeVisible();
});


test("R7 Companion is a real pet Living Canvas on the owner phone", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/companion");

  const canvas = page.getByTestId("pli.companion.living-stage");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds, "Companion Living Canvas has real geometry").not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);

  const stage = page.locator('[data-testid="pet3d-stage"]').first();
  await expect(stage).toHaveAttribute("data-pet3d", "ready", { timeout: 15000 });
  await page.waitForFunction(
    ({ expectedPetId }) => {
      const manifest = (window as typeof window & { __PLI_3D_MANIFEST__?: Record<string, any> }).__PLI_3D_MANIFEST__;
      return (
        manifest?.ready === true &&
        manifest?.manifestOrigin === "RUNTIME" &&
        manifest?.representation === "rigged-glb-twin" &&
        manifest?.technicalRepresentationQuality === "RIGGED_PBR_SKINNED" &&
        manifest?.visualFidelityTier === "STYLIZED_REFERENCE" &&
        manifest?.individualIdentityEvidence === false &&
        manifest?.petId === expectedPetId &&
        manifest?.stageRole === "companion" &&
        manifest?.generic !== true &&
        manifest?.fallbackUsed !== true
      );
    },
    { expectedPetId: petId },
  );
  await expect(page.getByRole("link", { name: "看看它" })).toBeVisible();
  await expect(page.getByText(/尚未连接设备|个设备在线|设备状态暂时/).first()).toBeVisible();
  await expectNoFatalState(page);
});
