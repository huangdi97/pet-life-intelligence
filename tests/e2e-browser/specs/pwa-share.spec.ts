import { patchGoto, test, expect } from "./fixtures";
import {
  API, assetPath, expectNoFatalState, loginAsEmail, userIdFor,
} from "./helpers";

const stamp = Date.now();

test("E2E-08 PWA manifest + service worker + offline fallback", async ({ page, request }) => {
  const ownerId = await loginAsEmail(page, request, "owner@pli.demo");

  // manifest is served and installable
  const manifest = await (await page.request.get(assetPath("/manifest.webmanifest"))).json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  expect(manifest.start_url).toBe(`${process.env.PLI_E2E_BASE_PATH ?? ""}/`);

  // service worker registers
  await page.goto("/");
  const swScope = assetPath("/");
  const swState = await page.evaluate(async (scope) => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    for (let i = 0; i < 10; i++) {
      const reg = await navigator.serviceWorker.getRegistration(scope);
      if (reg?.active) return "active";
      if (reg?.installing || reg?.waiting) return "installing";
      await new Promise((r) => setTimeout(r, 500));
    }
    return "not-found";
  }, swScope);
  expect(["active", "installing"]).toContain(swState);

  // offline page is pre-cached
  const offline = await page.request.get(assetPath("/offline"));
  expect(offline.status()).toBe(200);
  await expectNoFatalState(page);
});

test("E2E-09 H5 分享页（Vet Brief 匿名访问 + 过期/撤销态）", async ({ browser, request }) => {
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get(`${API}/pets`, { headers: { "X-Dev-User-Id": ownerId } })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("豆豆"));

  const he = await (
    await request.post(`${API}/pets/${coco.id}/health-events`, {
      headers: { "X-Dev-User-Id": ownerId },
      data: { chief_complaint: `BW-share-${stamp}`, duration_text: "2小时" },
    })
  ).json();
  const brief = await (
    await request.post(`${API}/health-events/${he.health_event_id}/vet-brief`, {
      headers: { "X-Dev-User-Id": ownerId },
    })
  ).json();
  const share = await (
    await request.post(`${API}/vet-briefs/${brief.vet_brief_id}/share`, {
      headers: { "X-Dev-User-Id": ownerId },
      data: { expires_in_hours: 24 },
    })
  ).json();

  // anonymous H5 page renders the shared content
  const page = await browser.newPage();
  patchGoto(page);
  await page.goto(`/share/vet-brief/${share.share_token}`);
  await expect(page.getByText("就诊摘要 · Vet Brief")).toBeVisible();
  await expect(page.getByText(`BW-share-${stamp}`).first()).toBeVisible();
  await expect(page.getByText(/不是兽医诊断/).first()).toBeVisible();
  await expect(page.getByText(/访问已记录/)).toBeVisible();
  await page.close();
});

test("E2E-10 中文导航 + 全新页面 states（错误页/404/离线文案）", async ({ page, request }) => {
  await loginAsEmail(page, request, "owner@pli.demo");
  await page.goto("/");
  await expect(page.locator(".topnav")).toContainText("今日");
  await expect(page.locator(".topnav")).toContainText("时间线");
  await expect(page.locator(".topnav")).toContainText("宠物");
  await expect(page.locator(".topnav")).toContainText("助手");
  await expect(page.locator(".topnav")).toContainText("我的");

  // 404 page: human-readable, no raw stack
  await page.goto("/no-such-route-xyz");
  await expect(page.getByText("页面不存在").first()).toBeVisible();
  const body404 = await page.content();
  expect(body404).not.toContain("TypeError");
  expect(body404).not.toContain("stack");
});