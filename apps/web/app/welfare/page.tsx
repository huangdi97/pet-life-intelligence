"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import {
  WELFARE_EVENT_TYPES,
  type WelfareEvidence,
  type WelfareProfile,
} from "../_components/welfare/constants";
import { EvidenceCard } from "../_components/welfare/EvidenceCard";
import { QualityCard } from "../_components/welfare/QualityCard";
import { WelfareTrendCard } from "../_components/welfare/WelfareTrendCard";

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

      <QualityCard profile={profile} />
      <EvidenceCard evidence={evidence} kind={kind} setKind={setKind} busy={busy} onRecord={recordObservation} />
      <WelfareTrendCard events={events} welfareEvents={welfareEvents} />

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
