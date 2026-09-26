"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Plan 面板：今日任务与训练计划入口。 */
export function PlanPanel() {
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }}>
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">{t("agent.tabPlan")}</h2>
        <span className="v4-chip">
          <span className="v4-chip-icon">
            <Icon name="target" size={13} />
          </span>
          今日计划
        </span>
      </div>
      <p className="v4-sec-sub">今日任务与训练计划。</p>
      <div className="v4-linkrow">
        <Link href="/tasks" className="v4-action v4-action--primary">
          任务
        </Link>
        <Link href="/training" className="v4-action v4-action--secondary">
          训练
        </Link>
      </div>
    </div>
  );
}
