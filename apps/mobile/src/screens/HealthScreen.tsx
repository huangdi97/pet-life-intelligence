/** HealthScreen (PLI-049..056 mobile port): health events list + 发现异常
 *  entry (placeholder form → POST /pets/{id}/health-events with
 *  chief_complaint). Triage levels display backend rule-engine values only
 *  (no local inference, no diagnosis claims — 本页仅信息整理). */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type HealthEventRow } from "../api";
import { usePets } from "../context";
import { fmtDate, riskLabel } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Badge, Card, EmptyText, ErrorText, Loading, PrimaryButton, ScreenTitle, SectionTitle } from "./ui";

interface HealthEventCreateResp {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  triage: { level: string; engine: string; matched_rules: string[] };
}

/** Risk colors come from tokens (semantic risk colors); display backend
 *  triage values only. */
function triageColors(level: string | null): { color: string; bg: string } {
  if (level === "NORMAL") return { color: COLORS.ok, bg: COLORS.okBg };
  if (level === "NOTICE") return { color: COLORS.notice, bg: COLORS.noticeBg };
  if (level === "MONITOR") return { color: COLORS.monitor, bg: COLORS.monitorBg };
  if (level === "VET_SOON") return { color: COLORS.vetSoon, bg: COLORS.vetSoonBg };
  if (level === "URGENT") return { color: COLORS.urgent, bg: COLORS.urgentBg };
  if (level === "EMERGENCY") return { color: COLORS.emergency, bg: COLORS.emergencyBg };
  return { color: COLORS.inkMuted, bg: COLORS.bgSurfaceMuted };
}

function statusLabel(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "CLOSED") return "已结束";
  return status;
}

export function HealthScreen() {
  const { petId } = usePets();
  const [rows, setRows] = useState<HealthEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdLevel, setCreatedLevel] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<HealthEventRow[]>(`/pets/${petId}/health-events`)
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

  async function submit() {
    if (!petId || saving) return;
    const c = complaint.trim();
    if (!c) {
      setFormError("请简单描述主要情况。");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const r = await api.post<HealthEventCreateResp>(`/pets/${petId}/health-events`, {
        chief_complaint: c,
      });
      setCreatedLevel(r.triage.level);
      setComplaint("");
      setFormOpen(false);
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
        <ScreenTitle title="健康" sub="健康记录 · 仅信息整理，不构成诊断。" />

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <Loading />}

        {createdLevel && (
          <Card>
            <Text style={styles.successText}>已创建健康记录。</Text>
            <View style={styles.createdRow}>
              <Badge text={riskLabel(createdLevel)} {...triageColors(createdLevel)} />
              <Text style={styles.note}>分级来自后端规则引擎，不构成诊断。</Text>
            </View>
          </Card>
        )}

        <PrimaryButton label={formOpen ? "收起" : "+ 发现异常"} onPress={() => setFormOpen((v) => !v)} />

        {formOpen && (
          <Card>
            <Text style={styles.fieldLabel}>主要情况（主诉）</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={complaint}
              onChangeText={setComplaint}
              multiline
              placeholder="例如：左耳抓挠三天，有棕色分泌物"
              placeholderTextColor={COLORS.inkDisabled}
            />
            <Text style={styles.note}>
              仅信息整理与分级提示，不构成诊断；紧急情况请直接联系兽医。
            </Text>
            <PrimaryButton label={saving ? "提交中…" : "提交"} onPress={() => void submit()} disabled={saving} />
            {formError && <ErrorText>{formError}</ErrorText>}
          </Card>
        )}

        <SectionTitle>健康记录</SectionTitle>
        {!loading && rows.length === 0 ? (
          <EmptyText>还没有健康记录。</EmptyText>
        ) : (
          rows.map((r) => {
            const colors = triageColors(r.latest_triage_level);
            return (
              <Card key={r.health_event_id}>
                <Text style={styles.itemTitle}>{r.chief_complaint}</Text>
                <View style={styles.itemRow}>
                  <Badge text={riskLabel(r.latest_triage_level)} color={colors.color} bg={colors.bg} />
                  <Text style={styles.itemMeta}>
                    {statusLabel(r.status)} · {fmtDate(r.opened_at)}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  successText: { fontSize: TYPE.base, color: COLORS.ok, fontWeight: TYPE.weightMedium },
  createdRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s2 },
  note: { fontSize: TYPE.xs, color: COLORS.inkMuted, flexShrink: 1 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: 10,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.base,
    color: COLORS.inkPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  itemTitle: { fontSize: TYPE.base, color: COLORS.inkPrimary },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACE.s2 },
  itemMeta: { fontSize: TYPE.xs, color: COLORS.inkMuted },
});
