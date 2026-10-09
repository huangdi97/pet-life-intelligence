"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/i18n";
import { State } from "../../components/ui";
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

  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];
  const profile = useAsync<WelfareProfile>(
    () => (petId ? api.get(`/pets/${petId}/welfare-profile`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const evidence = useAsync<WelfareEvidence>(
    () => (petId ? api.get(`/pets/${petId}/welfare-evidence`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const enrichment = useAsync<{
    activities: Array<{ name: string; domain: string; min_minutes: number }>;
    version?: string;
  }>(() => api.get("/welfare/enrichment-activities"), []);

  const events = useAsync<{ events: LifeEvent[] }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=60${WELFARE_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );

  async function recordObservation(): Promise<boolean> {
    if (!petId) return false;
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
      return true;
    } catch (e) {
      setMsg(mapErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const welfareEvents = (events.data?.events ?? []).filter((e) =>
    WELFARE_EVENT_TYPES.some((w) => e.event_type === w),
  );

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.welfare.identity">
        <h1>生活与福祉</h1>
        <p className="sub">{current ? `${current.name} · 从真实观察里看休息、活动、压力恢复、环境与丰富化的变化。` : "从真实观察里看休息、活动、压力恢复、环境与丰富化的变化。"}</p>
      </div>
      {msg && <div className="alert info">{msg}</div>}

      <QualityCard profile={profile} />

      <div data-testid="pli.welfare.observable">
        <EvidenceCard evidence={evidence} kind={kind} setKind={setKind} busy={busy} onRecord={recordObservation} />
      </div>

      <div className="v4-note" data-testid="pli.welfare.action">
        新观察会保存记录人与来源；趋势只基于已记录事实，不推断情绪或幸福指数。
      </div>

      <WelfareTrendCard events={events} welfareEvents={welfareEvents} />

      <div className="v4-sec" data-testid="pli.welfare.enrichment">
        <h2>丰富化</h2>
        <p className="muted" style={{ margin: 0 }}>
          {welfareEvents.length > 0
            ? `最近 ${Math.min(welfareEvents.length, 10)} 条福祉相关记录来自真实观察。`
            : "还没有丰富化观察。记录玩耍、探索与新事物后会出现在这里。"}
        </p>
        <State
          state={enrichment.state}
          error={enrichment.error}
          onRetry={enrichment.reload}
          empty="当前没有可用的丰富化活动说明。"
        >
          <div className="v5-observation-list" style={{ marginTop: 10 }}>
            {(enrichment.data?.activities ?? []).map((activity) => (
              <div className="v5-observation-row" key={activity.name}>
                <span className="v5-observation-label">{activity.name}</span>
                <span className="v5-observation-value">{activity.domain} · 至少 {activity.min_minutes} 分钟</span>
              </div>
            ))}
          </div>
          <p className="v4-note">活动库是通用安全内容，不代表这只宠物已经喜欢或完成过这些活动。</p>
        </State>
      </div>

      <div className="v4-sec" data-testid="pli.welfare.comfort">
        <h2>休息与舒适</h2>
        <p className="muted" style={{ margin: 0 }}>睡眠、休息环境与舒适度相关的观察会汇总到这里。还没有相关记录。</p>
      </div>

      <div className="v4-sec" data-testid="pli.welfare.activity">
        <h2>活动与探索</h2>
        <p className="muted" style={{ margin: 0 }}>
          {welfareEvents.length > 0 ? "这里仅汇总已记录的活动与探索事实；是否喜欢需要主人明确记录，不能从事件频次自动推断。" : "记录玩耍与探索后，这里会呈现发生过的活动；不会自动推断偏好或情绪。"}
        </p>
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
