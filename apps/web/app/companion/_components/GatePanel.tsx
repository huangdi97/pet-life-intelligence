"use client";

import Link from "next/link";
import { t } from "../../../lib/i18n";

/** OWN-014 Companion — 未开启 Feature Flag 时的 Gate 视图（GENERATED_3D / 原型声明）。 */
export function GatePanel() {
  return (
    <main>
      <h1>{t("companion.title")}</h1>
      <div className="state">
        <div className="pli-state-title">
          <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
        </div>
        <p className="pli-state-desc" style={{ marginTop: 8 }}>
          {t("companion.gateDesc")}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          现在看到的是 <strong>GENERATED_3D / 原型</strong>，不是实时画面（LIVE）也不是录像（RECORDED）。3D 形象只描述外观，不包含任何健康信息。
        </p>
        <div style={{ marginTop: 12 }}>
          <Link href="/" className="btn primary" role="button">
            {t("companion.gateBack")}
          </Link>
        </div>
      </div>
    </main>
  );
}
