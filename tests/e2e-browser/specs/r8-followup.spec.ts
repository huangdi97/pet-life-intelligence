import { test, expect } from "./fixtures";
import { API, authHeaders, loginAs, useCurrentPet, userIdFor } from "./helpers";

/** R8AL/R8AM: Web owner follow-up must cite a REAL saved event and link it
 *  back to the SAME immutable Case, with source validity preserved. */
test("web owner records a real follow-up observation and links the same Case", async ({
  page, request,
}) => {
  const owner = await userIdFor(request, "owner@pli.demo");
  const headers = await authHeaders(request, owner);

  const petResponse = await request.post(`${API}/pets`, {
    headers,
    data: { name: `R8 Follow-up ${Date.now()}`, species: "dog" },
  });
  expect(petResponse.ok()).toBeTruthy();
  const petId = (await petResponse.json()).id as string;

  const at = new Date(Date.now() - 2 * 60 * 1000);
  for (const days of [1, 2, 3]) {
    const occurred = new Date(at.getTime() - days * 24 * 60 * 60 * 1000);
    const sent = await request.post(`${API}/pets/${petId}/events`, {
      headers,
      data: {
        event_type: "daily.walk",
        payload: { duration_minutes: 90 },
        occurred_at: occurred.toISOString(),
      },
    });
    expect(sent.ok()).toBeTruthy();
  }
  const today = await request.post(`${API}/pets/${petId}/events`, {
    headers,
    data: {
      event_type: "daily.walk",
      payload: { duration_minutes: 20 },
      occurred_at: at.toISOString(),
    },
  });
  expect(today.ok()).toBeTruthy();
  const todayEventId = (await today.json()).event_id as string;

  const recompute = await request.post(
    `${API}/pets/${petId}/baseline/recompute?window_days=14`, { headers, data: {} },
  );
  expect(recompute.ok()).toBeTruthy();
  const caseResponse = await request.post(`${API}/pets/${petId}/life-change-cases`, {
    headers, data: { metric: "walk_minutes_per_day" },
  });
  expect(caseResponse.ok()).toBeTruthy();
  const caseId = (await caseResponse.json()).case_id as string;

  await loginAs(page, owner);
  await useCurrentPet(page, petId);
  await page.goto(
    `/?followUpCase=${caseId}&followUpPet=${petId}&followUpMetric=walk_minutes_per_day`,
  );

  await expect(page.getByTestId("pli.r8.web-followup.banner")).toBeVisible();
  await page.getByTestId("pli.quicklog.tile.walk").click();
  await page.getByTestId("pli.quicklog.field.duration_minutes").fill("25");
  await page.getByTestId("pli.quicklog.text-save").click();

  await expect(page).toHaveURL(new RegExp(`/pets/${petId}/history/${caseId}\\?linkedEvent=`));
  await expect(page.getByTestId("pli.r8.web-case.followup-linked")).toBeVisible();
  const eventId = new URL(page.url()).searchParams.get("linkedEvent");
  expect(eventId).toBeTruthy();

  const detail = await request.get(`${API}/pets/${petId}/life-change-cases/${caseId}`, { headers });
  expect(detail.ok()).toBeTruthy();
  const body = await detail.json();
  const observations = body.reviews.filter(
    (row: { decision: string }) => row.decision === "RECORD_OBSERVATION",
  );
  expect(observations).toHaveLength(1);
  expect(observations[0].related_event_ids).toEqual([eventId]);
  expect(body.follow_up_source_valid).toBe(true);

  // R8AN: retracting an ORIGINAL source is a real two-step owner action. The
  // derived Case becomes INVALIDATED while every append-only Review remains.
  await page.getByTestId("pli.r8.web-case.sources.open").click();
  await page.getByTestId(`pli.r8.web-case.source.retract.${todayEventId}`).click();
  await page.getByTestId(`pli.r8.web-case.source.retract-yes.${todayEventId}`).click();
  await expect(page.getByTestId("pli.r8.web-case.status")).toContainText("原始记录已变更");
  await expect(page.getByTestId("pli.r8.web-case.action-status")).toContainText("已撤回");

  const invalidated = await request.get(
    `${API}/pets/${petId}/life-change-cases/${caseId}`, { headers },
  );
  expect(invalidated.ok()).toBeTruthy();
  const invalidBody = await invalidated.json();
  expect(invalidBody.source_valid).toBe(false);
  expect(invalidBody.state).toBe("INVALIDATED");
  expect(invalidBody.reviews).toHaveLength(observations.length);
});
