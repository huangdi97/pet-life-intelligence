"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, type HealthEventDetail, type Pet } from "@pli/api-client";
import { useAsync } from "../../../../lib/hooks";
import { mapActionError } from "../../../../lib/errors";
import { RecordOutcomeCard, OUTCOMES } from "./_components/RecordOutcomeCard";
import { SelectHealthEventCard, STATUS_LABELS, type HealthEventRow } from "./_components/SelectHealthEventCard";

const NO_PET = "NO_PET_SELECTED";

/** PRO-006 结局记录：POST /health-events/{id}/outcomes（outcome: IMPROVED 等）。
 *  结局基于实际观察记录；本页不生成诊断；错误映射为人话。 */
export default function OutcomePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const reject = () => Promise.reject(new Error(NO_PET));

  const [selected, setSelected] = useState("");
  const [outcome, setOutcome] = useState("IMPROVED");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pet = useAsync<Pet>(() => (id ? api.get<Pet>(`/pets/${id}`) : reject()), [id]);
  const healthEvents = useAsync<HealthEventRow[]>(
    () => (id ? api.get<HealthEventRow[]>(`/pets/${id}/health-events`) : reject()),
    [id],
  );
  const detail = useAsync<HealthEventDetail | null>(
    () =>
      selected
        ? api.get<HealthEventDetail>(`/health-events/${selected}`)
        : Promise.resolve(null),
    [selected],
  );

  if (!id || pet.state === "denied") {
    return (
      <main>
        <h1>记录结局 · Outcome</h1>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const rows = healthEvents.data ?? [];

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const r = await api.post<{ outcome_id: string; outcome: string; health_event_status: string }>(
        `/health-events/${selected}/outcomes`,
        { outcome, notes },
      );
      const label = OUTCOMES.find((o) => o.value === r.outcome)?.label ?? r.outcome;
      setSuccess(`已记录结局：${label}。事件状态：${STATUS_LABELS[r.health_event_status] ?? r.health_event_status}。`);
      healthEvents.reload();
      detail.reload();
    } catch (e) {
      setActionError(mapActionError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>记录结局 · Outcome</h1>
      <p className="sub">
        {pet.data?.name ?? "患者"} · 基于实际观察记录结局；本页为信息整理，不生成诊断。
      </p>

      <SelectHealthEventCard
        healthEvents={healthEvents}
        rows={rows}
        selected={selected}
        onSelect={(v) => { setSelected(v); setSuccess(null); }}
        detail={detail}
      />

      {selected && (
        <RecordOutcomeCard
          outcome={outcome}
          onOutcomeChange={setOutcome}
          notes={notes}
          onNotesChange={setNotes}
          actionError={actionError}
          success={success}
          busy={busy}
          onSubmit={submit}
          onBack={() => router.push(`/pets/${id}`)}
        />
      )}

      {!selected && rows.length > 0 && (
        <p className="muted">请先在上方选择一个健康事件。</p>
      )}
      <p className="muted">
        <Link href={`/pets/${id}`}>← 返回患者档案 · Pet Brief</Link>
      </p>
    </main>
  );
}
