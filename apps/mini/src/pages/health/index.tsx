import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input, Textarea } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime, riskLabel } from "../../utils/format";

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

export default function Health() {
  const { petId } = usePets();
  const [rows, setRows] = useState<HealthEventRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((rows) => {
        setRows(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  async function openEvent() {
    if (!complaint.trim() || !petId) return;
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
      Taro.showToast({ title: "已记录，请继续描述", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">健康</View>
      <View className="sub">发现异常 → 追问 → 红旗 → 分级 → 就诊摘要 → 结局</View>
      <View className="entry-card" onClick={() => Taro.navigateTo({ url: "/pages/medication/index" })}>
        <View>
          <View className="entry-title">用药</View>
          <View className="entry-desc">用药计划与给药记录 · 剂量以兽医处方为准</View>
        </View>
        <Text className="entry-arrow">›</Text>
      </View>


      <Button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "收起" : "＋ 发现异常"}
      </Button>

      {showCreate && (
        <View className="card">
          <View className="field">
            <Text>主诉 *</Text>
            <Textarea className="input" value={complaint} onInput={(e) => setComplaint(e.detail.value)} placeholder="例如：今天早上开始呕吐，精神不振" autoHeight />
          </View>
          <View className="field">
            <Text>持续时长</Text>
            <Input className="input" value={duration} onInput={(e) => setDuration(e.detail.value)} placeholder="例如：2小时" />
          </View>
          <Button className="btn btn-primary" onClick={openEvent} disabled={busy || !complaint.trim()}>
            {busy ? "提交中…" : "开始健康事件"}
          </Button>
          <View className="muted" style={{ marginTop: 12 }}>系统将追问更多信息并做规则引擎红旗检测（非 AI 诊断）。</View>
        </View>
      )}

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && rows.length === 0 && <View className="state">还没有健康记录。</View>}
      {rows.map((h) => (
        <View className="card" key={h.health_event_id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{h.chief_complaint}</Text>
            <Text className={`badge ${h.latest_triage_level ?? ""}`}>{riskLabel(h.latest_triage_level)}</Text>
          </View>
          <View className="muted">
            {h.status === "CLOSED" ? "已结束" : "进行中"} · {fmtTime(h.opened_at)}
          </View>
        </View>
      ))}
    </View>
  );
}