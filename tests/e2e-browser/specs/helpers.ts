import { APIRequestContext, Page, expect } from "@playwright/test";

/** Remote-capable API base (Stage F §19): override with PLI_E2E_API to run
 *  the suite against a public deployment, e.g. the /pli-api prefix. */
export const API = process.env.PLI_E2E_API ?? "http://localhost:8800/api/v1";

/** Resolve a seeded demo user id by email (ids change on every reseed). */
export async function userIdFor(request: APIRequestContext, email: string): Promise<string> {
  const r = await request.post(`${API}/auth/dev/login`, { data: { email } });
  if (!r.ok()) throw new Error(`login failed for ${email}: ${r.status()}`);
  return (await r.json()).user_id;
}

/** Bind a browser session to a demo user via the dev-auth localStorage key
 *  that apps/web/lib (api-client) reads. */
export async function loginAs(page: Page, userId: string): Promise<void> {
  await page.addInitScript(
    (id) => window.localStorage.setItem("pli_dev_user_id", id as string),
    userId,
  );
}

export async function loginAsEmail(page: Page, request: APIRequestContext, email: string) {
  const id = await userIdFor(request, email);
  await loginAs(page, id);
  return id;
}

/** Select a specific pet as the persistent "current pet" context. */
export async function useCurrentPet(page: Page, petId: string): Promise<void> {
  await page.addInitScript(
    (id) => window.localStorage.setItem("pli_current_pet", id as string),
    petId,
  );
}

export async function authHeaders(request: APIRequestContext, userId: string) {
  return { "X-Dev-User-Id": userId };
}

export async function createPetViaUI(page: Page, name: string): Promise<void> {
  await page.goto("/pets/new");
  await page.getByLabel("名字").fill(name);
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));
}

export async function expectNoFatalState(page: Page): Promise<void> {
  await expect(page.locator(".state.error")).toHaveCount(0);
}

/**
 * Base-path-aware URL regex from a regex tail (Stage F §19): urlReTail(
 * "/health/[0-9a-f-]{36}") matches the UUID detail URL under any deployment.
 */
export function urlReTail(tail: string): RegExp {
  const basePath = process.env.PLI_E2E_BASE_PATH ?? "";
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(esc(basePath) + tail + "$");
}

/** Base-path-aware asset/API path for request.get() (baseURL has no prefix). */
export function assetPath(path: string): string {
  const basePath = process.env.PLI_E2E_BASE_PATH ?? "";
  return path.startsWith("/") ? basePath + path : path;
}

/**
 * Base-path-aware URL regex (Stage F §19): urlRe("/login") matches "/login"
 * on localhost and "/pli/login" on a /pli deployment. Home ("/") matches the
 * basePath itself (with optional trailing slash).
 */
export function urlRe(path: string): RegExp {
  const basePath = process.env.PLI_E2E_BASE_PATH ?? "";
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (path === "/") {
    if (!basePath) return /\/$/;
    return new RegExp(esc(basePath) + "\\/?$");
  }
  return new RegExp(esc(basePath + path) + "$");
}
