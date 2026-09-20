"use client";

import { api, ApiError, type Pet, type Task } from "@pli/api-client";
import { fmtTime, useAsync } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/errors";
import { State } from "../../components/ui";

interface PetTaskRow {
  pet: Pet;
  tasks: Task[] | null;
  denied: boolean;
  error: string | null;
}

/** PRO-010 任务（上门服务 Service）：GET /pets/{id}/tasks，
 *  按 task_type 分区：用药 Medication / 照护更新 Updates / 就诊 Incident / 其他。 */
const SECTION_LABELS: Array<{ id: string; label: string; match: (t: string) => boolean }> = [
  { id: "MEDICATION", label: "用药 · Medication", match: (t) => t === "MEDICATION" },
  { id: "CARE", label: "照护更新 · Updates", match: (t) => t === "FEED" || t === "WALK" || t === "GROOMING" },
  { id: "VET_VISIT", label: "就诊 · Incident", match: (t) => t === "VET_VISIT" },
  { id: "OTHER", label: "其他 · Other", match: (t) => t === "OTHER" || t === "" },
];

const STATUS_LABELS: Record<string, string> = {
  OPEN: "待办",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default function TasksPage() {
  const rows = useAsync<PetTaskRow[]>(
    () =>
      api.get<Pet[]>("/pets").then(async (pets) =>
        Promise.all(
          pets.slice(0, 5).map(async (pet): Promise<PetTaskRow> => {
            try {
              const tasks = await api.get<Task[]>(`/pets/${pet.id}/tasks`);
              return { pet, tasks, denied: false, error: null };
            } catch (e) {
              return {
                pet,
                tasks: null,
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
      <h1>任务</h1>
      <p className="sub">任务清单 · Tasks — 按用药 / 照护更新 / 就诊分区。</p>

      <State
        state={rows.state}
        error={rows.error ? mapErrorMessage(rows.error) : null}
        onRetry={rows.reload}
        empty="暂无被授权的患者，无法查看任务。"
      >
        {(rows.data ?? []).map(({ pet, tasks, denied, error }) => {
          const all = tasks ?? [];
          const matched = SECTION_LABELS.filter((s) => all.some((t) => s.match(t.task_type)));
          return (
            <div className="card" key={pet.id}>
              <h2>{pet.name}（{pet.species}）</h2>
              {denied ? (
                <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
              ) : error ? (
                <div className="state error">{mapErrorMessage(error)}</div>
              ) : all.length === 0 ? (
                <div className="state">暂无任务。</div>
              ) : (
                <>
                  {matched.map((s) => (
                    <div key={s.id}>
                      <h3>{s.label}</h3>
                      <table className="pli-table">
                        <thead>
                          <tr>
                            <th>标题</th>
                            <th>状态</th>
                            <th>截止</th>
                            <th>完成备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {all
                            .filter((t) => s.match(t.task_type))
                            .map((t) => (
                              <tr key={t.id}>
                                <td>{t.title}</td>
                                <td>
                                  <span className={`badge status-${t.status}`}>
                                    {STATUS_LABELS[t.status] ?? t.status}
                                  </span>
                                </td>
                                <td>{t.due_at ? fmtTime(t.due_at) : "—"}</td>
                                <td>{t.completion_note || "—"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {all.some((t) => !SECTION_LABELS.some((s) => s.match(t.task_type))) && (
                    <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                      部分任务类型未归类显示（能力未开放）。
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </State>
    </main>
  );
}
