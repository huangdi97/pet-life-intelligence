"use client";

import { api, ApiError, type Pet } from "@pli/api-client";
import { fmtTime, useAsync } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/errors";
import { State } from "../../components/ui";

interface HandoffRow {
  handoff_id: string;
  caregiver_user_id: string;
  scope: string;
  start_at: string;
  end_at: string | null;
  status: string;
  notes: string;
}

interface PetHandoffRow {
  pet: Pet;
  handoffs: HandoffRow[] | null;
  denied: boolean;
  error: string | null;
}

/** PRO-009 照护执行（上门服务 Service）：交接执行视图（GET /pets/{id}/handoffs）。
 *  交接范围 / 起止时间 / 状态 / 备注；单个患者无权限不影响其他患者。 */
export default function CareCardsPage() {
  const rows = useAsync<PetHandoffRow[]>(
    () =>
      api.get<Pet[]>("/pets").then(async (pets) =>
        Promise.all(
          pets.slice(0, 5).map(async (pet): Promise<PetHandoffRow> => {
            try {
              const handoffs = await api.get<HandoffRow[]>(`/pets/${pet.id}/handoffs`);
              return { pet, handoffs, denied: false, error: null };
            } catch (e) {
              return {
                pet,
                handoffs: null,
                denied: e instanceof ApiError && e.code === "PERMISSION_DENIED",
                error: e instanceof Error ? e.message : String(e),
              };
            }
          }),
        ),
      ),
    [],
  );

  return (
    <main>
      <h1>照护执行 · Care Cards</h1>
      <p className="sub">
        照护交接执行视图 · Handoffs — 范围 / 起止时间 / 状态 / 备注。
      </p>

      <State
        state={rows.state}
        error={rows.error ? mapErrorMessage(rows.error) : null}
        onRetry={rows.reload}
        empty="暂无被授权的患者，无法查看照护交接。"
      >
        {(rows.data ?? []).map(({ pet, handoffs, denied, error }) => (
          <div className="card" key={pet.id}>
            <h2>{pet.name}（{pet.species}）</h2>
            {denied ? (
              <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
            ) : error ? (
              <div className="state error">{mapErrorMessage(error)}</div>
            ) : (handoffs ?? []).length === 0 ? (
              <div className="state">暂无照护交接。</div>
            ) : (
              <table className="pli-table">
                <thead>
                  <tr>
                    <th>范围 scope</th>
                    <th>开始</th>
                    <th>结束</th>
                    <th>状态</th>
                    <th>备注</th>
                    <th>照护人</th>
                  </tr>
                </thead>
                <tbody>
                  {(handoffs ?? []).map((h) => (
                    <tr key={h.handoff_id}>
                      <td>{h.scope || "—"}</td>
                      <td>{fmtTime(h.start_at)}</td>
                      <td>{h.end_at ? fmtTime(h.end_at) : "—"}</td>
                      <td><span className={`badge status-${h.status}`}>{h.status}</span></td>
                      <td>{h.notes || "—"}</td>
                      <td>{h.caregiver_user_id.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </State>
    </main>
  );
}
