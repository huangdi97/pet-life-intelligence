import { describe, expect, it } from "vitest";
import {
  followUpEventType, followUpHref, followUpIdempotencyKey, isFollowUpTarget,
  type FollowUpTarget,
} from "../lib/caseFollowUp";

const target: FollowUpTarget = {
  caseId: "case-1",
  petId: "pet-1",
  metric: "walk_minutes_per_day",
  eventType: "daily.walk",
};

describe("R8AL web follow-up observation loop", () => {
  it("maps an archive metric to the same real daily event type", () => {
    expect(followUpEventType("walk_minutes_per_day")).toBe("daily.walk");
    expect(followUpEventType("meal_count_per_day")).toBe("daily.meal");
    expect(followUpEventType("sleep_minutes_per_day")).toBe("daily.sleep");
    expect(followUpEventType("weight_kg")).toBeNull();
  });

  it("builds a Today link that carries pet, Case and metric", () => {
    const href = followUpHref("pet-1", "case-1", "walk_minutes_per_day");
    expect(href.startsWith("/?")).toBe(true);
    const params = new URLSearchParams(href.slice(2));
    expect(params.get("followUpPet")).toBe("pet-1");
    expect(params.get("followUpCase")).toBe("case-1");
    expect(params.get("followUpMetric")).toBe("walk_minutes_per_day");
  });

  it("refuses to link a different pet or a different metric event", () => {
    expect(isFollowUpTarget(target, "pet-1", "daily.walk")).toBe(true);
    expect(isFollowUpTarget(target, "pet-2", "daily.walk")).toBe(false);
    expect(isFollowUpTarget(target, "pet-1", "daily.meal")).toBe(false);
    expect(isFollowUpTarget(null, "pet-1", "daily.walk")).toBe(false);
  });

  it("uses one idempotency key per saved event, not per attempt", () => {
    expect(followUpIdempotencyKey("evt-1")).toBe("r8-web-observation-evt-1");
    expect(followUpIdempotencyKey("evt-1")).toBe(followUpIdempotencyKey("evt-1"));
    expect(followUpIdempotencyKey("evt-2")).not.toBe(followUpIdempotencyKey("evt-1"));
  });
});
