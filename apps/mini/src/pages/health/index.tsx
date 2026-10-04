import { useCallback, useEffect, useState } from "react";
import { Button, Input, Text, Textarea, View } from "@tarojs/components";
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

function statusLabel(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "CLOSED") return "已结束";
  return "已记录";
}

function highRisk(level: string | null): boolean {
  return level === "URGENT" || level === "EMERGENCY";
}

export default function Health() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [rows, setRows] = useState<HealthEventRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback((pid: string) => {
    setState("loading");
    api.get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((items) => {
        setRows(items);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

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
        <View className="metric-row">
          <View className="metric-cell">
            <View className="metric-value">{latest ? riskLabel(latest.latest_triage_level) : "暂无"}</View>
            <View className="metric-label">最近一次分级</View>
          </View>
          <View className="metric-cell">
            <View className="metric-value">{recentSevenDays.length}</View>
            <View className="metric-label">近 7 天记录</View>
          </View>
        </View>
        {latest ? (
          <View className={highRisk(latest.latest_triage_level) ? "attention-panel attention-danger" : "attention-panel attention-calm"}>
            <View>
              <View className="attention-title">{riskLabel(latest.latest_triage_level)}</View>
              <View className="attention-body">{latest.chief_complaint}</View>
              <View className="attention-footer">{statusLabel(latest.status)} · {fmtTime(latest.opened_at)}</View>
            </View>
          </View>
        ) : (
          <View className="life-empty-note">还没有健康变化记录。</View>
        )}
      </View>

      <View className="open-section">
        <View className="section-title">健康记录</View>
        {rows.length ? rows.map((row) => (
          <View className="life-row" key={row.health_event_id}>
            <View className={highRisk(row.latest_triage_level) ? "life-dot life-dot-danger" : "life-dot"} />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{row.chief_complaint}</Text>
                <Text className="life-row-time">{riskLabel(row.latest_triage_level)}</Text>
              </View>
              <View className="life-row-detail">{statusLabel(row.status)} · {fmtTime(row.opened_at)}</View>
            </View>
          </View>
        )) : (
          <View className="life-empty-note">从一次真实观察开始，分级与后续变化会留在这里。</View>
        )}
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
        <View className="life-row">
          <View className="life-row-body">
            <View className="life-row-head"><Text className="life-row-type">疫苗与驱虫</Text></View>
            <View className="life-row-detail">暂无记录；不会因为缺少数据显示“正常”。</View>
          </View>
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
