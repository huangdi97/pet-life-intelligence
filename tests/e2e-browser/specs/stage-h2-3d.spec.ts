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
  const coco = pets.find((p) => p.name === "豆豆");
  expect(coco, "seeded 豆豆 pet should exist").toBeTruthy();
  return coco!.id;
}

test.describe("Stage H.2 — Pet Living Model / 3D", () => {
  test("life-view renders honest individual-twin state (no fatal, no fake LIVE)", async ({
    page,
    request,
  }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/life-view`);
    await expect(page).toHaveURL(urlRe(`/pets/${petId}/life-view`));
    await expectNoFatalState(page);
    // Honest states are: the explicitly disclosed seeded demo Twin,
    // an owner-confirmed real candidate, or the simplified fallback. None may
    // masquerade as LIVE or leak raw internal/provider terminology.
    await expect(
      page.getByText(/示例 3D 形象|演示 3D 形象|第 \d+ 版 3D 形象|简化形象/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/不把示例模板当作真实宠物身份|已通过你的确认|连接照片后|连接真实服务后/).first(),
    ).toBeVisible();
    await page.getByRole("tab", { name: "外观" }).click();
    await expect(
      page.getByText(/不代表真实宠物扫描|已通过你的确认|经过你确认后/).first(),
    ).toBeVisible();
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

  test("Twin Review selected angle matches the real runtime camera", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/twin/review`);
    await expectNoFatalState(page);

    const waitForYaw = async (expected: number) => {
      await page.waitForFunction(
        (target) => {
          const m = (window as any).__PLI_3D_MANIFEST__;
          const yaw = Number(m?.camera?.yaw);
          if (
            !m ||
            m.representation !== "high-fidelity-glb-twin" ||
            m.stageRole !== "review" ||
            m.pose !== "Stand" ||
            m.canonicalPose !== "Stand" ||
            m.poseSource !== "AMBIENT" ||
            !Number.isFinite(yaw)
          ) {
            return false;
          }
          return Math.abs(Math.atan2(Math.sin(yaw - target), Math.cos(yaw - target))) <= 0.08;
        },
        expected,
        { timeout: 15_000 },
      );
    };

    // The initial selected chip is 正面; async GLB fitting must not silently
    // restore the generic 3/4 yaw after React already selected front.
    await expect(page.getByTestId("pli.twinreview.view.front")).toHaveAttribute("aria-pressed", "true");
    await waitForYaw(0);

    await page.getByTestId("pli.twinreview.view.side").click();
    await waitForYaw(Math.PI / 2);
    await page.getByTestId("pli.twinreview.view.back").click();
    await waitForYaw(Math.PI);
    await page.getByTestId("pli.twinreview.view.front").click();
    await waitForYaw(0);
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
    await expect(page.getByText(/不会用现在的样子冒充过去的它/).first()).toBeVisible();
    await page.getByLabel("清除日期").click();
    await expect(page.getByText("回到那一天 · 2026-01-01")).toHaveCount(0);
  });

  test("companion keeps device state honest (no fake LIVE / no fake online)", async ({
    page,
    request,
  }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/companion");
    await expect(page).toHaveURL(urlRe("/companion"));
    await expect(page.getByText("尚未连接设备").first()).toBeVisible();
    await expect(
      page.getByText(/没有设备时不会模拟在线|没有可确认的实时来源时不会显示成实时画面/).first(),
    ).toBeVisible();
    const main = (await page.textContent("main")) ?? "";
    expect(main).not.toContain("LIVE");
    expect(main).not.toContain("GENERATED_3D");
  });
  test("today living canvas shows pet life-view entry (no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/");
    await expect(page).toHaveURL(urlRe("/"));
    await expect(page.getByRole("link", { name: /打开 .* 的生命视图/ }).first()).toBeVisible();
    await expect(page.getByText("此刻").first()).toBeVisible();
    await expect(page.getByText("变化").first()).toBeVisible();
  });
});
