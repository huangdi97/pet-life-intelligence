"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Find 面板：全局查找事件与内容入口。 */
export function FindPanel() {
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }}>
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">{t("agent.tabFind")}</h2>
        <span className="v4-chip">
          <span className="v4-chip-icon">
            <Icon name="search" size={13} />
          </span>
          全局查找
        </span>
      </div>
      <p className="v4-sec-sub">全局查找事件与内容。</p>
      <div className="v4-linkrow">
        <Link href="/search" className="v4-action v4-action--primary">
          {t("agent.findLink")}
        </Link>
      </div>
    </div>
  );
}
