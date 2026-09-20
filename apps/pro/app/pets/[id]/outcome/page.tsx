"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, type HealthEventDetail, type Pet } from "@pli/api-client";
import { fmtTime, useAsync } from "../../../../lib/hooks";
import { mapActionError, mapErrorMessage } from "../../../../lib/errors";
import { ErrorNote, State, TriageBadge } from "../../../../components/ui";

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
}

const NO_PET = "NO_PET_SELECTED";

const OUTCOMES: Array<{ value: string; label: string }> = [
  { value: "RECOVERED", label: "康复 RECOVERED" },
  { value: "IMPROVED", label: "好转 IMPROVED" },
  { value: "UNCHANGED", label: "无变化 UNCHANGED" },
  { value: "WORSENED", label: "恶化 WORSENED" },
  { value: "RELAPSED", label: "复发 RELAPSED" },
  { value: "REFERRED", label: "转诊 REFERRED" },
  { value: "UNRESOLVED", label: "未解决 UNRESOLVED" },
];

const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

/** PRO-006 结局记录：POST /health-events/{id}/outcomes（outcome: IMPROVED 等）。
 *  结局基于实际观察记录；本页不生成诊断；错误映射为人话。 */
export default function OutcomePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const reject = () => Promise.reject(new Error(NO_PET));

  const [selected, setSelected] = useState("");
  const [outcome, setOutcome] = useState("IMPROVED");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pet = useAsync<Pet>(() => (id ? api.get<Pet>(`/pets/${id}`) : reject()), [id]);
  const healthEvents = useAsync<HealthEventRow[]>(
    () => (id ? api.get<HealthEventRow[]>(`/pets/${id}/health-events`) : reject()),
    [id],
  );
  const detail = useAsync<HealthEventDetail | null>(
    () =>
      selected
        ? api.get<HealthEventDetail>(`/health-events/${selected}`)
        : Promise.resolve(null),
    [selected],
  );

  if (!id || pet.state === "denied") {
    return (
      <main>
        <h1>记录结局 · Outcome</h1>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const rows = healthEvents.data ?? [];
  const sel = detail.data;

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const r = await api.post<{ outcome_id: string; outcome: string; health_event_status: string }>(
        `/health-events/${selected}/outcomes`,
        { outcome, notes },
      );
      const label = OUTCOMES.find((o) => o.value === r.outcome)?.label ?? r.outcome;
      setSuccess(`已记录结局：${label}。事件状态：${STATUS_LABELS[r.health_event_status] ?? r.health_event_status}。`);
      healthEvents.reload();
      detail.reload();
    } catch (e) {
      setActionError(mapActionError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>记录结局 · Outcome</h1>
      <p className="sub">
        {pet.data?.name ?? "患者"} · 基于实际观察记录结局；本页为信息整理，不生成诊断。
      </p>

      <div className="card">
        <h2>选择健康事件</h2>
        <State
          state={healthEvents.state}
          error={healthEvents.error ? mapErrorMessage(healthEvents.error) : null}
          onRetry={healthEvents.reload}
          empty="暂无健康事件，无法记录结局。"
        >
          <label className="field">
            健康事件
            <select value={selected} onChange={(e) => { setSelected(e.target.value); setSuccess(null); }} aria-label="选择健康事件">
              <option value="">（请选择）</option>
              {rows.map((h) => (
                <option key={h.health_event_id} value={h.health_event_id}>
                  {h.chief_complaint}（{STATUS_LABELS[h.status] ?? h.status}）
                </option>
              ))}
            </select>
          </label>

          {selected && (
            <State
              state={detail.state}
              error={detail.error ? mapErrorMessage(detail.error) : null}
              onRetry={detail.reload}
            >
              {sel && (
                <>
                  <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    <span className={`badge status-${sel.status}`}>当前状态：{STATUS_LABELS[sel.status] ?? sel.status}</span>
                    <TriageBadge level={sel.latest_triage_level} />
                  </div>
                  {sel.outcomes.length > 0 ? (
                    <>
                      <h3>已有结局记录</h3>
                      <table className="pli-table">
                        <thead>
                          <tr>
                            <th>结局</th>
                            <th>备注</th>
                            <th>记录时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sel.outcomes.map((o, i) => (
                            <tr key={`${o.recorded_at}-${i}`}>
                              <td><span className={`badge status-${o.outcome}`}>{o.outcome}</span></td>
                              <td>{o.notes || "—"}</td>
                              <td>{fmtTime(o.recorded_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="muted" style={{ marginBottom: 0 }}>暂无结局记录。</p>
                  )}
                </>
              )}
            </State>
          )}
        </State>
      </div>

      {selected && (
        <div className="card">
          <h2>记录新结局</h2>
          <label className="field">
            结局 Outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="选择结局">
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            备注（可选）
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="补充观察（例如：精神与食欲变化）"
            />
          </label>
          {actionError && <ErrorNote message={actionError} />}
          {success && <div className="alert info">{success}</div>}
          <div className="row">
            <button className="btn primary" onClick={submit} disabled={busy}>
              {busy ? "记录中…" : "记录结局"}
            </button>
            <button className="btn" onClick={() => router.push(`/pets/${id}`)}>
              返回患者档案
            </button>
          </div>
          <p className="notice-ai">
            结局记录会写入事件日志（health.outcome_recorded），带 pet / actor / time / source。
          </p>
        </div>
      )}

      {!selected && rows.length > 0 && (
        <p className="muted">请先在上方选择一个健康事件。</p>
      )}
      <p className="muted">
        <Link href={`/pets/${id}`}>← 返回患者档案 · Pet Brief</Link>
      </p>
    </main>
  );
}
