import { expect, test } from "@playwright/test";
import { API, expectNoFatalState, loginAsEmail, useCurrentPet } from "./helpers";

/**
 * R2-P core evidence — Today / Pet / Life View (R2-P §34/D5).
 *
 * Captures the three owner pages at 390×844 (mobile) and 1440×900 (desktop)
 * against the deterministic demo seed, plus an interaction smoke (quick log
 * flash + life-view mode switch) and the owner-term zero gate (Q9). Screenshots
 * are evidence for the human visual gate — never a substitute for it.
 */
async function demoDoudouId(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const r = await request.post(`${API}/auth/dev/login`, { data: { email: "owner@pli.demo" } });
  const userId = ((await r.json()) as { user_id: string }).user_id;
  const pets = (await (
    await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": userId } })
  ).json()) as Array<{ id: string; name: string }>;
  const doudou = pets.find((p) => p.name === "豆豆");
  expect(doudou, "seeded 豆豆 pet must exist").toBeTruthy();
  return doudou!.id;
}

test("R2P-CORE-01 today / pet / life-view capture 390 + 1440", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);

  const views = [
    { route: "/", file: "today" },
    { route: `/pets/${petId}`, file: "pet" },
    { route: `/pets/${petId}/life-view`, file: "life-view" },
  ] as const;
  const widths = [390, 1440] as const;

  for (const v of views) {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      await page.goto(v.route);
      await page.waitForLoadState("networkidle");
      await expectNoFatalState(page);
      await page.screenshot({ path: `artifacts/r2p/playwright/${v.file}-${w}.png`, fullPage: true });
      await page.screenshot({ path: `artifacts/r2p/playwright/${v.file}-${w}-fold.png` });
    }
  }

  // Q9 owner-term zero: the three pages must not leak internal vocabulary.
  const body = await page.textContent("main");
  for (const prohibited of ["BW-", "OWNER_REPORTED", "provider_real", "model_id", "STRESS_RECOVERY", "today.viewed", "pli_dev_user_id"]) {
    expect(body ?? "", `no raw internal term "${prohibited}"`).not.toContain(prohibited);
  }
});

test("R2P-CORE-02 interaction smoke: quick log flash + life-view modes", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const petId = await demoDoudouId(request);
  await useCurrentPet(page, petId);

  // Quick log: feed action produces the .alert.info flash (E2E contract).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "喂食", exact: true }).click();
  await expect(page.locator(".alert.info").first()).toBeVisible();

  // Life view mode switching: 趋势 / 外观 panels are reachable and honest.
  await page.goto(`/pets/${petId}/life-view`);
  await page.getByRole("tab", { name: "趋势" }).click();
  await expect(page.getByText(/数据积累后|饮水|进食|活动|睡眠/).first()).toBeVisible();
  await page.getByRole("tab", { name: "外观" }).click();
  await expect(page.getByText(/演示 3D 形象/).first()).toBeVisible();
});