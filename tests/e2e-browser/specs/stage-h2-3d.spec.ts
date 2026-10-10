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
      page.getByTestId("pli.lifeview.model-status"),
    ).toBeVisible();
    await expect(
      page.getByText(/照片、记录与规则结论始终独立于外观|照片、记录与规则结论仍可独立使用/).first(),
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
    // Date travel is intentionally secondary to the Life Stream. Reveal the
    // advanced filter group before interacting with the real date control.
    await page.locator(".v7-timeline-refine > summary").click();
    await expect(page.getByLabel("回到那一天")).toBeVisible();
    await page.getByLabel("回到那一天").fill("2026-01-01");
    await expect(page.getByText("回到那一天 · 2026-01-01").first()).toBeVisible();
    await expect(page.getByText(/不会用现在的样子冒充过去的它/).first()).toBeVisible();
    await page.getByLabel("清除日期").click();
    await expect(page.getByText("回到那一天 · 2026-01-01")).toHaveCount(0);
  });

  test("pet profile persists a protected owner-selected avatar", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await demoPetId(request);
    await page.goto(`/pets/${petId}/edit`);
    await expectNoFatalState(page);

    const upload = page.waitForResponse(
      (response) =>
        response.url().includes(`/pets/${petId}/artifacts`) &&
        response.request().method() === "POST",
    );
    const select = page.waitForResponse(
      (response) =>
        response.url().includes(`/pets/${petId}/avatar`) &&
        response.request().method() === "PUT",
    );
    await page.getByTestId("pli.pet.profile.avatar-input").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+5Q9QAAAAAElFTkSuQmCC",
        "base64",
      ),
    });
    expect((await upload).ok()).toBeTruthy();
    expect((await select).ok()).toBeTruthy();
    const avatarPanel = page.getByTestId("pli.pet.profile.avatar");
    await expect(avatarPanel).toContainText("当前头像保存在这只宠物的受保护媒体中");
    await expect(avatarPanel.getByRole("img", { name: /的头像$/ })).toBeVisible();
  });

  test("assistant exposes the medical action hard boundary", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/agent");
    await expectNoFatalState(page);
    const boundary = page.getByTestId("pli.assistant.medical-boundary");
    await expect(boundary).toBeVisible();
    await expect(boundary).toContainText("不会诊断");
    await expect(boundary).toContainText("不会");
    await expect(boundary).toContainText(/开药|改剂量/);
    await expect(boundary).toContainText("独立风险分级");
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
  test("Quick Log keeps governed actions truthful and persists owner diary text", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/");
    await expectNoFatalState(page);

    await page.getByTestId("pli.today.primary-action").click();
    await page.getByTestId("pli.quicklog.tile.medication.administered").click();
    await expect(page).toHaveURL(urlRe("/medication"));

    await page.goto("/");
    await page.getByTestId("pli.today.primary-action").click();
    await page.getByTestId("pli.quicklog.tile.behavior.observed").click();
    await expect(page).toHaveURL(urlRe("/behavior"));

    await page.goto("/");
    await page.getByTestId("pli.today.primary-action").click();
    await page.getByTestId("pli.quicklog.tile.diary.created").click();
    const diary = page.getByTestId("pli.quicklog.text-input");
    const save = page.getByTestId("pli.quicklog.text-save");
    await expect(save).toBeDisabled();
    await diary.fill("今天傍晚主动靠近门口等待散步。");
    await expect(save).toBeEnabled();
    const saved = page.waitForResponse(
      (response) => response.url().includes("/diary") && response.request().method() === "POST",
    );
    await save.click();
    expect((await saved).ok()).toBeTruthy();
    await expect(page.getByText("已记录：备注")).toBeVisible();
  });

  test("Quick Log binds uploaded media evidence to the created life event", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/");
    await expectNoFatalState(page);

    await page.getByTestId("pli.today.primary-action").click();
    await page.getByTestId("pli.quicklog.media-input").setInputFiles({
      name: "meal-evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+5Q9QAAAAAElFTkSuQmCC",
        "base64",
      ),
    });
    await expect(page.getByTestId("pli.quicklog.media")).toContainText("已选择 1 个文件");

    // Selecting a record type opens an owner-confirmation form. It must not
    // silently submit the old 100g/"狗粮" demo defaults.
    await page.getByTestId("pli.quicklog.tile.feed").click();
    await expect(page.getByTestId("pli.quicklog.field.amount")).toHaveValue("");
    await expect(page.getByTestId("pli.quicklog.field.food_type")).toHaveValue("");

    const upload = page.waitForResponse(
      (response) => response.url().includes("/artifacts") && response.request().method() === "POST",
    );
    const createEvent = page.waitForResponse(
      (response) =>
        response.url().includes("/events") &&
        response.request().method() === "POST",
    );
    await page.getByTestId("pli.quicklog.text-save").click();
    expect((await upload).ok()).toBeTruthy();
    const eventResponse = await createEvent;
    expect(eventResponse.ok()).toBeTruthy();
    const eventBody = (await eventResponse.json()) as {
      artifact_ids?: string[];
      payload?: Record<string, unknown>;
    };
    expect(eventBody.artifact_ids).toHaveLength(1);
    expect(eventBody.payload?.food_type ?? "").not.toBe("狗粮");
    expect(eventBody.payload?.amount ?? "").not.toBe("100");
    await expect(page.getByText(/已记录：喂食 · 已绑定 1 个媒体/)).toBeVisible();
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
