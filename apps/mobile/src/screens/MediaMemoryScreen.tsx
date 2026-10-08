import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { api, authenticatedMediaSource, humanizeError } from "../api";
import type { StackParamList } from "../navigation";
import { COLORS, SPACE, TYPE } from "../tokens";

type Route = RouteProp<StackParamList, "MediaMemory">;
type Nav = NativeStackNavigationProp<StackParamList>;

interface ArtifactMeta {
  artifact_id: string;
  pet_id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  content_type: string;
  size_bytes: number;
  original_filename: string;
  sensitive: boolean;
  created_at: string;
}

interface MediaSource {
  uri: string;
  headers: Record<string, string>;
}

export function MediaMemoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const artifactIds = useMemo(
    () => route.params.artifactIds.filter(Boolean).slice(0, 20),
    [route.params.artifactIds],
  );
  const [index, setIndex] = useState(Math.min(route.params.initialIndex ?? 0, Math.max(0, artifactIds.length - 1)));
  const [meta, setMeta] = useState<ArtifactMeta | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const artifactId = artifactIds[index] ?? null;

  useEffect(() => {
    if (!artifactId) {
      setState("error");
      setError("没有可查看的媒体。");
      return;
    }
    let alive = true;
    setState("loading");
    setError("");
    Promise.all([
      api.get<ArtifactMeta>(`/artifacts/${artifactId}`),
      authenticatedMediaSource(artifactId),
    ])
      .then(([metadata, mediaSource]) => {
        if (!alive) return;
        setMeta(metadata);
        setSource(mediaSource);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setMeta(null);
        setSource(null);
        setState("error");
        setError(humanizeError(e));
      });
    return () => { alive = false; };
  }, [artifactId]);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回时间线"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>媒体回忆</Text>
          <Text style={styles.sub}>只展示这条记录绑定的原始媒体</Text>
        </View>
        <Text style={styles.counter}>{artifactIds.length ? `${index + 1}/${artifactIds.length}` : "—"}</Text>
      </View>

      <View style={styles.stage} testID="pli.media-memory.stage">
        {state === "loading" ? (
          <Text style={styles.stateText}>正在读取原始媒体……</Text>
        ) : state === "error" ? (
          <View style={styles.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={26} color={COLORS.textTertiary} />
            <Text style={styles.stateText}>{error || "媒体暂时无法读取。"}</Text>
            <Text style={styles.hint}>不会用占位图、模拟视频或生成声音替代原始记录。</Text>
          </View>
        ) : meta && source ? (
          meta.kind === "IMAGE" ? (
            <Image source={source} style={styles.image} resizeMode="contain" accessibilityLabel={meta.original_filename || "宠物生活记录照片"} />
          ) : (
            <WebView
              source={source}
              style={styles.webview}
              originWhitelist={["*"]}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction
              accessibilityLabel={meta.kind === "VIDEO" ? "原始视频回忆" : meta.kind === "AUDIO" ? "原始声音回忆" : "原始文件"}
            />
          )
        ) : null}
      </View>

      {meta ? (
        <View style={styles.meta}>
          <Text style={styles.metaTitle}>
            {meta.kind === "IMAGE" ? "照片" : meta.kind === "VIDEO" ? "视频" : meta.kind === "AUDIO" ? "声音" : "文件"}
            {meta.original_filename ? ` · ${meta.original_filename}` : ""}
          </Text>
          <Text style={styles.hint}>
            原始媒体 · {Math.max(1, Math.round(meta.size_bytes / 1024))} KB · {new Date(meta.created_at).toLocaleString("zh-CN")}
          </Text>
          {meta.sensitive ? <Text style={styles.sensitive}>敏感资料 · 仅按当前医疗权限读取</Text> : null}
        </View>
      ) : null}

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="上一个媒体"
          disabled={index <= 0}
          onPress={() => setIndex((v) => Math.max(0, v - 1))}
          style={[styles.navButton, index <= 0 && styles.disabled]}
        >
          <Text style={styles.navText}>上一个</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="下一个媒体"
          disabled={index >= artifactIds.length - 1}
          onPress={() => setIndex((v) => Math.min(artifactIds.length - 1, v + 1))}
          style={[styles.navButton, index >= artifactIds.length - 1 && styles.disabled]}
        >
          <Text style={styles.navText}>下一个</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s3, gap: SPACE.s2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: COLORS.surface },
  headerText: { flex: 1 },
  title: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  sub: { marginTop: 2, fontSize: TYPE.caption, color: COLORS.textTertiary },
  counter: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  stage: { flex: 1, marginHorizontal: SPACE.s3, borderRadius: 22, overflow: "hidden", backgroundColor: COLORS.surfaceRaised, alignItems: "stretch", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  webview: { flex: 1, backgroundColor: COLORS.surfaceRaised },
  errorWrap: { alignItems: "center", padding: SPACE.s5, gap: SPACE.s2 },
  stateText: { textAlign: "center", fontSize: TYPE.body, color: COLORS.textSecondary, paddingHorizontal: SPACE.s4 },
  meta: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  metaTitle: { fontSize: TYPE.bodyStrong, color: COLORS.textPrimary, fontWeight: "600" },
  hint: { marginTop: 4, fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18 },
  sensitive: { marginTop: 5, fontSize: TYPE.caption, color: COLORS.brandSecondary },
  controls: { flexDirection: "row", gap: SPACE.s2, padding: SPACE.s4 },
  navButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: COLORS.brandSoftGreen },
  navText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  disabled: { opacity: 0.35 },
});
