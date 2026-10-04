/**
 * 生命视图 — 豆豆的可视生命状态入口 (Stage R.2 §31-36).
 * Photo-first：宠物视觉为焦点；此刻只显示真实来源的数据；
 * 小程序保持轻量视觉模式：真实照片/物种视觉 + 此刻/趋势/记忆。
 * 高保真交互 3D 已在支持的 Web/Android 客户端呈现；本端不伪装成已加载 3D。
 */
import { useEffect, useState } from "react";
import { Icon, Text, View } from "@tarojs/components";
import { api, type LifeEvent } from "../../../services/api";
import { usePets } from "../../../utils/usePets";
import { eventPayloadText, eventTypeLabel, sourceLabel } from "../../../utils/labels";
import { PetSpeciesTile } from "../../../components/pet_visual";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../../../components/timeline/LifeStream";
import { InlineError } from "../../../components/feedback/Feedback";

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

export default function LifeView() {
  const { pets, petId } = usePets();
  const [providerReal, setProviderReal] = useState<boolean | null>(null);
  const [today, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [visualState, setVisualState] = useState<"loading" | "ready" | "error">("loading");

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    if (!petId) return;
    setState("loading");
    api
      .get<{ events: LifeEvent[] }>(`/pets/${petId}/today`)
      .then((r) => {
        setToday(r);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [petId]);

  useEffect(() => {
    setVisualState("loading");
    api
      .get<{ real: boolean }>("/visual/status")
      .then((s) => {
        setProviderReal(s.real);
        setVisualState("ready");
      })
      .catch(() => setVisualState("error"));
  }, []);

  const petEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const lastEvent = petEvents[0] ?? null;
  const streamDays: LifeStreamDay[] = petEvents.slice(0, 4).length
    ? [{ id: "now", label: "此刻", isToday: true, rows: petEvents.slice(0, 4).map(rowFromEvent) }]
    : [];

  return (
    <View className="page">
      <View className="h1">生命视图</View>
      <View className="sub">{pet ? `${pet.name} · 此刻` : "宠物 · 此刻"}</View>

      <View className="pet-hero" style={{ height: 460 }}>
        <PetSpeciesTile species={pet?.species ?? "dog"} size={260} round={64} />
        <View className="pet-hero-scrim" />
        <View className="pet-hero-info">
          <View className="pet-hero-name">{pet?.name ?? "宠物"}</View>
          <View className="pet-hero-headline">
            {state === "error" ? "暂时连接不上" : lastEvent ? `最近一次记录：${eventTypeLabel(lastEvent.event_type)}` : "今天还没有记录"}
          </View>
        </View>
      </View>

      {state === "error" && <InlineError message="暂时连接不上" />}

      <View className="open-section">
        <View className="section-title">生命轨迹</View>
        {streamDays.length ? (
          <LifeStream days={streamDays} />
        ) : (
          <Text className="life-empty-note">
            {state === "error" ? "暂时连接不上，稍后自动恢复。" : "从第一次喂食、散步或健康记录开始，轨迹会慢慢成形。"}
          </Text>
        )}
      </View>

      <View className="open-section">
        <View className="section-title">可视形象</View>
        <View className="life-row">
          <View className="life-dot" />
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">小程序轻量模式</Text>
            </View>
            <View className="life-row-detail">当前小程序以照片/物种视觉与真实记录呈现；可交互高保真 3D 请在支持的 Web 或 Android 客户端查看。</View>
            {visualState === "ready" && providerReal === true && (
              <View className="life-row-source">3D 服务可用；本端仍保持轻量展示，不伪装成本地 3D。</View>
            )}
            {visualState === "error" && <View className="life-row-source"><Icon type="info" size={14} color="#8A8074" /> 3D 服务状态暂不可确认；不影响本端记录与生命轨迹。</View>}
          </View>
        </View>
      </View>
    </View>
  );
}
