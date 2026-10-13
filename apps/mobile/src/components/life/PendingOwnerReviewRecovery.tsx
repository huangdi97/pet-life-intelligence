/** R8J: owner-visible recovery for review intents after a Case leaves Today.
 * Never auto-submit, cross pet scope, or clear an ambiguous instruction.
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, humanizeError } from "../../api";
import { clearOwnerIntent, listOwnerIntentsForPet, type SavedOwnerIntent } from "../../storage/pendingOwnerReview";
import { COLORS, SPACE, TYPE } from "../../tokens";

type CaseDetail = {
  case_id: string;
  pet_id: string;
  evidence_event_ids: string[];
  source_valid: boolean;
  reviews: Array<{ review_id: string; decision: string }>;
};
type ReviewAck = { review_id: string; pet_id: string; case_id: string; decision: string };

const DECISION_LABELS: Record<SavedOwnerIntent["decision"], string> = {
  FOLLOW_UP_LATER: "稍后关注",
  NOT_RELEVANT: "暂不关注",
  CORRECT_SOURCE: "来源不准确",
};

export function PendingOwnerReviewRecovery({
  petId, refreshKey,
}: {
  petId: string;
  refreshKey: number;
}) {
  const [intents, setIntents] = useState<SavedOwnerIntent[]>([]);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setIntents([]);
    setWarning(null);
    // SecureStore-only discovery: no GET, POST, or automated owner action.
    listOwnerIntentsForPet(petId)
      .then((rows) => { if (alive) setIntents(rows); })
      .catch(() => {
        if (alive) setWarning("暂时无法读取本机待核对决定；数据未被自动清除，请稍后重试。");
      });
    return () => { alive = false; };
  }, [petId, refreshKey]);

  const recover = async (intent: SavedOwnerIntent) => {
    if (loadingCaseId) return;
    setLoadingCaseId(intent.caseId);
    setWarning(null);
    try {
      const path = `/pets/${petId}/life-change-cases/${intent.caseId}`;
      const detail = await api.get<CaseDetail>(path);
      const fromServer = [...detail.evidence_event_ids].sort().join("|");
      if (detail.pet_id !== petId ||
          detail.case_id !== intent.caseId ||
          fromServer !== intent.sourceIdsKey) {
        throw new Error("R8_RECOVERY_SCOPE_MISMATCH");
      }
      // Only a fresh, EXPLICIT user tap can replay the original human
      // instruction. Keep its immutable prior token and idempotency key:
      // a server-accepted but lost POST returns the same Review ID.
      const accepted = await api.post<ReviewAck>(`${path}/reviews`, intent.payload);
      if (!accepted.review_id ||
          accepted.pet_id !== petId ||
          accepted.case_id !== intent.caseId ||
          accepted.decision !== intent.decision) {
        throw new Error("R8_RECOVERY_ACK_MISMATCH");
      }
      const confirmed = await api.get<CaseDetail>(path);
      if (confirmed.pet_id !== petId ||
          confirmed.case_id !== intent.caseId ||
          !confirmed.reviews.some((row) =>
            row.review_id === accepted.review_id && row.decision === intent.decision
          )) {
        throw new Error("R8_RECOVERY_NOT_YET_CONFIRMED");
      }
      await clearOwnerIntent(petId, intent.caseId, intent.sourceIdsKey);
      setIntents((rows) => rows.filter((row) =>
        !(row.caseId === intent.caseId && row.sourceIdsKey === intent.sourceIdsKey)
      ));
      setWarning("服务器已确认原来的主人决定；没有新建第二条不同的决定。");
    } catch (error: unknown) {
      // Including 409 and timeouts: never erase an uncertain local intent.
      // The backend is the only authority for whether a Review exists.
      setWarning(
        error instanceof Error && error.message.startsWith("R8_RECOVERY_")
          ? "服务器身份或记录版本尚未核对一致；保留原决定，请检查后重试。"
          : `核对尚未完成：${humanizeError(error)}。原决定仍安全保留；不会自动重新提交。`,
      );
    } finally {
      setLoadingCaseId(null);
    }
  };

  // A matching evidence fingerprint does not prove another panel has
  // loaded the exact Case. Never hide the only recovery option on a guess.
  if (!intents.length && !warning) return null;
  return (
    <View style={styles.root} testID="pli.r8.pending-review-recovery">
      <Text style={styles.title}>待核对的主人决定</Text>
      <Text style={styles.note}>
        这些决定可能已到达服务器，但确认结果中断。必须由你主动核对；不会自动替你决定或补发。
      </Text>
      {intents.map((intent) => (
        <View key={`${intent.caseId}:${intent.sourceIdsKey}`} style={styles.item}>
          <Text style={styles.itemText}>
            {DECISION_LABELS[intent.decision]} · 记录 ${intent.caseId.slice(0, 8)}
          </Text>
          <Pressable
            testID={`pli.r8.pending-review-recovery.verify.${intent.caseId}`}
            accessibilityRole="button"
            accessibilityLabel="主动核对这条未确认的主人决定"
            disabled={loadingCaseId !== null}
            onPress={() => void recover(intent)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loadingCaseId === intent.caseId ? "核对中…" : "主动核对原决定"}
            </Text>
          </Pressable>
        </View>
      ))}
      {warning ? (
        <Text style={styles.warning} testID="pli.r8.pending-review-recovery.status" accessibilityLiveRegion="polite">
          {warning}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: SPACE.s4, marginTop: SPACE.s2, backgroundColor: COLORS.stageWarmBase, borderRadius: 20, padding: SPACE.s4, gap: SPACE.s2 },
  title: { color: COLORS.textPrimary, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  note: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 21 },
  item: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: SPACE.s2, paddingVertical: SPACE.s2 },
  itemText: { color: COLORS.textPrimary, fontSize: TYPE.sm, fontWeight: "600" },
  button: { minHeight: 44, paddingHorizontal: SPACE.s3, justifyContent: "center", backgroundColor: COLORS.brandPrimaryDeep, borderRadius: 14 },
  buttonText: { color: COLORS.textInverse, fontSize: TYPE.sm, fontWeight: "700" },
  warning: { color: COLORS.textPrimary, backgroundColor: COLORS.brandSoft, padding: SPACE.s3, borderRadius: 12, fontSize: TYPE.sm, lineHeight: 20 },
});
