/** R8AK owner-readable source detail: values, both clocks and authorization.
 *
 * SECURITY: the server re-authorizes every event. This component only hides
 * what the server already refused; it must never be the only gate.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { listCaseSources, type CaseSourceEvent } from "./caseHistoryApi";
import {
  ownerEvidenceCaseRole, ownerEvidenceLocalTime, ownerEvidenceValue,
} from "./ownerEvidence";

const PAGE = 6;
const SOURCE_LABELS: Record<string, string> = {
  OWNER_REPORTED: "主人记录", CAREGIVER_REPORTED: "照护者记录",
  DEVICE_DERIVED: "设备记录", PROFESSIONAL_CONFIRMED: "专业人员确认",
  LAB_CONFIRMED: "检测机构确认",
};

export function CaseSourceList({
  petId, caseId, computedAt, expectedSourceIds, frozenRoles, roleSource,
}: {
  petId: string;
  caseId: string;
  computedAt: string;
  expectedSourceIds: string[];
  frozenRoles: Record<string, "CURRENT" | "HISTORICAL"> | null;
  roleSource: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CaseSourceEvent[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
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
      const allowed = new Set(expectedSourceIds);
      if (page.sources.some((item) => !allowed.has(item.event_id))) {
        throw new Error("SOURCE_NOT_IN_FROZEN_CASE");
      }
      setTotal(page.total);
      setMissing(page.missing_event_ids);
      setRows((before) => {
        const seen = new Set(before.map((item) => item.event_id));
        return [...before, ...page.sources.filter((item) => !seen.has(item.event_id))];
      });
    } catch (e: unknown) {
      if (epoch === generation.current) setError(humanizeError(e));
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (rows.length === 0) void load(0);
  };

  return (
    <View style={styles.section} testID="pli.r8.case-detail.evidence">
      <Text style={styles.heading}>当时依据什么？</Text>
      <Text style={styles.caption}>
        {roleSource === "FROZEN_AT_CREATION"
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
            已核对 {rows.length} / {total ?? expectedSourceIds.length} 条原始来源
          </Text>
          {missing.length > 0 ? (
            <Text style={styles.warning} testID="pli.r8.case-detail.sources.missing">
              有 {missing.length} 条来源已不可读取；不能据此确认原来的变化仍然成立。
            </Text>
          ) : null}
          {rows.map((source) => {
            const role = frozenRoles != null
              ? (frozenRoles[source.event_id] === "CURRENT" ? "当日依据"
                : frozenRoles[source.event_id] === "HISTORICAL" ? "同期参考" : "日期待核实")
              : ownerEvidenceCaseRole(source.event_id, source.occurred_at, computedAt, null);
            return (
              <View
                key={source.event_id}
                testID={`pli.r8.case-detail.source.${source.event_id}`}
                accessible
                accessibilityLabel={`${role} · ${ownerEvidenceValue(source)} · 发生 ${ownerEvidenceLocalTime(source.occurred_at)} · 录入 ${ownerEvidenceLocalTime(source.recorded_at)} · ${SOURCE_LABELS[source.source_type] ?? "其他来源"} · ${source.valid ? "来源有效" : "来源已撤回或修正"} · 完整事件标识 ${source.event_id}`}
                style={styles.source}
              >
                <Text style={styles.label}>{role}</Text>
                <Text style={styles.body}>{ownerEvidenceValue(source)}</Text>
                <Text style={styles.caption}>
                  发生 {ownerEvidenceLocalTime(source.occurred_at)} · 录入 {ownerEvidenceLocalTime(source.recorded_at)}
                </Text>
                <Text style={styles.caption}>
                  {SOURCE_LABELS[source.source_type] ?? "其他来源"} · {source.valid ? "来源有效" : "来源已撤回或修正"}
                </Text>
                <Text style={styles.id} selectable>{source.event_id}</Text>
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
          ) : <Text style={styles.caption}>全部来源已可逐条核对</Text>}
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
  id: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  warning: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.danger },
  touch: { minHeight: 44, justifyContent: "center" },
});
