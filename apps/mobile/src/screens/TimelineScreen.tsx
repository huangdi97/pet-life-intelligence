/**
 * TimelineScreen — Life Stream (Stage R.2 §37-40): day groups on a time
 * spine, semantic event rows with source provenance, filter chips.
 * No per-event white Cards; "back to a day" shows only that day's data.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { LifeStream } from "../components/timeline/LifeStream";
import { groupEventsByDay } from "../components/timeline/lifeStreamUtils";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { TIMELINE_FILTERS } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

interface EventsResp {
  events: LifeEvent[];
  count: number;
}

export function TimelineScreen() {
  const { petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [selected, setSelected] = useState<string[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    const types = TIMELINE_FILTERS.filter((f) => selected.includes(f.key)).flatMap((f) => f.types);
    const qs = types.length ? `&${types.map((t) => `event_type=${t}`).join("&")}` : "";
    api
      .get<EventsResp>(`/pets/${petId}/events?limit=60${qs}`)
      .then((r) => {
        if (alive) {
          setEvents(r.events);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId, selected]);

  function toggle(key: string) {
    if (key === "all") {
      setSelected([]);
      return;
    }
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const days = groupEventsByDay(events);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>时间线</Text>
          <Text style={styles.sub}>记录每一天真实发生的事情</Text>
        </View>

        <View style={styles.chipRow}>
          {TIMELINE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => toggle(f.key)}
              style={[styles.chip, (f.key === "all" ? selected.length === 0 : selected.includes(f.key)) && styles.chipActive]}
            >
              <Text style={[styles.chipText, (f.key === "all" ? selected.length === 0 : selected.includes(f.key)) && styles.chipActiveText]}>{f.zh}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={4} />
          </View>
        ) : days.length ? (
          <LifeStream days={days} />
        ) : (
          <EmptyState
            title="豆豆的时间线还很安静"
            body="第一次喂食、散步或健康记录会从这里开始。"
            actionLabel="快速记录"
            onAction={() => navigation.navigate("QuickLog")}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  chip: { paddingHorizontal: SPACE.s3, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
});
