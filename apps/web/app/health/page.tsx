"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State, TriageBadge } from "../../components/ui";
import { triageLabel } from "../../lib/ownerLabels";

interface ReminderRow {
  reminder_id: string;
  kind: "VACCINE" | "DEWORMING" | "CHECKUP";
  title: string;
  due_date: string;
  status: string;
}

const REMINDER_KIND_LABEL: Record<ReminderRow["kind"], string> = {
  VACCINE: "疫苗",
  DEWORMING: "驱虫",
  CHECKUP: "体检",
};

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
  const reminders = useAsync<ReminderRow[]>(
    () =>
      petId
        ? api.get<ReminderRow[]>(`/pets/${petId}/reminders`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [reminderKind, setReminderKind] = useState<ReminderRow["kind"]>("VACCINE");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderBusy, setReminderBusy] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  async function createReminder() {
    if (!petId || !reminderTitle.trim() || !reminderDate || reminderBusy) return;
    setReminderBusy("create");
    setReminderError(null);
    try {
      await api.post(`/pets/${petId}/reminders`, {
        kind: reminderKind,
        title: reminderTitle.trim(),
        due_date: reminderDate,
        note: "",
      });
      setReminderTitle("");
      setReminderDate("");
      reminders.reload();
    } catch (e) {
      setReminderError(e instanceof Error ? e.message : String(e));
    } finally {
      setReminderBusy(null);
    }
  }

  async function completeReminder(reminderId: string) {
    if (reminderBusy) return;
    setReminderBusy(reminderId);
    setReminderError(null);
    try {
      await api.post(`/reminders/${reminderId}/done`, {});
      reminders.reload();
    } catch (e) {
      setReminderError(e instanceof Error ? e.message : String(e));
    } finally {
      setReminderBusy(null);
    }
  }

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
      setComposerOpen(false);
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
        <div className="v4-sec-head">
          <div>
            <h2 className="v4-sec-title">预防与计划</h2>
            <p className="v4-sec-sub">疫苗、驱虫和体检提醒来自主人明确记录；到期不等于异常，也不会自动推断已经完成。</p>
          </div>
        </div>
        <State
          state={reminders.state}
          error={reminders.error}
          onRetry={reminders.reload}
          empty="还没有预防提醒。"
        >
          <div className="v4-list">
            {(reminders.data ?? []).map((row) => (
              <div className="v4-list-row" key={row.reminder_id}>
                <div>
                  <strong>{REMINDER_KIND_LABEL[row.kind] ?? "提醒"} · {row.title}</strong>
                  <div className="v4-note">计划日期：{row.due_date} · {row.status === "DONE" ? "已完成" : "待完成"}</div>
                </div>
                {row.status !== "DONE" ? (
                  <button className="btn" onClick={() => void completeReminder(row.reminder_id)} disabled={reminderBusy !== null}>
                    {reminderBusy === row.reminder_id ? "保存中…" : "标记完成"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </State>
        <div className="grid2" style={{ marginTop: 12 }}>
          <label className="field">
            类型
            <select value={reminderKind} onChange={(e) => setReminderKind(e.target.value as ReminderRow["kind"])}>
              <option value="VACCINE">疫苗</option>
              <option value="DEWORMING">驱虫</option>
              <option value="CHECKUP">体检</option>
            </select>
          </label>
          <label className="field">
            计划日期
            <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            提醒内容
            <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="例如：年度核心疫苗" />
          </label>
        </div>
        {reminderError ? <p className="v4-note">提醒暂时没有保存成功：{reminderError}</p> : null}
        <button className="btn" onClick={() => void createReminder()} disabled={reminderBusy !== null || !reminderTitle.trim() || !reminderDate}>
          {reminderBusy === "create" ? "保存中…" : "添加预防提醒"}
        </button>
      </section>

      <section className="v4-sec" data-testid="pli.health.medication">
        <h2 className="v4-sec-title">用药</h2>
        <p className="muted" style={{ margin: 0 }}>
          用药计划与给药记录见「用药」页。{" "}
          <Link href="/medication">查看用药</Link>
        </p>
      </section>

      <section className="v4-sec v5-health-compose" data-testid="pli.health.compose">
        <div className="v4-sec-head">
          <div>
            <h2 className="v4-sec-title">需要记录新的变化？</h2>
            <p className="v4-sec-sub">只有发现新的异常或需要补充事实时再记录；阅读已有证据始终优先。</p>
          </div>
          <button
            type="button"
            className="btn"
            aria-expanded={composerOpen}
            aria-controls="pli-health-compose-form"
            onClick={() => {
              setComposerOpen((value) => !value);
              setError(null);
            }}
            data-testid="pli.health.compose.toggle"
          >
            {composerOpen ? "收起" : "记录健康事件"}
          </button>
        </div>
        {composerOpen ? (
          <div id="pli-health-compose-form" className="v5-form-surface v5-form-surface--inline">
            <h2>记录你真实观察到的情况</h2>
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
            <p className="v4-note">提交后由独立规则进行风险提示，不是 AI 诊断；紧急情况请直接联系兽医。</p>
            <ErrorNote message={error} />
            <button className="btn primary" onClick={open} disabled={busy || !petId || !complaint.trim()} data-testid="pli.health.action">
              {busy ? "创建中…" : "打开健康事件"}
            </button>
          </div>
        ) : null}
      </section>

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
