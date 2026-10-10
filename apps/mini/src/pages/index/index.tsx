/**
 * Today — Living Canvas (Stage R.2 §18-27).
 * 结构：PetHero → Now(LifeSignal) → One Attention → Primary Action →
 * 情境入口 → 最近生命轨迹。数据流与网络层保持不变（presentation only）。
 */
import { useCallback, useEffect, useState } from "react";
import { Icon, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, ApiError, type Task } from "../../services/api";
import { getPlatform } from "../../platform";
import { usePets } from "../../utils/usePets";
import { LifeStream, type LifeStreamDay } from "../../components/timeline/LifeStream";
import { PetHero } from "../../components/pet_visual";
import { LifeSignal, type LifeSignalRow } from "../../components/life/LifeSignal";
import { AttentionPanel } from "../../components/life/AttentionPanel";
import { ChangeNarrative } from "../../components/life/ChangeNarrative";
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

interface DayHintExplanation {
  metric: string;
  label: string;
  unit: string;
  current_value: number;
  same_time_baseline: number | null;
  sample_count: number;
  window_days: number;
  deviation_percent: number | null;
  direction: "LOWER" | "HIGHER" | "SIMILAR" | "INSUFFICIENT";
  notable: boolean;
  fact: string;
  comparison: string;
  uncertainty: string;
  next_step: string;
}

interface DayHintResponse {
  status: "INSUFFICIENT" | "STABLE" | "NOTABLE";
  hints: string[];
  rule: string;
  explanations?: DayHintExplanation[];
}

function ownerFacingHealthText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  if (!text || /^(?:BW|HE|EV)-[A-Za-z0-9_-]+$/i.test(text)) return fallback;
  return text;
}

export default function Index() {
  const { pets, petId, choose } = usePets();
  const [today, setToday] = useState<TodayData | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [healthRows, setHealthRows] = useState<HealthEventRow[]>([]);
  const [healthState, setHealthState] = useState<"loading" | "ready" | "error">("loading");
  const [dayHint, setDayHint] = useState<DayHintResponse | null>(null);
  const [dayHintState, setDayHintState] = useState<"loading" | "ready" | "error">("loading");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "denied">("loading");
  const [flash, setFlash] = useState<string | null>(null);

  // Quick Log Sheet（单层；tap → minimal input → save）
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<(typeof QUICK_TYPES)[number] | null>(null);
  const [sheetForm, setSheetForm] = useState<Record<string, string>>({});
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetMedia, setSheetMedia] = useState<string[]>([]);

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
    setHealthState("loading");
    api
      .get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((rows) => {
        setHealthRows(rows);
        setHealthState("ready");
      })
      .catch(() => {
        setHealthRows([]);
        setHealthState("error");
      });
  }, []);

  const loadChange = useCallback((pid: string) => {
    setDayHintState("loading");
    setDayHint(null);
    api
      .get<DayHintResponse>(`/pets/${pid}/abnormal-day-hint`)
      .then((value) => {
        setDayHint(value);
        setDayHintState("ready");
      })
      .catch(() => {
        setDayHint(null);
        setDayHintState("error");
      });
  }, []);

  useDidShow(() => {
    // 回到 tab 时刷新任务与关注（首次加载由 petId effect 处理）
    if (petId) {
      loadTasks(petId);
      loadAttention(petId);
      loadChange(petId);
    }
  });

  useEffect(() => {
    if (petId) {
      loadToday(petId);
      loadTasks(petId);
      loadAttention(petId);
      loadChange(petId);
    }
  }, [petId, loadToday, loadTasks, loadAttention, loadChange]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const attention = healthRows.filter(
    (h) => h.status !== "CLOSED" && h.latest_triage_level && ATTENTION_LEVELS.includes(h.latest_triage_level),
  );

  const counts = today?.event_counts ?? {};
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const activityMinutes = todayEvents
    .filter((event) => event.event_type === "daily.walk" || event.event_type === "daily.play")
    .reduce((total, event) => {
      const minutes = Number((event.payload as Record<string, unknown>)?.duration_minutes);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
      return total + minutes;
    }, 0);
  const sleepMinutes = todayEvents
    .filter((event) => event.event_type === "daily.sleep")
    .reduce((total, event) => {
      const minutes = Number((event.payload as Record<string, unknown>)?.duration_minutes);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
      return total + minutes;
    }, 0);
  const formatDuration = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return "—";
    if (minutes < 60) return `${Math.round(minutes)} 分钟`;
    return `${Math.round((minutes / 60) * 10) / 10} 小时`;
  };
  const signalRows: LifeSignalRow[] = [
    { id: "meal", label: "进食", value: `${counts["daily.meal"] ?? 0} 次` },
    { id: "drink", label: "饮水", value: `${counts["daily.drink"] ?? 0} 次` },
    { id: "activity", label: "活动", value: activityMinutes > 0 ? `${activityMinutes} 分钟` : "—" },
    { id: "sleep", label: "睡眠", value: formatDuration(sleepMinutes) },
  ];
  const memoryRows = todayEvents.slice(0, 5).map(eventRowFromEvent);
  const memoryDays: LifeStreamDay[] = memoryRows.length
    ? [{ id: "today", label: timeContextText(), isToday: true, rows: memoryRows }]
    : [];

  const danger = attention.find((h) => h.latest_triage_level === "URGENT" || h.latest_triage_level === "EMERGENCY");
  const focus = attention.find((h) => h.latest_triage_level !== "URGENT" && h.latest_triage_level !== "EMERGENCY");

  const abnormalChange =
    dayHint?.hints.find(
      (value) => !value.includes("暂未出现需要突出显示的变化") && !value.includes("无明显异常"),
    ) ?? null;
  const changeDetail =
    dayHint?.explanations?.find((row) => row.notable) ??
    dayHint?.explanations?.find((row) => row.direction !== "INSUFFICIENT") ??
    dayHint?.explanations?.[0];
  const baselineInsufficient = dayHintState === "ready" && dayHint?.status === "INSUFFICIENT";
  const changeUnknown = dayHintState !== "ready" || baselineInsufficient;
  const changeSummary =
    dayHintState !== "ready"
      ? "今天的自身基线暂时没有完整读取到。"
      : baselineInsufficient
        ? "与它自己相比：同期基线记录还不够，暂时不能判断变化。"
        : abnormalChange
          ? abnormalChange
          : "与它自己相比：今天暂未出现需要突出显示的变化。";
  const changeEvidence =
    dayHintState !== "ready"
      ? "不会把未知状态显示成“没有变化”"
      : baselineInsufficient
        ? changeDetail?.comparison ?? "至少需要 3 天同一时间点的可比记录。"
        : changeDetail?.comparison ?? dayHint?.rule ?? "只比较同一时间点、同一指标口径的已记录事实";

  function openSheet(t: (typeof QUICK_TYPES)[number]) {
    const form: Record<string, string> = {};
    t.fields.forEach((f) => {
      form[f.key] = f.initial;
    });
    setSheetType(t);
    setSheetForm(form);
    setSheetMedia([]);
    setSheetOpen(true);
  }

  async function addSheetMedia() {
    if (!current?.id || sheetMedia.length >= 3) return;
    try {
      const picked = await getPlatform().media.chooseImage(3 - sheetMedia.length);
      setSheetMedia((old) => [...old, ...picked].slice(0, 3));
    } catch {
      setFlash("没有添加照片；仍可以继续保存记录。");
      setTimeout(() => setFlash(null), 2000);
    }
  }

  async function saveSheet() {
    const target = current?.id;
    if (!target || !sheetType) return;
    const invalidRequired = sheetType.fields.some((field) => {
      const raw = (sheetForm[field.key] ?? "").trim();
      if (field.required && !raw) return true;
      if (!raw || field.min == null) return false;
      const value = Number(raw);
      return !Number.isFinite(value) || value < field.min;
    });
    if (invalidRequired) {
      setFlash("请先填写带 * 的真实记录，并确认数值有效。");
      setTimeout(() => setFlash(null), 2000);
      return;
    }
    setSheetBusy(true);
    const payload: Record<string, string | number> = { ...sheetType.defaults };
    sheetType.fields.forEach((f) => {
      const raw = sheetForm[f.key];
      if (raw !== undefined && raw !== "") {
        if (f.numeric) {
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0) {
            throw new Error("INVALID_NUMERIC_QUICKLOG_FIELD");
          }
          payload[f.key] = value;
        } else {
          payload[f.key] = raw;
        }
      }
    });
    try {
      // Diary is owner-authored text with its own canonical endpoint. Let the
      // backend create the corresponding timeline event rather than submitting
      // a parallel generic event payload from the client.
      if (sheetType.type === "diary.created") {
        const text = String(payload.text ?? "").trim();
        if (!text) {
          setFlash("请先填写备注内容。");
          return;
        }
        await api.post(`/pets/${target}/diary`, { text });
      } else {
        const artifactIds: string[] = [];
        for (const filePath of sheetMedia.slice(0, 3)) {
          const uploaded = await getPlatform().uploader.uploadImage(target, filePath);
          artifactIds.push(uploaded.artifact_id);
        }
        await api.post(`/pets/${target}/events`, {
          event_type: sheetType.type,
          payload,
          artifact_ids: artifactIds,
        });
      }
      setSheetOpen(false);
      setSheetType(null);
      setFlash(
        `已记录：${DAILY_COUNT_LABELS[sheetType.type] ?? sheetType.type}${sheetType.type !== "diary.created" && sheetMedia.length ? ` · 已绑定 ${sheetMedia.length} 张照片` : ""}`,
      );
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

          <ChangeNarrative
            summary={changeSummary}
            evidence={changeEvidence}
            fact={dayHintState !== "ready" ? "今天的同期基线暂时没有完整读取到。" : changeDetail?.fact}
            comparison={changeDetail?.comparison}
            uncertainty={changeUnknown ? (changeDetail?.uncertainty ?? "记录不足或读取失败时，不会把未知状态显示成“没有变化”。") : changeDetail?.uncertainty}
            nextStep={changeDetail?.next_step}
            unknown={changeUnknown}
          />

          {healthState !== "ready" ? (
            <AttentionPanel
              kind="unknown"
              body={healthState === "loading" ? "正在读取健康记录。" : "健康关注状态暂时无法确认。"}
              footer={healthState === "error" ? "健康记录没有完整读取到，不会把未知状态显示成“没有风险”" : undefined}
            />
          ) : danger ? (
            <AttentionPanel
              kind="danger"
              body={ownerFacingHealthText(danger.chief_complaint, "有一条健康记录需要关注，请查看健康页。")}
              footer="由风险规则引擎判定 · 查看健康页了解详情"
              onPress={() => Taro.navigateTo({ url: "/pages/health/index" })}
            />
          ) : focus ? (
            <AttentionPanel
              kind="focus"
              body={ownerFacingHealthText(focus.chief_complaint, "有一条健康记录值得查看。")}
              footer="查看健康页了解详情"
              onPress={() => Taro.navigateTo({ url: "/pages/health/index" })}
            />
          ) : (
            <AttentionPanel
              kind="calm"
              body="目前没有健康记录被独立风险规则标记为需要立即关注。"
              footer="仅表示当前已记录事实未触发规则，不等同于健康正常"
            />
          )}

          {/* R5.4: ACTION immediately follows Attention; supporting tasks
              and contextual capabilities must not displace the primary action. */}
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
          </View>

          {tasks && tasks.length > 0 && <TodayTasks tasks={tasks} onComplete={completeTask} />}

          <View
            className="secondary-action"
            style={{ marginTop: 8, marginLeft: 16, marginRight: 16 }}
            onClick={toggleMonitor}
          >
            <Text className="secondary-action-icon">家</Text>
            {monitorOpen ? "收起在家状态" : "查看在家状态"}
          </View>

          {monitorOpen && (
            <MonitorCard
              monitorOpen={monitorOpen}
              monitorCounts={monitorCounts}
              monitorDevices={monitorDevices}
              onToggle={toggleMonitor}
            />
          )}

          <TodayMemory days={memoryDays} count={todayEvents.length} petName={current?.name} />

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
          mediaCount={sheetMedia.length}
          onAddMedia={() => void addSheetMedia()}
          onClearMedia={() => setSheetMedia([])}
          onBack={() => setSheetType(null)}
          onSave={saveSheet}
        />
      )}
    </View>
  );
}
