"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { ProvenanceBadge, State } from "../../components/ui";
import { EmptyState, MetricCard, TrendCard } from "@pli/ui-kit";
interface WelfareProfile {
  pet_id: string;
  profile?: {
    domains?: Record<string, unknown>;
    notes?: string;
    updated_at?: string | null;
  } | null;
}

interface WelfareEvidence {
  observation_counts: Record<string, number>;
  sources: string[];
  notice?: string;
}

const WELFARE_EVENT_TYPES = [
  "daily.sleep",
  "daily.play",
  "daily.walk",
  "daily.weight",
  "daily.elimination",
];

const KIND_LABELS: Record<string, string> = {
  CHOICE: "选择/控制感",
  ENVIRONMENT_LOAD: "环境负荷",
  STRESS_RECOVERY: "压力恢复",
  QOL_QUESTIONNAIRE: "生活质量问卷",
  "daily.sleep": "休息",
  "daily.play": "玩耍/丰富化",
  "daily.walk": "外出活动",
  "daily.weight": "体况",
  "daily.elimination": "排泄质量",
};

/** OWN-011 Welfare（Stage H §26）：生活质量/舒适/压力/活动/环境/丰富化。
 *  输出强调 Evidence/Trend/Uncertainty；禁止 AI 情绪百分比与幸福指数。 */
export default function WelfarePage() {
  const { petId } = useCurrentPet();
  const [kind, setKind] = useState("STRESS_RECOVERY");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const profile = useAsync<WelfareProfile>(
    () => (petId ? api.get(`/pets/${petId}/welfare-profile`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const evidence = useAsync<WelfareEvidence>(
    () => (petId ? api.get(`/pets/${petId}/welfare-evidence`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const events = useAsync<{ events: LifeEvent[] }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=60${WELFARE_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );

  async function recordObservation() {
    if (!petId) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/welfare-observations`, {
        kind,
        data: { recorded_from: "web", note: "" },
        source_type: "OWNER_REPORTED",
      });
      setMsg("已记录福祉观察");
      evidence.reload();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(mapErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const welfareEvents = (events.data?.events ?? []).filter((e) =>
    WELFARE_EVENT_TYPES.some((w) => e.event_type === w),
  );

  return (
    <main>
      <h1>{t("welfare.title")}</h1>
      <p className="sub">{t("welfare.sub")}</p>
      {msg && <div className="alert info">{msg}</div>}

      {/* 生活质量概览（问卷/域数据，非 AI 百分比） */}
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

      {/* 证据（带来源的可观察记录） */}
      <div className="card">
        <h2>{t("welfare.evidence")}</h2>
        <State
          state={evidence.state}
          error={evidence.error ? mapErrorMessage(evidence.error) : null}
          onRetry={evidence.reload}
          empty={t("welfare.noData")}
        >
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {Object.entries(evidence.data?.observation_counts ?? {}).map(([k, n]) => (
              <span key={k} className="badge">
                {KIND_LABELS[k] ?? k} × {n}
              </span>
            ))}
            {Object.keys(evidence.data?.observation_counts ?? {}).length === 0 && (
              <span className="badge">{t("welfare.noData")}</span>
            )}
          </div>
          {evidence.data?.notice && (
            <p className="muted" style={{ marginTop: 8 }}>
              {evidence.data.notice}
            </p>
          )}
        </State>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="观察类型" style={{ maxWidth: 220 }}>
            <option value="STRESS_RECOVERY">压力恢复</option>
            <option value="ENVIRONMENT_LOAD">环境负荷</option>
            <option value="CHOICE">选择/控制感</option>
            <option value="QOL_QUESTIONNAIRE">生活质量问卷</option>
          </select>
          <button className="btn primary" disabled={busy} onClick={recordObservation}>
            {t("welfare.record")}
          </button>
        </div>
      </div>

      {/* 趋势（基于福祉相关日常事件） */}
      <div className="card">
        <h2>{t("welfare.trend")}</h2>
        <State
          state={events.state}
          error={events.error ? mapErrorMessage(events.error) : null}
          onRetry={events.reload}
          empty={t("welfare.noData")}
        >
          {welfareEvents.length === 0 ? (
            <EmptyState title="还没有福祉记录" description="记录观察后，这里会显示基于事件频次的趋势。" />
          ) : (
            <>
              <TrendCard
                label={t("welfare.trend")}
                summary={`近 ${Math.min(welfareEvents.length, 10)} 条福祉相关记录 · 与自己近期范围对比`}
                evidence={welfareEvents
                  .slice(0, 4)
                  .map((e) => `${KIND_LABELS[e.event_type] ?? e.event_type} · ${fmtTime(e.occurred_at)}`)
                  .join("；")}
              />
              <ul className="tl">
                {welfareEvents.slice(0, 10).map((e) => (
                  <li key={e.event_id}>
                    <div className="tl-head">
                      <span className="tl-type">{KIND_LABELS[e.event_type] ?? e.event_type}</span>
                      <ProvenanceBadge level={e.provenance_level} />
                      <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                    </div>
                    <div className="tl-body">
                      {Object.entries(e.payload)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="muted">
                趋势基于事件频次与自己的历史范围；{t("welfare.uncertainty")}；不是医疗结论。
              </p>
            </>
          )}
        </State>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/health" className="btn">
          健康
        </Link>
        <Link href="/behavior" className="btn">
          行为
        </Link>
      </div>
    </main>
  );
}
