/** Offline persistence regression: captured pet identity beats current selection. */
import { describe, expect, it } from "vitest";
import { resolveDraftRequest } from "../lib/drafts";

describe("offline draft replay must preserve pet identity and endpoint", () => {
  it("always targets the originally selected pet even after switching", () => {
    const req = resolveDraftRequest("quicklog", {
      pet_id: "pet-doudou",
      event_type: "daily.meal",
      payload: { amount: "50", unit: "g" },
      artifact_ids: ["artifact-a"],
    });
    expect(req.path).toBe("/pets/pet-doudou/events");
    expect(req.body).toEqual({
      event_type: "daily.meal",
      payload: { amount: "50", unit: "g" },
      artifact_ids: ["artifact-a"],
    });
  });

  it("replays a diary through /diary, not a fabricated /events payload", () => {
    expect(resolveDraftRequest("quicklog", {
      pet_id: "pet-mimi",
      endpoint: "/pets/pet-mimi/diary",
      text: "今天很活跃",
    })).toEqual({
      path: "/pets/pet-mimi/diary",
      body: { text: "今天很活跃" },
    });
  });

  it("refuses legacy drafts without original pet ID instead of guessing", () => {
    expect(() => resolveDraftRequest("quicklog", {
      event_type: "daily.drink",
      payload: { amount: "120", unit: "ml" },
    })).toThrow("DRAFT_PET_ID_UNVERIFIED");
  });

  it("rejects mismatched or arbitrary diary endpoints", () => {
    expect(() => resolveDraftRequest("quicklog", {
      pet_id: "pet-mimi",
      endpoint: "/pets/pet-doudou/diary",
      text: "wrong pet",
    })).toThrow("DRAFT_ENDPOINT_MISMATCH");
  });

  it("preserves governed health and care drafts rather than forging diary events", () => {
    for (const kind of ["health_intake", "care_note"] as const) {
      expect(() => resolveDraftRequest(kind, {
        pet_id: "pet-mimi",
        description: "review needed",
      })).toThrow("DRAFT_KIND_REQUIRES_REVIEW");
    }
  });

  it("rejects invalid or untyped event bodies", () => {
    expect(() => resolveDraftRequest("quicklog", {
      pet_id: "pet-mimi", event_type: "daily.meal", payload: null,
    })).toThrow("DRAFT_EVENT_PAYLOAD_INVALID");
  });
});
