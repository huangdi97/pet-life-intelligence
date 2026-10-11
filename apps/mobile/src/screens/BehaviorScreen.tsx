/**
 * BehaviorScreen — 观察优先 (Stage R.2 §46): Recent Observations →
 * Current context → (form last). ABC 记录法保留在录入流程里，不作为默认
 * 首页主体。只保存可观察事实，不构成行为诊断；intensity 记为主人标注。
 */
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePets } from "../context";
import { api, humanizeError, type BehaviorEventRow } from "../api";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { INTENSITIES, intensityLabel } from "./behavior_styles";

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

const BEHAVIOR_TEMPLATES = ["吠叫", "抓挠", "破坏物品", "追逐", "躲避", "反复舔咬"] as const;

function topObserved(values: Array<string | null | undefined>, limit = 3): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  values.forEach((raw) => {
    const label = (raw ?? "").trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

const EMPTY_FORM = {
  antecedent: "",
  behavior: "",
  consequence: "",
  duration_seconds: "",
  intensity: "",
  environment: "",
  owner_notes: "",
};

export function BehaviorScreen() {
  const { pets, petId } = usePets();
  const [rows, setRows] = useState<BehaviorEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [validation, setValidation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<"all" | "MILD" | "MODERATE" | "SEVERE" | "UNLABELED">("all");
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [preferenceState, setPreferenceState] = useState<"loading" | "ready" | "error">("loading");
  const [preferenceKind, setPreferenceKind] = useState<"LIKE" | "DISLIKE" | "ALLERGY_CAUTION">("LIKE");
  const [preferenceSubject, setPreferenceSubject] = useState("");
  const [preferenceNote, setPreferenceNote] = useState("");
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [artifactIds, setArtifactIds] = useState<string[]>([]);
  const [artifactNames, setArtifactNames] = useState<string[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setPreferenceState("loading");
    api.get<PreferenceRow[]>(`/pets/${petId}/preferences`)
      .then((items) => {
        if (!alive) return;
        setPreferences(items);
        setPreferenceState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setPreferences([]);
        setPreferenceState("error");
      });
    api
      .get<BehaviorEventRow[]>(`/pets/${petId}/behavior-events`)
      .then((r) => {
        if (alive) {
          setRows(r);
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
  }, [petId, version]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function attachBehaviorVideo() {
    if (!petId || videoUploading) return;
    setVideoUploading(true);
    setFormError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType && asset.mimeType.startsWith("video/")
        ? asset.mimeType
        : "video/mp4";
      const fileName = asset.fileName || `behavior-${Date.now()}.mp4`;
      const row = await api.upload<{ artifact_id: string; kind: string }>(
        `/pets/${petId}/artifacts`,
        { uri: asset.uri, name: fileName, type: mimeType },
      );
      if (row.kind !== "VIDEO") throw new Error("上传内容没有被识别为视频。");
      setArtifactIds((ids) => [...ids, row.artifact_id].slice(-3));
      setArtifactNames((names) => [...names, fileName].slice(-3));
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setVideoUploading(false);
    }
  }

  async function addPreference() {
    if (!petId || !preferenceSubject.trim() || preferenceBusy) return;
    setPreferenceBusy(true);
    setFormError(null);
    try {
      await api.post(`/pets/${petId}/preferences`, {
        kind: preferenceKind,
        subject: preferenceSubject.trim(),
        note: preferenceNote.trim(),
        source_type: "OWNER_REPORTED",
      });
      setPreferenceSubject("");
      setPreferenceNote("");
      setPreferenceOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setPreferenceBusy(false);
    }
  }

  async function submit() {
    if (!petId || saving) return;
    setValidation(null);
    if (!form.behavior.trim()) {
      setValidation("“观察到的行为”必填，请写你看到的，不要写结论。");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date().toISOString(),
        antecedent: form.antecedent,
        behavior: form.behavior.trim(),
        consequence: form.consequence,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        intensity: form.intensity,
        environment: form.environment,
        owner_notes: form.owner_notes,
        artifact_ids: artifactIds,
      });
      setForm(EMPTY_FORM);
      setArtifactIds([]);
      setArtifactNames([]);
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const latest = rows[0] ?? null;
  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "UNLABELED") return !row.intensity;
    return row.intensity === filter;
  });
  const topBehaviors = topObserved(rows.map((row) => row.behavior));
  const topContexts = topObserved(rows.flatMap((row) => [row.antecedent, row.environment]));

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.behavior.identity">
          <Text style={styles.title}>{pet ? `${pet.name}的行为` : "行为"}</Text>
          <Text style={styles.sub}>只记录可观察的事实，不构成行为诊断。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="最近观察" testID="pli.behavior.observations">
              {rows.length > 0 ? (
                <View style={styles.filterWrap} accessibilityLabel="行为记录筛选">
                  {[
                    ["all", "全部"],
                    ["MILD", "轻度"],
                    ["MODERATE", "中度"],
                    ["SEVERE", "重度"],
                    ["UNLABELED", "未标注"],
                  ].map(([value, label]) => (
                    <ChipPressable
                      key={value}
                      label={label}
                      active={filter === value}
                      onPress={() => setFilter(value as typeof filter)}
                    />
                  ))}
                </View>
              ) : null}
              {rows.length === 0 ? (
                <EmptyState
                  title="还没有行为观察"
                  body={`记录${pet?.name ?? "宠物"}做了什么、之前之后发生了什么，规律会慢慢浮现。`}
                />
              ) : (
                <View testID="pli.behavior.recent">
                  {visibleRows.length === 0 ? (
                    <Text style={styles.hintText}>当前筛选下没有行为记录。</Text>
                  ) : null}
                  {visibleRows.map((b, i) => (
                    <View key={b.behavior_event_id} style={[styles.obsRow, i > 0 && styles.obsDivider]}>
                      <Text style={styles.obsText}>{b.behavior}</Text>
                      <View style={styles.obsMetaRow}>
                        <Text style={styles.obsMeta}>{fmtTime(b.occurred_at)}</Text>
                        {b.intensity ? (
                          <View testID="pli.behavior.source" style={styles.intensityPill}>
                            <Text style={styles.intensityText}>{intensityLabel(b.intensity)} · 主人标注</Text>
                          </View>
                        ) : null}
                      </View>
                      {b.artifact_ids?.length ? (
                        <Text style={styles.obsMeta}>已关联 {b.artifact_ids.length} 个媒体证据 · 仅作为本次行为记录的原始素材</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </OpenSection>

            <OpenSection title="模式与情境" testID="pli.behavior.patterns">
              <Text style={styles.hintText}>只按真实行为记录汇总频次与共现，不推断性格、情绪、疾病或因果。</Text>
              {topBehaviors.length ? (
                <View style={styles.filterWrap} accessibilityLabel="常见行为记录">
                  {topBehaviors.map((item) => (
                    <View key={item.label} style={styles.patternChip}>
                      <Text style={styles.patternChipText}>{item.label} · {item.count} 次</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={styles.hintText}>还没有足够记录形成可展示的频次。</Text>}
              {topContexts.length ? (
                <View style={styles.abcCard}>
                  {topContexts.map((item) => (
                    <AbcLine key={item.label} label="记录共现" value={`${item.label} · ${item.count} 次`} />
                  ))}
                </View>
              ) : null}
            </OpenSection>

            {latest ? (
              <OpenSection title="当前情境" testID="pli.behavior.context">
                <View style={styles.abcCard}>
                  <AbcLine label="前因" value={latest.antecedent} />
                  <AbcLine label="行为" value={latest.behavior} />
                  <AbcLine label="后果" value={latest.consequence} />
                  <AbcLine label="环境" value={latest.environment} />
                </View>
              </OpenSection>
            ) : null}

            <OpenSection title="偏好与回避" testID="pli.behavior.preferences">
              <Text style={styles.hintText}>只保存主人明确观察到的喜欢、回避或过敏谨慎项；不会从单次行为自动推断偏好。</Text>
              {preferenceState === "loading" ? (
                <Text style={styles.hintText}>正在读取偏好记录……</Text>
              ) : preferenceState === "error" ? (
                <Text style={styles.hintText}>偏好记录暂时没有加载成功；不会用默认偏好补齐。</Text>
              ) : preferences.filter((row) => row.kind !== "REWARD").length ? (
                preferences.filter((row) => row.kind !== "REWARD").map((row, index) => (
                  <View key={row.preference_id} style={[styles.obsRow, index > 0 && styles.obsDivider]}>
                    <Text style={styles.obsText}>{row.subject}</Text>
                    <Text style={styles.obsMeta}>{PREF_LABEL[row.kind]} · 主人记录{row.note ? ` · ${row.note}` : ""}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.hintText}>还没有偏好记录。</Text>
              )}
              <Pressable
                testID="pli.behavior.preference.toggle"
                accessibilityRole="button"
                accessibilityLabel={preferenceOpen ? "收起偏好记录" : "记录偏好"}
                accessibilityState={{ expanded: preferenceOpen }}
                onPress={() => setPreferenceOpen((value) => !value)}
                style={styles.secondaryToggle}
              >
                <Text style={styles.secondaryToggleText}>{preferenceOpen ? "收起" : "+ 记录偏好"}</Text>
              </Pressable>
              {preferenceOpen ? (
                <View style={styles.secondaryForm}>
                  <View style={styles.filterWrap}>
                    {(["LIKE", "DISLIKE", "ALLERGY_CAUTION"] as const).map((kind) => (
                      <ChipPressable key={kind} label={PREF_LABEL[kind]} active={preferenceKind === kind} onPress={() => setPreferenceKind(kind)} />
                    ))}
                  </View>
                  <TextInput style={styles.input} value={preferenceSubject} onChangeText={setPreferenceSubject} placeholder="例如：冻干鸡肉 / 吹风机声音" placeholderTextColor={COLORS.textTertiary} />
                  <TextInput style={styles.input} value={preferenceNote} onChangeText={setPreferenceNote} placeholder="补充实际观察（可选）" placeholderTextColor={COLORS.textTertiary} />
                  <Pressable testID="pli.behavior.preference.submit" accessibilityRole="button" accessibilityLabel="保存偏好" disabled={preferenceBusy || !preferenceSubject.trim()} onPress={() => void addPreference()} style={[styles.submitBtn, (preferenceBusy || !preferenceSubject.trim()) && styles.pressed]}>
                    <Text style={styles.submitText}>{preferenceBusy ? "保存中…" : "保存偏好"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </OpenSection>



            <View style={styles.formSection}>
              <Pressable
                testID="pli.behavior.action"
                accessibilityRole="button"
                accessibilityLabel={formOpen ? "收起行为记录表单" : "记录行为"}
                accessibilityState={{ expanded: formOpen }}
                onPress={() => setFormOpen((v) => !v)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <Text style={styles.formToggleText}>{formOpen ? "收起记录表单" : "记录行为"}</Text>
              </Pressable>
              {formOpen ? (
                <View style={styles.formWrap}>
                  <Text style={styles.fieldLabel}>前因 / 情境（发生了什么之前？）</Text>
                  <TextInput style={styles.input} value={form.antecedent} onChangeText={(v) => set("antecedent", v)} placeholder="例如：门铃响 / 陌生狗经过" placeholderTextColor={COLORS.textTertiary} />
                  <Text style={styles.fieldLabel}>观察到的行为 *（写你看到的）</Text>
                  <TextInput style={styles.input} value={form.behavior} onChangeText={(v) => set("behavior", v)} placeholder="例如：连续吠叫约 3 分钟后躲到沙发下" placeholderTextColor={COLORS.textTertiary} />
                  <View style={styles.filterWrap} accessibilityLabel="行为观察快捷模板">
                    {BEHAVIOR_TEMPLATES.map((template) => (
                      <ChipPressable key={template} label={template} active={form.behavior === template} onPress={() => set("behavior", template)} />
                    ))}
                  </View>
                  <Text style={styles.hintText}>模板只作为填写起点；请继续补充这次真实看到的细节。</Text>
                  <Text style={styles.fieldLabel}>关联行为视频（可选，最多保留 3 个）</Text>
                  <Pressable
                    testID="pli.behavior.video"
                    accessibilityRole="button"
                    accessibilityLabel="选择行为视频"
                    disabled={videoUploading}
                    onPress={() => void attachBehaviorVideo()}
                    style={[styles.videoButton, videoUploading && styles.pressed]}
                  >
                    <Text style={styles.videoButtonText}>{videoUploading ? "正在上传视频……" : "从相册选择视频"}</Text>
                  </Pressable>
                  <Text style={styles.hintText}>
                    {artifactNames.length
                      ? `已关联：${artifactNames.join("、")}`
                      : "视频只作为这条观察的原始证据；系统不会仅凭视频自动推断性格、情绪或诊断。"}
                  </Text>
                  <Text style={styles.fieldLabel}>后果（之后发生了什么？）</Text>
                  <TextInput style={styles.input} value={form.consequence} onChangeText={(v) => set("consequence", v)} placeholder="例如：主人安抚后自行出来" placeholderTextColor={COLORS.textTertiary} />
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>持续秒数</Text>
                      <TextInput style={styles.input} value={form.duration_seconds} onChangeText={(v) => set("duration_seconds", v)} keyboardType="number-pad" placeholder="可选" placeholderTextColor={COLORS.textTertiary} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>环境</Text>
                      <TextInput style={styles.input} value={form.environment} onChangeText={(v) => set("environment", v)} placeholder="例如：客厅" placeholderTextColor={COLORS.textTertiary} />
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>强度（主人主观标注）</Text>
                  <View style={styles.chipRow}>
                    {INTENSITIES.map((it) => (
                      <ChipPressable key={it.value} label={it.label} active={form.intensity === it.value} onPress={() => set("intensity", it.value)} />
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>备注</Text>
                  <TextInput style={[styles.input, styles.inputMultiline]} value={form.owner_notes} onChangeText={(v) => set("owner_notes", v)} multiline placeholder="可选" placeholderTextColor={COLORS.textTertiary} />
                  {validation ? <Text style={styles.errorText}>{validation}</Text> : null}
                  {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="保存行为事件"
                    accessibilityState={{ disabled: saving }}
                    disabled={saving}
                    onPress={() => void submit()}
                    style={({ pressed }) => [styles.submitBtn, saving && styles.pressed, pressed && !saving && styles.pressed]}
                  >
                    <Text style={styles.submitText}>{saving ? "提交中…" : "保存行为事件"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AbcLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.abcRow}>
      <Text style={styles.abcLabel}>{label}</Text>
      <Text style={styles.abcValue}>{value || "—"}</Text>
    </View>
  );
}

function ChipPressable({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipActiveText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, paddingBottom: SPACE.s2 },
  patternChip: { borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceRaised, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  patternChipText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  obsRow: { paddingVertical: 10 },
  obsDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  obsText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  obsMetaRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: 4 },
  obsMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  intensityPill: { backgroundColor: COLORS.brandSoftAmber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  intensityText: { fontSize: TYPE.caption, color: COLORS.brandSecondary },
  // V4 §5 SoftPanel: warm soft surface, no white bordered box.
  abcCard: { backgroundColor: COLORS.brandSoftGreen, borderRadius: RADIUS.xl, padding: SPACE.s4, gap: 8 },
  abcRow: { flexDirection: "row", gap: SPACE.s3 },
  abcLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary, width: 40 },
  abcValue: { fontSize: TYPE.sm, color: COLORS.textPrimary, flex: 1 },
  hintText: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  secondaryToggle: { marginTop: SPACE.s3, minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen },
  secondaryToggleText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  secondaryForm: { marginTop: SPACE.s3, gap: SPACE.s2 },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { minHeight: 48, paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center", justifyContent: "center" },
  formToggleText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  formWrap: { marginTop: SPACE.s3 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  videoButton: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: RADIUS.md, backgroundColor: COLORS.brandSoftGreen, marginBottom: SPACE.s2 },
  videoButtonText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  fieldRow: { flexDirection: "row", gap: SPACE.s3 },
  fieldHalf: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  chip: { minHeight: 44, paddingHorizontal: SPACE.s3, paddingVertical: 6, justifyContent: "center", borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  submitBtn: { marginTop: SPACE.s4, minHeight: 48, justifyContent: "center", backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
