"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@pli/api-client";
import { CASE_METRIC, caseStatus, type WebCaseSummary } from "../../../lib/lifeCases";

/** A persisted Case stays visible after the day's change hint disappears.
 *  This rail entry is a journal, not a live alert or a health diagnosis. */
export function CaseJournalCard({ petId }: { petId: string }) {
  const [rows, setRows] = useState<WebCaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows([]);
    setTotal(0);
    setFailed(false);
    api
      .get<{ cases: WebCaseSummary[]; total: number }>(`/pets/${petId}/life-change-cases?limit=3`)
      .then((page) => {
        if (!alive) return;
        // Even a stale server response must never paint pet A's Case on pet B.
        const own = page.cases.filter((item) => item.pet_id === petId);
        setRows(own.slice(0, 2));
        setTotal(page.total);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  // Never synthesise history from an empty or failed query.
  if (rows.length === 0) {
    return failed ? (
      <div className="v4-note" role="status" data-testid="pli.r8.web-journal.unavailable">
        生活观察回顾暂时无法读取；这不代表没有历史记录。
      </div>
    ) : null;
  }

  return (
    <section className="v4-sec" data-testid="pli.r8.web-journal">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">最近的生活观察回顾</h2>
        <Link className="v4-sec-link" href={`/pets/${petId}/history`} data-testid="pli.r8.web-journal.all">
          全部 {total} 条 →
        </Link>
      </div>
      <p className="v4-note">
        已创建的核对会保留。今天不再显示变化提示，不代表宠物已经恢复或没有问题。
      </p>
      <div className="r8-journal-list">
        {rows.map((item) => {
          const metric = CASE_METRIC[item.metric] ?? { name: "生活记录", unit: "" };
          const unit = metric.unit ? ` ${metric.unit}` : "";
          return (
            <Link
              key={item.case_id}
              className="r8-journal-item"
              href={`/pets/${petId}/history/${item.case_id}`}
              data-testid={`pli.r8.web-journal.case.${item.case_id}`}
            >
              <div className="r8-journal-head">
                <strong>{metric.name}记录</strong>
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}
