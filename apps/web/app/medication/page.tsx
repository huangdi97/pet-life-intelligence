"use client";

import { useState } from "react";
import { api, type MedicationPlan } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";
import { CareTask, EmptyState } from "@pli/ui-kit";
function sourceLabel(source: string): string {
  if (source === "PROFESSIONAL_CONFIRMED") return "兽医确认";
  if (source === "OWNER_REPORTED") return "主人记录";
  if (source === "LAB_CONFIRMED") return "检验确认";
  return "来源已记录";
}

function doseStatusLabel(status: string): string {
  if (status === "GIVEN") return "已给药";
  if (status === "MISSED") return "已遗漏";
  if (status === "SKIPPED") return "已跳过";
  if (status === "PENDING") return "待给药";
  if (status === "CANCELLED") return "已取消";
  return "计划中";
}

/** Surface 11: Medication (PLI-059/060) — plan, administrations, missed
 *  reminders, duplicate protection. v0.1 never recommends doses. */
export default function MedicationPage() {
  const { petId } = useCurrentPet();
  const plans = useAsync<MedicationPlan[]>(
    () =>
      petId
        ? api.get<MedicationPlan[]>(`/pets/${petId}/medication-plans`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [form, setForm] = useState({
    medicine_name: "",
    dose_text: "",
    route: "oral",
    frequency_per_day: "2",
    duration_days: "7",
    source_type: "PROFESSIONAL_CONFIRMED",
    source_note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createPlan() {
    if (!petId) return;
    setError(null);
    try {
      await api.post(`/pets/${petId}/medication-plans`, {
        medicine_name: form.medicine_name,
        dose_text: form.dose_text,
        route: form.route,
        frequency_per_day: Number(form.frequency_per_day),
        duration_days: Number(form.duration_days),
        source_type: form.source_type,
        source_note: form.source_note,
      });
      setForm((f) => ({ ...f, medicine_name: "", dose_text: "", source_note: "" }));
      setFormOpen(false);
      plans.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function give(planId: string, doseId: string) {
    setConflict(null);
    setError(null);
    try {
      await api.post(`/medication-plans/${planId}/administrations`, {
        planned_dose_id: doseId,
      });
      setFlash("已记录给药。");
      plans.reload();
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      const err = e as { code?: string; message?: string; details?: Record<string, unknown> };
      if (err.code === "MEDICATION_CONFLICT") {
        setConflict(
          `冲突：该剂量已由 ${String(err.details?.given_by ?? "他人")} 给药；首条记录保留，未覆盖。`,
        );
      } else {
        setError(err.message ?? String(e));
      }
      plans.reload();
    }
  }

  async function skip(planId: string, doseId: string) {
    setConflict(null);
    setError(null);
    try {
      await api.post(`/medication-plans/${planId}/skip`, {
        planned_dose_id: doseId,
        note: "主人记录为本次跳过",
      });
      setFlash("已记录本次跳过；没有修改用药计划或剂量。");
      plans.reload();
      setTimeout(() => setFlash(null), 2600);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "MEDICATION_CONFLICT") {
        setConflict("该剂量已有给药记录，不能改为跳过；原记录保持不变。");
      } else {
        setError(err.message ?? String(e));
      }
      plans.reload();
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <h1>用药管理</h1>
        <p className="sub">
          用药计划与给药记录。系统不推荐剂量、不自动建议停药；药物信息必须注明来源。
        </p>
      </div>
      {flash && <div className="alert info">{flash}</div>}
      {conflict && <div className="alert emergency">{conflict}</div>}



      <State state={plans.state} error={plans.error} onRetry={plans.reload} empty="还没有用药计划。">
        {plans.data?.length === 0 && (
          <EmptyState title="还没有用药计划" description="创建计划后，这里会显示待给剂量与给药时间表。" />
        )}
        {plans.data?.map((p) => {
          const pending = p.doses.filter((d) => d.status === "PENDING");
          const missed = p.doses.filter((d) => d.status === "MISSED");
          return (
            <div className="v5-plan-card" key={p.plan_id}>
              <div className="tl-head">
                <span className="tl-type">{p.medicine_name}</span>
                <span className="badge">{p.dose_text}</span>
                <span className="badge">{p.frequency_text || "按计划给药"}</span>
                <span className="badge">{sourceLabel(p.source_type)}</span>
                {missed.length > 0 && (
                  <span className="badge EMERGENCY">{missed.length} 次遗漏</span>
                )}
              </div>
              <p className="muted">
                {p.start_date ? `开始 ${fmtTime(p.start_date)}` : ""}
                {p.source_note ? ` · 来源：${p.source_note}` : ""}
              </p>
              <h3>待给药</h3>
              {pending.length === 0 && <p className="muted">没有待给剂量。</p>}
              {pending.slice(0, 6).map((d) => (
                <div key={d.dose_id} className="row" style={{ marginBottom: 6, gap: 8 }}>
                  <CareTask
                    task={{
                      title: `给 ${p.medicine_name} · ${p.dose_text}`,
                      status: "OPEN",
                      due_at: d.planned_at,
                    }}
                  />
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => give(p.plan_id, d.dose_id)}>
                      记录给药 {fmtTime(d.planned_at)}
                    </button>
                    <button className="btn" onClick={() => skip(p.plan_id, d.dose_id)}>
                      标记本次跳过
                    </button>
                  </div>
                </div>
              ))}
              <h3>时间表（近 10 条）</h3>
              <ul className="tl">
                {p.doses.slice(0, 10).map((d) => (
                  <li key={d.dose_id}>
                    <div className="tl-head">
                      <span className={`badge ${d.status === "GIVEN" ? "status-COMPLETED" : d.status === "MISSED" ? "EMERGENCY" : ""}`}>
                        {doseStatusLabel(d.status)}
                      </span>
                      <span className="tl-time">{fmtTime(d.planned_at)}</span>
                      {d.given_at && <span className="muted">给药于 {fmtTime(d.given_at)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </State>


      <section className="v4-sec v5-domain-create" data-form-open={formOpen ? "true" : "false"}>
        <div className="v4-sec-head">
          <div>
            <h2 className="v4-sec-title">添加用药计划</h2>
            <p className="v4-sec-sub">当前计划和待给药始终优先；有明确处方或来源时再录入新计划。</p>
          </div>
          <button
            type="button"
            className="btn"
            data-testid="pli.medication.create.toggle"
            aria-expanded={formOpen}
            aria-controls="pli-medication-create-form"
            onClick={() => {
              setFormOpen((value) => !value);
              setError(null);
            }}
          >
            {formOpen ? "收起" : "+ 新用药计划"}
          </button>
        </div>
        {formOpen ? (
          <div id="pli-medication-create-form" className="v5-form-surface v5-form-surface--inline">
            <h2>新用药计划</h2>
            <p className="v4-note">只录入你已经从处方、兽医或明确记录获得的信息；系统不生成剂量建议。</p>
            <div className="grid2">
              <label className="field">药名<input value={form.medicine_name} onChange={(e) => set("medicine_name", e.target.value)} /></label>
              <label className="field">剂量文字（来自处方）<input value={form.dose_text} onChange={(e) => set("dose_text", e.target.value)} placeholder="如 50mg" /></label>
              <label className="field">途径<input value={form.route} onChange={(e) => set("route", e.target.value)} /></label>
              <label className="field">每日次数<input type="number" min={1} max={12} value={form.frequency_per_day} onChange={(e) => set("frequency_per_day", e.target.value)} /></label>
              <label className="field">天数<input type="number" min={1} max={30} value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} /></label>
              <label className="field">信息来源<select value={form.source_type} onChange={(e) => set("source_type", e.target.value)}><option value="PROFESSIONAL_CONFIRMED">兽医确认</option><option value="OWNER_REPORTED">主人记录</option><option value="LAB_CONFIRMED">检验确认</option></select></label>
              <label className="field">来源备注（兽医/诊所）<input value={form.source_note} onChange={(e) => set("source_note", e.target.value)} /></label>
            </div>
            <ErrorNote message={error} />
            <button data-testid="pli.medication.create.submit" className="btn primary" onClick={createPlan} disabled={!petId || !form.medicine_name || !form.dose_text}>
              创建计划
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
