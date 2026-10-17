"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@pli/api-client";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { CASE_METRIC, caseStatus, type WebCaseSummary } from "../../../../../lib/lifeCases";

interface CaseReview {
  review_id: string;
  reviewed_at: string;
  decision: string;
  note: string;
  related_event_ids: string[];
  related_sources_valid: boolean | null;
}
interface CaseDetail extends WebCaseSummary {
  computed_at: string;
  evidence_role_source: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
  evidence_role_by_event_id: Record<string, "CURRENT" | "HISTORICAL"> | null;
  uncertainty: string;
  truth_note: string;
  owner_can_review: boolean;
  latest_review_id: string | null;
  reviews: CaseReview[];
}
interface SourceRow {
  event_id: string;
  occurred_at: string;
  recorded_at: string;
  source_type: string;
  event_type: string;
  payload: Record<string, unknown>;
  role: "CURRENT" | "HISTORICAL" | null;
  valid: boolean;
}
interface SourcePage {
  sources: SourceRow[];
  total: number;
  has_more: boolean;
  next_offset: number | null;
  missing_event_ids: string[];
}

const DECISIONS: Record<string, string> = {
  RECORD_OBSERVATION: "已关联真实后续观察",
  FOLLOW_UP_LATER: "主人选择稍后关注",
  NOT_RELEVANT: "主人选择暂不关注",
  CORRECT_SOURCE: "主人要求重新核对来源",
};
const ACTIONS: Array<{ key: string; label: string }> = [
  { key: "FOLLOW_UP_LATER", label: "继续关注" },
  { key: "NOT_RELEVANT", label: "暂不关注" },
  { key: "CORRECT_SOURCE", label: "来源需核对" },
];
const SOURCE_LABELS: Record<string, string> = {
  OWNER_REPORTED: "主人记录", CAREGIVER_REPORTED: "照护者记录",
  DEVICE_DERIVED: "设备记录", PROFESSIONAL_CONFIRMED: "专业人员确认",
  LAB_CONFIRMED: "检测机构确认",
};

function timeText(value: string): string {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime())
    ? instant.toLocaleString("zh-CN", { hour12: false })
    : "时间待核实";
}
function valueText(source: SourceRow): string {
  if (!source.valid) return "这条来源已撤回或修正，不再是当前依据";
  const duration = source.payload?.duration_minutes;
  if (typeof duration === "number" && duration > 0 && duration <= 1440) {
    return `记录时长 ${duration} 分钟（非实时测量）`;
  }
  return "仅展示有来源的生活记录";
}

/** R8AK Web parity: immutable Case detail, authorized sources, append-only review. */
export default function LifeChangeCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id: petId, caseId } = use(params);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [sourceMore, setSourceMore] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<CaseDetail>(`/pets/${petId}/life-change-cases/${caseId}`)
      .then((data) => {
        if (data.pet_id !== petId || data.case_id !== caseId) {
          setError("返回的档案不属于当前宠物，已停止显示。");
          return;
        }
        setDetail(data);
        setError(null);
      })
      .catch((e: unknown) => setError(mapErrorMessage(e)));
  }, [petId, caseId]);

  useEffect(() => {
    setDetail(null);
    setSources([]);
    setSourceTotal(0);
    setSourceMore(false);
    setMessage(null);
    load();
  }, [load]);

  const loadSources = (offset: number) => {
    setSourceError(null);
    api
      .get<SourcePage>(`/pets/${petId}/life-change-cases/${caseId}/sources?offset=${offset}&limit=6`)
      .then((page) => {
        setSources((before) => {
          const seen = new Set(before.map((item) => item.event_id));
          return [...before, ...page.sources.filter((item) => !seen.has(item.event_id))];
        });
        setSourceTotal(page.total);
        setSourceMore(page.has_more);
        if (page.missing_event_ids.length > 0) {
          setSourceError(`有 ${page.missing_event_ids.length} 条来源已不可读取，不能据此确认原变化仍成立。`);
        }
      })
      .catch((e: unknown) => setSourceError(mapErrorMessage(e)));
  };

  const review = (decision: string) => {
    if (!detail || busy || !detail.owner_can_review) return;
    setBusy(true);
    setMessage(null);
    api
      .post<{ review_id: string; pet_id: string; case_id: string; decision: string; replayed: boolean }>(
        `/pets/${petId}/life-change-cases/${caseId}/reviews`,
        {
          decision,
          expected_latest_review_id: detail.latest_review_id,
          idempotency_key: `r8-web-${decision}-${detail.latest_review_id ?? "initial"}`,
        },
      )
      .then((ack) => {
        if (ack.pet_id !== petId || ack.case_id !== caseId || ack.decision !== decision) {
          setMessage("服务器确认的档案身份与当前页面不一致，已停止显示。");
          return;
        }
        setMessage(ack.replayed ? "这次决定此前已保存。" : "已追加一条主人反馈；历史记录未被改写。");
        load();
      })
      .catch((e: unknown) => {
        setMessage(`${mapErrorMessage(e)} 档案可能已有新的反馈，请刷新后重试。`);
        load();
      })
      .finally(() => setBusy(false));
  };

  if (error) {
    return (
      <main className="v4-main">
        <div className="state error" data-testid="pli.r8.web-case.error">{error}</div>
      </main>
    );
  }
  if (!detail) {
    return (
      <main className="v4-main">
        <div className="state loading" role="status">正在核对冻结来源与主人反馈……</div>
      </main>
    );
  }

  const metric = CASE_METRIC[detail.metric] ?? { name: "生活记录", unit: "" };
  const unit = metric.unit ? ` ${metric.unit}` : "";
  return (
    <main className="v4-main" data-testid="pli.r8.web-case">
      <div className="v4-topline">
        <Link className="v4-sec-link" href={`/pets/${petId}/history`}>‹ 全部观察档案</Link>
      </div>
      <section className="v4-sec" data-testid="pli.r8.web-case.identity">
        <h1 className="v4-sec-title">{metric.name}变化回顾</h1>
        <p className="muted" data-testid="pli.r8.web-case.status">{caseStatus(detail)}</p>
        <p>
          当时已记录 {detail.current_value}{unit} · 同期参考 {detail.baseline_value}{unit}
        </p>
        <p className="muted">
          {detail.sample_days} 天可比参考 · {detail.evidence_event_ids.length} 条原始来源 ·
          对比时间 {timeText(detail.computed_at)} · 不能据此推断疾病或已恢复
        </p>
      </section>

      <section className="v4-sec" data-testid="pli.r8.web-case.review-actions">
        <h2 className="v4-sec-title">主人可以怎样继续？</h2>
        <p className="muted">只记录主人的观察与决定，不会自动诊断、用药或判断宠物已恢复。</p>
        {!detail.owner_can_review ? (
          <p className="muted" data-testid="pli.r8.web-case.readonly">
            只有宠物主人可以在档案里继续记录决定；你可以查看已保留的来源与历史反馈。
          </p>
        ) : (
          <div className="r8-filters">
            {ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                className="btn"
                disabled={busy}
                data-testid={`pli.r8.web-case.review.${action.key.toLowerCase()}`}
                onClick={() => review(action.key)}
              >
                {action.label}
              </button>
            ))}
            <Link className="btn primary" href={`/timeline`} data-testid="pli.r8.web-case.record">
              去记录真实观察
            </Link>
          </div>
        )}
        {message ? <p className="alert info" data-testid="pli.r8.web-case.review.status">{message}</p> : null}
      </section>

      <section className="v4-sec" data-testid="pli.r8.web-case.reviews">
        <h2 className="v4-sec-title">主人反馈历程</h2>
        <p className="muted">历次决定按时间保留；来源后来失效，不会改写原本的主人选择。</p>
        {detail.reviews.length === 0 ? <p className="muted">还没有主人反馈。</p> : null}
        {detail.reviews.map((item) => (
          <div className="r8-journal-item" key={item.review_id} data-testid={`pli.r8.web-case.review.${item.review_id}`}>
            <strong>{DECISIONS[item.decision] ?? "已保存的主人决定"}</strong>
            <div className="muted">{timeText(item.reviewed_at)}</div>
            {item.decision === "RECORD_OBSERVATION" ? (
              <div className={item.related_sources_valid === false ? "r8-warn" : "muted"}>
                {item.related_sources_valid === true ? "后续记录目前有效"
                  : item.related_sources_valid === false ? "后续记录已撤回或修正，需重新核对"
                    : "后续记录有效性待核实"}
              </div>
            ) : null}
            {item.related_event_ids.map((eventId) => (
              <div className="muted" key={eventId}>后续事件 ID：{eventId}</div>
            ))}
            {item.note?.trim() ? <div>主人备注：{item.note}</div> : null}
          </div>
        ))}
      </section>

      <section className="v4-sec" data-testid="pli.r8.web-case.sources">
        <h2 className="v4-sec-title">当时依据什么？</h2>
        <p className="muted">
          {detail.evidence_role_source === "FROZEN_AT_CREATION"
            ? "当日依据与同期参考的角色在创建时由服务器冻结，不随浏览器时区重算。"
            : "旧记录没有冻结角色：只按当时日期规则兼容推算，来源身份仍可核对。"}
        </p>
        <button type="button" className="btn" onClick={() => loadSources(0)} data-testid="pli.r8.web-case.sources.open">
          查看来源时间与数值
        </button>
        {sources.map((source) => (
          <div className="r8-journal-item" key={source.event_id} data-testid={`pli.r8.web-case.source.${source.event_id}`}>
            <strong>
              {source.role === "CURRENT" ? "当日依据" : source.role === "HISTORICAL" ? "同期参考" : "日期待核实"}
            </strong>
            <div>{valueText(source)}</div>
            <div className="muted">
              发生 {timeText(source.occurred_at)} · 录入 {timeText(source.recorded_at)}
            </div>
            <div className="muted">
              {SOURCE_LABELS[source.source_type] ?? "其他来源"} · {source.valid ? "来源有效" : "来源已撤回或修正"}
            </div>
            <div className="muted">{source.event_id}</div>
          </div>
        ))}
        {sources.length < sourceTotal && sourceMore ? (
          <button
            type="button"
            className="btn"
            onClick={() => loadSources(sources.length)}
            data-testid="pli.r8.web-case.sources.more"
          >
            继续查看其余来源（{sources.length}/{sourceTotal}）
          </button>
        ) : null}
        {sources.length > 0 && sources.length >= sourceTotal ? (
          <p className="muted">全部来源已可逐条核对</p>
        ) : null}
        {sourceError ? <p className="r8-warn" data-testid="pli.r8.web-case.sources.error">{sourceError}</p> : null}
      </section>

      <section className="v4-sec">
        <h2 className="v4-sec-title">解释边界</h2>
        <p>{detail.truth_note}</p>
        <p className="muted">{detail.uncertainty}</p>
        <p className="muted" data-testid="pli.r8.web-case.case-id">Case ID：{detail.case_id}</p>
      </section>
    </main>
  );
}
