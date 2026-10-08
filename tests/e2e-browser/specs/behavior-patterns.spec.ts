import { expect, test } from "@playwright/test";
import {
  API,
  authHeaders,
  loginAsEmail,
  useCurrentPet,
} from "./helpers";

interface PetRow {
  id: string;
  species: string;
}

async function seededDogId(
  request: import("@playwright/test").APIRequestContext,
  userId: string,
): Promise<string> {
  const r = await request.get(`${API}/pets`, {
    headers: await authHeaders(request, userId),
  });
  expect(r.ok()).toBeTruthy();
  const pets = (await r.json()) as PetRow[];
  const dog = pets.find((pet) => pet.species.toLowerCase() === "dog");
  expect(dog, "seeded owner household should contain one dog").toBeTruthy();
  return dog!.id;
}

test.describe("Behavior record-derived product semantics", () => {
  test("patterns/context come from real observations and templates stay input-only", async ({
    page,
    request,
  }) => {
    const userId = await loginAsEmail(page, request, "owner@pli.demo");
    const petId = await seededDogId(request, userId);
    await useCurrentPet(page, petId);
    const headers = await authHeaders(request, userId);

    const observation = "测试可观察吠叫";
    const antecedent = "测试门铃响起";
    const environment = "测试客厅环境";

    for (let i = 0; i < 2; i += 1) {
      const created = await request.post(`${API}/pets/${petId}/behavior-events`, {
        headers,
        data: {
          occurred_at: new Date(Date.now() - i * 60_000).toISOString(),
          antecedent,
          behavior: observation,
          consequence: "测试记录后安静下来",
          duration_seconds: 30,
          intensity: "",
          environment,
          owner_notes: "",
          artifact_ids: [],
        },
      });
      expect(created.ok(), `behavior fixture ${i + 1} should be recorded`).toBeTruthy();
    }

    await page.goto("/behavior");

    await expect(page.getByTestId("pli.behavior.patterns")).toContainText(
      `${observation} · 2 次`,
    );
    await expect(page.getByTestId("pli.behavior.context")).toContainText(
      `发生之前 · ${antecedent}`,
    );
    await expect(page.getByTestId("pli.behavior.context")).toContainText(
      `环境 · ${environment}`,
    );
    await expect(page.getByTestId("pli.behavior.context")).toContainText("不表示因果");

    const template = page.getByRole("button", {
      name: "用“吠叫”作为行为记录起点",
    });
    await expect(template).toBeVisible();
    await template.click();
    await expect(page.getByLabel(/你观察到的行为/)).toHaveValue("吠叫");

    // A shortcut must never silently save a diagnosis or behavior conclusion.
    const before = await request.get(`${API}/pets/${petId}/behavior-events`, { headers });
    expect(before.ok()).toBeTruthy();
    const beforeRows = (await before.json()) as unknown[];
    await page.waitForTimeout(100);
    const after = await request.get(`${API}/pets/${petId}/behavior-events`, { headers });
    expect(after.ok()).toBeTruthy();
    const afterRows = (await after.json()) as unknown[];
    expect(afterRows).toHaveLength(beforeRows.length);
  });
});
