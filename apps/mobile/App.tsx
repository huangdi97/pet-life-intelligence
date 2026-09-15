import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { api, type Pet } from "./src/services/api";
import { getCurrentPet, setCurrentPet } from "./src/storage/session";

const Tab = createBottomTabNavigator();

function usePets() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    api
      .get<Pet[]>("/pets")
      .then(async (rows) => {
        setPets(rows);
        const stored = await getCurrentPet();
        if (rows.length && (!stored || !rows.some((r) => r.id === stored))) {
          const first = rows[0].id;
          setPetId(first);
          await setCurrentPet(first);
        } else {
          setPetId(stored);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const choose = useCallback(async (id: string) => {
    setPetId(id);
    await setCurrentPet(id);
  }, []);

  return { pets, petId, choose, reload, error };
}

function TodayScreen() {
  const { pets, petId, choose, error } = usePets();
  const [events, setEvents] = useState<Array<{ event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown> }>>([]);

  useEffect(() => {
    if (!petId) return;
    api
      .get<{ events: Array<{ event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown> }> }>(`/pets/${petId}/events?limit=20`)
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
  }, [petId]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  const QUICK = [
    { type: "daily.meal", label: "喂食" },
    { type: "daily.drink", label: "饮水" },
    { type: "daily.elimination", label: "排泄" },
    { type: "daily.walk", label: "散步" },
  ];

  async function quickLog(t: { type: string }) {
    if (!current) return;
    try {
      await api.post(`/pets/${current.id}/events`, { event_type: t.type, payload: {} });
      const r = await api.get<{ events: Array<{ event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown> }> }>(`/pets/${current.id}/events?limit=20`);
      setEvents(r.events);
    } catch {
      /* ignore */
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{current ? `${current.name} 今天怎么样？` : "今日"}</Text>
      <Text style={styles.sub}>
        {pets && pets.length > 1
          ? "长按宠物名可切换"
          : current
            ? `${current.species}${current.breed ? ` · ${current.breed}` : ""}`
            : "宠物生活智能"}
      </Text>

      {pets && pets.length > 1 && (
        <View style={styles.row}>
          {pets.map((p) => (
            <Pressable key={p.id} onPress={() => choose(p.id)} style={[styles.chip, p.id === current?.id && styles.chipActive]}>
              <Text style={p.id === current?.id ? styles.chipActiveText : styles.chipText}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>加载失败：{error}</Text>}

      <Text style={styles.h2}>快速记录</Text>
      <View style={styles.quickgrid}>
        {QUICK.map((q) => (
          <Pressable key={q.type} style={styles.quick} onPress={() => quickLog(q)}>
            <Text style={styles.quickText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h2}>最近记录</Text>
      {events.length === 0 ? (
        <Text style={styles.muted}>还没有记录。</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.event_id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.event_type}</Text>
              <Text style={styles.muted}>{new Date(item.occurred_at).toLocaleString("zh-CN")}</Text>
              <Text style={styles.cardBody}>{Object.entries(item.payload).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function TimelineScreen() {
  const { pets } = usePets();
  const [events, setEvents] = useState<Array<{ event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pets?.length) return;
    setLoading(true);
    api
      .get<{ events: Array<{ event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown> }> }>(`/pets/${pets[0].id}/events?limit=100`)
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [pets]);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>时间线</Text>
      <Text style={styles.sub}>宠物生命中的每一次记录</Text>
      {loading && <ActivityIndicator style={{ margin: 20 }} />}
      {!loading && events.length === 0 && <Text style={styles.muted}>还没有记录。</Text>}
      <FlatList
        data={events}
        keyExtractor={(e) => e.event_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.event_type}</Text>
            <Text style={styles.muted}>{new Date(item.occurred_at).toLocaleString("zh-CN")}</Text>
            <Text style={styles.cardBody}>{Object.entries(item.payload).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</Text>
          </View>
        )}
      />
    </View>
  );
}

function ProfileScreen() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>我的</Text>
      <Text style={styles.sub}>账号、隐私与设置</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{current ? current.name : "未登录"}</Text>
        <Text style={styles.muted}>开发模式认证 · 生产环境将接入真实账号系统</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                Today: "home",
                Timeline: "list",
                Profile: "person",
              };
              return <Ionicons name={icons[route.name] ?? "ellipse"} color={color} size={size} />;
            },
            tabBarActiveTintColor: "#3D4F3A",
            tabBarInactiveTintColor: "#7C7369",
            headerShown: false,
          })}
        >
          <Tab.Screen name="Today" component={TodayScreen} />
          <Tab.Screen name="Timeline" component={TimelineScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FAF8F5" },
  h1: { fontSize: 26, fontWeight: "700", color: "#2B2723", marginTop: 8 },
  h2: { fontSize: 17, fontWeight: "600", color: "#2B2723", marginTop: 20, marginBottom: 8 },
  sub: { fontSize: 13, color: "#7C7369", marginBottom: 12 },
  muted: { fontSize: 12, color: "#7C7369" },
  error: { color: "#B42318", marginVertical: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F3F0EB", borderWidth: 1, borderColor: "#E8E2D9" },
  chipActive: { backgroundColor: "#E4EAE0", borderColor: "#61795C" },
  chipText: { color: "#7C7369" },
  chipActiveText: { color: "#2F3D2D", fontWeight: "600" },
  quickgrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quick: { flex: 1, minWidth: 90, padding: 16, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E2D9", alignItems: "center" },
  quickText: { fontSize: 14, color: "#2B2723" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E8E2D9", padding: 14, marginVertical: 6 },
  cardTitle: { fontWeight: "600", color: "#2B2723", fontSize: 14 },
  cardBody: { marginTop: 4, fontSize: 12, color: "#57504A" },
});