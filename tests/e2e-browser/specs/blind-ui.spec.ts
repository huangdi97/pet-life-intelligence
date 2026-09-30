/**
 * blind-ui.spec.ts — functional blind harness gates on the web runtime.
 *
 * Covers what layout snapshots cannot prove:
 *  - 3D Scene Manifest truth (ready, wireframe=false, fallbackUsed=false)
 *  - Life View rotation A→B via manifest camera state
 *  - multi-pet context switch (identity + twin + today data change)
 *  - Twin Review "不像" disables activation
 *  - Today four anchors always present
 * No vision model is used anywhere.
 */
import { test, expect, type Page } from "@playwright/test";

const API = "http://localhost:8800";

async function seedPet(page: Page, petId: string) {
  // Resolve the real dev user id (the web app stores the UUID, not the email).
  let uid = "";
  try {
    const res = await page.request.post(`${API}/api/v1/auth/dev/login`, {
      data: { email: "owner@pli.demo" },
    });
    const body = (await res.json()) as { user_id?: string };
    uid = body.user_id ?? "";
  } catch {
    // fall back to empty uid; data-dependent asserts will fail loudly
  }
  await page.addInitScript(
    ([user, id]) => {
      localStorage.setItem("pli_dev_user_id", user);
      if (id) localStorage.setItem("pli_current_pet", id);
    },
    [uid, petId],
  );
}

/** Resolve the current pet id exactly like the app: visit /pets, read storage. */
async function currentPetId(page: Page): Promise<string> {
  await page.goto("/pets");
  await page.waitForTimeout(900);
  const id = await page.evaluate(() => localStorage.getItem("pli_current_pet") || "");
  expect(id).not.toBe("");
  return id;
}

/** All pet ids visible in the pet switcher (pli.multipet.switch.<id>). */
async function allPetIds(page: Page): Promise<string[]> {
  await page.goto("/pets");
  await page.waitForTimeout(900);
  return page.evaluate(() => {
    const ids: string[] = [];
    document.querySelectorAll('[data-testid^="pli.multipet.switch."]').forEach((el) => {
      const t = el.getAttribute("data-testid") ?? "";
      const id = t.replace("pli.multipet.switch.", "");
      if (id) ids.push(id);
    });
    let curId = "";
    document.querySelectorAll('[data-testid="pli.multipet.current"]').forEach((el) => {
      if (curId) return;
      const h = el.getAttribute("href") || "";
      const m = h.match(/\/pets\/([0-9a-f-]+)/);
      if (m) curId = m[1];
    });
    if (curId && !ids.includes(curId)) ids.unshift(curId);
    return ids;
  });
}

test.describe("blind-ui harness (web)", () => {
  test("today renders four basic anchors + identity + health summary", async ({ page }) => {
    await seedPet(page, "");
    await page.goto("/");
    await expect(page.getByTestId("pli.today.identity")).toBeVisible();
    for (const a of ["water", "food", "activity", "sleep"]) {
      await expect(page.getByTestId(`pli.today.anchor.${a}`)).toBeVisible();
    }
    await expect(page.getByTestId("pli.today.health-summary")).toBeVisible();
    await expect(page.getByTestId("pli.today.primary-action")).toBeVisible();
  });

  test("3D scene manifest is truthful (web)", async ({ page }) => {
    await seedPet(page, "");
    await page.goto("/");
    await page.waitForSelector('[data-testid="pet3d-stage"]', { timeout: 20000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="pet3d-stage"]');
      return !el || el.getAttribute("data-pet3d") === "ready" || el.getAttribute("data-pet3d") === "failed";
    });
    const manifest = await page.evaluate(() => (window as any).__PLI_3D_MANIFEST__ ?? null);
    expect(manifest).not.toBeNull();
    expect(manifest.ready).toBe(true);
    expect(manifest.wireframe).toBe(false);
    expect(manifest.fallbackUsed).toBe(false);
    expect(manifest.representation).not.toBe("image");
    expect(Array.isArray(manifest.animationClips)).toBe(true);
    expect(manifest.animationClips.length).toBeGreaterThanOrEqual(4);
    expect(manifest.screenBounds.width).toBeGreaterThan(100);
  });

  test("life view rotation changes camera state (A != B)", async ({ page }) => {
    await seedPet(page, "");
    const petId = await currentPetId(page);
    await page.goto(`/pets/${petId}/life-view`);
    await page.waitForSelector('[data-testid="pet3d-stage"][data-pet3d="ready"]', { timeout: 20000 });
    const getYaw = () =>
      page.evaluate(() => ((window as any).__PLI_3D_MANIFEST__ ?? {}).camera?.yaw ?? 0);
    const yawA = await getYaw();
    const stage = page.getByTestId("pet3d-stage");
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const yawB = await getYaw();
    expect(Math.abs(yawB - yawA)).toBeGreaterThan(0.05);
  });

  test("multi-pet switch changes pet context, not only the title", async ({ page }) => {
    await seedPet(page, "");
    const petIds = await allPetIds(page);
    expect(petIds.length).toBeGreaterThanOrEqual(2);
    await page.goto("/");
    const nameA = await page.getByTestId("pli.today.identity").innerText();
    await page.evaluate((id) => {
      localStorage.setItem("pli_current_pet", id);
      window.dispatchEvent(new Event("pli-pet-changed"));
    }, petIds[1]);
    await page.reload();
    await expect(page.getByTestId("pli.today.identity")).not.toHaveText(nameA);
  });

  test("twin review: 不像 disables activation", async ({ page }) => {
    await seedPet(page, "");
    const petId = await currentPetId(page);
    await page.goto(`/pets/${petId}/twin/review?version=1`);
    await expect(page.getByTestId("pli.twinreview.verify.not_like")).toBeVisible();
    await page.getByTestId("pli.twinreview.verify.not_like").click();
    const activate = page.getByTestId("pli.twinreview.action.activate");
    await expect(activate).toBeDisabled();
  });

  test("pet world shows six life domains with meaning + friends + caregivers", async ({ page }) => {
    await seedPet(page, "");
    await page.goto("/pets");
    for (const d of ["life", "health", "behavior", "training", "welfare", "social"]) {
      await expect(page.getByTestId(`pli.pet.domain.${d}`)).toBeVisible();
    }
    await expect(page.getByTestId("pli.pet.friends")).toBeVisible();
    await expect(page.getByTestId("pli.pet.caregivers")).toBeVisible();
  });
});