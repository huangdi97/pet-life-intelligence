import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Picker, Input } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, ApiError, type LifeEvent, type Pet, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime, speciesLabel } from "../../utils/format";

interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
}

interface DeviceRow {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
}

/** Quick Log Sheet 类型 — 只复用后端 event_types.py 已注册的 daily.* 事件，
 *  payload 字段与 canonical schema 一致，不发明新事件/新字段。 */
const QUICK_TYPES: Array<{
  type: string;
  label: string;
  fields: Array<{ key: string; label: string; initial: string; numeric?: boolean }>;
  defaults: Record<string, string | number>;
}> = [
  { type: "daily.meal", label: "喂食", fields: [{ key: "amount", label: "食量（g）", initial: "100" }, { key: "food_type", label: "食物类型", initial: "狗粮" }], defaults: { unit: "g" } },
  { type: "daily.drink", label: "饮水", fields: [{ key: "amount", label: "饮水量（ml）", initial: "200" }], defaults: { unit: "ml" } },
  { type: "daily.elimination", label: "排泄", fields: [{ key: "kind", label: "类型（urine/stool/both）", initial: "urine" }, { key: "quality", label: "状态（normal/abnormal）", initial: "normal" }], defaults: {} },
  { type: "daily.walk", label: "散步", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "20", numeric: true }], defaults: { intensity: "normal" } },
  { type: "daily.play", label: "玩耍", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "15", numeric: true }], defaults: { activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", fields: [{ key: "weight_kg", label: "体重（kg）", initial: "12.0" }], defaults: {} },
  { type: "daily.sleep", label: "睡眠", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "60", numeric: true }], defaults: { quality: "" } },
];

/** 值得关注：后端 triage 分级非 NORMAL 的进行中健康事件（只显示后端分级值）。 */
const ATTENTION_LEVELS = ["NOTICE", "MONITOR", "VET_SOON", "URGENT", "EMERGENCY"];

const DAILY_COUNT_LABELS: Record<string, string> = {
  "daily.meal": "喂食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
};

function deviceStatusLabel(status: string): string {
  if (status === "LINKED") return "已连接";
  if (status === "EXPIRED" || status === "REVOKED") return "已断开";
  return "状态未知";
}

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
      <View className="h1">{current ? `${current.name} 今天怎么样？` : "今日"}</View>
      <View className="sub">
        {current ? `${speciesLabel(current.species)}${current.breed ? ` · ${current.breed}` : ""} · ${today?.date ?? ""}` : "宠物生活智能"}
      </View>

      {pets && pets.length > 1 && (
        <Picker
          mode="selector"
          range={pets.map((p) => p.name)}
          value={pets.findIndex((p) => p.id === petId) < 0 ? 0 : pets.findIndex((p) => p.id === petId)}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            const p = pets[idx];
            if (p) choose(p.id);
          }}
        >
          <View className="btn">切换宠物：{current?.name}</View>
        </Picker>
      )}

      {flash && <View className="card" style={{ background: "#e8f1f2", color: "#3e7c83" }}>{flash}</View>}

      {current && (
        <View className="entry-card" onClick={() => setSheetOpen(true)}>
          <View>
            <View className="entry-title">＋ 快速记录</View>
            <View className="entry-desc">喂食 · 饮水 · 排泄 · 散步 · 玩耍 · 体重 · 睡眠</View>
          </View>
          <Text className="entry-arrow">›</Text>
        </View>
      )}

      {/* 当前状态卡：今天各事件计数（低密度统计） */}
      {loadState === "ready" && today && (
        <View className="card">
          <Text>当前状态</Text>
          <View className="statgrid" style={{ marginTop: 16 }}>
            {Object.entries(today.event_counts)
              .filter(([, n]) => n > 0)
              .slice(0, 6)
              .map(([t, n]) => (
                <View className="stat" key={t}>
                  <View className="stat-n">{n}</View>
                  <View className="stat-label">{DAILY_COUNT_LABELS[t] ?? t}</View>
                </View>
              ))}
          </View>
          {Object.values(today.event_counts).every((n) => n === 0) && (
            <View className="muted" style={{ marginTop: 12 }}>今天还没有记录。</View>
          )}
        </View>
      )}

      {/* 值得关注：进行中健康事件的规则引擎分级（只显示后端分级值） */}
      {attention.length > 0 && (
        <View className="card">
          <Text>值得关注</Text>
          {attention.slice(0, 3).map((h) => (
            <View className="tl-item" key={h.health_event_id} onClick={() => Taro.navigateTo({ url: "/pages/health/index" })}>
              <View className="tl-head">
                <Text className="tl-type">{h.chief_complaint}</Text>
                <Text className={`badge ${h.latest_triage_level ?? ""}`}>{h.latest_triage_level}</Text>
                <Text className="tl-time">{fmtTime(h.opened_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 今日任务 */}
      {current && (
        <View className="card">
          <Text>今日任务</Text>
          {tasks && tasks.length === 0 && <View className="muted" style={{ marginTop: 12 }}>没有待办任务。</View>}
          {tasks?.slice(0, 3).map((t) => (
            <View className="tl-item" key={t.id}>
              <View className="tl-head">
                <Text className="tl-type">{t.title}</Text>
                <Button className="btn" size="mini" onClick={() => completeTask(t.id)}>
                  完成
                </Button>
              </View>
              <View className="muted">{t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}</View>
            </View>
          ))}
          <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/tasks/index" })}>
            管理任务 ›
          </View>
        </View>
      )}

      {/* 监测入口：今天在家状态 + 设备（设备集成为原型，如实显示） */}
      {current && (
        <View className="card">
          <View className="row" style={{ justifyContent: "space-between" }} onClick={toggleMonitor}>
            <Text>在家监测</Text>
            <Text className="muted">{monitorOpen ? "收起" : "展开"}</Text>
          </View>
          {monitorOpen && (
            <View style={{ marginTop: 12 }}>
              {monitorCounts === null && <View className="muted">加载中……</View>}
              {monitorCounts !== null && Object.keys(monitorCounts).length === 0 && (
                <View className="muted">今天还没有设备事件（设备集成为原型）。</View>
              )}
              {monitorCounts !== null &&
                Object.entries(monitorCounts).map(([k, n]) => (
                  <Text key={k} className="badge">{k} × {n}</Text>
                ))}
              {monitorDevices !== null && monitorDevices.length === 0 && (
                <View className="muted" style={{ marginTop: 8 }}>还没有绑定设备（设备集成为原型）。</View>
              )}
              {monitorDevices?.map((d) => (
                <View className="tl-item" key={d.device_id}>
                  <View className="tl-head">
                    <Text className="tl-type">{d.display_name || d.provider}</Text>
                    <Text className="muted">{deviceStatusLabel(d.status)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 最近事件 */}
      {loadState === "ready" && today && today.events.length > 0 && (
        <View className="card">
          <Text>最近记录</Text>
          {today.events.slice(0, 5).map((e) => (
            <View className="tl-item" key={e.event_id}>
              <View className="tl-head">
                <Text className="tl-type">{e.event_type}</Text>
                <Text className="badge">{e.provenance_level}</Text>
                <Text className="tl-time">{fmtTime(e.occurred_at)}</Text>
              </View>
              <View className="tl-body">
                {Object.entries(e.payload)
                  .filter(([k]) => k !== "health_event_id" && k !== "task_id")
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · ")}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 陪伴入口卡（feature-flagged 原型） */}
      {current && (
        <View className="entry-card" onClick={() => Taro.navigateTo({ url: "/pages/companion/index" })}>
          <View>
            <View className="entry-title">看看它 · 陪伴</View>
            <View className="entry-desc">陪伴为前端原型 · 硬件集成未激活</View>
          </View>
          <Text className="entry-arrow">›</Text>
        </View>
      )}

      {loadState === "loading" && <View className="state">加载中……</View>}
      {loadState === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && loadToday(petId)}>重试</Button>
        </View>
      )}
      {loadState === "denied" && <View className="state">没有查看此内容的权限。</View>}

      {/* Quick Log Sheet：单层 bottom sheet；tap 类型 → 最少输入 → 保存 */}
      {sheetOpen && (
        <View className="sheet-mask" onClick={() => setSheetOpen(false)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <Text className="sheet-close" onClick={() => setSheetOpen(false)}>×</Text>
            <View className="sheet-title">快速记录</View>
            {!sheetType && (
              <View className="sheet-types">
                {QUICK_TYPES.map((t) => (
                  <Button key={t.type} className="btn" onClick={() => openSheet(t)}>
                    {t.label}
                  </Button>
                ))}
              </View>
            )}
            {sheetType && (
              <View>
                <View className="muted" style={{ marginBottom: 12 }}>{sheetType.label} · 记录会带来源与记录人进入事件图</View>
                {sheetType.fields.map((f) => (
                  <View className="field" key={f.key}>
                    <Text>{f.label}</Text>
                    <Input
                      className="input"
                      value={sheetForm[f.key] ?? ""}
                      onInput={(e) => setSheetForm({ ...sheetForm, [f.key]: e.detail.value })}
                      type={f.numeric ? "digit" : "text"}
                    />
                  </View>
                ))}
                <View className="row" style={{ justifyContent: "space-between" }}>
                  <Button className="btn" onClick={() => setSheetType(null)}>返回</Button>
                  <Button className="btn btn-primary" onClick={saveSheet} disabled={sheetBusy}>
                    {sheetBusy ? "保存中…" : "保存"}
                  </Button>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
