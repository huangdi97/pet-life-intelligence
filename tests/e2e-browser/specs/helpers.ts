import { APIRequestContext, Page, expect } from "@playwright/test";

export const API = "http://localhost:8800/api/v1";

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
  await expect(page).toHaveURL(/\/$/);
}

export async function expectNoFatalState(page: Page): Promise<void> {
  await expect(page.locator(".state.error")).toHaveCount(0);
}
