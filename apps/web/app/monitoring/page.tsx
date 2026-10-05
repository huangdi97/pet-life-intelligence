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
 *  无真实设备 provider 时明确显示“未连接/待确认”，绝不伪装在线。 */
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

  // 设备状态机：只呈现一个明确状态，绝不一直“连接中”。
  const stateKey =
    devices.state === "loading"
      ? "LOADING"
      : devices.state === "error"
        ? "ERROR"
        : !devices.data || devices.data.length === 0
          ? "NO_DEVICE"
          : devices.data.some((d) => d.status === "offline")
            ? "OFFLINE"
            : "CONNECTED";
  const stateText: Record<string, string> = {
    LOADING: "正在读取设备状态",
    ERROR: "设备状态读取失败",
    NO_DEVICE: "还没有连接设备",
    OFFLINE: "有设备离线",
    CONNECTED: "设备在线",
  };

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.monitoring.identity">
        <h1>在家状态</h1>
        <p className="sub">查看真实设备连接、最近看到的活动与需要你确认的设备记录；没有设备时仍可正常使用其他生活功能。</p>
      </div>
      <section className="v5-utility-surface v5-utility-surface--soft" data-testid={`pli.monitoring.state.${stateKey}`}>
        <div className="v4-sec-head">
          <div>
            <h2>当前状态</h2>
            <p className="v4-sec-sub">只展示最近一次真实同步结果，不把未知状态伪装成在线。</p>
          </div>
        </div>
        <div className="v4-calm">
          <div>
            <p className="v4-calm-title">{stateText[stateKey]}</p>
            <p className="v4-calm-body">
              {stateKey === "CONNECTED"
                ? "设备数据会作为生活记录的一个来源，不替代你的观察。"
                : stateKey === "NO_DEVICE"
                  ? "没有设备也不影响记录、健康、行为和时间线。"
                  : stateKey === "OFFLINE"
                    ? "离线期间不会生成伪实时状态；恢复连接后再继续同步。"
                    : stateKey === "ERROR"
                      ? "当前无法读取设备状态，可以稍后刷新。"
                      : "正在读取最近一次设备状态。"}
            </p>
          </div>
        </div>
      </section>
      {/* 最近看到 */}
      <div data-testid="pli.monitoring.last">
        <LastSeenPanel recent={recent} />
      </div>

      <div data-testid="pli.monitoring.content">
        {/* 今天（设备事件汇总） */}
        <TodayPanel summary={summary} />

        {/* 设备 */}
        <DevicesPanel devices={devices} />

        {/* 近期变化（基于自己的历史，非跨宠物、非诊断） */}
        <section className="v4-sec">
          <h2 className="v4-sec-title">{t("monitoring.changes")}</h2>
          <p className="v4-sec-sub">
            与它自己的 30 日范围对比；暂无自动判定时此处为空。
          </p>
        </section>

        {/* Camera Candidate Review Queue */}
        <ReviewQueuePanel queue={queue} reviewBusy={reviewBusy} onReview={review} />
      </div>

      <div className="v4-actions" style={{ marginTop: 16 }} data-testid="pli.monitoring.action">
        <Link href="/companion" className="v4-action v4-action--primary">
          进入陪伴模式
        </Link>
        <button type="button" className="v4-action v4-action--soft" onClick={() => devices.reload()}>
          刷新状态
        </button>
      </div>
    </main>
  );
}
