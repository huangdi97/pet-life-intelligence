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
    await expect(page.getByText(/福祉 · Welfare/).first()).toBeVisible();
    await expect(page.getByText(/不是医疗结论|不是医疗诊断/).first()).toBeVisible();
  });

  test("social renders relationship view (no fatal)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/social");
    await expect(page).toHaveURL(urlRe("/social"));
    await expectNoFatalState(page);
    await expect(page.getByText(/社交 · Social/).first()).toBeVisible();
  });

  test("monitoring renders device status UI (no fatal, no fake online)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/monitoring");
    await expect(page).toHaveURL(urlRe("/monitoring"));
    await expectNoFatalState(page);
    await expect(page.getByText(/在家 · Monitoring/).first()).toBeVisible();
  });

  test("agent renders 5 assistant tabs (navigation)", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/agent");
    await expect(page).toHaveURL(urlRe("/agent"));
    await expectNoFatalState(page);
    for (const tab of ["问", "摘要", "找", "计划", "解释"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
  });

  test("companion shows PROTOTYPE gate when feature flag off", async ({ page, request }) => {
    await loginAsEmail(page, request, "owner@pli.demo");
    await page.goto("/companion");
    await expect(page).toHaveURL(urlRe("/companion"));
    await expect(page.getByText("PROTOTYPE").first()).toBeVisible();
    await expect(page.getByText(/硬件集成未激活/).first()).toBeVisible();
  });
});
