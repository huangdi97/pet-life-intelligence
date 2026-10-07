"use client";

import { api } from "@pli/api-client";
import { useMemo, useState } from "react";
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
  target_role: string | null;
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

function roleAudienceLabel(role: string | null): string | null {
  if (!role || role === "ALL") return null;
  const labels: Record<string, string> = {
    OWNER: "仅家庭主人",
    CO_OWNER: "仅共同主人",
    FAMILY: "仅家人",
    SITTER: "仅临时照护",
    VET: "仅兽医",
    TRAINER: "仅训练师",
    GROOMER: "仅美容师",
  };
  return labels[role] ?? "仅指定家庭角色";
}

function notificationTone(type: string): string {
  if (type.includes("EMERGENCY") || type === "TASK_CONFLICT") return "v4-chip v4-chip--danger";
  if (type.includes("MEDICATION")) return "v4-chip v4-chip--warning";
  if (type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION")) return "v4-chip v4-chip--info";
  return "v4-chip";
}

type NotificationFilter = "all" | "attention" | "health" | "care" | "other";

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "attention", label: "需要处理" },
  { id: "health", label: "健康与用药" },
  { id: "care", label: "照护与任务" },
  { id: "other", label: "其他" },
];

function notificationCategory(type: string): Exclude<NotificationFilter, "all" | "attention"> {
  if (type.includes("HEALTH") || type.includes("TRIAGE") || type.includes("EMERGENCY") || type.includes("MEDICATION")) return "health";
  if (type.includes("TASK") || type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION") || type.includes("CARE")) return "care";
  return "other";
}

/** Surface 13: unified notification center (PLI-219). */
export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const notifications = useAsync<NotificationRow[]>(() =>
    api
      .get<Pet[]>("/pets")
      .then((pets) => {
        if (!pets.length) {
          setHouseholdId(null);
          return [] as NotificationRow[];
        }
        const hh = pets[0].household_id;
        setHouseholdId(hh);
        return api.get<NotificationRow[]>(`/households/${hh}/notifications`);
      }),
  );

  const unread = notifications.data?.filter((n) => !n.read_at).length ?? 0;
  const visible = useMemo(
    () =>
      (notifications.data ?? []).filter((n) => {
        if (filter === "all") return true;
        if (filter === "attention") return !n.read_at;
        return notificationCategory(n.type) === filter;
      }),
    [notifications.data, filter],
  );

  async function markRead(id: string) {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/notifications/${id}/read`, {});
      notifications.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "暂时无法更新通知状态。");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!householdId || busyId || unread === 0) return;
    setBusyId("all");
    setActionError(null);
    try {
      await api.post(`/households/${householdId}/notifications/read-all`, {});
      notifications.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "暂时无法更新通知状态。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <div>
          <h1>通知中心</h1>
          <p className="sub">任务、健康、权限与用药提醒集中在这里，只强调真正需要处理的事情。</p>
        </div>
        {notifications.data && notifications.data.length > 0 ? (
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <span className={unread > 0 ? "v4-chip v4-chip--warning" : "v4-chip v4-chip--success"}>
              {unread > 0 ? `${unread} 条未读` : "已查看全部"}
            </span>
            {unread > 0 ? (
              <button className="btn primary" onClick={() => void markAllRead()} disabled={busyId !== null}>
                {busyId === "all" ? "处理中…" : "全部标为已读"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {actionError ? <div className="alert warn">{actionError}</div> : null}

      <div className="v4-filter-row" aria-label="通知筛选">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`v4-chip ${filter === item.id ? "v4-chip--brand" : ""}`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="v5-utility-surface">
        <State
          state={notifications.state}
          error={notifications.error}
          onRetry={notifications.reload}
          empty="暂无通知。"
        >
          {notifications.data && notifications.data.length > 0 ? (
            visible.length > 0 ? (
              <ul className="v4-ls">
                {visible.map((n) => (
                  <li className="ls-item" key={n.id}>
                    <span className="ls-time">{fmtTime(n.created_at)}</span>
                    <div className="ls-body">
                      <div className="ls-title">
                        {n.title}
                        {!n.read_at ? <span className="v4-chip v4-chip--brand">未读</span> : null}
                        <span className={notificationTone(n.type)}>{notificationTypeLabel(n.type)}</span>
                        {roleAudienceLabel(n.target_role) ? <span className="v4-chip v4-chip--info">{roleAudienceLabel(n.target_role)}</span> : null}
                      </div>
                      <div className="ls-summary">{n.body}</div>
                      {!n.read_at ? (
                        <button
                          type="button"
                          className="v4-action v4-action--soft"
                          style={{ marginTop: 8, minHeight: 36 }}
                          disabled={busyId !== null}
                          onClick={() => void markRead(n.id)}
                        >
                          {busyId === n.id ? "处理中…" : "标为已读"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v4-note">当前筛选下没有通知。</p>
            )
          ) : null}
        </State>
      </section>

      <p className="v4-note" style={{ marginTop: 14 }}>
        紧急程度来自真实规则或记录状态；普通通知不会使用危险色制造焦虑。
      </p>
    </main>
  );
}
