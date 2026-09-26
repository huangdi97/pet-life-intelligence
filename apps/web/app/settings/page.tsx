"use client";

import { useState } from "react";
import { api, pilotApi, type Consent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote } from "../../components/ui";
import { AccountSecurityCard } from "./_components/AccountSecurityCard";
import { AuditAndFeedbackSection } from "./_components/AuditAndFeedbackSection";
import { ConsentsCard } from "./_components/ConsentsCard";
import { DeletionRequestCard } from "./_components/DeletionRequestCard";
import { EmergencyProfileCard } from "./_components/EmergencyProfileCard";
import type { AuditRow, EmergencyProfile } from "./_components/types";

/** Surface 14: Settings / Privacy (PLI-014/016/215/216/046). */
export default function SettingsPage() {
  const { petId } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"));
  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];
  const pid = current?.id;

  const consents = useAsync<Consent[]>(
    () => (pid ? api.get<Consent[]>(`/pets/${pid}/consents`) : Promise.reject(new Error("no pet"))),
    [pid],
  );
  const profile = useAsync<EmergencyProfile>(
    () =>
      pid
        ? api.get<EmergencyProfile>(`/pets/${pid}/emergency-profile`)
        : Promise.reject(new Error("no pet")),
    [pid],
  );
  const audit = useAsync<AuditRow[]>(
    () => (pid ? api.get<AuditRow[]>(`/pets/${pid}/audit`) : Promise.reject(new Error("no pet"))),
    [pid],
  );
  const [form, setForm] = useState<EmergencyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [fbCat, setFbCat] = useState("bug");
  const [fbMsg, setFbMsg] = useState("");
  const [delReason, setDelReason] = useState("");
  const [fbDone, setFbDone] = useState(false);

  async function sendFeedback() {
    setError(null);
    setFbDone(false);
    try {
      await pilotApi.feedback({
        category: fbCat,
        message: fbMsg.trim(),
        page_url: typeof window !== "undefined" ? window.location.pathname : "",
        pet_id: pid,
      });
      setFbMsg("");
      setFbDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function set<K extends keyof EmergencyProfile>(k: K, v: string) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function toggleConsent(purpose: string, granted: boolean) {
    if (!pid) return;
    setError(null);
    try {
      await api.put(`/pets/${pid}/consents/${purpose}`, { granted });
      consents.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveProfile() {
    if (!pid || !form) return;
    setError(null);
    try {
      await api.put(`/pets/${pid}/emergency-profile`, form);
      setFlash("紧急联系卡已保存。");
      profile.reload();
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function requestDeletion() {
    if (!pid) return;
    setError(null);
    try {
      await api.post(`/pets/${pid}/deletion-requests`, { reason: delReason });
      setFlash("删除请求已登记（不会自动删除；等待人工确认）。");
      setDelReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main>
      <h1>设置与隐私</h1>
      <p className="sub">
        紧急联系卡、细粒度同意、删除请求与访问审计。
      </p>
      {flash && <div className="alert info">{flash}</div>}
      <ErrorNote message={error} />

      <AccountSecurityCard />

      <ConsentsCard consents={consents} onToggle={toggleConsent} />

      <EmergencyProfileCard profile={profile} form={form} onFieldChange={set} onSave={saveProfile} />

      <DeletionRequestCard
        pid={pid}
        value={delReason}
        onValueChange={setDelReason}
        onRequest={requestDeletion}
      />

      <AuditAndFeedbackSection
        audit={audit}
        fbCat={fbCat}
        onFbCatChange={setFbCat}
        fbMsg={fbMsg}
        onFbMsgChange={setFbMsg}
        onSendFeedback={sendFeedback}
        fbDone={fbDone}
      />
    </main>
  );
}
