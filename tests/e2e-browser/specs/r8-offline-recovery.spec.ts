import { test, expect } from "./fixtures";
import { API, authHeaders, loginAs, useCurrentPet, userIdFor } from "./helpers";

/** A transient offline read must be recoverable in place, without inventing
 *  rows and without requiring a full page reload. */
test("web history recovers from a transient offline read", async ({ page, request }) => {
  const owner = await userIdFor(request, "owner@pli.demo");
  const headers = await authHeaders(request, owner);

  const petResponse = await request.post(`${API}/pets`, {
    headers,
    data: { name: `R8 Offline ${Date.now()}`, species: "dog" },
  });
  expect(petResponse.ok()).toBeTruthy();
  const petId = (await petResponse.json()).id as string;

  const at = new Date(Date.now() - 2 * 60 * 1000);
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
  expect((await request.post(`${API}/pets/${petId}/events`, {
    headers,
    data: {
      event_type: "daily.walk",
      payload: { duration_minutes: 20 },
      occurred_at: at.toISOString(),
    },
  })).ok()).toBeTruthy();
  expect((await request.post(
    `${API}/pets/${petId}/baseline/recompute?window_days=14`, { headers, data: {} },
  )).ok()).toBeTruthy();
  const created = await request.post(`${API}/pets/${petId}/life-change-cases`, {
    headers, data: { metric: "walk_minutes_per_day" },
  });
  expect(created.ok()).toBeTruthy();
  const caseId = (await created.json()).case_id as string;

  await loginAs(page, owner);
  await useCurrentPet(page, petId);

  await page.route("**/api/v1/pets/*/life-change-cases*", (route) => route.abort("failed"));
  await page.goto(`/pets/${petId}/history`);
  await expect(page.getByTestId("pli.r8.web-history.retry")).toBeVisible();
  await expect(page.getByTestId(`pli.r8.web-history.case.${caseId}`)).toHaveCount(0);

  await page.unroute("**/api/v1/pets/*/life-change-cases*");
  await page.getByTestId("pli.r8.web-history.retry").click();
  await expect(page.getByTestId(`pli.r8.web-history.case.${caseId}`)).toBeVisible();
});
