"use client";

import { State } from "../../../components/ui";
import type { Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import type { SocialProfile } from "./types";

const FAMILIAR_LABELS: Record<string, string> = {
  UNKNOWN: "未知",
  GOOD: "很好",
  OK: "可以",
  CAUTION: "需注意",
  NO: "不行",
};

interface RelationsPanelProps {
  profile: Async<SocialProfile>;
}

/** OWN-012 Social — 关系图谱（列表式 + 倾向标注，非 Feed）。 */
export function RelationsPanel({ profile }: RelationsPanelProps) {
  const prof = profile.data?.profile;
  return (
    <div className="card">
      <h2>{t("social.relations")}</h2>
      <State
        state={profile.state}
        error={profile.error ? mapErrorMessage(profile.error) : null}
        onRetry={profile.reload}
        empty={t("social.noData")}
      >
        {prof ? (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="badge">对狗：{FAMILIAR_LABELS[prof.good_with_dogs ?? "UNKNOWN"] ?? "未知"}</span>
            <span className="badge">对猫：{FAMILIAR_LABELS[prof.good_with_cats ?? "UNKNOWN"] ?? "未知"}</span>
            <span className="badge">对孩子：{FAMILIAR_LABELS[prof.good_with_kids ?? "UNKNOWN"] ?? "未知"}</span>
            <span className="badge">对陌生人：{FAMILIAR_LABELS[prof.good_with_strangers ?? "UNKNOWN"] ?? "未知"}</span>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            {t("social.noData")}
          </p>
        )}
      </State>
    </div>
  );
}
