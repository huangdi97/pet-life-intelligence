"use client";

import type { Pet } from "@pli/api-client";
import type { Async } from "../../../../lib/hooks";

export function BaselineCard({ pet }: { pet: Async<Pet> }) {
  const p = pet.data;
  return (
    <div className="card">
      <h2>基线 · Baseline</h2>
      {p?.weight_note ? (
        <div className="row" style={{ gap: 6 }}>
          <span className="badge">体重备注：{p.weight_note}</span>
        </div>
      ) : (
        <p className="muted">暂无基线记录（基线能力未开放，仅显示体重备注）。</p>
      )}
    </div>
  );
}
