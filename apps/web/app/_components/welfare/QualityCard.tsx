"use client";

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
    <section className="v4-sec" data-testid="pli.welfare.quality">
      <h2 className="v4-sec-title">生活状态概览</h2>
      <State
        state={profile.state}
        error={profile.error ? mapErrorMessage(profile.error) : null}
        onRetry={profile.reload}
        empty={t("welfare.noData")}
      >
        {profile.data?.profile ? (
          <>
            <div className="v5-observation-list">
              {Object.entries(profile.data.profile.domains ?? {}).map(([d, v]) => (
                <div key={d} className="v5-observation-row">
                  <span className="v5-observation-label">{KIND_LABELS[d] ?? "生活观察"}</span>
                  <strong className="v5-observation-value">{String(v)}</strong>
                </div>
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
    </section>
  );
}
