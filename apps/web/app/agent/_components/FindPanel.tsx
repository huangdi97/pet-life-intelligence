"use client";

import Link from "next/link";
import { t } from "../../../lib/i18n";

/** OWN-015 Agent — Find 面板：全局查找事件与内容入口。 */
export function FindPanel() {
  return (
    <div className="card">
      <h2>{t("agent.tabFind")}</h2>
      <p className="sub">全局查找事件与内容。</p>
      <div className="row">
        <Link href="/search" className="btn primary">
          {t("agent.findLink")}
        </Link>
      </div>
    </div>
  );
}
