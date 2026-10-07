import { expect, test, type APIRequestContext } from "@playwright/test";
import { loginAsEmail } from "./helpers";

const API = "http://localhost:8800/api/v1";
const OWNER_EMAIL = "owner@pli.demo";

async function ownerContext(request: APIRequestContext) {
  const login = await request.post(`${API}/auth/dev/login`, {
    data: { email: OWNER_EMAIL },
  });
  expect(login.ok()).toBeTruthy();
  const { user_id } = (await login.json()) as { user_id: string };
  const headers = { "X-Dev-User-Id": user_id };
  const petsResponse = await request.get(`${API}/pets`, { headers });
  expect(petsResponse.ok()).toBeTruthy();
  const pets = (await petsResponse.json()) as Array<{
    id: string;
    household_id: string;
    name: string;
  }>;
  expect(pets.length).toBeGreaterThan(0);
  return { userId: user_id, headers, pet: pets[0] };
}

test.describe("R5 owner contracts — Care + Medication", () => {
  test("Care selects people instead of raw IDs and exposes revocation", async ({ page, request }) => {
    const { headers, pet } = await ownerContext(request);
    const membersResponse = await request.get(
      `${API}/households/${pet.household_id}/members`,
      { headers },
    );
    expect(membersResponse.ok()).toBeTruthy();
    const members = (await membersResponse.json()) as Array<{
      user_id: string;
      display_name: string;
      email: string;
      role: string;
      status: string;
    }>;
    const caregiver = members.find(
      (member) => member.status === "ACTIVE" && member.role !== "OWNER",
    );
    expect(caregiver, "seeded household should have a non-owner care member").toBeTruthy();

    const created = await request.post(`${API}/pets/${pet.id}/handoffs`, {
      headers,
      data: {
        caregiver_user_id: caregiver!.user_id,
        scopes: ["daily:read", "daily:write"],
        end_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        reason: "R5 browser contract",
      },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = (await created.json()) as { handoff_id: string; grant_id: string };

    await loginAsEmail(page, request, OWNER_EMAIL);
    await page.goto("/care");

    const memberSelect = page.getByRole("combobox", { name: "临时照护人" });
    await expect(memberSelect).toBeVisible();
    const label = caregiver!.display_name || caregiver!.email || "家庭成员";
    await expect(memberSelect.locator("option").filter({ hasText: label })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "撤销权限" }).first()).toBeVisible();

    const ownerText = (await page.locator("main").innerText()) ?? "";
    expect(ownerText).not.toContain(caregiver!.user_id);
    expect(ownerText).not.toContain(createdBody.handoff_id);
    expect(ownerText).not.toContain(createdBody.grant_id);
  });

  test("Medication distinguishes pending / skipped and performs a real skip", async ({ page, request }) => {
    const { headers, pet } = await ownerContext(request);
    const medicine = `R5-contract-${Date.now()}`;
    const created = await request.post(`${API}/pets/${pet.id}/medication-plans`, {
      headers,
      data: {
        medicine_name: medicine,
        dose_text: "按处方记录",
        route: "oral",
        frequency_per_day: 1,
        duration_days: 1,
        source_type: "OWNER_REPORTED",
        source_note: "R5 browser contract",
      },
    });
    expect(created.status()).toBe(201);

    await loginAsEmail(page, request, OWNER_EMAIL);
    await page.goto("/medication");

    const card = page.locator(".v5-plan-card").filter({ hasText: medicine });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "标记本次跳过" }).first()).toBeVisible();
    await card.getByRole("button", { name: "标记本次跳过" }).first().click();

    await expect(card.getByText("已跳过").first()).toBeVisible();
    await expect(page.getByText("已记录本次跳过；没有修改用药计划或剂量。")).toBeVisible();
  });
});
