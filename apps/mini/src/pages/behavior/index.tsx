import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Textarea, Input, Picker } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";
import { getPlatform } from "../../platform/index";

interface PreferenceRow {
  preference_id: string;
  kind: "LIKE" | "DISLIKE" | "ALLERGY_CAUTION" | "REWARD";
  subject: string;
  note: string;
  source_type: string;
}
const PREF_LABEL: Record<PreferenceRow["kind"], string> = {
  LIKE: "喜欢",
  DISLIKE: "回避",
  ALLERGY_CAUTION: "过敏/谨慎",
  REWARD: "奖励",
};

interface BehaviorRow {
  behavior_event_id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: string;
  artifact_ids: string[];
}

export default function Behavior() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "MILD" | "MODERATE" | "SEVERE" | "UNLABELED">("all");
  const [form, setForm] = useState({ antecedent: "", behavior: "", consequence: "", environment: "", intensity: "" });
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [preferenceState, setPreferenceState] = useState<"loading" | "ready" | "error">("loading");
  const [preferenceKind, setPreferenceKind] = useState<"LIKE" | "DISLIKE" | "ALLERGY_CAUTION">("LIKE");
  const [preferenceSubject, setPreferenceSubject] = useState("");
  const [preferenceNote, setPreferenceNote] = useState("");
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [artifactIds, setArtifactIds] = useState<string[]>([]);
  const [artifactNames, setArtifactNames] = useState<string[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<BehaviorRow[]>(`/pets/${pid}/behavior-events`)
      .then((rows) => {
        setRows(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const loadPreferences = useCallback((pid: string) => {
    setPreferenceState("loading");
    api.get<PreferenceRow[]>(`/pets/${pid}/preferences`)
      .then((items) => {
        setPreferences(items);
        setPreferenceState("ready");
      })
      .catch(() => {
        setPreferences([]);
        setPreferenceState("error");
      });
  }, []);

  useEffect(() => {
    if (petId) {
      load(petId);
      loadPreferences(petId);
    }
  }, [petId, load, loadPreferences]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">行为</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function attachBehaviorVideo() {
    if (!petId || videoUploading) return;
    setVideoUploading(true);
    try {
      const { media, uploader } = getPlatform();
      const filePath = await media.chooseVideo();
      if (!filePath) return;
      const row = await uploader.uploadVideo(petId, filePath);
      setArtifactIds((ids) => [...ids, row.artifact_id].slice(-3));
      const displayName = filePath.split("/").pop() || "行为视频";
      setArtifactNames((names) => [...names, displayName].slice(-3));
    } catch {
      Taro.showToast({ title: "暂时无法上传视频", icon: "none" });
    } finally {
      setVideoUploading(false);
    }
  }

  async function addPreference() {
    if (!petId || !preferenceSubject.trim() || preferenceBusy) return;
    setPreferenceBusy(true);
    try {
      await api.post(`/pets/${petId}/preferences`, {
        kind: preferenceKind,
        subject: preferenceSubject.trim(),
        note: preferenceNote.trim(),
        source_type: "OWNER_REPORTED",
      });
      setPreferenceSubject("");
      setPreferenceNote("");
      loadPreferences(petId);
      Taro.showToast({ title: "偏好已记录", icon: "success" });
    } catch {
      setPreferenceState("error");
      Taro.showToast({ title: "暂时无法记录偏好", icon: "none" });
    } finally {
      setPreferenceBusy(false);
    }
  }

  async function save() {
    if (!form.behavior.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date().toISOString(),
        antecedent: form.antecedent.trim(),
        behavior: form.behavior.trim(),
        consequence: form.consequence.trim(),
        environment: form.environment.trim(),
        intensity: form.intensity,
        artifact_ids: artifactIds,
      });
      setShowCreate(false);
      setForm({ antecedent: "", behavior: "", consequence: "", environment: "", intensity: "" });
      setArtifactIds([]);
      setArtifactNames([]);
      load(petId);
      Taro.showToast({ title: "已记录", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    }
  }

  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "UNLABELED") return !row.intensity;
    return row.intensity === filter;
  });
  const intensityOptions = ["未标注", "轻度", "中度", "重度"];
  const intensityValues = ["", "MILD", "MODERATE", "SEVERE"];

  return (
    <View className="page">
      <View className="h1">行为</View>
      <View className="sub">先看最近真实记录，再用“发生之前 → 具体行为 → 发生之后”补充观察，不给宠物贴人格标签。</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && rows.length === 0 && <View className="state">还没有行为记录。</View>}
      {state === "ready" && rows.length > 0 ? (
        <View className="chips" aria-label="行为记录筛选">
          {[
            ["all", "全部"],
            ["MILD", "轻度"],
            ["MODERATE", "中度"],
            ["SEVERE", "重度"],
            ["UNLABELED", "未标注"],
          ].map(([value, label]) => (
            <View
              key={value}
              className={`chip${filter === value ? " chip-active" : ""}`}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </View>
          ))}
        </View>
      ) : null}
      {state === "ready" && rows.length > 0 && visibleRows.length === 0 ? <View className="state">当前筛选下没有行为记录。</View> : null}
      {visibleRows.map((b) => (
        <View className="card" key={b.behavior_event_id}>
          <View className="tl-time">{fmtTime(b.occurred_at)}</View>
          {b.antecedent && <View className="muted" style={{ marginTop: 6 }}>发生之前：{b.antecedent}</View>}
          <View style={{ marginTop: 6 }}>具体行为：{b.behavior}</View>
          {b.intensity ? <View className="badge" style={{ marginTop: 6 }}>{b.intensity === "MILD" ? "轻度" : b.intensity === "MODERATE" ? "中度" : b.intensity === "SEVERE" ? "重度" : "主人标注"}</View> : null}
          {b.consequence && <View className="muted" style={{ marginTop: 6 }}>发生之后：{b.consequence}</View>}
          {b.artifact_ids?.length ? (
            <View className="life-row-source">已关联 {b.artifact_ids.length} 个媒体证据 · 仅作为本次行为记录的原始素材</View>
          ) : null}
        </View>
      ))}

      <View className="open-section" data-testid="pli.mini.behavior.preferences">
        <View className="section-title">偏好与回避</View>
        <View className="life-row-source">只保存主人明确观察到的喜欢、回避或过敏谨慎项；不会从单次行为自动推断偏好。</View>
        {preferenceState === "loading" ? (
          <View className="state">正在读取偏好记录……</View>
        ) : preferenceState === "error" ? (
          <View className="state state-error">偏好记录暂时没有加载成功；不会用默认偏好补齐。</View>
        ) : preferences.filter((row) => row.kind !== "REWARD").length ? (
          preferences.filter((row) => row.kind !== "REWARD").map((row) => (
            <View className="life-row" key={row.preference_id}>
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{row.subject}</Text>
                  <Text className="life-row-time">{PREF_LABEL[row.kind]} · 主人记录</Text>
                </View>
                {row.note ? <View className="life-row-detail">{row.note}</View> : null}
              </View>
            </View>
          ))
        ) : <View className="life-empty-note">还没有偏好记录。</View>}
        <View className="chips">
          {(["LIKE", "DISLIKE", "ALLERGY_CAUTION"] as const).map((kind) => (
            <View key={kind} className={`chip${preferenceKind === kind ? " chip-active" : ""}`} onClick={() => setPreferenceKind(kind)}>
              {PREF_LABEL[kind]}
            </View>
          ))}
        </View>
        <Input className="input" value={preferenceSubject} onInput={(event) => setPreferenceSubject(event.detail.value)} placeholder="例如：冻干鸡肉 / 吹风机声音" />
        <Input className="input" value={preferenceNote} onInput={(event) => setPreferenceNote(event.detail.value)} placeholder="补充实际观察（可选）" />
        <Button className="btn" disabled={preferenceBusy || !preferenceSubject.trim()} onClick={() => void addPreference()}>
          {preferenceBusy ? "保存中…" : "记录偏好"}
        </Button>
      </View>

      <View className="open-section">
        <View className="section-title" onClick={() => setShowCreate((v) => !v)}>
          记录一次行为观察
          <Text className="section-caption">{showCreate ? "收起" : "＋ 记录"}</Text>
        </View>
        {showCreate && (
          <View className="soft-panel">
            <View className="field">
              <Text>发生之前</Text>
              <Input className="input" value={form.antecedent} onInput={(e) => setForm({ ...form, antecedent: e.detail.value })} placeholder="当时发生了什么 / 谁在场" />
            </View>
            <View className="field">
              <Text>具体行为 *</Text>
              <Textarea className="input" value={form.behavior} onInput={(e) => setForm({ ...form, behavior: e.detail.value })} placeholder="例如：听到门铃后连续吠叫约 30 秒" autoHeight />
            </View>
            <View className="field" data-testid="pli.mini.behavior.video">
              <Text>关联行为视频（可选，最多保留 3 个）</Text>
              <Button className="btn" disabled={videoUploading} onClick={() => void attachBehaviorVideo()}>
                {videoUploading ? "正在上传视频……" : "从相册选择视频"}
              </Button>
              <View className="life-row-source">
                {artifactNames.length
                  ? `已关联：${artifactNames.join("、")}`
                  : "视频只作为这条观察的原始证据；系统不会仅凭视频自动推断性格、情绪或诊断。"}
              </View>
            </View>
            <View className="field">
              <Text>发生之后</Text>
              <Input className="input" value={form.consequence} onInput={(e) => setForm({ ...form, consequence: e.detail.value })} placeholder="之后发生了什么" />
            </View>
            <View className="field">
              <Text>环境</Text>
              <Input className="input" value={form.environment} onInput={(e) => setForm({ ...form, environment: e.detail.value })} placeholder="地点 / 环境" />
            </View>
            <View className="field">
              <Text>强度（主人主观标注，可选）</Text>
              <Picker
                mode="selector"
                range={intensityOptions}
                value={Math.max(0, intensityValues.indexOf(form.intensity))}
                onChange={(e) => setForm({ ...form, intensity: intensityValues[Number(e.detail.value)] ?? "" })}
              >
                <View className="input">{intensityOptions[Math.max(0, intensityValues.indexOf(form.intensity))]}</View>
              </Picker>
            </View>
            <View className="life-row-source">只记录可观察到的事实，不从一次行为推断性格或情绪。</View>
            <Button className="btn btn-primary" onClick={save} disabled={!form.behavior.trim()}>
              保存
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}