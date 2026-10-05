import { useEffect, useState } from "react";
import { Button, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventTypeLabel } from "../../utils/labels";
import { fmtTime } from "../../utils/format";

interface WelfareProfile { profile?: { domains?: Record<string, unknown> } }
interface WelfareEvidence {
  observation_counts?: Record<string, number>;
  sources?: string[];
  notice?: string;
}

const KINDS = [
  { value: "STRESS_RECOVERY", label: "压力恢复" },
  { value: "CHOICE", label: "选择/控制感" },
  { value: "ENVIRONMENT_LOAD", label: "环境负荷" },
  { value: "QOL_QUESTIONNAIRE", label: "生活质量问卷" },
];
const LABELS: Record<string, string> = {
  comfort: "舒适",
  stress_recovery: "压力恢复",
  activity: "活动",
  environment: "环境",
  enrichment: "丰富化",
  STRESS_RECOVERY: "压力恢复",
  CHOICE: "选择/控制感",
  ENVIRONMENT_LOAD: "环境负荷",
  QOL_QUESTIONNAIRE: "生活质量问卷",
};
const SOURCES: Record<string, string> = {
  OWNER_REPORTED: "你记录",
  DEVICE: "设备",
  PROFESSIONAL: "专业人士",
  AI_STRUCTURED: "AI 整理",
  AI_INFERENCE: "AI 推断",
  RECORDED: "系统记录",
};

function ownerValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "已有记录" : "暂无记录";
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "暂无记录";
    return /^[A-Z0-9_:-]+$/.test(text) ? "已有记录" : text;
  }
  return value == null ? "暂无记录" : "已有记录";
}

export default function Welfare() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [profile, setProfile] = useState<WelfareProfile | null>(null);
  const [evidence, setEvidence] = useState<WelfareEvidence | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [kind, setKind] = useState(KINDS[0].value);
  const [busy, setBusy] = useState(false);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "error">("loading");
  const [evidenceState, setEvidenceState] = useState<"loading" | "ready" | "error">("loading");
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    setProfileState("loading");
    setEvidenceState("loading");
    setEventsState("loading");
    Promise.allSettled([
      api.get<WelfareProfile>(`/pets/${petId}/welfare-profile`),
      api.get<WelfareEvidence>(`/pets/${petId}/welfare-evidence`),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=30`),
    ]).then(([p, ev, es]) => {
      if (p.status === "fulfilled") {
        setProfile(p.value);
        setProfileState("ready");
      } else {
        setProfileState("error");
      }
      if (ev.status === "fulfilled") {
        setEvidence(ev.value);
        setEvidenceState("ready");
      } else {
        setEvidenceState("error");
      }
      if (es.status === "fulfilled") {
        setEvents(es.value.events.filter((e) => ["daily.sleep","daily.play","daily.walk","daily.weight","daily.elimination"].includes(e.event_type)));
        setEventsState("ready");
      } else {
        setEventsState("error");
      }
    });
  }, [petId, version]);

  async function record() {
    if (!petId || busy) return;
    setBusy(true);
    try {
      await api.post(`/pets/${petId}/welfare-observations`, {
        kind,
        data: { recorded_from: "mini", note: "" },
        source_type: "OWNER_REPORTED",
      });
      setVersion((v) => v + 1);
      Taro.showToast({ title: "已记录观察", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  const counts = evidence?.observation_counts ?? {};
  const domains = profile?.profile?.domains ?? {};

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name}的福祉` : "生活与福祉"}</View>
      <View className="sub">用观察与证据说话，不做开心指数或情绪评分。</View>

      <View className="open-section">
        <View className="section-title">近期观察</View>
        {evidenceState === "loading" ? (
          <View className="state">正在读取近期观察……</View>
        ) : evidenceState === "error" ? (
          <View className="state state-error">近期观察暂时没有加载成功；不会把未知状态显示成“没有观察”。</View>
        ) : Object.keys(counts).length ? Object.entries(counts).map(([key, value]) => (
          <View className="life-row" key={key}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{LABELS[key] ?? "其他观察"}</Text>
                <Text className="life-row-time">{value} 条</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">还没有福祉观察。</View>
        {evidence?.sources?.length ? (
          <View className="life-row-source">来源：{evidence.sources.map((s) => SOURCES[s] ?? "其他来源").join("、")}</View>
        ) : null}
        {evidence?.notice ? <View className="life-row-source">{evidence.notice}</View> : null}
      </View>

      <View className="open-section">
        <View className="section-title">生活质量记录</View>
        {eventsState === "loading" ? (
          <View className="state">正在读取相关日常记录……</View>
        ) : eventsState === "error" ? (
          <View className="state state-error">日常记录暂时没有加载成功；不会把加载失败显示成“没有记录”。</View>
        ) : events.length ? events.slice(0, 6).map((e) => (
          <View className="life-row" key={e.event_id}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{eventTypeLabel(e.event_type)}</Text>
                <Text className="life-row-time">{fmtTime(e.occurred_at)}</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">还没有相关日常记录。</View>
      </View>

      <View className="open-section">
        <View className="section-title">各维度概况</View>
        {profileState === "loading" ? (
          <View className="state">正在读取福祉概况……</View>
        ) : profileState === "error" ? (
          <View className="state state-error">福祉概况暂时没有加载成功；不会用默认结论填补未知状态。</View>
        ) : Object.keys(domains).length ? Object.entries(domains).map(([key, value]) => (
          <View className="life-row" key={key}>
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{LABELS[key] ?? "其他维度"}</Text>
                <Text className="life-row-time">{ownerValue(value)}</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">观察积累后，会按舒适、压力恢复、活动与环境逐渐归纳。</View>
      </View>

      <View className="open-section">
        <View className="section-title">记录生活观察</View>
        <View className="field">
          <Text>观察类型</Text>
          <Picker
            mode="selector"
            range={KINDS.map((k) => k.label)}
            value={Math.max(0, KINDS.findIndex((k) => k.value === kind))}
            onChange={(e) => setKind(KINDS[Number(e.detail.value)]?.value ?? KINDS[0].value)}
          >
            <View className="input">{KINDS.find((k) => k.value === kind)?.label ?? KINDS[0].label}</View>
          </Picker>
        </View>
        <Button className="btn btn-primary" onClick={record} disabled={busy}>
          {busy ? "记录中…" : "记录观察"}
        </Button>
      </View>
    </View>
  );
}
