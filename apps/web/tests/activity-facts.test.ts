import { describe, expect, it } from "vitest";
import type { LifeEvent } from "@pli/api-client";
import { observedActivityMinutes } from "../app/_components/today/activity";

const sample = (event_type: string, duration_minutes: unknown) =>
  ({ event_type, payload: { duration_minutes } }) as Pick<LifeEvent, "event_type" | "payload">;

describe("Today activity facts", () => {
  it("counts only observed walks and play, not sleep or unrelated durations", () => {
    expect(observedActivityMinutes([
      sample("daily.sleep", 480),
      sample("medication.administered", 10),
      sample("daily.walk", 30),
      sample("daily.play", 15),
    ])).toBe(45);
  });

  it("does not invent duration when missing, negative or implausible", () => {
    expect(observedActivityMinutes([
      sample("daily.walk", null),
      sample("daily.walk", "abc"),
      sample("daily.walk", -15),
      sample("daily.play", 9000),
      sample("daily.walk", "30"),
    ])).toBe(30);
  });
});
