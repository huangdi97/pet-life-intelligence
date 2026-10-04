"use client";

import { api } from "@pli/api-client";
import { fmtTime, useAsync } from "../../lib/hooks";
import type { Pet } from "@pli/api-client";
import { State } from "../../components/ui";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  pet_id: string | null;
  created_at: string;
  read_at: string | null;
  data: Record<string, unknown>;
}

function notificationTypeLabel(type: string): string {
  if (type.includes("EMERGENCY")) return "紧急提醒";
  if (type === "TASK_CONFLICT") return "任务冲突";
  if (type.includes("MEDICATION")) return "用药提醒";
  if (type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION")) return "照护权限";
  if (type.includes("TASK")) return "照护任务";
  return "生活提醒";
}

/** Surface 13: unified notification center (PLI-219). */
export default function NotificationsPage() {
  const notifications = useAsync<NotificationRow[]>(() =>
    api
      .get<Pet[]>("/pets")
      .then((pets) => {
        if (!pets.length) return [] as NotificationRow[];
        // v0.1: fetch per known households via first pet's household
        const hh = pets[0].household_id;
        return api.get<NotificationRow[]>(`/households/${hh}/notifications`);
      }),
  );

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede">
        <h1>通知中心</h1>
        <p className="sub">任务、健康、权限与用药提醒集中在这里，优先呈现真正需要处理的事情。</p>
      </div>
      <State
        state={notifications.state}
        error={notifications.error}
        onRetry={notifications.reload}
        empty="暂无通知。"
      >
        <ul className="tl">
          {notifications.data?.map((n) => (
            <li key={n.id}>
              <div className="tl-head">
                <span className={`tl-type ${n.type.includes("EMERGENCY") || n.type === "TASK_CONFLICT" ? "" : ""}`}>
                  {n.title}
                </span>
                <span className="badge">{notificationTypeLabel(n.type)}</span>
                <span className="tl-time">{fmtTime(n.created_at)}</span>
              </div>
              <div className="tl-body">{n.body}</div>
            </li>
          ))}
        </ul>
      </State>
    </main>
  );
}
