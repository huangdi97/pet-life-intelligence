"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State, TriageBadge } from "../../components/ui";

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

/** Surface 9: Health Event list + “发现异常”入口 (PLI-049, E2E-05). */
export default function HealthPage() {
  const { petId } = useCurrentPet();
  const router = useRouter();
  const list = useAsync<HealthEventRow[]>(
    () =>
      petId
        ? api.get<HealthEventRow[]>(`/pets/${petId}/health-events`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [complaint, setComplaint] = useState("");
  const [onset, setOnset] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!petId || !complaint.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ health_event_id: string }>(`/pets/${petId}/health-events`, {
        chief_complaint: complaint.trim(),
        onset_at: onset ? new Date(onset).toISOString() : null,
      });
      setComplaint("");
      list.reload();
      // jump straight into the intake flow
      router.push(`/health/${r.health_event_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>健康事件</h1>
      <p className="sub">
        发现异常 → 动态追问 → 可观察事实 → 红旗分级（规则引擎） → Vet Brief → Outcome。
        分级由独立规则引擎给出，AI 只整理事实，不能降低紧急度。
      </p>
      <div className="card">
        <h2>发现异常</h2>
        <label className="field">
          主诉 *（描述你观察到的异常）
          <textarea
            rows={2}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="如：精神不太好，晚饭没吃；或：反复进猫砂盆但几乎尿不出来"
          />
        </label>
        <label className="field">
          开始时间（可选）
          <input type="datetime-local" value={onset} onChange={(e) => setOnset(e.target.value)} />
        </label>
        <ErrorNote message={error} />
        <button className="btn primary" onClick={open} disabled={busy || !petId}>
          {busy ? "创建中…" : "打开健康事件"}
        </button>
      </div>

      <State state={list.state} error={list.error} onRetry={list.reload} empty="还没有健康事件。">
        <ul className="tl">
          {list.data?.map((h) => (
            <li key={h.health_event_id}>
              <div className="tl-head">
                <Link href={`/health/${h.health_event_id}`} className="tl-type">
                  {h.chief_complaint}
                </Link>
                <TriageBadge level={h.latest_triage_level} />
                <span className={`badge status-${h.status}`}>{h.status}</span>
                <span className="tl-time">{fmtTime(h.opened_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </State>
    </main>
  );
}
