/** R8AK: continue reviewing an OLD persisted Case from its own detail page.
 *
 * SAFETY / INVARIANT: this never invents a new observation. "补充真实观察"
 * leaves this screen for QuickLog, which saves a real LifeEvent first and only
 * then appends the owner RECORD_OBSERVATION review. Text here is a human
 * decision, not a diagnosis or a claim that the pet recovered.
 */
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";
import {
  continueCaseReview, type CaseDecision,
} from "./caseHistoryApi";

const DECISIONS: Array<{ key: CaseDecision; label: string; note: string }> = [
  { key: "FOLLOW_UP_LATER", label: "继续关注", note: "保留这条观察，稍后再看" },
  { key: "NOT_RELEVANT", label: "暂不关注", note: "主人判断暂不需要跟进" },
  { key: "CORRECT_SOURCE", label: "来源需核对", note: "请核对当时记录是否准确" },
];

export function CaseReviewActions({
  petId, caseId, ownerCanReview, latestReviewId, sourceValid,
  onReviewed, onRecord,
}: {
  petId: string;
  caseId: string;
  ownerCanReview: boolean;
  latestReviewId: string | null;
  sourceValid: boolean;
  onReviewed: () => void;
  onRecord: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const scope = `${petId}:${caseId}`;
  const activeScope = useRef(scope);
  if (activeScope.current !== scope) {
    activeScope.current = scope;
    inFlight.current = false;
  }

  const decide = async (decision: CaseDecision) => {
    if (!ownerCanReview || inFlight.current) return;
    // A source-changed Case must not accept a new human decision until the
    // owner has seen the invalidation; the server enforces this too.
    if (!sourceValid) {
      setMessage("原始依据已改变，需重新核对后才能继续记录主人决定。");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const accepted = await continueCaseReview(petId, caseId, decision, latestReviewId);
      setMessage(
        accepted.replayed
          ? "这次主人决定此前已保存，已按原记录显示。"
          : decision === "NOT_RELEVANT"
            ? "已记录主人判断；不代表宠物健康状态已被证明正常。"
            : decision === "CORRECT_SOURCE"
              ? "已记录需要核对来源；可在下方来源明细逐条查看。"
              : "已记录继续关注；不会自动创建医疗任务。",
      );
      onReviewed();
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "REVIEW_ACK_MISMATCH") {
        setMessage("服务器未确认这次决定属于当前档案，已停止显示。");
      } else {
        setMessage(`${humanizeError(e)} 档案可能已有新的主人反馈，请刷新后重试。`);
        onReviewed();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.section} testID="pli.r8.case-detail.review-actions">
      <Text style={styles.heading}>主人可以怎样继续？</Text>
      <Text style={styles.caption}>
        这里只记录主人的观察与决定，不会自动诊断、用药或判断宠物已恢复。
      </Text>
      {!ownerCanReview ? (
        <Text style={styles.caption} testID="pli.r8.case-detail.review.readonly">
          只有宠物主人可以在档案里继续记录决定；你可以查看已保留的来源与历史反馈。
        </Text>
      ) : (
        <>
          <Pressable
            testID="pli.r8.case-detail.review.record"
            accessibilityRole="button"
            style={styles.primary}
            disabled={busy}
            onPress={onRecord}
          >
            <Text style={styles.primaryText}>记录一条真实观察</Text>
          </Pressable>
          <View style={styles.row}>
            {DECISIONS.map((item) => (
              <Pressable
                key={item.key}
                testID={`pli.r8.case-detail.review.${item.key.toLowerCase()}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}：${item.note}`}
                accessibilityHint="追加一次主人反馈，不会改写历史记录"
                style={styles.secondary}
                disabled={busy}
                onPress={() => void decide(item.key)}
              >
                <Text style={styles.secondaryText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {message ? (
            <Text
              style={styles.status}
              testID="pli.r8.case-detail.review.status"
              accessibilityLiveRegion="polite"
            >
              {message}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: COLORS.surface, borderRadius: 18, padding: SPACE.s4, gap: SPACE.s3 },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  primary: {
    minHeight: 48, paddingHorizontal: SPACE.s4, justifyContent: "center",
    alignItems: "center", borderRadius: 18, backgroundColor: COLORS.brandPrimaryDeep,
  },
  primaryText: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.textInverse },
  secondary: {
    minHeight: 44, paddingHorizontal: SPACE.s3, justifyContent: "center",
    alignItems: "center", borderRadius: 16, backgroundColor: COLORS.surfaceRaised,
  },
  secondaryText: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textPrimary },
  status: {
    fontSize: TYPE.sm, lineHeight: 21, color: COLORS.brandPrimaryDeep,
    backgroundColor: COLORS.brandSoft, padding: SPACE.s3, borderRadius: 12,
  },
});
