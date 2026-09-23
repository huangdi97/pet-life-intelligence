"use client";

import Link from "next/link";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Brief 面板：就诊摘要入口（信息整理，不是兽医诊断）。 */
export function BriefPanel() {
  return (
    <div className="card">
      <h2>{t("agent.tabBrief")}</h2>
      <p className="sub">健康事件的就诊摘要（信息整理，不是兽医诊断）。</p>
      <div className="row">
        <Link href="/health" className="btn primary">
          {t("agent.briefLink")}
        </Link>
      </div>
    </div>
  );
}
