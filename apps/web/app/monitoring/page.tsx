"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { t } from "../../lib/i18n";
import { DevicesPanel } from "./_components/DevicesPanel";
import { LastSeenPanel } from "./_components/LastSeenPanel";
import { ReviewQueuePanel } from "./_components/ReviewQueuePanel";
import { TodayPanel } from "./_components/TodayPanel";
import type { HomeSummary, PetDevice, ReviewDecision, ReviewItem } from "./_components/types";

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

  async function review(eventId: string, decision: ReviewDecision) {
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
      <LastSeenPanel recent={recent} />

      {/* 今天（设备事件汇总） */}
      <TodayPanel summary={summary} />

      {/* 设备 */}
      <DevicesPanel devices={devices} />

      {/* 近期变化（基于自己的历史，非跨宠物、非诊断） */}
      <div className="card">
        <h2>{t("monitoring.changes")}</h2>
        <p className="sub" style={{ margin: 0 }}>
          与它自己的 30 日范围对比；暂无自动判定时此处为空。
        </p>
      </div>

      {/* Camera Candidate Review Queue */}
      <ReviewQueuePanel queue={queue} reviewBusy={reviewBusy} onReview={review} />

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
