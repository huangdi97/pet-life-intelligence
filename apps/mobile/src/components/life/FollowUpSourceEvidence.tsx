/** R8BI: independently inspect a Review's follow-up observations.
 *
 * A later Review never inherits the original Case's frozen comparison roles.
 * Only the server-authorized REVIEW scope supplies evidence; current validity
 * is a record-quality statement, never diagnosis or physical recovery.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { listCaseSources, type CaseSourceEvent } from "./caseHistoryApi";
import {
  canonicalCaseSourceId, ownerEvidenceLocalTime, ownerEvidenceValue,
} from "./ownerEvidence";

const PAGE_SIZE = 6;
const SOURCE_TYPE: Record<string, string> = {
  OWNER_REPORTED: "主人记录",
  CAREGIVER_REPORTED: "照护者记录",
  DEVICE_DERIVED: "设备记录",
  PROFESSIONAL_CONFIRMED: "专业人员确认",
  LAB_CONFIRMED: "检测机构确认",
};
const REASON: Record<string, string> = {
  VALID: "这条后续来源目前有效",
  RETRACTED: "记录已撤回",
  SUPERSEDED: "记录已被新的修正替代",
  WRONG_METRIC: "指标与本次观察不符",
  NON_FACT_SOURCE: "这不是可采信的原始观察",
};

interface SourceState {
  scope: string;
  rows: CaseSourceEvent[];
  missing: string[];
  shapeValid: boolean | null;
  total: number;
  next: number | null;
  error: string | null;
}

export function FollowUpSourceEvidence({
  petId, caseId, reviewId, expectedSourceIds,
}: {
  petId: string;
  caseId: string;
  reviewId: string;
  expectedSourceIds: string[];
}) {
  const scope = `${petId}:${caseId}:${reviewId}`;
  const activeScope = useRef(scope);
  const generation = useRef(0);
  if (activeScope.current !== scope) {
    activeScope.current = scope;
    generation.current += 1;
  }
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SourceState | null>(null);
  useEffect(() => {
    setExpanded(false);
    setLoading(false);
    setState(null);
    return () => { generation.current += 1; };
  }, [scope]);
  const visible = state?.scope === scope ? state : null;

  async function load(offset: number) {
    if (loading) return;
    const requestedScope = scope;
    const epoch = generation.current;
    setLoading(true);
    setState((previous) => previous?.scope === scope ? { ...previous, error: null } : null);
    try {
      const result = await listCaseSources(petId, caseId, offset, PAGE_SIZE, reviewId);
      if (activeScope.current !== requestedScope || generation.current !== epoch) return;
      if (result.scope !== "FOLLOW_UP_REVIEW" || result.review_id !== reviewId ||
          result.evidence_role_shape_valid === false ||
          result.sources.some((item) => item.scope !== "FOLLOW_UP_REVIEW" ||
            item.role !== null || item.role_source !== "FOLLOW_UP_OBSERVATION")) {
        throw new Error("后续观察与原始对比来源发生混淆，已停止展示。");
      }
      const allowed = new Set(expectedSourceIds.map(canonicalCaseSourceId));
      if (result.sources.some((row) => {
        const id = canonicalCaseSourceId(row.event_id);
        return id === null || !allowed.has(id);
      })) {
        throw new Error("后续来源不属于本条主人反馈，已停止展示。");
      }
      setState((before) => {
        const previous = offset === 0 || before?.scope !== scope ? [] : before.rows;
        const seen = new Set(previous.map((row) => canonicalCaseSourceId(row.event_id)));
        return {
          scope, rows: [...previous, ...result.sources.filter((item) => {
            const id = canonicalCaseSourceId(item.event_id);
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          })],
          missing: result.missing_event_ids,
          shapeValid: result.evidence_shape_valid,
          total: result.total,
          next: result.has_more ? result.next_offset : null,
          error: null,
        };
      });
    } catch (e: unknown) {
      if (activeScope.current === requestedScope && generation.current === epoch) {
        setState((before) => ({
          scope, rows: before?.scope === scope ? before.rows : [],
          missing: before?.scope === scope ? before.missing : [],
          shapeValid: before?.scope === scope ? before.shapeValid : null,
          total: before?.scope === scope ? before.total : 0,
          next: before?.scope === scope ? before.next : null,
          error: humanizeError(e),
        }));
      }
    } finally {
      if (activeScope.current === requestedScope && generation.current === epoch) setLoading(false);
    }
  }

  return (
    <View testID={`pli.r8.followup-evidence.${reviewId}`} style={styles.container}>
      <Pressable
        accessibilityRole="button"
        testID={`pli.r8.followup-evidence.open.${reviewId}`}
        style={styles.touch}
        disabled={loading}
        onPress={() => {
          if (expanded) { setExpanded(false); return; }
          setExpanded(true);
          if (!visible) void load(0);
        }}
      >
        <Text style={styles.link}>{expanded ? "收起后续观察来源" : "核对后续观察来源与数值"}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.list}>
          <Text style={styles.caption}>
            后续观察独立于原始 Case 的“当日依据 / 同期参考”，不会倒填历史角色或推断宠物已恢复。
          </Text>
          {visible?.shapeValid === false ? (
            <Text style={styles.warning} testID={`pli.r8.followup-evidence.integrity.${reviewId}`}>
              历史后续来源格式异常，不能确认全部依据。
            </Text>
          ) : null}
          {visible?.missing.length ? (
            <Text style={styles.warning}>有 {visible.missing.length} 条后续来源不可读取。</Text>
          ) : null}
          {visible?.rows.map((source) => (
            <View key={source.event_id} style={styles.source}
              testID={`pli.r8.followup-evidence.source.${source.event_id}`}>
              <Text style={styles.heading}>后续观察 · {ownerEvidenceValue(source)}</Text>
              <Text style={styles.caption}>
                发生 {ownerEvidenceLocalTime(source.occurred_at)} · 录入 {ownerEvidenceLocalTime(source.recorded_at)}
              </Text>
              <Text style={styles.caption}>
                {SOURCE_TYPE[source.source_type] ?? "其他来源"} · {REASON[source.validity_reason ?? ""] ?? "来源有效性待核实"}
              </Text>
              <Text style={styles.id} selectable>{source.event_id}</Text>
            </View>
          ))}
          {visible?.next != null ? (
            <Pressable style={styles.touch} accessibilityRole="button"
              testID={`pli.r8.followup-evidence.more.${reviewId}`}
              disabled={loading} onPress={() => { if (visible?.next != null) void load(visible.next); }}>
              <Text style={styles.link}>继续核对后续来源</Text>
            </Pressable>
          ) : visible && !visible.error ? (
            <Text style={styles.caption}>
              已读取 {visible.rows.length} 条可见后续来源；总计 {visible.total} 条可授权读取。
            </Text>
          ) : null}
          {visible?.error ? (
            <Text style={styles.warning} testID={`pli.r8.followup-evidence.error.${reviewId}`}>
              {visible.error}
            </Text>
          ) : null}
          {loading ? <Text style={styles.caption}>正在核对真实事件…</Text> : null}
          {!loading && visible?.error ? (
            <Pressable style={styles.touch} accessibilityRole="button"
              onPress={() => void load(0)}>
              <Text style={styles.link}>重试核对</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.s1 },
  touch: { minHeight: 44, justifyContent: "center" },
  link: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.body, fontWeight: "700" },
  list: { gap: SPACE.s2 },
  source: { backgroundColor: COLORS.canvas, padding: SPACE.s3, borderRadius: 14, gap: SPACE.s1 },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  id: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  warning: { color: COLORS.danger, fontSize: TYPE.body, fontWeight: "700" },
});
