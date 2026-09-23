"use client";

import { MetricCard } from "@pli/ui-kit";
import { type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { State } from "../../../components/ui";
import { KIND_LABELS, type WelfareProfile } from "./constants";

interface QualityCardProps {
  profile: Async<WelfareProfile>;
}

/** OWN-011 生活质量概览（问卷/域数据，非 AI 百分比）。 */
export function QualityCard({ profile }: QualityCardProps) {
  return (
    <div className="card">
      <h2>{t("welfare.quality")}</h2>
      <State
        state={profile.state}
        error={profile.error ? mapErrorMessage(profile.error) : null}
        onRetry={profile.reload}
        empty={t("welfare.noData")}
      >
        {profile.data?.profile ? (
          <>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {Object.entries(profile.data.profile.domains ?? {}).map(([d, v]) => (
                <MetricCard
                  key={d}
                  label={KIND_LABELS[d] ?? d}
                  value={String(v)}
                  unit={typeof v === "number" ? "" : undefined}
                />
              ))}
            </div>
            {profile.data.profile.notes && (
              <p className="muted" style={{ marginTop: 8 }}>
                {profile.data.profile.notes}
              </p>
            )}
            <p className="muted" style={{ marginTop: 8 }}>
              {t("welfare.uncertainty")}
            </p>
          </>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            {t("welfare.noData")}
          </p>
        )}
      </State>
    </div>
  );
}
