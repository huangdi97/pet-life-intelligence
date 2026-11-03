import { test, expect } from "./fixtures";
import { API, authHeaders, loginAs, useCurrentPet, userIdFor } from "./helpers";

/** R8AT: the owner history filter is server-derived and must never leak the
 *  valid complement into the invalid view (or vice versa). */
test("web history filters by derived source validity", async ({ page, request }) => {
  const owner = await userIdFor(request, "owner@pli.demo");
  const headers = await authHeaders(request, owner);

  const petResponse = await request.post(`${API}/pets`, {
    headers,
    data: { name: `R8 Filter ${Date.now()}`, species: "dog" },
  });
  expect(petResponse.ok()).toBeTruthy();
  const petId = (await petResponse.json()).id as string;

  const at = new Date(Date.now() - 3 * 60 * 1000);
  for (const days of [1, 2, 3]) {
    const sent = await request.post(`${API}/pets/${petId}/events`, {
      headers,
      data: {
        event_type: "daily.walk",
        payload: { duration_minutes: 90 },
        occurred_at: new Date(at.getTime() - days * 86400000).toISOString(),
      },
    });
    expect(sent.ok()).toBeTruthy();
  }
  const first = await request.post(`${API}/pets/${petId}/events`, {
    headers,
    data: {
      event_type: "daily.walk",
      payload: { duration_minutes: 20 },
      occurred_at: at.toISOString(),
    },
  });
  expect(first.ok()).toBeTruthy();
  const firstEventId = (await first.json()).event_id as string;
  const recompute = await request.post(
    `${API}/pets/${petId}/baseline/recompute?window_days=14`, { headers, data: {} },
  );
  expect(recompute.ok()).toBeTruthy();
  const invalidCase = await request.post(`${API}/pets/${petId}/life-change-cases`, {
    headers, data: { metric: "walk_minutes_per_day" },
  });
  expect(invalidCase.ok()).toBeTruthy();
  const invalidId = (await invalidCase.json()).case_id as string;
  const retract = await request.post(`${API}/events/${firstEventId}/retract`, { headers });
  expect(retract.ok()).toBeTruthy();

  const second = await request.post(`${API}/pets/${petId}/events`, {
    headers,
    data: {
      event_type: "daily.walk",
      payload: { duration_minutes: 40 },
      occurred_at: new Date(at.getTime() + 60000).toISOString(),
    },
  });
  expect(second.ok()).toBeTruthy();
  expect((await request.post(
    `${API}/pets/${petId}/baseline/recompute?window_days=14`, { headers, data: {} },
  )).ok()).toBeTruthy();
  const validCase = await request.post(`${API}/pets/${petId}/life-change-cases`, {
    headers, data: { metric: "walk_minutes_per_day" },
  });
  expect(validCase.ok()).toBeTruthy();
  const validId = (await validCase.json()).case_id as string;

  await loginAs(page, owner);
  await useCurrentPet(page, petId);
  await page.goto(`/pets/${petId}/history`);

  const invalidRow = page.getByTestId(`pli.r8.web-history.case.${invalidId}`);
  const validRow = page.getByTestId(`pli.r8.web-history.case.${validId}`);
  await expect(invalidRow).toBeVisible();
  await expect(validRow).toBeVisible();

  await page.getByTestId("pli.r8.web-history.validity.INVALID").click();
  await expect(invalidRow).toBeVisible();
  await expect(validRow).toHaveCount(0);
  await expect(page.getByText("共 1 条档案")).toBeVisible();

  await page.getByTestId("pli.r8.web-history.validity.VALID").click();
  await expect(validRow).toBeVisible();
  await expect(invalidRow).toHaveCount(0);
  await expect(page.getByText("共 1 条档案")).toBeVisible();

  await page.getByTestId("pli.r8.web-history.validity.all").click();
  await expect(invalidRow).toBeVisible();
  await expect(validRow).toBeVisible();
  await expect(page.getByText("共 2 条档案")).toBeVisible();
});
