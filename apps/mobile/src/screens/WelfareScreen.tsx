/** WelfareScreen — 福利 (OWN-011 mobile port of apps/web/app/welfare):
 *  生活质量/舒适/压力/活动/环境/丰富化。输出强调证据与趋势，不做
 *  “开心指数”或 AI 情绪百分比；观察记录标记 OWNER_REPORTED。 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type LifeEvent, type WelfareEvidence, type WelfareProfile } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Badge, Card, Chip, EmptyText, ErrorText, Loading, MutedText, PrimaryButton, ScreenTitle, SectionTitle } from "./ui";
import { eventTypeLabel } from "./ui_labels";

const WELFARE_KINDS: Array<{ value: string; label: string }> = [
  { value: "STRESS_RECOVERY", label: "压力恢复" },
  { value: "CHOICE", label: "选择/控制感" },
  { value: "ENVIRONMENT_LOAD", label: "环境负荷" },
  { value: "QOL_QUESTIONNAIRE", label: "生活质量问卷" },
];

const WELFARE_EVENT_TYPES = ["daily.sleep", "daily.play", "daily.walk", "daily.weight", "daily.elimination"];

const DOMAIN_LABELS: Record<string, string> = {
  comfort: "舒适",
  stress_recovery: "压力恢复",
  activity: "活动",
  environment: "环境",
  enrichment: "丰富化",
};

export function WelfareScreen() {
  const { petId } = usePets();
  const [profile, setProfile] = useState<WelfareProfile | null>(null);
  const [evidence, setEvidence] = useState<WelfareEvidence | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("STRESS_RECOVERY");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<WelfareProfile>(`/pets/${petId}/welfare-profile`)
      .then((r) => {
        if (alive) setProfile(r);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      });
    api
      .get<WelfareEvidence>(`/pets/${petId}/welfare-evidence`)
      .then((r) => {
        if (alive) setEvidence(r);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      });
    api
      .get<{ events: LifeEvent[] }>(
        `/pets/${petId}/events?limit=60${WELFARE_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`,
      )
      .then((r) => {
        if (alive) setEvents(r.events);
      })
      .catch(() => {
        if (alive) setEvents([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  async function recordObservation() {
    if (!petId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/welfare-observations`, {
        kind,
        data: { recorded_from: "mobile", note: "" },
        source_type: "OWNER_REPORTED",
      });
      setMsg("已记录福利观察。");
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setMsg(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  const domains = profile?.profile?.domains ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="福利" sub="生活质量 / 舒适 / 压力 / 活动 / 环境 / 丰富化。用证据与趋势，不做开心指数。" />

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <Loading />}

        <Card>
          <SectionTitle>福利档案</SectionTitle>
          {domains && Object.keys(domains).length > 0 ? (
            Object.entries(domains).map(([k, v]) => (
              <View key={k} style={styles.domainRow}>
                <Text style={styles.domainLabel}>{DOMAIN_LABELS[k] ?? k}</Text>
                <Text style={styles.domainValue}>{String(v)}</Text>
              </View>
            ))
          ) : (
            <MutedText>档案尚未形成，等待更多观察记录。</MutedText>
          )}
          {profile?.profile?.notes ? <MutedText>{profile.profile.notes}</MutedText> : null}
        </Card>

        <Card>
          <SectionTitle>记录福利观察</SectionTitle>
          <View style={styles.chipRow}>
            {WELFARE_KINDS.map((k) => (
              <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
          <PrimaryButton label={busy ? "提交中…" : "记录观察"} onPress={() => void recordObservation()} disabled={busy} />
          {msg && <Text style={styles.msg}>{msg}</Text>}
        </Card>

        <Card>
          <SectionTitle>证据概览</SectionTitle>
          {evidence && Object.keys(evidence.observation_counts).length > 0 ? (
            Object.entries(evidence.observation_counts).map(([k, v]) => (
              <View key={k} style={styles.domainRow}>
                <Text style={styles.domainLabel}>{k}</Text>
                <Badge text={`${v} 条`} color={COLORS.inkSecondary} bg={COLORS.bgSurfaceMuted} />
              </View>
            ))
          ) : (
            <MutedText>还没有证据记录。</MutedText>
          )}
          {evidence?.sources && evidence.sources.length > 0 ? (
            <Text style={styles.sourceText}>来源：{evidence.sources.join("、")}</Text>
          ) : null}
          {evidence?.notice ? <MutedText>{evidence.notice}</MutedText> : null}
        </Card>

        <SectionTitle>近期日常记录</SectionTitle>
        {events.length === 0 ? (
          <EmptyText>还没有相关记录。</EmptyText>
        ) : (
          events.map((e) => (
            <Card key={e.event_id}>
              <View style={styles.eventHead}>
                <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                <Text style={styles.eventTime}>{fmtTime(e.occurred_at)}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginVertical: SPACE.s2 },
  msg: { fontSize: TYPE.sm, color: COLORS.ok, marginTop: SPACE.s2 },
  domainRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: SPACE.s1 },
  domainLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
  domainValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary },
  sourceText: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: SPACE.s2 },
  eventHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  eventTime: { fontSize: TYPE.xs, color: COLORS.inkMuted },
});
