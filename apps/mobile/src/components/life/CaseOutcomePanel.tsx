/** R8BV: owner outcome journal anchored to a real follow-up observation.
 *
 * This records the owner's current judgement about what to do next. It never
 * claims recovery, diagnosis, or causal effect, and it never mutates old Case
 * or Review history.
 */
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";
import {
  recordCaseOutcome, type CaseOutcomeAssessment,
} from "./caseHistoryApi";

export interface OwnerOutcomeRow {
  outcome_id: string;
  observation_review_id: string;
  recorded_at: string;
  assessment: CaseOutcomeAssessment;
  observation_sources_valid: boolean;
  truth_note: string;
}

const LABELS: Record<CaseOutcomeAssessment, string> = {
  CONTINUE_OBSERVING: "继续观察",
  NO_LONGER_CONCERNED: "目前不再担心",
  NEEDS_FURTHER_FOLLOW_UP: "需要进一步跟进",
};

const OPTIONS: Array<{ key: CaseOutcomeAssessment; hint: string }> = [
  { key: "CONTINUE_OBSERVING", hint: "保留关注，之后继续记录真实观察" },
  { key: "NO_LONGER_CONCERNED", hint: "仅记录主人目前的判断，不代表已证明恢复" },
  { key: "NEEDS_FURTHER_FOLLOW_UP", hint: "主人认为还需要继续跟进，不自动升级为医疗结论" },
];

function dateText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间待核实" : date.toLocaleString("zh-CN", { hour12: false });
}

export function CaseOutcomePanel({
  petId, caseId, ownerCanWrite, observationReviewId, latestOutcomeId,
  outcomes, onRecorded,
}: {
  petId: string;
  caseId: string;
  ownerCanWrite: boolean;
  observationReviewId: string | null;
  latestOutcomeId: string | null;
  outcomes: OwnerOutcomeRow[];
  onRecorded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  const submit = async (assessment: CaseOutcomeAssessment) => {
    if (!ownerCanWrite || !observationReviewId || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const ack = await recordCaseOutcome(
        petId, caseId, observationReviewId, assessment, latestOutcomeId,
      );
      setMessage(
        ack.replayed
          ? "这次主人判断此前已保存，已按原记录显示。"
          : "已记录主人当前判断；不会据此宣称宠物已恢复、患病或存在因果关系。",
      );
      onRecorded();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error && error.message === "OUTCOME_ACK_MISMATCH"
          ? "服务器未确认这次结果属于当前宠物与档案，已停止显示。"
          : `${humanizeError(error)} 请重新核对后续观察后再试。`,
      );
      onRecorded();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.section} testID="pli.r8.case-detail.outcomes">
      <Text style={styles.eyebrow}>跟进结果</Text>
      <Text style={styles.heading}>这次观察后来怎样了？</Text>
      <Text style={styles.caption}>
        结果必须基于一条真实、仍可核对的后续观察。这里记录的是主人判断，不是诊断、因果结论或“已经恢复”证明。
      </Text>

      {outcomes.map((outcome) => (
        <View
          key={outcome.outcome_id}
          style={outcome.observation_sources_valid ? styles.history : styles.historyInvalid}
          testID={`pli.r8.case-detail.outcome.${outcome.outcome_id}`}
        >
          <Text style={styles.label}>{LABELS[outcome.assessment]}</Text>
          <Text style={styles.caption}>{dateText(outcome.recorded_at)}</Text>
          <Text style={outcome.observation_sources_valid ? styles.body : styles.warning}>
            {outcome.observation_sources_valid
              ? "所依据的后续观察目前仍有效"
              : "所依据的后续记录已变化；保留历史判断，但不能继续当作当前依据"}
          </Text>
          <Text style={styles.caption}>{outcome.truth_note}</Text>
        </View>
      ))}

      {!ownerCanWrite ? (
        <Text style={styles.caption}>只有宠物主人可以追加新的结果判断。</Text>
      ) : !observationReviewId ? (
        <Text style={styles.caption} testID="pli.r8.case-detail.outcome.needs-observation">
          先记录一条真实的后续观察，之后才能回看结果。
        </Text>
      ) : (
        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              testID={`pli.r8.case-detail.outcome.${option.key.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityLabel={`${LABELS[option.key]}：${option.hint}`}
              disabled={busy}
              onPress={() => void submit(option.key)}
              style={styles.action}
            >
              <Text style={styles.actionTitle}>{LABELS[option.key]}</Text>
              <Text style={styles.actionHint}>{option.hint}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {message ? (
        <Text style={styles.status} testID="pli.r8.case-detail.outcome.status" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: COLORS.surface, borderRadius: 18, padding: SPACE.s4, gap: SPACE.s3 },
  eyebrow: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.meta, fontWeight: "700" },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  body: { color: COLORS.textPrimary, fontSize: TYPE.sm, lineHeight: 20 },
  label: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  warning: { color: COLORS.danger, fontSize: TYPE.sm, lineHeight: 20, fontWeight: "700" },
  history: { paddingLeft: SPACE.s3, borderLeftWidth: 3, borderLeftColor: COLORS.brandSoftGreen, gap: SPACE.s1 },
  historyInvalid: { paddingLeft: SPACE.s3, borderLeftWidth: 3, borderLeftColor: COLORS.danger, gap: SPACE.s1 },
  options: { gap: SPACE.s2 },
  action: { minHeight: 58, borderRadius: 15, backgroundColor: COLORS.surfaceRaised, padding: SPACE.s3, justifyContent: "center" },
  actionTitle: { color: COLORS.textPrimary, fontSize: TYPE.sm, fontWeight: "700" },
  actionHint: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  status: { fontSize: TYPE.sm, lineHeight: 21, color: COLORS.brandPrimaryDeep, backgroundColor: COLORS.brandSoft, padding: SPACE.s3, borderRadius: 12 },
});
