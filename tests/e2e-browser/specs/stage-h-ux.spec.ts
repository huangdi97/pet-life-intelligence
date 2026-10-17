import { expect, test } from "@playwright/test";
import { expectNoFatalState, loginAsEmail, urlRe } from "./helpers";

/**
 * Stage H UX E2E (§88): new domain routes + Companion prototype gate.
 * Valuable only: navigation + state rendering + permission on the Stage H
 * additions. Existing 12/12 (pwa-share / real-auth / seven-paths) unchanged.
 * Runs against a seeded dev environment (owner@pli.demo) — no real participants.
 */

test.describe("Stage H UX — new domain routes", () => {
  test("welfare renders (state rendering, no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/welfare");
    await expect(page).toHaveURL(urlRe("/welfare"));
    await expectNoFatalState(page);
    await expect(page.getByTestId("pli.welfare.identity")).toContainText("生活与福祉");
    await expect(page.getByTestId("pli.welfare.action")).toContainText("不推断情绪或幸福指数");
  });

  test("social renders relationship view (no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/social");
    await expect(page).toHaveURL(urlRe("/social"));
    await expectNoFatalState(page);
    await expect(page.getByTestId("pli.social.identity")).toContainText("社交与伙伴");
  });

  test("monitoring renders device status UI (no fatal, no fake online)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/monitoring");
    await expect(page).toHaveURL(urlRe("/monitoring"));
    await expectNoFatalState(page);
    await expect(page.getByTestId("pli.monitoring.identity")).toContainText("在家状态");
    await expect(page.getByTestId(/pli\.monitoring\.state\./)).toContainText(/设备|读取/);
  });

  test("assistant keeps Ask primary and other jobs contextual", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/agent");
    await expect(page).toHaveURL(urlRe("/agent"));
    await expectNoFatalState(page);

    // R5.6 final hierarchy: Ask is the dominant Assistant job. Brief / Find /
    // Plan / Explain remain available as contextual tools instead of five
    // equal primary tabs competing for attention.
    await expect(page.getByRole("region", { name: "提问" })).toBeVisible();
    await expect(page.getByText(/先问一件和.*有关的事/).first()).toBeVisible();
    for (const tool of ["摘要", "找记录", "计划", "解释"]) {
      // Assistant may also surface contextual suggestions such as
      // "计划下一步". The capability rail itself owns the exact accessible
      // names, so keep this assertion scoped to the intended control.
      await expect(page.getByRole("button", { name: tool, exact: true })).toBeVisible();
    }

    // Contextual jobs must still open and provide a clear route back to Ask.
    await page.getByRole("button", { name: "摘要" }).click();
    await expect(page.getByRole("button", { name: "← 回到提问" })).toBeVisible();
  });

  test("companion renders graceful empty state (honest preview, no fake hardware)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/companion");
    await expect(page).toHaveURL(urlRe("/companion"));
    await expect(page.getByText("陪伴模式").first()).toBeVisible();
    await expect(page.getByTestId("pli.companion.overview")).toContainText("陪伴方式");
    await expect(page.getByText("尚未连接设备").first()).toBeVisible();
    await expect(page.getByText(/陪伴模式不用于医疗判断/).first()).toBeVisible();
  });
});
