"use client";

/** Offline drafts（Stage H §63）：离线起草 + 同步状态展示。
 *  Quick Log / Behavior / Health Intake / Care Note 离线可保存草稿，恢复后重试。
 *  状态四档：未同步 / 同步中 / 已同步 / 同步失败。 */

export type DraftKind = "quicklog" | "behavior" | "health_intake" | "care_note";

export type SyncStatus = "unsynced" | "syncing" | "synced" | "failed";

export interface Draft {
  id: string;
  kind: DraftKind;
  payload: Record<string, unknown>;
  created_at: string;
  status: SyncStatus;
}

const KEY = "pli_offline_drafts";

/** A draft belongs to the pet selected when it was CREATED, never when
 * it is retried. Missing pet provenance must fail closed to prevent a
 * different household pet from inheriting an unrelated clinical/life event.
 * No arbitrary user-supplied endpoint is accepted on replay.
 */
export interface DraftRequest {
  path: string;
  body: Record<string, unknown>;
}

function petIdFromDraft(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error("DRAFT_PET_ID_UNVERIFIED");
  }
  return value;
}

export function resolveDraftRequest(kind: DraftKind, payload: Record<string, unknown>): DraftRequest {
  const petId = petIdFromDraft(payload.pet_id);
  if (kind === "quicklog" && payload.endpoint !== undefined) {
    if (payload.endpoint !== `/pets/${petId}/diary`) {
      throw new Error("DRAFT_ENDPOINT_MISMATCH");
    }
    if (typeof payload.text !== "string" || !payload.text.trim()) {
      throw new Error("DRAFT_DIARY_TEXT_MISSING");
    }
    return { path: `/pets/${petId}/diary`, body: { text: payload.text.trim() } };
  }
  if (kind === "quicklog" || kind === "behavior") {
    if (typeof payload.event_type !== "string" || !/^[a-z][a-z0-9_.]{1,80}$/.test(payload.event_type)) {
      throw new Error("DRAFT_EVENT_TYPE_UNVERIFIED");
    }
    if (!payload.payload || typeof payload.payload !== "object" || Array.isArray(payload.payload)) {
      throw new Error("DRAFT_EVENT_PAYLOAD_INVALID");
    }
    if (payload.artifact_ids !== undefined &&
        (!Array.isArray(payload.artifact_ids) || !payload.artifact_ids.every(id => typeof id === "string"))) {
      throw new Error("DRAFT_ARTIFACT_IDS_INVALID");
    }
    return {
      path: `/pets/${petId}/events`,
      body: {
        event_type: payload.event_type,
        payload: payload.payload,
        artifact_ids: payload.artifact_ids ?? [],
      },
    };
  }
  // Health intake and caregiver notes are governed flows. Without their
  // canonical endpoint/payload contract, NEVER recast them as diary events.
  throw new Error("DRAFT_KIND_REQUIRES_REVIEW");
}


export function listDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as Draft[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveAll(drafts: Draft[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function saveDraft(kind: DraftKind, payload: Record<string, unknown>): Draft {
  const draft: Draft = {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    created_at: new Date().toISOString(),
    status: "unsynced",
  };
  saveAll([...listDrafts(), draft]);
  return draft;
}

export function updateDraftStatus(id: string, status: SyncStatus): void {
  saveAll(listDrafts().map((d) => (d.id === id ? { ...d, status } : d)));
}

export function removeDraft(id: string): void {
  saveAll(listDrafts().filter((d) => d.id !== id));
}

/** 尝试同步所有未同步草稿；poster 提供实际提交方式。 */
export async function syncDrafts(
  poster: (kind: DraftKind, payload: Record<string, unknown>) => Promise<void>,
): Promise<{ synced: number; failed: number }> {
  const pending = listDrafts().filter((d) => d.status === "unsynced" || d.status === "failed");
  let synced = 0;
  let failed = 0;
  for (const d of pending) {
    updateDraftStatus(d.id, "syncing");
    try {
      await poster(d.kind, d.payload);
      updateDraftStatus(d.id, "synced");
      removeDraft(d.id);
      synced += 1;
    } catch {
      updateDraftStatus(d.id, "failed");
      failed += 1;
    }
  }
  return { synced, failed };
}

export const SYNC_LABELS: Record<SyncStatus, string> = {
  unsynced: "未同步",
  syncing: "同步中",
  synced: "已同步",
  failed: "同步失败",
};
