import { useCallback, useEffect, useState } from "react";
import { Button, Input, Text, Textarea, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime, riskLabel } from "../../utils/format";

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

function statusLabel(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "CLOSED") return "已结束";
  return "已记录";
}

function highRisk(level: string | null): boolean {
  return level === "URGENT" || level === "EMERGENCY";
}

export default function Health() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [rows, setRows] = useState<HealthEventRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);\n  const [reminderFormOpen, setReminderFormOpen] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [reminderState, setReminderState] = useState<"loading" | "ready" | "error">("loading");
  const [reminderKind, setReminderKind] = useState<ReminderRow["kind"]>("VACCINE");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderBusy, setReminderBusy] = useState<string | null>(null);

  const load = useCallback((pid: string) => {
    setState("loading");
    api.get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((items) => {
        setRows(items);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const loadReminders = useCallback((pid: string) => {
    setReminderState("loading");
    api.get<ReminderRow[]>(`/pets/${pid}/reminders`)
      .then((items) => {
        setReminders(items);
        setReminderState("ready");
      })
      .catch(() => {
        setReminders([]);
        setReminderState("error");
      });
  }, []);

  useEffect(() => {
    if (petId) {
      load(petId);
      loadReminders(petId);
    }
  }, [petId, load, loadReminders]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">健康</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function createReminder() {
    if (!petId || reminderBusy || !reminderTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(reminderDate)) return;
    setReminderBusy("create");
    try {
      await api.post(`/pets/${petId}/reminders`, {
        kind: reminderKind,
        title: reminderTitle.trim(),
        due_date: reminderDate,
        note: "",
      });
      setReminderTitle("");
      setReminderDate("");
      loadReminders(petId);
      load(petId);
      Taro.showToast({ title: "预防提醒已保存", icon: "success" });
    } catch {
      setReminderState("error");
      Taro.showToast({ title: "暂时无法保存提醒", icon: "none" });
    } finally {
      setReminderBusy(null);
    }
  }

  async function completeReminder(reminderId: string) {
    if (!petId || reminderBusy) return;
    setReminderBusy(reminderId);
    try {
      await api.post(`/reminders/${reminderId}/done`, {});
      loadReminders(petId);
      load(petId);
    } catch {
      setReminderState("error");
    } finally {
      setReminderBusy(null);
    }
  }

  async function openEvent() {
    if (!complaint.trim() || !petId || busy) return;
    setBusy(true);
    try {
      await api.post(`/pets/${petId}/health-events`, {
        chief_complaint: complaint.trim(),
        duration_text: duration.trim(),
      });
      setShowCreate(false);
      setComplaint("");
      setDuration("");
      load(petId);
      Taro.showToast({ title: "健康记录已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  const latest = rows[0] ?? null;
  const recentSevenDays = rows.filter((row) => Date.now() - new Date(row.opened_at).getTime() < 7 * 24 * 60 * 60 * 1000);

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name}的健康` : "健康"}</View>
      <View className="sub">整理观察与风险分级，帮助你知道下一步；不构成诊断。</View>

      {state === "loading" && <View className="state">正在读取健康记录……</View>}
      {state === "error" && (
        <View className="state state-error">
          暂时连接不上，已有内容不会被改写。
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}

      <View className="soft-hero">
        <View className="section-title">近期状态</View>
        {state === "error" ? (
          <View className="life-empty-note">健康记录暂时没有加载成功；不会把未知状态显示成“暂无”或“正常”。</View>
        ) : (
          <>
            <View className="metric-row">
              <View className="metric-cell">
                <View className="metric-value">{state === "loading" ? "…" : latest ? riskLabel(latest.latest_triage_level) : "暂无"}</View>
                <View className="metric-label">最近一次分级</View>
              </View>
              <View className="metric-cell">
                <View className="metric-value">{state === "loading" ? "…" : recentSevenDays.length}</View>
                <View className="metric-label">近 7 天记录</View>
              </View>
            </View>
            {state === "ready" && latest ? (
              <View className={highRisk(latest.latest_triage_level) ? "attention-panel attention-danger" : "attention-panel attention-calm"}>
                <View>
                  <View className="attention-title">{riskLabel(latest.latest_triage_level)}</View>
                  <View className="attention-body">{latest.chief_complaint}</View>
                  <View className="attention-footer">{statusLabel(latest.status)} · {fmtTime(latest.opened_at)}</View>
                </View>
              </View>
            ) : state === "ready" ? (
              <View className="life-empty-note">还没有健康变化记录。</View>
            ) : null}
          </>
        )}
      </View>

      <View className="open-section">
        <View className="section-title">健康记录</View>
        {state === "error" ? (
          <View className="life-empty-note">健康记录暂时不可用，请重试。</View>
        ) : state === "ready" && rows.length ? rows.map((row) => (
          <View className="life-row" key={row.health_event_id} onClick={() => Taro.navigateTo({ url: `/pages/health/detail/index?id=${row.health_event_id}` })}>
            <View className={highRisk(row.latest_triage_level) ? "life-dot life-dot-danger" : "life-dot"} />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{row.chief_complaint}</Text>
                <Text className="life-row-time">{riskLabel(row.latest_triage_level)}</Text>
              </View>
              <View className="life-row-detail">{statusLabel(row.status)} · {fmtTime(row.opened_at)} · 查看详情 ›</View>
            </View>
          </View>
        )) : state === "ready" ? (
          <View className="life-empty-note">从一次真实观察开始，分级与后续变化会留在这里。</View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">预防与用药</View>
        <View className="life-row" onClick={() => Taro.navigateTo({ url: "/pages/medication/index" })}>
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">用药计划与给药记录</Text>
              <Text className="life-row-time">›</Text>
            </View>
            <View className="life-row-detail">剂量以兽医处方为准；这里区分计划、已给、跳过与漏服。</View>
          </View>
        </View>
        <View data-testid="pli.mini.health.reminders">
          <View className="life-row-source">疫苗、驱虫和体检提醒来自主人明确记录；到期不等于异常，也不会自动推断已经完成。</View>
          {reminderState === "loading" ? (
            <View className="state">正在读取预防提醒……</View>
          ) : reminderState === "error" ? (
            <View className="state state-error">预防提醒暂时没有加载成功；不会用默认日期替代真实计划。</View>
          ) : reminders.length ? reminders.map((row) => (
            <View className="life-row" key={row.reminder_id}>
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{REMINDER_KIND_LABEL[row.kind]} · {row.title}</Text>
                  <Text className="life-row-time">{row.status === "DONE" ? "已完成" : row.due_date}</Text>
                </View>
                {row.status !== "DONE" ? (
                  <View className="secondary-action" onClick={() => void completeReminder(row.reminder_id)}>
                    {reminderBusy === row.reminder_id ? "保存中…" : "标记完成"}
                  </View>
                ) : null}
              </View>
            </View>
          )) : (
            <View className="life-empty-note">还没有预防提醒。</View>
          )}
          <View
            className="secondary-action"
            data-testid="pli.mini.health.reminder.toggle"
            onClick={() => setReminderFormOpen((value) => !value)}
          >
            {reminderFormOpen ? "收起" : "＋ 添加预防提醒"}
          </View>
          {reminderFormOpen ? (
            <View className="soft-panel" data-testid="pli.mini.health.reminder.form">
              <View className="chips">
                {(["VACCINE", "DEWORMING", "CHECKUP"] as const).map((kind) => (
                  <View key={kind} className={`chip${reminderKind === kind ? " chip-active" : ""}`} onClick={() => setReminderKind(kind)}>
                    {REMINDER_KIND_LABEL[kind]}
                  </View>
                ))}
              </View>
              <Input className="input" value={reminderDate} onInput={(event) => setReminderDate(event.detail.value)} placeholder="计划日期 YYYY-MM-DD" />
              <Input className="input" value={reminderTitle} onInput={(event) => setReminderTitle(event.detail.value)} placeholder="例如：年度核心疫苗" />
              <Button data-testid="pli.mini.health.reminder.submit" className="btn" disabled={reminderBusy !== null || !reminderTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(reminderDate)} onClick={() => void createReminder()}>
                {reminderBusy === "create" ? "保存中…" : "保存预防提醒"}
              </Button>
            </View>
          ) : null}
        </View>
      </View>

      <View className="open-section">
        <View className="section-title" onClick={() => setShowCreate((value) => !value)}>
          记录健康事件
          <Text className="section-caption">{showCreate ? "收起" : "＋ 记录"}</Text>
        </View>
        {showCreate ? (
          <View className="soft-panel">
            <View className="field">
              <Text>主要情况 *</Text>
              <Textarea className="input" value={complaint} onInput={(e) => setComplaint(e.detail.value)} placeholder="例如：今天早上开始呕吐，精神不振" autoHeight />
            </View>
            <View className="field">
              <Text>持续时长</Text>
              <Input className="input" value={duration} onInput={(e) => setDuration(e.detail.value)} placeholder="例如：2 小时" />
            </View>
            <View className="life-row-source">提交后由确定性规则做风险提示，不是 AI 诊断；紧急情况请直接联系兽医。</View>
            <Button className="btn btn-primary" onClick={openEvent} disabled={busy || !complaint.trim()}>
              {busy ? "提交中…" : "提交"}
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}
