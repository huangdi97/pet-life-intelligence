/** TimelineScreen — 时间线 (PLI-018/185 mobile port): full event timeline
 *  with event-type filter chips (repeated event_type= params). Each item
 *  shows type / time / actor / source. Flat list, no dashboards. */
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE } from "../tokens";
import { Card, Chip, EmptyText, ErrorText, EventItem, Loading, ScreenTitle, TIMELINE_FILTERS } from "./ui";

interface EventsResp {
  events: LifeEvent[];
  count: number;
}

export function TimelineScreen() {
  const { petId } = usePets();
  const [selected, setSelected] = useState<string[]>([]); // filter keys; [] = 全部
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    // Repeated event_type= params (FastAPI list[str] query).
    const types = TIMELINE_FILTERS.filter((f) => selected.includes(f.key)).flatMap((f) => f.types);
    const qs = types.length ? `&${types.map((t) => `event_type=${t}`).join("&")}` : "";
    api
      .get<EventsResp>(`/pets/${petId}/events?limit=50${qs}`)
      .then((r) => {
        if (!alive) return;
        setEvents(r.events);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
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

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.content}
        data={events}
        keyExtractor={(e) => e.event_id}
        renderItem={({ item }) => <EventItem event={item} />}
        ListHeaderComponent={
          <>
            <ScreenTitle title="时间线" sub="每一次记录，可按类型筛选。" />
            <View style={styles.chipRow}>
              {TIMELINE_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.zh}
                  active={f.key === "all" ? selected.length === 0 : selected.includes(f.key)}
                  onPress={() => toggle(f.key)}
                />
              ))}
            </View>
            {error && <ErrorText>{error}</ErrorText>}
            {loading && <Loading />}
          </>
        }
        ListEmptyComponent={!loading && !error ? <EmptyText>还没有记录。</EmptyText> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginBottom: SPACE.s2 },
});
