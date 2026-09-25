/** BehaviorScreen — 行为记录 (PLI-069 mobile port of apps/web/app/behavior):
 *  ABC 记录法（前因→可观察行为→后果），只保存可观察事实，不自动推断疾病
 *  或行为诊断；intensity 由主人主观标注并记录为 OWNER_REPORTED。 */
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type BehaviorEventRow } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS } from "../tokens";
import { INTENSITIES, intensityLabel, styles } from "./behavior_styles";
import { Badge, Card, Chip, EmptyText, ErrorText, Loading, PrimaryButton, ScreenTitle, SectionTitle } from "./ui";

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
  const { petId } = usePets();
  const [rows, setRows] = useState<BehaviorEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [validation, setValidation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<BehaviorEventRow[]>(`/pets/${petId}/behavior-events`)
      .then((r) => {
        if (!alive) return;
        setRows(r);
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
  }, [petId, version]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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
      });
      setForm(EMPTY_FORM);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="行为记录" sub="ABC 记录法：前因 → 可观察行为 → 后果。只保存可观察事实，不构成诊断。" />

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <Loading />}

        <Card>
          <SectionTitle>记录一次行为事件</SectionTitle>
          <Text style={styles.fieldLabel}>前因 / 情境（发生了什么之前？）</Text>
          <TextInput
            style={styles.input}
            value={form.antecedent}
            onChangeText={(v) => set("antecedent", v)}
            placeholder="例如：门铃响 / 陌生狗经过"
            placeholderTextColor={COLORS.inkDisabled}
          />
          <Text style={styles.fieldLabel}>观察到的行为 *（写你看到的）</Text>
          <TextInput
            style={styles.input}
            value={form.behavior}
            onChangeText={(v) => set("behavior", v)}
            placeholder="例如：连续吠叫约 3 分钟后躲到沙发下"
            placeholderTextColor={COLORS.inkDisabled}
          />
          <Text style={styles.fieldLabel}>后果（之后发生了什么？）</Text>
          <TextInput
            style={styles.input}
            value={form.consequence}
            onChangeText={(v) => set("consequence", v)}
            placeholder="例如：主人安抚后自行出来"
            placeholderTextColor={COLORS.inkDisabled}
          />
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>持续秒数</Text>
              <TextInput
                style={styles.input}
                value={form.duration_seconds}
                onChangeText={(v) => set("duration_seconds", v)}
                keyboardType="number-pad"
                placeholder="可选"
                placeholderTextColor={COLORS.inkDisabled}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>环境</Text>
              <TextInput
                style={styles.input}
                value={form.environment}
                onChangeText={(v) => set("environment", v)}
                placeholder="例如：客厅"
                placeholderTextColor={COLORS.inkDisabled}
              />
            </View>
          </View>
          <Text style={styles.fieldLabel}>强度（主人主观，记为 OWNER_REPORTED）</Text>
          <View style={styles.chipRow}>
            {INTENSITIES.map((it) => (
              <Chip
                key={it.value}
                label={it.label}
                active={form.intensity === it.value}
                onPress={() => set("intensity", it.value)}
              />
            ))}
          </View>
          <Text style={styles.fieldLabel}>备注</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={form.owner_notes}
            onChangeText={(v) => set("owner_notes", v)}
            multiline
            placeholder="可选"
            placeholderTextColor={COLORS.inkDisabled}
          />
          {validation && <ErrorText>{validation}</ErrorText>}
          {formError && <ErrorText>{formError}</ErrorText>}
          <PrimaryButton label={saving ? "提交中…" : "保存行为事件"} onPress={() => void submit()} disabled={saving} />
        </Card>

        <SectionTitle>历史记录</SectionTitle>
        {!loading && rows.length === 0 ? (
          <EmptyText>还没有行为记录。</EmptyText>
        ) : (
          rows.map((b) => (
            <Card key={b.behavior_event_id}>
              <View style={styles.itemHead}>
                <Text style={styles.itemTitle}>{b.behavior}</Text>
                <Text style={styles.itemTime}>{fmtTime(b.occurred_at)}</Text>
              </View>
              {b.intensity ? (
                <View style={styles.itemRow}>
                  <Badge text={intensityLabel(b.intensity)} color={COLORS.accent600} bg={COLORS.accent50} />
                  <Text style={styles.itemMeta}>主人标注</Text>
                </View>
              ) : null}
              <Text style={styles.itemMeta}>
                前因：{b.antecedent || "—"} ・ 后果：{b.consequence || "—"} ・ 环境：{b.environment || "—"}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}