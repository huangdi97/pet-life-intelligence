/**
 * 小程序记录搜索 — contextual capability under Timeline.
 *
 * Uses the same real /pets/{id}/search endpoint as Web/Android. It never
 * fabricates missing history and remains a secondary route, not a sixth tab.
 */
import { useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventPayloadText, eventTypeLabel } from "../../utils/labels";
import { EmptyState, InlineError, PetContextGate } from "../../components/feedback/Feedback";
import { PetContextHeader } from "../../components/pet_visual";

interface SearchHit {
  event_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function Search() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const current = pets?.find((pet) => pet.id === petId) ?? pets?.[0];
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">搜索记录</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function run() {
    const value = query.trim();
    if (!petId || !value || state === "loading") return;
    setState("loading");
    try {
      const result = await api.get<{ hits: SearchHit[] }>(
        `/pets/${petId}/search?q=${encodeURIComponent(value)}`,
      );
      setHits(result.hits);
      setState("idle");
    } catch {
      setHits(null);
      setState("error");
    }
  }

  return (
    <View className="page">
      <PetContextHeader
        pet={current ?? null}
        title="搜索记录"
        sub={current ? `只查找${current.name}已经存在的记录` : "选择宠物后查找已有记录"}
      />

      <View className="soft-panel">
        <View className="field">
          <Text>关键词</Text>
          <Input
            className="input"
            value={query}
            onInput={(event) => setQuery(event.detail.value)}
            placeholder="如：猫砂盆、疫苗、散步"
            confirmType="search"
            onConfirm={run}
          />
        </View>
        <Button className="btn btn-primary" disabled={!petId || !query.trim() || state === "loading"} onClick={run}>
          {state === "loading" ? "查找中…" : "搜索"}
        </Button>
      </View>

      {state === "error" ? <InlineError onRetry={run} /> : null}

      {hits === null && state === "idle" ? (
        <View className="life-empty-note">搜索只返回真实存在的记录；没有匹配时不会补写历史。</View>
      ) : null}

      {hits !== null ? (
        <View className="open-section" data-testid="pli.mini.search.results">
          <View className="section-title">
            搜索结果
            <Text className="section-caption">{hits.length} 条</Text>
          </View>
          {hits.length === 0 ? (
            <EmptyState title="没有找到匹配记录" body="换一个关键词试试；这里不会为了给出结果而生成历史。" />
          ) : (
            hits.map((hit) => (
              <View className="life-row" key={hit.event_id}>
                <View className="life-row-body">
                  <View className="life-row-head">
                    <Text className="life-row-type">{eventTypeLabel(hit.event_type)}</Text>
                    <Text className="life-row-time">{timeLabel(hit.occurred_at)}</Text>
                  </View>
                  <View className="life-row-detail">{eventPayloadText(hit.payload) || "已记录事件"}</View>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
