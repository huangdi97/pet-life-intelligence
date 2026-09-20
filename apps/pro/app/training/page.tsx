"use client";

import { api, ApiError, type Pet } from "@pli/api-client";
import { useAsync } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/errors";
import { State } from "../../components/ui";

interface GoalRow {
  goal_id: string;
  title: string;
  status: string;
  mastery_level: number;
  steps: unknown[];
  target_behavior: string;
}

interface PetGoalsRow {
  pet: Pet;
  goals: GoalRow[] | null;
  denied: boolean;
  error: string | null;
}

function stepLabel(s: unknown): string {
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && "description" in s) {
    const d = (s as { description: unknown }).description;
    if (typeof d === "string") return d;
  }
  return JSON.stringify(s);
}

function stepStatus(s: unknown): string {
  if (s && typeof s === "object" && "status" in s) {
    const v = (s as { status: unknown }).status;
    if (typeof v === "string") return v;
  }
  return "";
}

/** PRO-008 训练目标（训导师）：Plan / Progress（GET /pets/{id}/training-goals）。
 *  奖励式训练（reward-based only）；掌握度 0..5 来自后端记录。 */
export default function TrainingPage() {
  const rows = useAsync<PetGoalsRow[]>(
    () =>
      api.get<Pet[]>("/pets").then(async (pets) =>
        Promise.all(
          pets.slice(0, 5).map(async (pet): Promise<PetGoalsRow> => {
            try {
              const goals = await api.get<GoalRow[]>(`/pets/${pet.id}/training-goals`);
              return { pet, goals, denied: false, error: null };
            } catch (e) {
              return {
                pet,
                goals: null,
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
      <h1>训练目标</h1>
      <p className="sub">
        训练计划与进度 · Training Goals — 仅奖励式训练（reward-based only）。
      </p>

      <State
        state={rows.state}
        error={rows.error ? mapErrorMessage(rows.error) : null}
        onRetry={rows.reload}
        empty="暂无被授权的患者，无法查看训练目标。"
      >
        {(rows.data ?? []).map(({ pet, goals, denied, error }) => (
          <div className="card" key={pet.id}>
            <h2>{pet.name}（{pet.species}）</h2>
            {denied ? (
              <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
            ) : error ? (
              <div className="state error">{mapErrorMessage(error)}</div>
            ) : (goals ?? []).length === 0 ? (
              <div className="state">暂无训练目标。</div>
            ) : (
              (goals ?? []).map((g) => (
                <div key={g.goal_id} style={{ marginBottom: 14 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{g.title}</strong>
                    <span className={`badge status-${g.status}`}>{g.status}</span>
                  </div>
                  {g.target_behavior && <p className="muted" style={{ margin: "4px 0" }}>目标行为：{g.target_behavior}</p>}
                  <div className="mastery" style={{ margin: "6px 0" }}>
                    <span className="muted">掌握度 {g.mastery_level}/5</span>
                    <div className="mastery-track" aria-hidden="true">
                      <div className="mastery-fill" style={{ width: `${Math.max(0, Math.min(5, g.mastery_level)) * 20}%` }} />
                    </div>
                  </div>
                  {g.steps.length > 0 && (
                    <details>
                      <summary className="muted" style={{ cursor: "pointer" }}>
                        训练步骤（{g.steps.length}）
                      </summary>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 13 }}>
                        {g.steps.map((s, i) => (
                          <li key={i}>
                            {stepLabel(s)}
                            {stepStatus(s) ? `（${stepStatus(s)}）` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </State>
    </main>
  );
}
