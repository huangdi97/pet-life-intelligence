import { useCallback, useEffect, useState } from "react";
import { Button, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, ApiError, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import {
  ATTENTION_LEVELS,
  DAILY_COUNT_LABELS,
  QUICK_TYPES,
  type DeviceRow,
  type HealthEventRow,
  type TodayData,
} from "./_lib";
import {
  AttentionCard, CompanionEntryCard, CurrentStateCard, MonitorCard,
  QuickLogSheet, RecentEventsCard, TasksCard, TodayHeader,
} from "./_components";

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

  // 监测入口（home-summary + devices；设备集成为原型，状态如实显示）
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
      <TodayHeader
        pets={pets}
        petId={petId}
        current={current}
        todayDate={today?.date ?? null}
        flash={flash}
        onPickPet={choose}
        onOpenSheet={() => setSheetOpen(true)}
      />
      {loadState === "ready" && today && <CurrentStateCard today={today} />}
      {attention.length > 0 && <AttentionCard attention={attention} />}
      {current && <TasksCard tasks={tasks} onComplete={completeTask} />}
      {current && (
        <MonitorCard
          monitorOpen={monitorOpen}
          monitorCounts={monitorCounts}
          monitorDevices={monitorDevices}
          onToggle={toggleMonitor}
        />
      )}
      {loadState === "ready" && today && today.events.length > 0 && <RecentEventsCard events={today.events} />}
      {current && <CompanionEntryCard />}
      {loadState === "loading" && <View className="state">加载中……</View>}
      {loadState === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && loadToday(petId)}>重试</Button>
        </View>
      )}
      {loadState === "denied" && <View className="state">没有查看此内容的权限。</View>}
      {sheetOpen && (
        <QuickLogSheet
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
