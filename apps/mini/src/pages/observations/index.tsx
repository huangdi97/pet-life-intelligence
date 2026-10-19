import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

/** R8AK Mini parity: durable owner Case history with stable cursor paging.
 *  Read-only here; the same append-only review semantics are shared with the
 *  Android/Web clients and enforced by the server, never by this page. */
interface CaseRow {
  case_id: string;
  pet_id: string;
  metric: string;
  current_value: number;
  baseline_value: number;
  sample_days: number;
  evidence_event_ids: string[];
  source_valid: boolean;
  follow_up_source_valid?: boolean | null;
  state: string;
}
interface HistoryPage {
  cases: CaseRow[];
  next_cursor: string | null;
  has_more: boolean;
  total: number;
}

const PAGE = 10;
const FILTERS: Array<{ key: string | null; label: string }> = [
  { key: null, label: "全部" },
  { key: "walk_minutes_per_day", label: "散步" },
  { key: "meal_count_per_day", label: "进食" },
  { key: "sleep_minutes_per_day", label: "睡眠" },
];
const VALIDITY_FILTERS: Array<{ key: "VALID" | "INVALID" | null; label: string }> = [
  { key: null, label: "全部来源" },
  { key: "VALID", label: "来源有效" },
  { key: "INVALID", label: "已失效" },
];
const METRIC: Record<string, { name: string; unit: string }> = {
  walk_minutes_per_day: { name: "散步", unit: "分钟" },
  meal_count_per_day: { name: "进食", unit: "次" },
  sleep_minutes_per_day: { name: "睡眠", unit: "分钟" },
};

function statusText(row: CaseRow): string {
  if (!row.source_valid || row.state === "INVALIDATED") return "原始记录已变更 · 需重新核对";
  if (row.state === "CLOSED") return "主人选择暂不关注";
  if (row.state === "OWNER_ACKNOWLEDGED") return "主人已提出来源核对";
  if (row.follow_up_source_valid === false || row.state === "FOLLOW_UP_EVIDENCE_INVALIDATED") {
    return "后续记录已失效 · 需重新核对";
  }
  if (row.follow_up_source_valid === true) return "已关联真实后续观察";
  if (row.state === "PROPOSED") return "等待主人核对";
  if (row.state === "FOLLOW_UP") return "主人选择继续关注";
  return "已有历史核对记录";
}

export default function ObservationsPage() {
  const { pets, petId, refresh, state } = usePets();
  const [metric, setMetric] = useState<string | null>(null);
  const [validity, setValidity] = useState<"VALID" | "INVALID" | null>(null);
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Scope-keyed presentation hides old pet/filter rows immediately, before
  // a useEffect has cleared cached history in the following render cycle.
  const scopeKey = JSON.stringify([petId, metric, validity]);
  const [resultScopeKey, setResultScopeKey] = useState<string | null>(null);
  const scopeReady = resultScopeKey === scopeKey;
  const visibleRows = scopeReady ? rows : [];
  const visibleHasMore = scopeReady ? hasMore : false;
  const visibleError = scopeReady ? error : null;
  const visibleLoading = loading || !scopeReady;
  // Mini requests cannot be assumed cancellable. Scope generations protect
  // every page and error state across pet switch / validity / metric changes.
  const scopeEpoch = useRef(0);
  const moreInFlight = useRef(false);

  const load = useCallback(
    (nextCursor: string | null, append: boolean) => {
      if (!petId || (append && (!nextCursor || moreInFlight.current))) return;
      const epoch = append ? scopeEpoch.current : ++scopeEpoch.current;
      if (append) moreInFlight.current = true;
      else moreInFlight.current = false;
      setLoading(true);
      setError(null);
      // Build the query manually: URLSearchParams is not guaranteed to exist
      // in every mini-program runtime, and a silent ReferenceError here would
      // look like "no history".
      const parts = [`limit=${PAGE}`];
      if (metric) parts.push(`metric=${encodeURIComponent(metric)}`);
      if (validity) parts.push(`validity=${validity}`);
      if (nextCursor) parts.push(`cursor=${encodeURIComponent(nextCursor)}`);
      const query = `?${parts.join("&")}`;
      api
        .get<HistoryPage>(`/pets/${petId}/life-change-cases${query}`)
        .then((page) => {
          if (scopeEpoch.current !== epoch) return;
          // A server-validated pet-scoped response must also belong to the
          // exact live filter/request generation before updating client state.
          const own = page.cases.filter((item) => item.pet_id === petId);
          setRows((before) => {
            if (!append) return own;
            const seen = new Set(before.map((item) => item.case_id));
            return [...before, ...own.filter((item) => !seen.has(item.case_id))];
          });
          setCursor(page.next_cursor);
          setHasMore(page.has_more);
          setResultScopeKey(scopeKey);
        })
        .catch(() => {
          if (scopeEpoch.current !== epoch) return;
          setError("观察档案暂时没有读取成功；这不代表没有历史记录。");
          setResultScopeKey(scopeKey);
        })
        .finally(() => {
          if (scopeEpoch.current !== epoch) return;
          moreInFlight.current = false;
          setLoading(false);
        });
    },
    [metric, petId, validity, scopeKey],
  );

  useEffect(() => {
    scopeEpoch.current += 1;
    moreInFlight.current = false;
    setResultScopeKey(null);
    setRows([]);
    setCursor(null);
    setHasMore(false);
    setError(null);
    if (petId) load(null, false);
    return () => {
      scopeEpoch.current += 1;
      moreInFlight.current = false;
    };
  }, [load, petId]);

  const current = pets?.find((pet) => pet.id === petId);
  return (
    <View className="page">
      <Text className="h1">生活观察档案</Text>
      <Text className="sub">
        {current ? `${current.name} · ` : ""}主人核对过的记录变化会保留；今天不提示，不代表已经恢复。
      </Text>
      <PetContextGate state={state} hasPet={Boolean(petId)} onRetry={refresh} />
      {petId ? (
        <>
          <View className="row" style={{ margin: "12px 0" }}>
            {FILTERS.map((item) => (
              <Button
                key={item.key ?? "all"}
                className={metric === item.key ? "btn" : "secondary-action"}
                onClick={() => setMetric(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </View>
          <View className="row" style={{ margin: "0 0 12px" }}>
            {VALIDITY_FILTERS.map((item) => (
              <Button
                key={item.key ?? "all"}
                className={validity === item.key ? "btn" : "secondary-action"}
                data-testid={`pli.r8.mini-history.validity.${item.key ?? "all"}`}
                onClick={() => setValidity(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </View>
          {visibleError ? <View className="state state-error">{visibleError}</View> : null}
          {!visibleLoading && !visibleError && visibleRows.length === 0 ? (
            <View className="state">还没有符合条件的观察档案。</View>
          ) : null}
          {visibleRows.map((row) => {
            const label = METRIC[row.metric] ?? { name: "生活记录", unit: "" };
            const unit = label.unit ? ` ${label.unit}` : "";
            return (
              <View
                className="card"
                key={row.case_id}
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages/observations/detail/index?petId=${petId}&caseId=${row.case_id}`,
                  })
                }
              >
                <View className="row" style={{ justifyContent: "space-between" }}>
                  <Text>{label.name}记录</Text>
                  <Text className="muted">{statusText(row)}</Text>
                </View>
                <Text className="muted">
                  当时已记录 {row.current_value}
                  {unit} · 同期参考 {row.baseline_value}
                  {unit}
                </Text>
                <Text className="muted">
                  {row.sample_days} 天可比参考 · {row.evidence_event_ids.length} 条冻结来源 · 非健康诊断
                </Text>
                <Text className="muted">查看来源与主人反馈 →</Text>
              </View>
            );
          })}
          {visibleHasMore ? (
            <Button className="btn" disabled={visibleLoading} onClick={() => load(cursor, true)}>
              {visibleLoading ? "正在读取…" : "继续查看更早的档案"}
            </Button>
          ) : null}
          {visibleRows.length > 0 ? (
            <Text className="muted" style={{ marginTop: "10px" }}>
              最近读取时间 {fmtTime(new Date().toISOString())}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
