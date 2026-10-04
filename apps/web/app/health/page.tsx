"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State, TriageBadge } from "../../components/ui";
import { triageLabel } from "../../lib/ownerLabels";

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
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];
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

  const rows = list.data ?? [];
  const openCount = rows.filter((h) => h.status !== "CLOSED").length;
  const latestLevel = rows[0]?.latest_triage_level ?? null;

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.health.identity">
        <h1>健康事件</h1>
        <p className="sub">
          {current ? `${current.name} · 先看最近的健康记录和变化，需要时再记录新的异常。` : "先看最近的健康记录和变化，需要时再记录新的异常。"}
          风险提示来自独立规则；AI 只整理已有事实，不替代兽医判断。
        </p>
      </div>

      <section className="v4-sec" data-testid="pli.health.overview">
        <h2 className="v4-sec-title">近期状态概览</h2>
        <p className="sub" style={{ margin: 0 }}>
          {list.state === "loading" ? "加载中……" : openCount > 0 ? `有 ${openCount} 个未关闭的健康事件` : "没有未关闭的健康事件。"}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          状态：{latestLevel ? triageLabel(latestLevel) : "未分级"}（来自最近一条健康记录）
        </p>
      </section>

      <section className="v4-sec" data-testid="pli.health.changes">
        <h2 className="v4-sec-title">近期变化</h2>
        <p className="muted" style={{ margin: 0 }}>
          {rows.length > 0 ? `最近的健康事件是「${rows[0].chief_complaint}」，打开于 ${fmtTime(rows[0].opened_at)}。` : "还没有健康记录，变化会从第一条记录开始汇总。"}
        </p>
      </section>

      <section className="v4-sec" data-testid="pli.health.prevent">
        <h2 className="v4-sec-title">预防与计划</h2>
        <p className="muted" style={{ margin: 0 }}>疫苗、驱虫与定期体检记录会集中在这里。还没有相关记录。</p>
      </section>

      <section className="v4-sec" data-testid="pli.health.medication">
        <h2 className="v4-sec-title">用药</h2>
        <p className="muted" style={{ margin: 0 }}>
          用药计划与给药记录见「用药」页。{" "}
          <Link href="/medication">查看用药</Link>
        </p>
      </section>

      <div className="v5-form-surface">
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
        <button className="btn primary" onClick={open} disabled={busy || !petId} data-testid="pli.health.action">
          {busy ? "创建中…" : "打开健康事件"}
        </button>
      </div>

      <section className="v4-sec" data-testid="pli.health.records">
        <h2 className="v4-sec-title">健康记录</h2>
        <p className="muted" style={{ marginTop: 0 }} data-testid="pli.health.status">
          {rows.length} 条记录 · {openCount} 个进行中
        </p>
        <State state={list.state} error={list.error} onRetry={list.reload} empty="还没有健康事件。">
          <ul className="tl">
            {rows.map((h) => (
              <li key={h.health_event_id}>
                <div className="tl-head">
                  <Link href={`/health/${h.health_event_id}`} className="tl-type" role="button" data-testid="pli.health.records">
                    {h.chief_complaint}
                  </Link>
                  <TriageBadge level={h.latest_triage_level} />
                  <span className={`badge status-${h.status}`}>{h.status === "OPEN" ? "进行中" : h.status === "CLOSED" ? "已关闭" : "其他状态"}</span>
                  <span className="tl-time">{fmtTime(h.opened_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      </section>

      <div className="row" style={{ marginTop: 8 }} data-testid="pli.health.vet">
        <Link href="/medication" className="btn">
          用药
        </Link>
        <Link href="/behavior" className="btn">
          行为
        </Link>
      </div>
    </main>
  );
}
