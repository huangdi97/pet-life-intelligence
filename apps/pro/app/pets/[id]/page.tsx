"use client";

import { useParams } from "next/navigation";
import { api, type BehaviorEvent, type Grant, type Pet } from "@pli/api-client";
import { fmtDate, useAsync } from "../../../lib/hooks";
import { BaselineCard } from "./_components/BaselineCard";
import { BehaviorOverviewCard } from "./_components/BehaviorOverviewCard";
import { CareNetworkCard } from "./_components/CareNetworkCard";
import { EvidenceCard } from "./_components/EvidenceCard";
import { HealthOverviewCard, type HealthEventRow, type TodayResp } from "./_components/HealthOverviewCard";
import { IdentityCard } from "./_components/IdentityCard";
import { TimelinePreviewCard } from "./_components/TimelinePreviewCard";

const NO_PET = "NO_PET_SELECTED";

/** PRO-002 Pet Brief（专业版档案）：不是字段表——
 *  Identity / Health Overview / Behavior Overview / Care Network / Baseline /
 *  Evidence 预览 / Timeline 预览 分区组织；风险只来自后端分级，不产生诊断。 */
export default function PetBriefPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const reject = () => Promise.reject(new Error(NO_PET));

  const pet = useAsync<Pet>(() => (id ? api.get<Pet>(`/pets/${id}`) : reject()), [id]);
  const today = useAsync<TodayResp>(() => (id ? api.get<TodayResp>(`/pets/${id}/today`) : reject()), [id]);
  const healthEvents = useAsync<HealthEventRow[]>(
    () => (id ? api.get<HealthEventRow[]>(`/pets/${id}/health-events`) : reject()),
    [id],
  );
  const behaviorEvents = useAsync<BehaviorEvent[]>(
    () => (id ? api.get<BehaviorEvent[]>(`/pets/${id}/behavior-events`) : reject()),
    [id],
  );
  const grants = useAsync<Grant[]>(
    () => (id ? api.get<Grant[]>(`/pets/${id}/grants`) : reject()),
    [id],
  );

  if (!id || pet.state === "denied") {
    return (
      <main>
        <h1>患者档案 · Pet Brief</h1>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const p = pet.data;
  const heRows = healthEvents.data ?? [];
  const beRows = behaviorEvents.data ?? [];
  const todayEvents = today.data?.events ?? [];
  const evidenceCount =
    beRows.reduce((n, b) => n + (b.artifact_ids ?? []).length, 0) +
    todayEvents.reduce((n, e) => n + (e.artifact_ids ?? []).length, 0);

  return (
    <main>
      <h1>{p?.name ?? "患者档案 · Pet Brief"}</h1>
      <p className="sub">
        {p ? `${p.breed || p.species} · ${p.birth_date ? `出生 ${fmtDate(p.birth_date)}` : "出生日期未填写"}` : "专业版患者档案"}
      </p>

      <IdentityCard pet={pet} />
      <HealthOverviewCard id={id} today={today} healthEvents={healthEvents} heRows={heRows} />
      <BehaviorOverviewCard id={id} behaviorEvents={behaviorEvents} beRows={beRows} />
      <CareNetworkCard grants={grants} />
      <BaselineCard pet={pet} />
      <EvidenceCard evidenceCount={evidenceCount} />
      <TimelinePreviewCard id={id} today={today} todayEvents={todayEvents} />
    </main>
  );
}
