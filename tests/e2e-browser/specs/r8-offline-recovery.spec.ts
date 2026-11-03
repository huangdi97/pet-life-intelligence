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


/** R8AY: a delayed older "more" response is not permitted to resurrect an
 *  owner Case in an unrelated filter after a new first page completed.
 *  The only synthetic data is deliberate network pagination timing; the Case
 *  itself is created by the real API so identity and source semantics remain
 *  representative of actual owner records. */
test("web history discards stale load-more responses after changing validity", async ({ page, request }) => {
  const owner = await userIdFor(request, "owner@pli.demo");
  const headers = await authHeaders(request, owner);
  const petResponse = await request.post(`${API}/pets`, {
    headers, data: { name: `R8 Stale Page ${Date.now()}`, species: "dog" },
  });
  expect(petResponse.ok()).toBeTruthy();
  const petId = (await petResponse.json()).id as string;
  const at = Date.now() - 3 * 60 * 1000;
  for (const days of [1, 2, 3]) {
    const sent = await request.post(`${API}/pets/${petId}/events`, {
      headers, data: {
        event_type: "daily.walk", payload: { duration_minutes: 90 },
        occurred_at: new Date(at - days * 86400000).toISOString(),
      },
    });
    expect(sent.ok()).toBeTruthy();
  }
  expect((await request.post(`${API}/pets/${petId}/events`, {
    headers, data: {
      event_type: "daily.walk", payload: { duration_minutes: 20 },
      occurred_at: new Date(at).toISOString(),
    },
  })).ok()).toBeTruthy();
  expect((await request.post(
    `${API}/pets/${petId}/baseline/recompute?window_days=14`,
    { headers, data: {} },
  )).ok()).toBeTruthy();
  const made = await request.post(`${API}/pets/${petId}/life-change-cases`, {
    headers, data: { metric: "walk_minutes_per_day" },
  });
  expect(made.ok()).toBeTruthy();
  const caseId = (await made.json()).case_id as string;

  await loginAs(page, owner);
  await useCurrentPet(page, petId);

  let startDelayed!: () => void;
  let releaseDelayed!: () => void;
  const delayedStarted = new Promise<void>((resolve) => { startDelayed = resolve; });
  const release = new Promise<void>((resolve) => { releaseDelayed = resolve; });
  let realRow: unknown = null;
  await page.route("**/api/v1/pets/*/life-change-cases*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("cursor") === "r8ay-pending") {
      startDelayed();
      await release;
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          cases: realRow ? [realRow] : [],
          next_cursor: null, has_more: false, total: 1,
        }),
      });
      return;
    }
    if (!url.searchParams.has("validity")) {
      const fetched = await route.fetch();
      const original = await fetched.json();
      realRow = original.cases[0];
      await route.fulfill({
        response: fetched,
        json: { ...original, has_more: true, next_cursor: "r8ay-pending" },
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`/pets/${petId}/history`);
  await expect(page.getByTestId(`pli.r8.web-history.case.${caseId}`)).toBeVisible();
  await expect(page.getByTestId("pli.r8.web-history.more")).toBeVisible();
  await page.getByTestId("pli.r8.web-history.more").click();
  await delayedStarted;

  await page.getByTestId("pli.r8.web-history.validity.INVALID").click();
  await expect(page.getByTestId("pli.r8.web-history.empty")).toBeVisible();
  await expect(page.getByTestId(`pli.r8.web-history.case.${caseId}`)).toHaveCount(0);

  const oldResponse = page.waitForResponse((response) =>
    new URL(response.url()).searchParams.get("cursor") === "r8ay-pending",
  );
  releaseDelayed();
  await oldResponse;
  // Give the old resolved promise a turn to run: it must not re-populate
  // rows, cursor or total from the previous all-records query.
  await page.waitForTimeout(120);
  await expect(page.getByTestId(`pli.r8.web-history.case.${caseId}`)).toHaveCount(0);
  await expect(page.getByTestId("pli.r8.web-history.empty")).toBeVisible();
  await expect(page.getByTestId("pli.r8.web-history.more")).toHaveCount(0);
});
