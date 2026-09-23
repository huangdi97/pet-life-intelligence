"use client";

import type { Pet } from "@pli/api-client";

interface RecordInteractionPanelProps {
  pets: Pet[] | null;
  petId: string | null;
  friendPetId: string;
  onFriendChange: (v: string) => void;
  quality: string;
  onQualityChange: (v: string) => void;
  duration: string;
  onDurationChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  busy: boolean;
  onRecord: () => void;
}

/** OWN-012 Social — 记录互动表单（质量/时长/备注 + 安全说明）。 */
export function RecordInteractionPanel({
  pets,
  petId,
  friendPetId,
  onFriendChange,
  quality,
  onQualityChange,
  duration,
  onDurationChange,
  notes,
  onNotesChange,
  busy,
  onRecord,
}: RecordInteractionPanelProps) {
  return (
    <div className="card">
      <h2>记录互动</h2>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <select
          value={friendPetId}
          onChange={(e) => onFriendChange(e.target.value)}
          aria-label="伙伴宠物"
          style={{ maxWidth: 200 }}
        >
          <option value="">选择伙伴…</option>
          {pets
            ?.filter((p) => p.id !== petId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select value={quality} onChange={(e) => onQualityChange(e.target.value)} aria-label="互动质量" style={{ maxWidth: 140 }}>
          <option value="GOOD">顺利</option>
          <option value="NEUTRAL">平静</option>
          <option value="TENSE">紧张</option>
          <option value="BAD">冲突</option>
          <option value="UNKNOWN">未知</option>
        </select>
        <input
          type="number"
          min={0}
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
          aria-label="时长（分钟）"
          style={{ width: 110 }}
        />
        <input
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="备注（可选）"
          aria-label="备注"
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn primary" disabled={busy || !friendPetId} onClick={onRecord}>
          记录互动
        </button>
      </div>
      <p className="muted">安全：出现冲突或紧张时，双方 Owner 都会看到反馈；不会公开展示。</p>
    </div>
  );
}
