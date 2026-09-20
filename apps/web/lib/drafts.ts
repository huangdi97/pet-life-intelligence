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
