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

function notificationTone(type: string): string {
  if (type.includes("EMERGENCY") || type === "TASK_CONFLICT") return "v4-chip v4-chip--danger";
  if (type.includes("MEDICATION")) return "v4-chip v4-chip--warning";
  if (type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION")) return "v4-chip v4-chip--info";
  return "v4-chip";
}

/** Surface 13: unified notification center (PLI-219). */
export default function NotificationsPage() {
  const notifications = useAsync<NotificationRow[]>(() =>
    api
      .get<Pet[]>("/pets")
      .then((pets) => {
        if (!pets.length) return [] as NotificationRow[];
        const hh = pets[0].household_id;
        return api.get<NotificationRow[]>(`/households/${hh}/notifications`);
      }),
  );

  const unread = notifications.data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <div>
          <h1>通知中心</h1>
          <p className="sub">任务、健康、权限与用药提醒集中在这里，只强调真正需要处理的事情。</p>
        </div>
        {notifications.data && notifications.data.length > 0 ? (
          <span className={unread > 0 ? "v4-chip v4-chip--warning" : "v4-chip v4-chip--success"}>
            {unread > 0 ? `${unread} 条未读` : "已查看全部"}
          </span>
        ) : null}
      </div>

      <section className="v5-utility-surface">
        <State
          state={notifications.state}
          error={notifications.error}
          onRetry={notifications.reload}
          empty="暂无通知。"
        >
          {notifications.data && notifications.data.length > 0 ? (
            <ul className="v4-ls">
              {notifications.data.map((n) => (
                <li className="ls-item" key={n.id}>
                  <span className="ls-time">{fmtTime(n.created_at)}</span>
                  <div className="ls-body">
                    <div className="ls-title">
                      {n.title}
                      {!n.read_at ? <span className="v4-chip v4-chip--brand">未读</span> : null}
                      <span className={notificationTone(n.type)}>{notificationTypeLabel(n.type)}</span>
                    </div>
                    <div className="ls-summary">{n.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </State>
      </section>

      <p className="v4-note" style={{ marginTop: 14 }}>
        紧急程度来自真实规则或记录状态；普通通知不会使用危险色制造焦虑。
      </p>
    </main>
  );
}
