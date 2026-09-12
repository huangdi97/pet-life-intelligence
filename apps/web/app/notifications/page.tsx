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
    <main>
      <h1>通知中心</h1>
      <p className="sub">任务冲突、红旗警告、权限到期、用药遗漏等统一通知（PLI-219）。</p>
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
                <span className="badge">{n.type}</span>
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
