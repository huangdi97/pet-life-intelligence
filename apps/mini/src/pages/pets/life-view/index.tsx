/**
 * 生命视图 — 小程序 Living Canvas（Stage R.2 / v3.4 §34.3, §46.8）。
 *
 * 小程序不伪装本地高保真 3D：真实照片优先；若没有照片，使用明确的物种视觉。
 * 四段信息架构与 Web / Android 对齐：此刻 / 趋势 / 时间线 / 外观。
 * 所有状态锚点只展示真实记录；事实详情保留来源、更新时间和证据。
 */
import { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent } from "../../../services/api";
import { usePets } from "../../../utils/usePets";
import { eventPayloadText, eventTypeLabel, sourceLabel } from "../../../utils/labels";
import { PetHero } from "../../../components/pet_visual";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../../../components/timeline/LifeStream";
import { InlineError, PetContextGate } from "../../../components/feedback/Feedback";

type LifeMode = "now" | "trend" | "appearance";
type DetailId = "water" | "meal" | "activity" | "sleep";

interface VisualModelRow {
  status?: string;
  version?: number;
  metadata_json?: { demo_fixture?: boolean };
}

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  computed_at: string;
}

interface LifeDetail {
  id: DetailId;
  label: string;
  value: string;
  source: string;
  updatedAt: string;
  evidence: string;
  compare: string;
}

function rowFromEvent(e: LifeEvent): LifeStreamRow {
  const t = new Date(e.occurred_at);
  const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return {
    id: e.event_id,
    time: hh,
    typeLabel: eventTypeLabel(e.event_type),
    detail: eventPayloadText(e.payload),
    source: sourceLabel(e.source_type),
  };
}

function observedActivityMinutes(events: LifeEvent[]): number {
  const allowed = new Set(["daily.walk", "daily.play"]);
  return events.reduce((total, event) => {
    if (!allowed.has(event.event_type)) return total;
    const minutes = Number((event.payload as Record<string, unknown>)?.duration_minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
    return total + minutes;
  }, 0);
}

function baselineLabel(metric: string): string | null {
  if (metric === "meal_count_per_day") return "每日进食";
  if (metric === "walk_minutes_per_day") return "每日散步";
  if (metric === "sleep_minutes_per_day") return "每日睡眠";
  return null;
}

export default function LifeView() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const [today, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [models, setModels] = useState<VisualModelRow[] | null>(null);
  const [visualState, setVisualState] = useState<"loading" | "ready" | "error">("loading");
  const [baseline, setBaseline] = useState<BaselineRow[]>([]);
  const [baselineState, setBaselineState] = useState<"loading" | "ready" | "error">("loading");
  const [mode, setMode] = useState<LifeMode>("now");
  const [detailId, setDetailId] = useState<DetailId | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setToday(null);
    setState("loading");
    setModels(null);
    setVisualState("loading");
    setBaseline([]);
    setBaselineState("loading");
    setDetailId(null);
    setMode("now");

    api
      .get<{ events: LifeEvent[] }>(`/pets/${petId}/today`)
      .then((result) => {
        if (!alive) return;
        setToday(result);
        setState("ready");
      })
      .catch(() => {
        if (alive) setState("error");
      });

    api
      .get<{ models: VisualModelRow[] }>(`/pets/${petId}/visual-models`)
      .then((result) => {
        if (!alive) return;
        setModels(result.models ?? []);
        setVisualState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setModels([]);
        setVisualState("error");
      });

    api
      .get<BaselineRow[]>(`/pets/${petId}/baseline`)
      .then((rows) => {
        if (!alive) return;
        setBaseline(rows);
        setBaselineState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setBaseline([]);
        setBaselineState("error");
      });

    return () => {
      alive = false;
    };
  }, [petId]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">生命视图</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  const petEvents = (today?.events ?? []).filter((event) => event.event_type !== "today.viewed");
  const lastEvent = petEvents[0] ?? null;
  const count = (type: string) => petEvents.filter((event) => event.event_type === type).length;
  const activityMinutes = observedActivityMinutes(petEvents);
  const value = (n: number, unit: string) => (n > 0 ? `${n} ${unit}` : "—");

  const matchingEvents = (types: string[]) => petEvents.filter((event) => types.includes(event.event_type));
  const makeDetail = (id: DetailId, label: string, fact: string, types: string[]): LifeDetail => {
    const rows = matchingEvents(types);
    const latest = rows[0] ?? null;
    const sources = Array.from(new Set(rows.map((event) => sourceLabel(event.source_type))));
    return {
      id,
      label,
      value: fact,
      source: sources.length ? sources.join(" + ") : "暂无来源记录",
      updatedAt: latest
        ? new Date(latest.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "暂无更新时间",
      evidence: latest ? `${eventTypeLabel(latest.event_type)} · ${eventPayloadText(latest.payload) || "已记录"}` : "暂无记录",
      compare: "暂无（数据积累后显示）",
    };
  };

  const details: LifeDetail[] = [
    makeDetail("water", "饮水", value(count("daily.drink"), "次"), ["daily.drink"]),
    makeDetail("meal", "进食", value(count("daily.meal"), "次"), ["daily.meal"]),
    makeDetail("activity", "活动", value(activityMinutes, "分钟"), ["daily.walk", "daily.play"]),
    makeDetail("sleep", "睡眠", value(count("daily.sleep"), "次"), ["daily.sleep"]),
  ];
  const activeDetail = details.find((row) => row.id === detailId) ?? null;

  const streamDays: LifeStreamDay[] = petEvents.slice(0, 4).length
    ? [{ id: "now", label: "最近", isToday: true, rows: petEvents.slice(0, 4).map(rowFromEvent) }]
    : [];

  const activeTwin = models?.find((model) => model.status === "ACTIVE") ?? null;
  const modelStatus =
    visualState === "loading"
      ? "3D 状态读取中"
      : visualState === "error"
        ? "3D 状态暂时不可用"
        : activeTwin
          ? activeTwin.metadata_json?.demo_fixture === true
            ? `示例 3D · v${activeTwin.version ?? 1}`
            : `3D v${activeTwin.version ?? 1} · 已确认`
          : "暂无已确认个体 3D";
  const freshness = lastEvent
    ? `更新 ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : "今天暂无新记录";

  return (
    <View className="page life-view-page">
      <View className="life-view-top">
        <View className="h1">生命视图</View>
        <View className="sub">{pet?.name ?? "宠物"} · 此刻</View>
        <View className="life-view-meta" data-testid="pli.mini.lifeview.meta">
          <Text>{freshness}</Text>
          <Text>·</Text>
          <Text>{modelStatus}</Text>
        </View>
      </View>

      <PetHero
        pet={pet ?? null}
        headline={
          state === "error"
            ? "暂时连接不上，照片与已有记录仍然保留"
            : lastEvent
              ? `最近一次记录：${eventTypeLabel(lastEvent.event_type)}`
              : "今天还没有新的记录"
        }
        identity="真实照片优先 · 生活记录可追溯"
        timeContext={freshness}
      />

      {state === "error" && <InlineError message="暂时连接不上；不会把未知状态显示成没有记录。" />}

      <View className="life-view-anchor-row" data-testid="pli.mini.lifeview.anchors">
        {details.map((row) => (
          <View
            key={row.id}
            className={`life-view-anchor${detailId === row.id ? " life-view-anchor-active" : ""}`}
            onClick={() => {
              setMode("now");
              setDetailId(row.id);
            }}
          >
            <Text className="life-view-anchor-value">{row.value}</Text>
            <Text className="life-view-anchor-label">{row.label}</Text>
          </View>
        ))}
      </View>

      <View className="life-view-modes" data-testid="pli.mini.lifeview.modebar">
        <View className={`life-view-mode${mode === "now" ? " life-view-mode-active" : ""}`} onClick={() => setMode("now")}>此刻</View>
        <View className={`life-view-mode${mode === "trend" ? " life-view-mode-active" : ""}`} onClick={() => setMode("trend")}>趋势</View>
        <View className="life-view-mode" onClick={() => Taro.switchTab({ url: "/pages/timeline/index" })}>时间线</View>
        <View className={`life-view-mode${mode === "appearance" ? " life-view-mode-active" : ""}`} onClick={() => setMode("appearance")}>外观</View>
      </View>

      {mode === "now" ? (
        <>
          {activeDetail ? (
            <View className="life-view-detail" data-testid="pli.mini.lifeview.anchor-detail">
              <View className="life-view-detail-head">
                <View>
                  <Text className="life-view-detail-kicker">此刻的记录详情</Text>
                  <View className="section-title">{activeDetail.label} · {activeDetail.value}</View>
                </View>
                <Text className="life-view-detail-close" onClick={() => setDetailId(null)}>关闭</Text>
              </View>
              <View className="life-view-detail-grid">
                <View className="life-view-detail-cell"><Text className="life-view-detail-key">事实</Text><Text>{activeDetail.value}</Text></View>
                <View className="life-view-detail-cell"><Text className="life-view-detail-key">与自己相比</Text><Text>{activeDetail.compare}</Text></View>
                <View className="life-view-detail-cell"><Text className="life-view-detail-key">来源</Text><Text>{activeDetail.source}</Text></View>
                <View className="life-view-detail-cell"><Text className="life-view-detail-key">更新时间</Text><Text>{activeDetail.updatedAt}</Text></View>
                <View className="life-view-detail-cell"><Text className="life-view-detail-key">证据</Text><Text>{activeDetail.evidence}</Text></View>
              </View>
            </View>
          ) : (
            <View className="open-section">
              <View className="section-title">此刻</View>
              <Text className="life-empty-note">点一下上面的饮水、进食、活动或睡眠，可以查看事实、来源和更新时间。</Text>
            </View>
          )}

          <View className="open-section">
            <View className="section-title">最近片段</View>
            {streamDays.length ? (
              <LifeStream days={streamDays} />
            ) : (
              <Text className="life-empty-note">
                {state === "error" ? "暂时连接不上，稍后重试。" : "从第一次喂食、散步或健康记录开始，轨迹会慢慢成形。"}
              </Text>
            )}
          </View>
        </>
      ) : null}

      {mode === "trend" ? (
        <View className="open-section" data-testid="pli.mini.lifeview.trend">
          <View className="section-title">它自己的常态</View>
          <Text className="life-empty-note">趋势只使用已经积累的多日事实，不用单日数据猜测“变好”或“变差”。</Text>
          {baselineState === "loading" ? (
            <View className="state">正在读取常态……</View>
          ) : baselineState === "error" ? (
            <View className="state state-error">常态暂时没有读取成功；不会用默认值代替。</View>
          ) : baseline.filter((row) => baselineLabel(row.metric)).length ? (
            <View className="life-view-baseline">
              {baseline.filter((row) => baselineLabel(row.metric)).map((row) => (
                <View className="life-view-baseline-row" key={row.metric}>
                  <Text>{baselineLabel(row.metric)}</Text>
                  <Text className="life-view-baseline-value">{row.value}</Text>
                  <Text className="life-view-baseline-meta">{row.sample_count} 个样本 · {row.window_days} 天</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="life-empty-note">数据还不够形成它自己的常态。</Text>
          )}
        </View>
      ) : null}

      {mode === "appearance" ? (
        <View className="open-section" data-testid="pli.mini.lifeview.appearance">
          <View className="section-title">外观</View>
          <Text className="life-empty-note">
            小程序始终优先展示主人设置的真实照片。{activeTwin
              ? activeTwin.metadata_json?.demo_fixture === true
                ? "当前账户有示例 3D 形象；它不代表真实宠物扫描。"
                : `当前已有确认过的第 ${activeTwin.version ?? 1} 版 3D 形象。`
              : "当前还没有已确认的个体 3D 形象。"}
          </Text>
          <Text className="life-empty-note">可旋转的 3D 交互在 Web / Android 提供；小程序不使用静态贴图伪装 3D。</Text>
        </View>
      ) : null}
    </View>
  );
}
