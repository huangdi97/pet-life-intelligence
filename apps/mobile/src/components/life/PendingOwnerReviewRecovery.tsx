/** R8J: owner-visible recovery for review intents after a Case leaves Today.
 * Never auto-submit, cross pet scope, or clear an ambiguous instruction.
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, humanizeError } from "../../api";
import { clearOwnerIntent, clearOwnerIntentIfUnchanged, listOwnerIntentsForPet, type SavedOwnerIntent } from "../../storage/pendingOwnerReview";
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
  // Explicit two-step opt-out for an orphaned local intent. This is NOT a
  // server Review deletion or an implicit approval/denial.
  const [discardCandidate, setDiscardCandidate] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setIntents([]);
    setWarning(null);
    setDiscardCandidate(null);
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
    // A recovery tap cancels an unconfirmed local-discard prompt. The owner
    // must explicitly start two-step opt-out again if verification fails.
    setDiscardCandidate(null);
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

  const discardLocalReminder = async (intent: SavedOwnerIntent) => {
    if (loadingCaseId) return;
    const intentKey = `${intent.caseId}:${intent.sourceIdsKey}`;
    if (discardCandidate !== intentKey) {
      setDiscardCandidate(intentKey);
      setWarning(
        "请再次确认：只删除这台设备的待核对提醒，不会撤销服务器上可能已保存的主人决定；" +
        "原始请求可能已经成功，放弃本机核对后无法凭这条提醒再次确认。",
      );
      return;
    }
    setLoadingCaseId(intent.caseId);
    try {
      // Explicit owner opt-out only: NEVER POST/DELETE a server Review here.
      const removed = await clearOwnerIntentIfUnchanged(intent);
      if (!removed) {
        // A second owner panel might have replaced the pending instruction
        // while this local two-step warning was visible.
        setIntents(await listOwnerIntentsForPet(petId));
        setDiscardCandidate(null);
        setWarning("本机原决定已被其他操作更新或确认，本次未清理任何新决定。");
        return;
      }
      setIntents((rows) => rows.filter((row) =>
        !(row.caseId === intent.caseId && row.sourceIdsKey === intent.sourceIdsKey)
      ));
      setDiscardCandidate(null);
      setWarning("已按你的确认，仅清除此设备上的提醒；服务器历史决定没有被修改。");
    } catch {
      setWarning("本机提醒清理未完成，原决定仍保留，请稍后再试。");
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
          <Pressable
            testID={`pli.r8.pending-review-recovery.discard.${intent.caseId}`}
            accessibilityRole="button"
            accessibilityLabel="放弃本机这条未确认提醒，不撤销服务器决定"
            disabled={loadingCaseId !== null}
            onPress={() => void discardLocalReminder(intent)}
            style={styles.discardButton}
          >
            <Text style={styles.discardText}>
              {discardCandidate === `${intent.caseId}:${intent.sourceIdsKey}`
                ? "确认仅清除本机提醒" : "不再在本机提醒"}
            </Text>
          </Pressable>
          {discardCandidate === `${intent.caseId}:${intent.sourceIdsKey}` ? (
            <Text
              style={styles.inlineDiscardWarning}
              testID={`pli.r8.pending-review-recovery.discard-warning.${intent.caseId}`}
              accessibilityLiveRegion="polite"
            >
              原决定可能已在服务器生效。确认后仅删除本机提醒，不撤销服务器上的记录。
            </Text>
          ) : null}
          {discardCandidate === `${intent.caseId}:${intent.sourceIdsKey}` ? (
            <Pressable
              testID={`pli.r8.pending-review-recovery.cancel-discard.${intent.caseId}`}
              accessibilityRole="button"
              onPress={() => { setDiscardCandidate(null); setWarning(null); }}
              disabled={loadingCaseId !== null}
              style={styles.discardButton}
            >
              <Text style={styles.discardText}>取消清理</Text>
            </Pressable>
          ) : null}
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
  discardButton: { minHeight: 44, paddingHorizontal: SPACE.s2, justifyContent: "center", borderRadius: 12 },
  discardText: { color: COLORS.textSecondary, fontSize: TYPE.sm, fontWeight: "600" },
  inlineDiscardWarning: { width: "100%", color: COLORS.textPrimary, fontSize: TYPE.sm, lineHeight: 20, padding: SPACE.s2, borderRadius: 12, backgroundColor: COLORS.brandSoft },
});
