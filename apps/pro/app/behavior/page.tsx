"use client";

import { api, ApiError, type BehaviorEvent, type Pet } from "@pli/api-client";
import { fmtTime, useAsync } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/errors";
import { State } from "../../components/ui";

interface PetBehaviorRow {
  pet: Pet;
  events: BehaviorEvent[] | null;
  denied: boolean;
  error: string | null;
}

/** PRO-007 行为观察（训导师）：跨被授权患者的行为事件，显式 ABC 结构
 *  （发生前 Antecedent / 行为 Behavior / 之后 Consequence）。
 *  单个患者无权限不影响其他患者（按患者容错）。 */
export default function BehaviorPage() {
  const rows = useAsync<PetBehaviorRow[]>(
    () =>
      api.get<Pet[]>("/pets").then(async (pets) =>
        Promise.all(
          pets.slice(0, 5).map(async (pet): Promise<PetBehaviorRow> => {
            try {
              const events = await api.get<BehaviorEvent[]>(`/pets/${pet.id}/behavior-events`);
              return { pet, events, denied: false, error: null };
            } catch (e) {
              return {
                pet,
                events: null,
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
      <h1>行为观察</h1>
      <p className="sub">
        跨患者的行为记录 · ABC 结构（发生前 Antecedent / 行为 Behavior / 之后 Consequence）。原始观察按事实保存；系统不会自动推断疾病或行为诊断。
      </p>

      <State
        state={rows.state}
        error={rows.error ? mapErrorMessage(rows.error) : null}
        onRetry={rows.reload}
        empty="暂无被授权的患者，无法查看行为记录。"
      >
        {(rows.data ?? []).map(({ pet, events, denied, error }) => (
          <div className="card" key={pet.id}>
            <h2>{pet.name}（{pet.species}）</h2>
            {denied ? (
              <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
            ) : error ? (
              <div className="state error">{mapErrorMessage(error)}</div>
            ) : (events ?? []).length === 0 ? (
              <div className="state">暂无行为记录。</div>
            ) : (
              <>
                <table className="pli-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>发生前 Antecedent</th>
                      <th>行为 Behavior</th>
                      <th>之后 Consequence</th>
                      <th>强度</th>
                      <th>时长</th>
                      <th>环境</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(events ?? []).slice(0, 10).map((b) => (
                      <tr key={b.behavior_event_id}>
                        <td>{fmtTime(b.occurred_at)}</td>
                        <td>{b.antecedent || "—"}</td>
                        <td>{b.behavior}</td>
                        <td>{b.consequence || "—"}</td>
                        <td>{b.intensity ? <span className="badge">{b.intensity}</span> : "—"}</td>
                        <td>{b.duration_seconds != null ? `${b.duration_seconds}s` : "—"}</td>
                        <td>{b.environment || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(events ?? []).length > 10 && (
                  <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                    仅显示最近 10 条（共 {(events ?? []).length} 条）。
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </State>
    </main>
  );
}
