"use client";

import Link from "next/link";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Plan 面板：今日任务与训练计划入口。 */
export function PlanPanel() {
  return (
    <div className="card">
      <h2>{t("agent.tabPlan")}</h2>
      <p className="sub">今日任务与训练计划。</p>
      <div className="row">
        <Link href="/tasks" className="btn primary">
          任务
        </Link>
        <Link href="/training" className="btn">
          训练
        </Link>
      </div>
    </div>
  );
}
