"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Brief 面板：就诊摘要入口（信息整理，不是兽医诊断）。 */
export function BriefPanel() {
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }}>
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">{t("agent.tabBrief")}</h2>
        <span className="v4-chip v4-chip--info">
          <span className="v4-chip-icon">
            <Icon name="note" size={13} />
          </span>
          信息整理
        </span>
      </div>
      <p className="v4-sec-sub">健康事件的就诊摘要（信息整理，不是兽医诊断）。</p>
      <div className="v4-linkrow">
        <Link href="/health" className="v4-action v4-action--primary">
          {t("agent.briefLink")}
        </Link>
      </div>
    </div>
  );
}
