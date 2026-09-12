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
    <main>
      <h1>行为记录</h1>
      <p className="sub">
        ABC 记录法：前因（Antecedent）→ 可观察行为（Behavior）→ 后果（Consequence）。
        系统只保存可观察事实，不会自动推断疾病或行为诊断（PLI-069）。
      </p>
      <div className="card">
        <h2>记录一次行为事件</h2>
        <label className="field">
          发生时间
          <input type="datetime-local" value={form.occurred_at} onChange={(e) => set("occurred_at", e.target.value)} />
        </label>
        <label className="field">
          前因 / 情境（发生了什么之前？）
          <input value={form.antecedent} onChange={(e) => set("antecedent", e.target.value)} placeholder="如：门铃响 / 陌生狗经过" />
        </label>
        <label className="field">
          观察到的行为 *（写你看到的，不要写结论）
          <input value={form.behavior} onChange={(e) => set("behavior", e.target.value)} placeholder="如：连续吠叫约1分钟后躲到沙发下" />
        </label>
        <label className="field">
          后果（之后发生了什么？）
          <input value={form.consequence} onChange={(e) => set("consequence", e.target.value)} placeholder="如：主人安抚后自行出来" />
        </label>
        <div className="grid2">
          <label className="field">
            持续秒数
            <input type="number" min={0} value={form.duration_seconds} onChange={(e) => set("duration_seconds", e.target.value)} />
          </label>
          <label className="field">
            强度（主人主观，将标记为 OWNER_REPORTED）
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
        <button className="btn primary" onClick={submit} disabled={!petId}>
          保存行为事件
        </button>
      </div>

      <State state={list.state} error={list.error} onRetry={list.reload} empty="还没有行为记录。">
        <ul className="tl">
          {list.data?.map((b) => (
            <li key={b.behavior_event_id}>
              <div className="tl-head">
                <span className="tl-type">{b.behavior}</span>
                {b.intensity && <span className="badge">{b.intensity}（{b.intensity_source}）</span>}
                <span className="tl-time">{fmtTime(b.occurred_at)}</span>
              </div>
              <div className="tl-body">
                前因：{b.antecedent || "—"} · 后果：{b.consequence || "—"} · 环境：{b.environment || "—"}
              </div>
            </li>
          ))}
        </ul>
      </State>
    </main>
  );
}
