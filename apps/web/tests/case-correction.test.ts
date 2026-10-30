import { describe, expect, it } from "vitest";
import {
  correctionFieldForMetric, correctionIdempotencyKey, correctionPayload,
} from "../lib/caseCorrection";

describe("R8AQ web source correction", () => {
  it("supports documented numeric daily metrics only", () => {
    expect(correctionFieldForMetric("walk_minutes_per_day")?.key).toBe("duration_minutes");
    expect(correctionFieldForMetric("sleep_minutes_per_day")?.unit).toBe("分钟");
    expect(correctionFieldForMetric("meal_count_per_day")).toBeNull();
    expect(correctionFieldForMetric("weight_kg")).toBeNull();
  });

  it("rejects empty or out-of-range corrected values", () => {
    const field = correctionFieldForMetric("walk_minutes_per_day")!;
    expect(correctionPayload(field, "35")).toEqual({ duration_minutes: 35 });
    expect(correctionPayload(field, "  ")).toBeNull();
    expect(correctionPayload(field, "-1")).toBeNull();
    expect(correctionPayload(field, "1441")).toBeNull();
    expect(correctionPayload(field, "abc")).toBeNull();
  });

  it("uses one idempotency key per event and corrected value", () => {
    expect(correctionIdempotencyKey("evt-1", 35)).toBe("r8-web-correction-evt-1-35");
    expect(correctionIdempotencyKey("evt-1", 35)).toBe(
      correctionIdempotencyKey("evt-1", 35),
    );
    expect(correctionIdempotencyKey("evt-1", 36)).not.toBe(
      correctionIdempotencyKey("evt-1", 35),
    );
  });
});
