import { test, expect } from "./fixtures";
import { API, authHeaders, loginAs, useCurrentPet, userIdFor } from "./helpers";

/** R8AQ: correcting a recorded source appends a superseding event; the old
 *  Case becomes invalid while every append-only Review stays. */
test("web owner corrects a source through an append-only supersede", async ({
  page, request,
}) => {
  const owner = await userIdFor(request, "owner@pli.demo");
  const headers = await authHeaders(request, owner);

  const petResponse = await request.post(`${API}/pets`, {
    headers,
    data: { name: `R8 Correction ${Date.now()}`, species: "dog" },
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
  await page.goto(`/pets/${petId}/history/${caseId}`);

  await page.getByTestId("pli.r8.web-case.sources.open").click();
  await page.getByTestId(`pli.r8.web-case.source.correct.${todayEventId}`).click();
  await page.getByTestId(`pli.r8.web-case.source.correct-input.${todayEventId}`).fill("35");
  await page.getByTestId(`pli.r8.web-case.source.correct-submit.${todayEventId}`).click();

  await expect(page.getByTestId("pli.r8.web-case.action-status")).toContainText("已提交修正");
  await expect(page.getByTestId("pli.r8.web-case.status")).toContainText("原始记录已变更");

  const detail = await request.get(
    `${API}/pets/${petId}/life-change-cases/${caseId}`, { headers },
  );
  const body = await detail.json();
  expect(body.source_valid).toBe(false);
  expect(body.state).toBe("INVALIDATED");

  // The original row is untouched; the sources projection points at the
  // successor correction instead of silently rewriting history.
  const original = await request.get(`${API}/events/${todayEventId}`, { headers });
  const originalBody = await original.json();
  expect(originalBody.payload.duration_minutes).toBe(20);
  expect(originalBody.retracted_at).toBeNull();

  const sources = await request.get(
    `${API}/pets/${petId}/life-change-cases/${caseId}/sources?limit=20`, { headers },
  );
  const rows = (await sources.json()).sources as Array<{
    event_id: string; valid: boolean; superseded_by_event_id: string | null;
  }>;
  const corrected = rows.find((row) => row.event_id === todayEventId);
  expect(corrected?.valid).toBe(false);
  expect(corrected?.superseded_by_event_id).toBeTruthy();
});
