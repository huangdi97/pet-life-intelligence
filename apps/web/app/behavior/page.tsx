"use client";

import { useState } from "react";
import { api, type BehaviorEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

/** Surface 8: Behavior Event (PLI-069, E2E-07) — ABC records, observable
 *  facts only; the app never auto-converts observations into diagnoses. */
export default function BehaviorPage() {
  const { petId } = useCurrentPet();
  const list = useAsync<BehaviorEvent[]>(
    () =>
      petId
        ? api.get<BehaviorEvent[]>(`/pets/${petId}/behavior-events`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [form, setForm] = useState({
    occurred_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    antecedent: "",
    behavior: "",
    consequence: "",
    duration_seconds: "",
    intensity: "",
    environment: "",
    owner_notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setValidation(null);
    if (!form.behavior.trim()) {
      setValidation("“观察到的行为”必填。");
      return;
    }
    setError(null);
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date(form.occurred_at).toISOString(),
        antecedent: form.antecedent,
        behavior: form.behavior.trim(),
        consequence: form.consequence,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        intensity: form.intensity,
        environment: form.environment,
        owner_notes: form.owner_notes,
      });
      setForm((f) => ({ ...f, antecedent: "", behavior: "", consequence: "" }));
      list.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.behavior.identity">
        <h1>行为记录</h1>
        <p className="sub">
          记录它当时遇到了什么、你实际看到了什么，以及之后发生了什么。系统只保存可观察事实，不会自动推断情绪、疾病或行为诊断。
        </p>
      </div>

      <section className="v4-sec" data-testid="pli.behavior.patterns">
        <h2 className="v4-sec-title">模式与倾向</h2>
        <p className="muted" style={{ margin: 0 }}>
          {(list.data?.length ?? 0) > 0
            ? "行为记录积累后，这里会汇总出现的情境与模式，不判断情绪。"
            : "还没有足够记录，模式会在多条行为记录后慢慢成形。"}
        </p>
      </section>

      <section className="v4-sec" data-testid="pli.behavior.context">
        <h2 className="v4-sec-title">情境与触发</h2>
        <p className="muted" style={{ margin: 0 }}>前因、环境与触发条件会从每条行为记录中汇总到这里。</p>
      </section>

      <div className="v5-form-surface">
        <h2>记录一次行为事件</h2>
        <label className="field">
          发生时间
          <input type="datetime-local" value={form.occurred_at} onChange={(e) => set("occurred_at", e.target.value)} />
        </label>
        <label className="field">
          发生之前（当时遇到了什么？）
          <input value={form.antecedent} onChange={(e) => set("antecedent", e.target.value)} placeholder="如：门铃响 / 陌生狗经过" />
        </label>
        <label className="field">
          你观察到的行为 *（写看到的事实，不写结论）
          <input value={form.behavior} onChange={(e) => set("behavior", e.target.value)} placeholder="如：连续吠叫约1分钟后躲到沙发下" />
        </label>
        <label className="field">
          发生之后（接着发生了什么？）
          <input value={form.consequence} onChange={(e) => set("consequence", e.target.value)} placeholder="如：主人安抚后自行出来" />
        </label>
        <div className="grid2">
          <label className="field">
            持续秒数
            <input type="number" min={0} value={form.duration_seconds} onChange={(e) => set("duration_seconds", e.target.value)} />
          </label>
          <label className="field">
            强度（主人主观，将标记为主人记录）
            <select value={form.intensity} onChange={(e) => set("intensity", e.target.value)}>
              <option value="">未标注</option>
              <option value="MILD">轻度</option>
              <option value="MODERATE">中度</option>
              <option value="SEVERE">重度</option>
            </select>
          </label>
          <label className="field">
            环境
            <input value={form.environment} onChange={(e) => set("environment", e.target.value)} placeholder="如：客厅" />
          </label>
        </div>
        <label className="field">
          备注
          <textarea rows={2} value={form.owner_notes} onChange={(e) => set("owner_notes", e.target.value)} />
        </label>
        {validation && <div className="alert warn">{validation}</div>}
        <ErrorNote message={error} />
        <button className="btn primary" onClick={submit} disabled={!petId} data-testid="pli.behavior.action">
          保存行为事件
        </button>
      </div>

      <section className="v4-sec" data-testid="pli.behavior.recent">
        <h2 className="v4-sec-title">最近记录</h2>
        <State state={list.state} error={list.error} onRetry={list.reload} empty="还没有行为记录。">
          <ul className="tl" data-testid="pli.behavior.observations">
            {list.data?.map((b) => (
              <li key={b.behavior_event_id}>
                <div className="tl-head">
                  <span className="tl-type">{b.behavior}</span>
                  {b.intensity && <span className="badge">{b.intensity === "MILD" ? "轻度" : b.intensity === "MODERATE" ? "中度" : b.intensity === "SEVERE" ? "重度" : b.intensity}（主人记录）</span>}
                  <span className="tl-time" data-testid="pli.behavior.source">{fmtTime(b.occurred_at)}</span>
                </div>
                <div className="tl-body">
                  之前：{b.antecedent || "—"} · 之后：{b.consequence || "—"} · 环境：{b.environment || "—"}
                </div>
              </li>
            ))}
          </ul>
        </State>
      </section>
    </main>
  );
}
