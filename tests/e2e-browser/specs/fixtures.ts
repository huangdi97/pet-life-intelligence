import { expect, test as base, type Page } from "@playwright/test";

export { expect };

/**
 * Remote-capable page fixture (Stage F §19): when PLI_E2E_BASE_PATH is set
 * (e.g. "/pli" for a path-prefix deployment), every page.goto() with a
 * root-relative path is prefixed automatically. Unset (local default) →
 * behavior identical to plain Playwright.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    patchGoto(page);
    await use(page);
  },
});

/** Idempotent goto-patcher for pages created outside the fixture
 *  (e.g. browser.newPage() in a test body). */
export function patchGoto(page: Page): void {
  const basePath = process.env.PLI_E2E_BASE_PATH ?? "";
  if (!basePath) return;
  const origGoto = page.goto.bind(page);
  (page as { goto: unknown }).goto = (
    path: string,
    options?: Parameters<typeof origGoto>[1],
  ) => origGoto(path.startsWith("/") ? basePath + path : path, options);
}
