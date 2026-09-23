"use client";

import type { Pet } from "@pli/api-client";
import { type Async } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { State } from "../../../../components/ui";

export function IdentityCard({ pet }: { pet: Async<Pet> }) {
  const p = pet.data;
  return (
    <div className="card">
      <h2>基本信息 · Identity</h2>
      <State state={pet.state} error={pet.error ? mapErrorMessage(pet.error) : null} onRetry={pet.reload} empty="—">
        <div className="row" style={{ gap: 6 }}>
          <span className="badge">种类：{p?.species}</span>
          <span className="badge">品种：{p?.breed || "—"}</span>
          <span className="badge">性别：{p?.sex}</span>
          <span className="badge">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
          <span className="badge">时区：{p?.timezone}</span>
        </div>
      </State>
    </div>
  );
}
