import { patchGoto, test, expect, urlRe, urlReTail } from "./fixtures";
import {
  API, createPetViaUI, expectNoFatalState, loginAsEmail, useCurrentPet, userIdFor,
} from "./helpers";

const stamp = Date.now();

test("E2E-01 创建宠物 → Quick Log → Timeline（刷新后仍存在，后端真实落库）", async ({ page, request }) => {
  // 1. login through the real UI (dev mode toggle → quick login button)
  await page.goto("/login");
  await page.getByRole("button", { name: "开发模式登录" }).click();
  await page.getByRole("button", { name: "owner", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));

  // 2. create a brand-new pet through the UI
  const name = `BW-Coco-${stamp}`;
  await createPetViaUI(page, name);
  await expect(page.locator(".topnav select")).toContainText(name);

  // 3. Today / Quick Log: add a meal
  await page.getByRole("button", { name: "喂食" }).click();
  await expect(page.locator(".alert.info")).toContainText("已记录");

  // 4. Timeline shows the event with provenance + actor
  await page.goto("/timeline");
  await expect(page.locator(".tl .tl-type", { hasText: "daily.meal" }).first()).toBeVisible();
  await expect(page.locator(".tl").getByText("OWNER_REPORTED").first()).toBeVisible();

  // 5. reload → still there, page healthy
  await page.reload();
  await expect(page.locator(".tl .tl-type", { hasText: "daily.meal" }).first()).toBeVisible();
  await expectNoFatalState(page);

  // 6. backend truth: the event really exists with provenance
  const uid0 = await userIdFor(request, "owner@pli.demo");
  const pets = await (
    await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": uid0 } })
  ).json();
  const pet = pets.find((p: { name: string }) => p.name === name);
  expect(pet).toBeTruthy();
  const tl = await (
    await request.get(`${API}/pets/${pet.id}/events?event_type=daily.meal`, {
      headers: { "X-Dev-User-Id": uid0 },
    })
  ).json();
  expect(tl.count).toBeGreaterThanOrEqual(1);
  expect(tl.events[0].provenance_level).toBe("OWNER_REPORTED");
});

test("E2E-02 家庭协作 / 权限（成员可完成，Owner-only 被拒，API 403）", async ({ browser, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const familyId = await userIdFor(request, "family@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));

  // owner creates a task in the browser
  const ownerPage = await browser.newPage();
  patchGoto(ownerPage);
  await loginAsEmail(ownerPage, request, "owner@pli.demo");
  await useCurrentPet(ownerPage, coco.id);
  await ownerPage.goto("/tasks");
  const title = `BW-task-${stamp}`;
  await ownerPage.getByPlaceholder("如：晚上喂食").fill(title);
  await ownerPage.getByRole("button", { name: "创建", exact: true }).click();
  await expect(ownerPage.getByText(title).first()).toBeVisible();
  await ownerPage.close();

  // family member completes it in their own browser session
  const famPage = await browser.newPage();
  patchGoto(famPage);
  await loginAsEmail(famPage, request, "family@pli.demo");
  await useCurrentPet(famPage, coco.id);
  await famPage.goto("/tasks");
  await famPage.locator(".tl li", { hasText: title }).first().getByRole("button", { name: "完成" }).click();
  await expect(famPage.locator(".tl li", { hasText: title }).first()).toContainText("COMPLETED");
  await famPage.close();

  // completed_by visible via API
  const tasks = await (
    await request.get(`${API}/pets/${coco.id}/tasks`, { headers: { "X-Dev-User-Id": ownerId } })
  ).json();
  const done = tasks.find((t: { title: string }) => t.title === title);
  expect(done.completed_by_user_id).toBe(familyId);

  // family attempts an Owner-only surface: audit → permission denied, no data
  const denied = await request.get(`${API}/pets/${coco.id}/audit`, {
    headers: { "X-Dev-User-Id": familyId },
  });
  expect(denied.status()).toBe(403);
  const famPage2 = await browser.newPage();
  patchGoto(famPage2);
  await loginAsEmail(famPage2, request, "family@pli.demo");
  await useCurrentPet(famPage2, coco.id);
  await famPage2.goto("/settings");
  await expect(famPage2.getByText("没有查看此内容的权限").first()).toBeVisible({ timeout: 15_000 });
  await famPage2.close();
});

test("E2E-03 红旗 → EMERGENCY → Vet Brief（前端不降级、刷新一致、无伪诊断）", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const mimi = pets.find((p: { name: string }) => p.name === "Mimi");
  await useCurrentPet(page, mimi.id);

  await page.goto("/health");
  await page.getByLabel(/主诉/).fill("反复进猫砂盆但几乎尿不出来");
  await page.getByRole("button", { name: "打开健康事件" }).click();
  await expect(page).toHaveURL(urlReTail("/health/[0-9a-f-]{36}"));
  await expect(page.locator(".badge.EMERGENCY").first()).toBeVisible();
  await expect(page.locator(".alert.emergency")).toContainText("立即");

  // vet brief through the UI
  await page.getByRole("button", { name: "生成 Vet Brief" }).click();
  await expect(page.getByText("摘要预览")).toBeVisible();
  await expect(page.getByText(/不是兽医诊断/)).toBeVisible();

  // no pseudo-diagnosis wording anywhere
  const body = await page.content();
  expect(body).not.toContain("确定是");
  expect(body).not.toContain("诊断为");

  // reload → triage state unchanged (front-end cannot downgrade)
  await page.reload();
  await expect(page.locator(".badge.EMERGENCY").first()).toBeVisible();
});

test("E2E-04 Medication → 给药 → Outcome → Timeline（重复提交无重复数据）", async ({ page, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  await loginAsEmail(page, request, "owner@pli.demo");
  await useCurrentPet(page, coco.id);

  await page.goto("/medication");
  const medName = `BW-Med-${stamp}`;
  await page.getByPlaceholder("如 50mg").fill("10mg");
  await page.locator("input").first().fill(medName);
  await page.getByRole("button", { name: "创建计划" }).click();
  await expect(page.getByText(medName).first()).toBeVisible();

  // give the first scheduled dose via UI
  await page.getByRole("button", { name: /记录给药/ }).first().click();
  await expect(page.locator(".alert.info")).toContainText("已记录给药");

  // duplicate submission via API must conflict (no double data)
  const plans = await (
    await request.get(`${API}/pets/${coco.id}/medication-plans`, { headers: { "X-Dev-User-Id": ownerId } })
  ).json();
  const plan = plans.find((p: { medicine_name: string }) => p.medicine_name === medName);
  const given = plan.doses.find((d: { status: string }) => d.status === "GIVEN");
  const dup = await request.post(`${API}/medication-plans/${plan.plan_id}/administrations`, {
    headers: { "X-Dev-User-Id": ownerId },
    data: { planned_dose_id: given.dose_id },
  });
  expect(dup.status()).toBe(409);
  expect((await dup.json()).error.code).toBe("MEDICATION_CONFLICT");

  // outcome via health detail UI
  const he = await (
    await request.post(`${API}/pets/${coco.id}/health-events`, {
      headers: { "X-Dev-User-Id": ownerId },
      data: { chief_complaint: `BW-outcome-${stamp}` },
    })
  ).json();
  await page.goto(`/health/${he.health_event_id}`);
  await expect(page.locator("main select")).toBeVisible();
  await page.locator("main select").selectOption("IMPROVED");
  await page.getByRole("button", { name: "记录结局" }).click();
  await expect(page.getByText("已记录：IMPROVED")).toBeVisible();

  // timeline links the outcome to the health event
  const tl = await (
    await request.get(
      `${API}/pets/${coco.id}/events?event_type=health.outcome_recorded`,
      { headers: { "X-Dev-User-Id": ownerId } },
    )
  ).json();
  expect(tl.count).toBeGreaterThanOrEqual(1);
});

test("E2E-05 Care Handoff / Care Card（最小字段、结束后权限收回）", async ({ browser, page, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const sitterId = await userIdFor(request, "sitter@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  const mimi = pets.find((p: { name: string }) => p.name === "Mimi");
  await loginAsEmail(page, request, "owner@pli.demo");
  await useCurrentPet(page, coco.id);

  await page.goto("/care");
  await page.getByPlaceholder("uuid").fill(sitterId);
  await page.getByRole("button", { name: "创建交接" }).click();
  await expect(page.locator(".tl li", { hasText: sitterId.slice(0, 8) }).first()).toContainText("ACTIVE");

  // issue care card and read the shared link anonymously
  await page.getByRole("button", { name: "生成并获取链接" }).click();
  const alert = await page.locator(".alert.info").textContent();
  const token = alert!.match(/\/care-card\/([A-Za-z0-9_-]+)/)![1];
  const shared = await request.get(`${API}/care-card/${token}`);
  expect(shared.status()).toBe(200);
  const cardBody = await shared.json();
  expect(cardBody.content.emergency_contacts).toBeTruthy();
  // minimal fields: no full medical history
  expect(cardBody.content.triage_history).toBeUndefined();
  expect(cardBody.content.observations).toBeUndefined();

  // caregiver sees only the handed-off pet — Mimi must stay hidden
  const sitterPage = await browser.newPage();
  await loginAsEmail(sitterPage, request, "sitter@pli.demo");
  const mimiDenied = await sitterPage.request.get(`${API}/pets/${mimi.id}`, {
    headers: { "X-Dev-User-Id": sitterId },
  });
  expect([403, 404]).toContain(mimiDenied.status());
  await sitterPage.close();

  // end handoff → scoped access revoked
  await page.getByRole("button", { name: "提前结束" }).first().click();
  await expect(page.locator(".tl li", { hasText: sitterId.slice(0, 8) }).first()).toContainText("ENDED");
  const after = await request.get(`${API}/pets/${coco.id}`, {
    headers: { "X-Dev-User-Id": sitterId },
  });
  expect([403, 404]).toContain(after.status());
});

test("E2E-06 Behavior ABC（中文+emoji 输入，Timeline 可见，页面不崩）", async ({ page, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  await loginAsEmail(page, request, "owner@pli.demo");
  await useCurrentPet(page, coco.id);

  const behaviorText = `对门铃响连续吠叫📞然后躲到沙发下🛋️（BW-${stamp}）`;
  await page.goto("/behavior");
  await page.getByPlaceholder(/门铃响 \/ 陌生狗经过/).fill("门铃响🔔");
  await page.getByPlaceholder(/连续吠叫/).fill(behaviorText);
  await page.getByPlaceholder(/主人安抚后自行出来/).fill("主人安抚后出来");
  await page.getByRole("button", { name: "保存行为事件" }).click();
  await expect(page.locator(".tl li", { hasText: `BW-${stamp}` }).first()).toBeVisible();

  await page.goto("/timeline");
  await page.locator("main select").selectOption("behavior.observed");
  await expect(page.locator(".tl .tl-body", { hasText: `BW-${stamp}` }).first()).toBeVisible();
  await expectNoFatalState(page);
});

test("E2E-07 IDOR / URL 篡改（跨 owner 访问必须 403/404 且不泄露）", async ({ browser, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const sitterId = await userIdFor(request, "sitter@pli.demo"); // no membership
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("Coco"));
  const mimi = pets.find((p: { name: string }) => p.name === "Mimi");
  const fakeId = "00000000-0000-0000-0000-00000000dead";

  // sitter has an EXPIRED historical grant on Coco only; Mimi never granted
  const sitter = await browser.newPage();
  patchGoto(sitter);
  await loginAsEmail(sitter, request, "sitter@pli.demo");

  for (const target of [coco.id, mimi.id, fakeId]) {
    const r = await sitter.request.get(`${API}/pets/${target}`, {
      headers: { "X-Dev-User-Id": sitterId },
    });
    expect([403, 404]).toContain(r.status());
    if (r.status() === 404) expect(await r.text()).not.toContain("Mimi");
    expect(await r.text()).not.toContain('"name":"Coco"');

    const tl = await sitter.request.get(`${API}/pets/${target}/events`, {
      headers: { "X-Dev-User-Id": sitterId },
    });
    expect([403, 404]).toContain(tl.status());
    expect(await tl.text()).not.toContain("event_type");

    const he = await sitter.request.get(`${API}/pets/${target}/health-events`, {
      headers: { "X-Dev-User-Id": sitterId },
    });
    expect([403, 404]).toContain(he.status());
    expect(await he.text()).not.toContain("chief_complaint");
  }

  // UI: unauthenticated-looking navigation must not render another owner's data
  await sitter.goto("/timeline");
  await sitter.waitForLoadState("networkidle");
  await sitter.waitForLoadState("networkidle");
  const body = await sitter.content();
  expect(body).not.toContain("Coco");
  await sitter.goto(`/health/${(await (await request.get(`${API}/pets/${mimi.id}/health-events`, { headers: { "X-Dev-User-Id": ownerId } })).json())[0].health_event_id}`);
  await expect(sitter.getByText(/没有查看此内容的权限|出错了/).first()).toBeVisible({ timeout: 15_000 });
  const detail = await sitter.content();
  expect(detail).not.toContain("chief_complaint");
  await sitter.close();
});
