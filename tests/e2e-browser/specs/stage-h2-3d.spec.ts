import { expect, test } from "@playwright/test";
import { expectNoFatalState, loginAsEmail, urlRe } from "./helpers";

/**
 * Stage H.2 E2E — Pet Living Model / 3D Life View / Capture / Timeline×3D
 * (GOAL O4 scenarios 2,4,9,10,11,13,17,18 — the subset runnable locally
 *  without a real 3D provider).
 *
 * Honesty rules verified: provider blocked state, GENERATED_3D ≠ LIVE,
 * real-photos fallback, no fake success, no "数字孪生" copy.
 * Runs against seeded dev env (owner@pli.demo) — no real participants.
 */

/** Resolve the seeded demo pet id (coco) via the pets API. */
async function demoPetId(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const id = await request.post("http://localhost:8800/api/v1/auth/dev/login", {
    data: { email: "owner@pli.demo" },
  });
  const body = (await id.json()) as { user_id: string };
  const r = await request.get("http://localhost:8800/api/v1/pets", {
    headers: { "X-Dev-User-Id": body.user_id },
  });
  const pets = (await r.json()) as Array<{ id: string; name: string }>;
  const coco = pets.find((p) => p.name === "Coco");
  expect(coco, "seeded Coco pet should exist").toBeTruthy();
  return coco!.id;
}

test.describe("Stage H.2 — Pet Living Model / 3D", () => {
  test("life-view renders honest blocked state (no fatal, no fake success)", async ({
    page,
    request,
  }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/life-view`);
    await expect(page).toHaveURL(urlRe(`/pets/${petId}/life-view`));
    await expectNoFatalState(page);
    await expect(page.getByText(/3D 生成服务暂未开放/).first()).toBeVisible();
    await expect(page.getByText(/不会伪装生成成功/).first()).toBeVisible();
    // user-facing copy must NOT contain 数字孪生
    expect(await page.textContent("main")).not.toContain("数字孪生");
  });

  test("life-view shows real-photos fallback and profile/timeline actions", async ({
    page,
    request,
  }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/life-view`);
    await expect(page.getByText("真实照片").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "宠物档案" })).toBeVisible();
    await expect(page.getByRole("link", { name: "查看时间线" })).toBeVisible();
  });

  test("capture wizard renders 6-angle guide + privacy checks", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/capture`);
    await expect(page).toHaveURL(urlRe(`/pets/${petId}/capture`));
    await expectNoFatalState(page);
    for (const label of ["正面", "左侧", "右侧", "背部", "站立全身", "清晰头部"]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    await expect(page.getByText(/避免出现人脸\/车牌\/地址/).first()).toBeVisible();
  });

  test("timeline back-to-that-day filter renders (no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/timeline");
    await expect(page).toHaveURL(urlRe("/timeline"));
    await expect(page.getByLabel("回到那一天")).toBeVisible();
    await page.getByLabel("回到那一天").fill("2026-01-01");
    await expect(page.getByText("回到那一天 · 2026-01-01").first()).toBeVisible();
    await expect(page.getByText(/不会用当前 3D 形象伪装过去/).first()).toBeVisible();
    await page.getByLabel("清除日期").click();
    await expect(page.getByText("回到那一天 · 2026-01-01")).toHaveCount(0);
  });

  test("companion declares GENERATED_3D is not LIVE (no fake video)", async ({
    page,
    request,
  }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/companion");
    await expect(page).toHaveURL(urlRe("/companion"));
    await expect(page.getByText(/硬件集成未激活/).first()).toBeVisible();
    await expect(page.getByText(/GENERATED_3D \/ 原型/).first()).toBeVisible();
    await expect(page.getByText(/不是实时画面（LIVE）/).first()).toBeVisible();
  });
  test("today living canvas shows pet life-view entry (no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/");
    await expect(page).toHaveURL(urlRe("/"));
    await expect(page.getByRole("button", { name: "打开生命视图" }).first()).toBeVisible();
    await expect(page.getByText("现在").first()).toBeVisible();
    await expect(page.getByText("变化").first()).toBeVisible();
  });
});
