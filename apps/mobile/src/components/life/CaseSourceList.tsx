/** R8AK owner-readable source detail: values, both clocks and authorization.
 *
 * SECURITY: the server re-authorizes every event. This component only hides
 * what the server already refused; it must never be the only gate.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { listCaseSources, type CaseSourceEvent } from "./caseHistoryApi";
import {
  canonicalCaseSourceId, ownerEvidenceCaseRole, ownerEvidenceLocalTime, ownerEvidenceValue,
} from "./ownerEvidence";

const PAGE = 6;
const SOURCE_TRUTH: Record<string, string> = {
  VALID: "可用于本次对比",
  RETRACTED: "记录已撤回",
  SUPERSEDED: "记录已由后续修正替代",
  WRONG_METRIC: "记录指标与本次对比不符",
  NON_FACT_SOURCE: "此来源不具备观察事实资格",
  FUTURE_OBSERVATION: "事件发生或记录时间在未来，不能当作已观察事实",
};
function sourceTruthLabel(source: CaseSourceEvent): string {
  return source.valid
    ? SOURCE_TRUTH.VALID
    : SOURCE_TRUTH[source.validity_reason ?? ""] ?? "来源有效性待核实";
}
const SOURCE_LABELS: Record<string, string> = {
  OWNER_REPORTED: "主人记录", CAREGIVER_REPORTED: "照护者记录",
  DEVICE_DERIVED: "设备记录", PROFESSIONAL_CONFIRMED: "专业人员确认",
  LAB_CONFIRMED: "检测机构确认",
};

export function CaseSourceList({
  petId, caseId, computedAt, expectedSourceIds, frozenRoles, roleSource,
  roleIntegrityValid, metric, ownerCanRetract, onRetracted,
}: {
  petId: string;
  caseId: string;
  computedAt: string;
  expectedSourceIds: string[];
  frozenRoles: Record<string, "CURRENT" | "HISTORICAL"> | null;
  roleSource: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
  roleIntegrityValid: boolean;
  metric: string;
  ownerCanRetract: boolean;
  onRetracted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CaseSourceEvent[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);
  // R8AO: retracting an original source is a real owner action, two-step and
  // server-derived. The client never rewrites source_valid.
  const [retractTarget, setRetractTarget] = useState<string | null>(null);
  const [retracting, setRetracting] = useState(false);
  // R8AS: correction appends a superseding event; the original row is kept.
  const [correctTarget, setCorrectTarget] = useState<string | null>(null);
  const [correctValue, setCorrectValue] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const canCorrect = metric === "walk_minutes_per_day" || metric === "sleep_minutes_per_day";
  const generation = useRef(0);
  const scope = `${petId}:${caseId}`;
  const activeScope = useRef(scope);
  if (activeScope.current !== scope) activeScope.current = scope;
  useEffect(() => {
    // A different Case is a different frozen source set: drop every row and
    // invalidate in-flight pages before the new identity can render.
    generation.current += 1;
    setRows([]);
    setTotal(null);
    setError(null);
    setMissing([]);
    setIntegrityWarning(null);
    setOpen(false);
  }, [petId, caseId]);

  const load = async (offset: number) => {
    const epoch = generation.current;
    const requested = scope;
    setLoading(true);
    setError(null);
    try {
      const page = await listCaseSources(petId, caseId, offset, PAGE);
      if (epoch !== generation.current || activeScope.current !== requested) return;
      const allowed = new Set(expectedSourceIds.map(canonicalCaseSourceId));
      if (page.sources.some((item) => {
        const id = canonicalCaseSourceId(item.event_id);
        return id === null || !allowed.has(id);
      })) {
        throw new Error("SOURCE_NOT_IN_FROZEN_CASE");
      }
      setTotal(page.total);
      setMissing(page.missing_event_ids);
      setIntegrityWarning(
        page.evidence_shape_valid === false || page.evidence_role_shape_valid === false
          ? "历史来源或角色字段格式异常，无法确认所有依据已核对。" : null,
      );
      setRows((before) => {
        const seen = new Set(before.map((item) => canonicalCaseSourceId(item.event_id)));
        return [...before, ...page.sources.filter((item) => {
          const id = canonicalCaseSourceId(item.event_id);
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })];
      });
    } catch (e: unknown) {
      if (epoch === generation.current) setError(humanizeError(e));
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  };

  const correct = async (eventId: string) => {
    if (!ownerCanRetract || correcting) return;
    const value = Number(correctValue.trim());
    if (!Number.isFinite(value) || value < 0 || value > 1440) {
      setError("请填写 0–1440 之间的分钟数。");
      return;
    }
    setCorrecting(true);
    setError(null);
    try {
      await api.post(`/pets/${petId}/events/${eventId}/supersede`, {
        payload: { duration_minutes: value },
        idempotency_key: `r8-android-correction-${eventId}-${value}`,
      });
      setCorrectTarget(null);
      setCorrectValue("");
      setRows([]);
      setTotal(null);
      await load(0);
      onRetracted();
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setCorrecting(false);
    }
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (rows.length === 0) void load(0);
  };

  const retract = async (eventId: string) => {
    if (!ownerCanRetract || retracting) return;
    setRetracting(true);
    setError(null);
    try {
      await api.post(`/events/${eventId}/retract`, {});
      setRetractTarget(null);
      // Drop cached valid rows; the Case must be re-read for its derived state.
      setRows([]);
      setTotal(null);
      await load(0);
      onRetracted();
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setRetracting(false);
    }
  };

  return (
    <View style={styles.section} testID="pli.r8.case-detail.evidence">
      <Text style={styles.heading}>当时依据什么？</Text>
      <Text style={styles.caption}>
        {!roleIntegrityValid
          ? "原始来源角色无法核实；不会使用手机日期推算出确定的对比角色。"
          : roleSource === "FROZEN_AT_CREATION"
            ? "当日依据与同期参考的角色在创建时由服务器冻结，不随手机时区重算。"
            : "旧记录没有冻结角色：只按当时日期规则兼容推算，来源身份仍可核对。"}
      </Text>
      <Text style={styles.caption}>
        每条来源分别保留记录值、发生时间、录入时间、来源类型与完整事件标识；显示 ID 不等于已看到原始媒体。
      </Text>
      <Pressable
        testID="pli.r8.case-detail.sources.open"
        accessibilityRole="button"
        onPress={toggle}
        disabled={loading}
        style={styles.touch}
      >
        <Text style={styles.link}>
          {loading && rows.length === 0 ? "正在核对来源权限…" : open ? "收起来源明细" : "查看来源时间与数值"}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.list}>
          <Text style={styles.progress} testID="pli.r8.case-detail.sources.progress">
            已读取 {rows.length} / {expectedSourceIds.length} 条冻结来源
          </Text>
          {integrityWarning ? (
            <Text style={styles.warning} testID="pli.r8.case-detail.sources.integrity">
              {integrityWarning}
            </Text>
          ) : null}
          {missing.length > 0 ? (
            <Text style={styles.warning} testID="pli.r8.case-detail.sources.missing">
              有 {missing.length} 条来源已不可读取；不能据此确认原来的变化仍然成立。
            </Text>
          ) : null}
          {rows.map((source) => {
            const role = ownerEvidenceCaseRole(
              source.event_id, source.occurred_at, computedAt, frozenRoles,
            );
            return (
              <View key={source.event_id} style={styles.sourceGroup}>
                {/* The factual row stays a single accessible node: R8AB/AG
                    evidence requires ID + value + role + both clocks together. */}
                <View
                  testID={`pli.r8.case-detail.source.${source.event_id}`}
                  accessible
                  accessibilityLabel={`${role} · ${ownerEvidenceValue(source)} · 发生 ${ownerEvidenceLocalTime(source.occurred_at)} · 录入 ${ownerEvidenceLocalTime(source.recorded_at)} · ${SOURCE_LABELS[source.source_type] ?? "其他来源"} · ${sourceTruthLabel(source)} · 完整事件标识 ${source.event_id}`}
                  style={styles.source}
                >
                  <Text style={styles.label}>{role}</Text>
                  <Text style={styles.body}>{ownerEvidenceValue(source)}</Text>
                  <Text style={styles.caption}>
                    发生 {ownerEvidenceLocalTime(source.occurred_at)} · 录入 {ownerEvidenceLocalTime(source.recorded_at)}
                  </Text>
                  <Text style={styles.caption}>
                    {SOURCE_LABELS[source.source_type] ?? "其他来源"} · {sourceTruthLabel(source)}
                  </Text>
                  <Text style={styles.id} selectable>{source.event_id}</Text>
                </View>
                {ownerCanRetract && source.valid ? (
                  retractTarget === source.event_id ? (
                    <View style={styles.retractBox} testID={`pli.r8.case-detail.source.retract-confirm.${source.event_id}`}>
                      <Text style={styles.warning}>
                        撤回后这条来源不再有效，旧对比会失效；历史主人反馈仍保留。
                      </Text>
                      <Pressable
                        testID={`pli.r8.case-detail.source.retract-yes.${source.event_id}`}
                        accessibilityRole="button"
                        disabled={retracting}
                        onPress={() => void retract(source.event_id)}
                        style={styles.touch}
                      >
                        <Text style={styles.link}>{retracting ? "正在撤回…" : "确认撤回这条记录"}</Text>
                      </Pressable>
                      <Pressable
                        testID={`pli.r8.case-detail.source.retract-cancel.${source.event_id}`}
                        accessibilityRole="button"
                        disabled={retracting}
                        onPress={() => setRetractTarget(null)}
                        style={styles.touch}
                      >
                        <Text style={styles.caption}>取消</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      testID={`pli.r8.case-detail.source.retract.${source.event_id}`}
                      accessibilityRole="button"
                      onPress={() => setRetractTarget(source.event_id)}
                      style={styles.touch}
                    >
                      <Text style={styles.link}>这条记录有误</Text>
                    </Pressable>
                  )
                ) : null}
                {ownerCanRetract && source.valid && canCorrect ? (
                  correctTarget === source.event_id ? (
                    <View
                      style={styles.retractBox}
                      testID={`pli.r8.case-detail.source.correct-form.${source.event_id}`}
                    >
                      <Text style={styles.warning}>
                        只修正数值；发生时间与原始记录保持不变。修正会替代旧来源，旧对比随之失效。
                      </Text>
                      <TextInput
                        testID={`pli.r8.case-detail.source.correct-input.${source.event_id}`}
                        value={correctValue}
                        onChangeText={setCorrectValue}
                        keyboardType="number-pad"
                        placeholder="0–1440 分钟"
                        placeholderTextColor={COLORS.textSecondary}
                        accessibilityLabel="修正后的分钟数"
                        style={styles.input}
                      />
                      <Pressable
                        testID={`pli.r8.case-detail.source.correct-submit.${source.event_id}`}
                        accessibilityRole="button"
                        disabled={correcting}
                        onPress={() => void correct(source.event_id)}
                        style={styles.touch}
                      >
                        <Text style={styles.link}>{correcting ? "正在提交…" : "提交修正"}</Text>
                      </Pressable>
                      <Pressable
                        testID={`pli.r8.case-detail.source.correct-cancel.${source.event_id}`}
                        accessibilityRole="button"
                        disabled={correcting}
                        onPress={() => { setCorrectTarget(null); setCorrectValue(""); }}
                        style={styles.touch}
                      >
                        <Text style={styles.caption}>取消</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      testID={`pli.r8.case-detail.source.correct.${source.event_id}`}
                      accessibilityRole="button"
                      onPress={() => {
                        setCorrectTarget(source.event_id);
                        const raw = source.payload?.duration_minutes;
                        setCorrectValue(typeof raw === "number" ? String(raw) : "");
                      }}
                      style={styles.touch}
                    >
                      <Text style={styles.link}>修正这条记录</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })}
          {rows.length < (total ?? expectedSourceIds.length) ? (
            <Pressable
              testID="pli.r8.case-detail.sources.more"
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void load(rows.length)}
              style={styles.touch}
            >
              <Text style={styles.link}>{loading ? "正在读取更多来源…" : "继续查看其余来源"}</Text>
            </Pressable>
          ) : <Text style={styles.caption}>{missing.length > 0 || integrityWarning ? "可读取的来源已查看，但仍有原始证据需要核对" : "全部冻结来源已可逐条核对"}</Text>}
        </View>
      ) : null}
      {error ? <Text style={styles.warning} testID="pli.r8.case-detail.sources.error">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: COLORS.surface, borderRadius: 18, padding: SPACE.s4, gap: SPACE.s3 },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  link: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.body, fontWeight: "700" },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  body: { color: COLORS.textPrimary, fontSize: TYPE.body, lineHeight: 21 },
  label: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  progress: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  list: { gap: SPACE.s2 },
  source: { padding: SPACE.s3, backgroundColor: COLORS.canvas, borderRadius: 14, gap: SPACE.s1 },
  sourceGroup: { gap: SPACE.s1 },
  input: {
    minHeight: 44, borderRadius: 12, paddingHorizontal: SPACE.s3,
    backgroundColor: COLORS.surface, color: COLORS.textPrimary,
  },
  retractBox: {
    padding: SPACE.s3, borderRadius: 12, backgroundColor: COLORS.surfaceRaised,
    gap: SPACE.s1,
  },
  id: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  warning: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.danger },
  touch: { minHeight: 44, justifyContent: "center" },
});
