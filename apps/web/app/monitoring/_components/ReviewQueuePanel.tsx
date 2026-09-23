"use client";

import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import type { ReviewDecision, ReviewItem } from "./types";

interface ReviewQueuePanelProps {
  queue: Async<ReviewItem[]>;
  reviewBusy: boolean;
  onReview: (eventId: string, decision: ReviewDecision) => void;
}

/** OWN-013 Monitoring — Camera Candidate Review Queue：AI 候选需 Owner 确认后才成为事实。 */
export function ReviewQueuePanel({ queue, reviewBusy, onReview }: ReviewQueuePanelProps) {
  return (
    <div className="card">
      <h2>{t("monitoring.reviewQueue")}</h2>
      <p className="muted">摄像头 AI 候选不直接成为事实；需 Owner 确认后进入 Canonical Event。</p>
      <State
        state={queue.state}
        error={queue.error ? mapErrorMessage(queue.error) : null}
        onRetry={queue.reload}
        empty="没有待确认的候选事件。"
      >
        <ul className="tl">
          {queue.data?.map((item) => (
            <li key={item.event_id}>
              <div className="tl-head">
                <span className="tl-type">{item.event_kind ?? "candidate"}</span>
                <span className="badge pli-tag--prototype">{t("monitoring.prototype")}</span>
                <span className="tl-time">{item.occurred_at ? fmtTime(item.occurred_at) : ""}</span>
              </div>
              {item.summary && <div className="tl-body">{item.summary}</div>}
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <button className="btn primary" disabled={reviewBusy} onClick={() => onReview(item.event_id, "confirm")}>
                  {t("monitoring.reviewConfirm")}
                </button>
                <button className="btn" disabled={reviewBusy} onClick={() => onReview(item.event_id, "correct")}>
                  {t("monitoring.reviewCorrect")}
                </button>
                <button className="btn" disabled={reviewBusy} onClick={() => onReview(item.event_id, "reject")}>
                  {t("monitoring.reviewReject")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </State>
    </div>
  );
}
