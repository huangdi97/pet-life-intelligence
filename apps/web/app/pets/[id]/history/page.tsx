"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@pli/api-client";
import { mapErrorMessage } from "../../../../lib/i18n";
import { State } from "../../../../components/ui";
import { CASE_METRIC, caseStatus, type WebCaseSummary } from "../../../../lib/lifeCases";

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

interface Page {
  cases: WebCaseSummary[];
  next_cursor: string | null;
  has_more: boolean;
  total: number;
}

/** R8AK Web parity: complete owner-readable Case history with stable cursors. */
export default function LifeChangeHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [metric, setMetric] = useState<string | null>(null);
  const [validity, setValidity] = useState<"VALID" | "INVALID" | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<WebCaseSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A transient offline/5xx must be recoverable without a full page reload.
  const [reloadToken, setReloadToken] = useState(0);
  // Render-time gating also prevents the OLD scope's already-loaded data from
  // flashing during the first frame before the fetch effect can reset state.
  const scopeKey = JSON.stringify([petId, metric, validity, query.trim(), reloadToken]);
  const [resultScopeKey, setResultScopeKey] = useState<string | null>(null);
  const scopeReady = resultScopeKey === scopeKey;
  const visibleRows = scopeReady ? rows : [];
  const visibleCursor = scopeReady ? cursor : null;
  const visibleHasMore = scopeReady ? hasMore : false;
  const visibleTotal = scopeReady ? total : 0;
  const visibleError = scopeReady ? error : null;
  const visibleLoading = loading || !scopeReady;
  // Every pet/filter/search/retry transition invalidates *both* the first
  // page and any in-flight "more" page. Older pages must never join newer
  // pet history or a differently filtered list after slow network responses.
  const scopeEpoch = useRef(0);
  const moreInFlight = useRef(false);

  useEffect(() => {
    let alive = true;
    const epoch = ++scopeEpoch.current;
    moreInFlight.current = false;
    setLoading(true);
    setResultScopeKey(null);
    setError(null);
    setRows([]);
    setCursor(null);
    setHasMore(false);
    const search = new URLSearchParams({ limit: String(PAGE) });
    if (metric) search.set("metric", metric);
    if (query.trim()) search.set("q", query.trim());
    if (validity) search.set("validity", validity);
    api
      .get<Page>(`/pets/${petId}/life-change-cases?${search.toString()}`)
      .then((page) => {
        if (!alive || scopeEpoch.current !== epoch) return;
        const own = page.cases.filter((item) => item.pet_id === petId);
        setRows(own);
        setCursor(page.next_cursor);
        setHasMore(page.has_more);
        setTotal(page.total);
        setResultScopeKey(scopeKey);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive || scopeEpoch.current !== epoch) return;
        setError(mapErrorMessage(e));
        setResultScopeKey(scopeKey);
        setLoading(false);
      });
    return () => {
      alive = false;
      scopeEpoch.current += 1;
      moreInFlight.current = false;
    };
  }, [petId, metric, query, validity, reloadToken]);

  const more = () => {
    if (!visibleCursor || visibleLoading || !visibleHasMore || moreInFlight.current) return;
    const epoch = scopeEpoch.current;
    moreInFlight.current = true;
    setLoading(true);
    const search = new URLSearchParams({ limit: String(PAGE), cursor: visibleCursor });
    if (metric) search.set("metric", metric);
    if (query.trim()) search.set("q", query.trim());
    if (validity) search.set("validity", validity);
    api
      .get<Page>(`/pets/${petId}/life-change-cases?${search.toString()}`)
      .then((page) => {
        if (scopeEpoch.current !== epoch) return;
        setRows((before) => {
          const seen = new Set(before.map((item) => item.case_id));
          return [...before, ...page.cases.filter((item) => item.pet_id === petId && !seen.has(item.case_id))];
        });
        setCursor(page.next_cursor);
        setHasMore(page.has_more);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (scopeEpoch.current !== epoch) return;
        setError(mapErrorMessage(e));
        setLoading(false);
      })
      .finally(() => {
        if (scopeEpoch.current === epoch) moreInFlight.current = false;
      });
  };

  return (
    <main className="v4-main" data-testid="pli.r8.web-history">
      <div className="v4-topline">
        <Link className="v4-sec-link" href={`/pets/${petId}`}>
          ‹ 返回宠物
        </Link>
      </div>
      <section className="v4-sec">
        <h1 className="v4-sec-title">生活观察档案</h1>
        <p className="v4-note">
          这里保留主人核对过的记录变化。今天不再提示，不代表宠物已经恢复或没有问题。
          {visibleTotal > 0 ? ` 共 ${visibleTotal} 条档案。` : ""}
        </p>
        <div className="r8-filters">
          {FILTERS.map((item) => (
            <button
              key={item.key ?? "all"}
              type="button"
              className={`btn${metric === item.key ? " primary" : ""}`}
              aria-pressed={metric === item.key}
              data-testid={`pli.r8.web-history.filter.${item.key ?? "all"}`}
              onClick={() => setMetric(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="r8-filters" role="group" aria-label="按来源有效性筛选">
          {VALIDITY_FILTERS.map((item) => (
            <button
              key={item.key ?? "all"}
              type="button"
              className={`btn${validity === item.key ? " primary" : ""}`}
              aria-pressed={validity === item.key}
              data-testid={`pli.r8.web-history.validity.${item.key ?? "all"}`}
              onClick={() => setValidity(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="r8-search">
          <input
            className="input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setQuery(draft);
            }}
            placeholder="按生活记录搜索，例如 散步"
            aria-label="搜索生活观察档案"
            data-testid="pli.r8.web-history.search"
          />
          <button
            type="button"
            className="btn"
            onClick={() => setQuery(draft)}
            data-testid="pli.r8.web-history.search-submit"
          >
            搜索
          </button>
        </div>
      </section>

      {visibleError ? (
        <div className="r8-error-action">
          <button
            type="button"
            className="btn"
            data-testid="pli.r8.web-history.retry"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            重新读取档案
          </button>
        </div>
      ) : null}

      <State state={visibleLoading && visibleRows.length === 0 ? "loading" : visibleError ? "error" : "ready"} error={visibleError}>
        {visibleRows.length === 0 && !visibleLoading && !visibleError ? (
          <div className="state empty" data-testid="pli.r8.web-history.empty">
            还没有符合条件的观察档案。空不代表没有记录，只是这里还没有主人核对过的变化。
          </div>
        ) : (
          <div className="r8-journal-list">
            {visibleRows.map((item) => {
              const metricLabel = CASE_METRIC[item.metric] ?? { name: "生活记录", unit: "" };
              const unit = metricLabel.unit ? ` ${metricLabel.unit}` : "";
              return (
                <Link
                  key={item.case_id}
                  className="r8-journal-item"
                  href={`/pets/${petId}/history/${item.case_id}`}
                  data-testid={`pli.r8.web-history.case.${item.case_id}`}
                >
                  <div className="r8-journal-head">
                    <strong>{metricLabel.name}记录</strong>
                    <span className={!item.source_valid || item.follow_up_source_valid === false ? "r8-warn" : "muted"}>
                      {caseStatus(item)}
                    </span>
                  </div>
                  <div className="muted">
                    当时已记录 {item.current_value}{unit} · 同期参考 {item.baseline_value}{unit}
                  </div>
                  <div className="muted">
                    {item.sample_days} 天可比参考 · {item.evidence_event_ids.length} 条冻结来源 · 非健康诊断
                  </div>
                  <div className="muted">Case ID {item.case_id}</div>
                  <div className="r8-open">查看来源与主人反馈 →</div>
                </Link>
              );
            })}
          </div>
        )}
        {visibleHasMore ? (
          <button
            type="button"
            className="btn"
            onClick={more}
            disabled={visibleLoading}
            data-testid="pli.r8.web-history.more"
          >
            {visibleLoading ? "正在读取…" : "继续查看更早的档案"}
          </button>
        ) : null}
      </State>
    </main>
  );
}
