import { describe, expect, it } from "vitest";
import { CASE_METRIC, caseStatus, type WebCaseSummary } from "../lib/lifeCases";

const base: WebCaseSummary = {
  case_id: "case-1",
  pet_id: "pet-1",
  metric: "walk_minutes_per_day",
  current_value: 20,
  baseline_value: 90,
  sample_days: 3,
  evidence_event_ids: ["e1", "e2"],
  source_valid: true,
  follow_up_source_valid: null,
  state: "PROPOSED",
};

describe("R8AK web Case status semantics", () => {
  it("never reports a diagnosis or recovery", () => {
    for (const state of ["PROPOSED", "FOLLOW_UP", "CLOSED", "OWNER_ACKNOWLEDGED"]) {
      const text = caseStatus({ ...base, state });
      expect(text).not.toMatch(/康复|痊愈|健康正常|诊断为/);
    }
  });

  it("keeps source invalidation distinct from owner decisions", () => {
    expect(caseStatus({ ...base, source_valid: false })).toContain("需重新核对");
    expect(caseStatus({ ...base, state: "CLOSED" })).toContain("暂不关注");
  });

  it("treats a withdrawn follow-up as needing review even after FOLLOW_UP", () => {
    expect(caseStatus({ ...base, state: "FOLLOW_UP", follow_up_source_valid: false }))
      .toContain("后续记录已失效");
    expect(caseStatus({ ...base, state: "FOLLOW_UP", follow_up_source_valid: true }))
      .toContain("真实后续观察");
  });

  it("uses owner-language metric names with units", () => {
    expect(CASE_METRIC.walk_minutes_per_day.unit).toBe("分钟");
    expect(CASE_METRIC.meal_count_per_day.name).toBe("进食");
  });
});
