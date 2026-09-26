/**
 * Today — Living Canvas (Stage R.2 §18-27).
 * 结构：PetHero → Now(LifeSignal) → One Attention → Primary Action →
 * 情境入口 → 最近生命轨迹。数据流与网络层保持不变（presentation only）。
 */
import { useCallback, useEffect, useState } from "react";
import { Icon, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, ApiError, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { LifeStream, type LifeStreamDay } from "../../components/timeline/LifeStream";
import { PetHero } from "../../components/pet_visual";
import { LifeSignal, type LifeSignalRow } from "../../components/life/LifeSignal";
import { AttentionPanel } from "../../components/life/AttentionPanel";
import { InlineError } from "../../components/feedback/Feedback";
import {
  ATTENTION_LEVELS,
  DAILY_COUNT_LABELS,
  QUICK_TYPES,
  type DeviceRow,
  type HealthEventRow,
  type TodayData,
} from "./_lib";
import { CompanionEntryCard, MonitorCard, QuickLogSheet, TodayTasks, TodayMemory } from "./_components";
import { timeContextText, heroIdentity, eventRowFromEvent } from "./_lib";

export default function Index() {
  const { pets, petId, choose } = usePets();
  const [today, setToday] = useState<TodayData | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [healthRows, setHealthRows] = useState<HealthEventRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "denied">("loading");
  const [flash, setFlash] = useState<string | null>(null);

  // Quick Log Sheet（单层；tap → minimal input → save）
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<(typeof QUICK_TYPES)[number] | null>(null);
  const [sheetForm, setSheetForm] = useState<Record<string, string>>({});
  const [sheetBusy, setSheetBusy] = useState(false);

  // 在家监测（contextual entry；设备未接入时如实显示）
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorCounts, setMonitorCounts] = useState<Record<string, number> | null>(null);
  const [monitorDevices, setMonitorDevices] = useState<DeviceRow[] | null>(null);

  const loadToday = useCallback((pid: string) => {
    setLoadState("loading");
    api
      .get<TodayData>(`/pets/${pid}/today`)
      .then((d) => {
        setToday(d);
        setLoadState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "PERMISSION_DENIED") setLoadState("denied");
        else setLoadState("error");
      });
  }, []);

  const loadTasks = useCallback((pid: string) => {
    api
      .get<Task[]>(`/pets/${pid}/tasks?status=OPEN`)
      .then((rows) => setTasks(rows))
      .catch(() => setTasks([]));
  }, []);

  const loadAttention = useCallback((pid: string) => {
    api
      .get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((rows) => setHealthRows(rows))
      .catch(() => setHealthRows([]));
  }, []);

  useDidShow(() => {
    // 回到 tab 时刷新任务与关注（首次加载由 petId effect 处理）
    if (petId) {
      loadTasks(petId);
      loadAttention(petId);
    }
  });

  useEffect(() => {
    if (petId) {
      loadToday(petId);
      loadTasks(petId);
      loadAttention(petId);
    }
  }, [petId, loadToday, loadTasks, loadAttention]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const attention = healthRows.filter(
    (h) => h.status !== "CLOSED" && h.latest_triage_level && ATTENTION_LEVELS.includes(h.latest_triage_level),
  );

  const counts = today?.event_counts ?? {};
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const activityMinutes = todayEvents.reduce(
    (acc, e) => acc + (Number((e.payload as Record<string, unknown>)?.duration_minutes) || 0),
    0,
  );
  const signalRows: LifeSignalRow[] = [
    { id: "meal", label: "进食", value: `${counts["daily.meal"] ?? 0} 次` },
    { id: "drink", label: "饮水", value: `${counts["daily.drink"] ?? 0} 次` },
    { id: "activity", label: "活动", value: `${activityMinutes} 分钟` },
  ];
  const memoryRows = todayEvents.slice(0, 5).map(eventRowFromEvent);
  const memoryDays: LifeStreamDay[] = memoryRows.length
    ? [{ id: "today", label: timeContextText(), isToday: true, rows: memoryRows }]
    : [];

  const danger = attention.find((h) => h.latest_triage_level === "URGENT" || h.latest_triage_level === "EMERGENCY");
  const focus = attention.find((h) => h.latest_triage_level !== "URGENT" && h.latest_triage_level !== "EMERGENCY");

  function openSheet(t: (typeof QUICK_TYPES)[number]) {
    const form: Record<string, string> = {};
    t.fields.forEach((f) => {
      form[f.key] = f.initial;
    });
    setSheetType(t);
    setSheetForm(form);
    setSheetOpen(true);
  }

  async function saveSheet() {
    const target = current?.id;
    if (!target || !sheetType) return;
    setSheetBusy(true);
    const payload: Record<string, string | number> = { ...sheetType.defaults };
    sheetType.fields.forEach((f) => {
      const raw = sheetForm[f.key];
      if (raw !== undefined && raw !== "") {
        payload[f.key] = f.numeric ? Number(raw) : raw;
      }
    });
    try {
      await api.post(`/pets/${target}/events`, { event_type: sheetType.type, payload });
      setSheetOpen(false);
      setSheetType(null);
      setFlash(`已记录：${DAILY_COUNT_LABELS[sheetType.type] ?? sheetType.type}`);
      loadToday(target);
      setTimeout(() => setFlash(null), 2000);
    } catch (e: unknown) {
      setSheetOpen(false);
      setSheetType(null);
      if (e instanceof ApiError && e.code === "PERMISSION_DENIED") setFlash("没有记录权限。");
      else setFlash("记录失败，请重试。");
      setTimeout(() => setFlash(null), 2000);
    } finally {
      setSheetBusy(false);
    }
  }

  async function completeTask(taskId: string) {
    if (!petId) return;
    try {
      await api.post(`/tasks/${taskId}/complete`, {});
      loadTasks(petId);
      Taro.showToast({ title: "已完成", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
  }

  function toggleMonitor() {
    const next = !monitorOpen;
    setMonitorOpen(next);
    const pid = current?.id;
    if (next && pid) {
      api
        .get<{ today_counts: Record<string, number> }>(`/pets/${pid}/home-summary`)
        .then((d) => setMonitorCounts(d.today_counts))
        .catch(() => setMonitorCounts({}));
      api
        .get<DeviceRow[]>(`/pets/${pid}/devices`)
        .then((rows) => setMonitorDevices(rows))
        .catch(() => setMonitorDevices([]));
    }
  }

  return (
    <View className="page">
      {pets && pets.length > 1 && (
        <View className="chips" style={{ marginTop: 8 }}>
          {pets.map((p) => (
            <View
              key={p.id}
              className={`chip${p.id === petId ? " chip-active" : ""}`}
              onClick={() => choose(p.id)}
            >
              {p.name}
            </View>
          ))}
        </View>
      )}

      <PetHero
        pet={current ?? null}
        headline={totalCount === 0 ? "今天还没有新的记录" : `今天记录了 ${totalCount} 件事`}
        identity={heroIdentity(current)}
        timeContext={timeContextText()}
        onPress={() => Taro.switchTab({ url: "/pages/pets/index" })}
      />

      {loadState === "error" && (
        <InlineError message="暂时连接不上，已展示已有内容" onRetry={() => petId && loadToday(petId)} />
      )}
      {loadState === "denied" && <View className="state">没有查看此内容的权限。</View>}

      {loadState === "loading" && <View className="state">加载中……</View>}

      {loadState === "ready" && (
        <>
          <LifeSignal
            rows={signalRows}
            empty={totalCount === 0}
            emptyNote="今天还没有足够记录"
          />

          {danger ? (
            <AttentionPanel
              kind="danger"
              body={danger.chief_complaint || "有一条健康记录需要关注，请查看健康页。"}
              footer="由风险规则引擎判定 · 查看健康页了解详情"
              onPress={() => Taro.navigateTo({ url: "/pages/health/index" })}
            />
          ) : focus ? (
            <AttentionPanel
              kind="focus"
              body={focus.chief_complaint}
              footer="查看健康页了解详情"
              onPress={() => Taro.navigateTo({ url: "/pages/health/index" })}
            />
          ) : (
            <AttentionPanel kind="calm" body="目前没有需要特别关注的变化。" />
          )}

          {tasks && tasks.length > 0 && <TodayTasks tasks={tasks} onComplete={completeTask} />}

          <View className="primary-action" onClick={() => setSheetOpen(true)}>
            快速记录
          </View>

          <View className="action-row">
            <View className="secondary-action" onClick={() => Taro.switchTab({ url: "/pages/agent/index" })}>
              <Text className="secondary-action-icon">问</Text>
              问助手
            </View>
            <View
              className="secondary-action"
              onClick={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}
            >
              <Text className="secondary-action-icon">看</Text>
              看看它
            </View>
            <View className="secondary-action" onClick={toggleMonitor}>
              <Text className="secondary-action-icon">家</Text>
              {monitorOpen ? "收起在家" : "在家"}
            </View>
          </View>

          {monitorOpen && (
            <MonitorCard
              monitorOpen={monitorOpen}
              monitorCounts={monitorCounts}
              monitorDevices={monitorDevices}
              onToggle={toggleMonitor}
            />
          )}

          <TodayMemory days={memoryDays} count={todayEvents.length} />

          <CompanionEntryCard />
        </>
      )}

      {flash && (
        <View className="inline-error" style={{ background: "#E8F1F2", justifyContent: "center" }}>
          <Text>{flash}</Text>
        </View>
      )}

      {sheetOpen && (
        <QuickLogSheet
          pet={current}
          type={sheetType}
          form={sheetForm}
          busy={sheetBusy}
          onClose={() => setSheetOpen(false)}
          onPickType={openSheet}
          onFormChange={(key, value) => setSheetForm({ ...sheetForm, [key]: value })}
          onBack={() => setSheetType(null)}
          onSave={saveSheet}
        />
      )}
    </View>
  );
}
