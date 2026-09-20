"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { DeviceStatus, type DeviceState, EmptyState, MetricCard } from "@pli/ui-kit";
import { State } from "../../components/ui";

interface HomeSummary {
  pet_id: string;
  today_counts: Record<string, number>;
  note?: string;
}

interface PetDevice {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
  last_sync?: string | null;
}

interface ReviewItem {
  event_id: string;
  event_kind?: string;
  summary?: string;
  occurred_at?: string;
  candidate?: Record<string, unknown>;
}

const KIND_LABELS: Record<string, string> = {
  feeding: "进食",
  drinking: "饮水",
  elimination: "排泄",
  activity: "活动",
  sleep: "睡眠",
};


/** OWN-013 Monitoring（Stage H §29-33）：Home Intelligence 产品页，不是 IoT dashboard。
 *  无真实设备 provider 时显示 PROTOTYPE + 未知状态，不伪装在线。 */
export default function MonitoringPage() {
  const { petId } = useCurrentPet();
  const [reviewBusy, setReviewBusy] = useState(false);
  const summary = useAsync<HomeSummary>(
    () => (petId ? api.get(`/pets/${petId}/home-summary`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const devices = useAsync<PetDevice[]>(
    () => (petId ? api.get(`/pets/${petId}/devices`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const queue = useAsync<ReviewItem[]>(
    () =>
      petId ? api.get(`/pets/${petId}/device-events/review-queue`) : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const recent = useAsync<{ events: LifeEvent[] }>(
    () => (petId ? api.get(`/pets/${petId}/events?limit=5`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );

  const counts = summary.data?.today_counts ?? {};
  const deviceList = devices.data ?? [];

  async function review(eventId: string, decision: "confirm" | "correct" | "reject") {
    setReviewBusy(true);
    try {
      await api.post(`/device-events/${eventId}/review`, {
        decision: decision === "confirm" ? "CONFIRM" : decision === "correct" ? "CORRECT" : "REJECT",
      });
      queue.reload();
    } catch {
      /* 错误由 busy 状态与空刷新表达；不弹 raw code */
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <main>
      <h1>{t("monitoring.title")}</h1>
      <p className="sub">{t("monitoring.sub")}</p>

      {/* 最近看到 */}
      <div className="card">
        <h2>{t("monitoring.lastSeen")}</h2>
        <State
          state={recent.state}
          error={recent.error ? mapErrorMessage(recent.error) : null}
          onRetry={recent.reload}
          empty={t("monitoring.noData")}
        >
          {recent.data?.events?.[0] ? (
            <p className="sub" style={{ margin: 0 }}>
              {fmtTime(recent.data.events[0].occurred_at)} · {recent.data.events[0].event_type}
            </p>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              {t("monitoring.noData")}
            </p>
          )}
        </State>
      </div>

      {/* 今天（设备事件汇总） */}
      <div className="card">
        <h2>{t("monitoring.today")}</h2>
        <State
          state={summary.state}
          error={summary.error ? mapErrorMessage(summary.error) : null}
          onRetry={summary.reload}
          empty={t("monitoring.noData")}
        >
            {Object.entries(counts).map(([kind, n]) => (
              <MetricCard key={kind} label={KIND_LABELS[kind] ?? kind} value={Number(n)} />
            ))}
            {Object.keys(counts).length === 0 && (
              <EmptyState title="还没有设备数据" description="设备接入后，这里会显示今天的进食/饮水/排泄/活动/睡眠汇总。" />
            )}
          {summary.data?.note && <p className="muted" style={{ marginTop: 8 }}>{summary.data.note}</p>}
        </State>
      </div>

      {/* 设备 */}
      <div className="card">
        <h2>{t("monitoring.devices")}</h2>
        {deviceList.length === 0 ? (
          <div className="state">
            {t("monitoring.devicesOff")}
            <div style={{ marginTop: 8 }}>
              <span className="badge pli-tag--prototype">{t("monitoring.prototype")}</span>
            </div>
          </div>
        ) : (
          <ul className="tl">
            {deviceList.map((d) => (
              <li key={d.device_id}>
                <DeviceStatus
                  name={d.display_name || d.provider}
                  state={d.status as DeviceState}
                  last_sync={d.last_sync ?? null}
                  isPrototype={d.status === "unknown"}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* 近期变化（基于自己的历史，非跨宠物、非诊断） */}
      <div className="card">
        <h2>{t("monitoring.changes")}</h2>
        <p className="sub" style={{ margin: 0 }}>
          与它自己的 30 日范围对比；暂无自动判定时此处为空。
        </p>
      </div>

      {/* Camera Candidate Review Queue */}
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
                  <button className="btn primary" disabled={reviewBusy} onClick={() => review(item.event_id, "confirm")}>
                    {t("monitoring.reviewConfirm")}
                  </button>
                  <button className="btn" disabled={reviewBusy} onClick={() => review(item.event_id, "correct")}>
                    {t("monitoring.reviewCorrect")}
                  </button>
                  <button className="btn" disabled={reviewBusy} onClick={() => review(item.event_id, "reject")}>
                    {t("monitoring.reviewReject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </State>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/" className="btn">
          回到今日
        </Link>
        <Link href="/companion" className="btn">
          陪伴
        </Link>
      </div>
    </main>
  );
}
