"use client";

import Link from "next/link";
import { useState } from "react";
import { api, pilotApi, type Consent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote } from "../../components/ui";
import { AccountSecurityCard } from "./_components/AccountSecurityCard";
import { AuditAndFeedbackSection } from "./_components/AuditAndFeedbackSection";
import { ConsentsCard } from "./_components/ConsentsCard";
import { DeletionRequestCard, type DeletionRequestRow } from "./_components/DeletionRequestCard";
import { DataControlsCard } from "./_components/DataControlsCard";
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
  const deletionRequests = useAsync<DeletionRequestRow[]>(
    () =>
      pid
        ? api.get<DeletionRequestRow[]>(`/pets/${pid}/deletion-requests`)
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
  const [inviteCode, setInviteCode] = useState("");
  const [fbDone, setFbDone] = useState(false);

  async function acceptHouseholdInvitation() {
    if (!inviteCode.trim()) return;
    setError(null);
    try {
      await api.post("/invitations/accept", { token: inviteCode.trim() });
      setInviteCode("");
      setFlash("家庭邀请已接受。");
      pets.reload();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

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
      deletionRequests.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page v5-me-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.me.owner">
        <h1>我的</h1>
        <p className="sub">家庭、通知、设备、隐私与数据设置。</p>
      </div>
      {flash && <div className="alert info">{flash}</div>}
      <ErrorNote message={error} />

      <div className="v5-me-section" data-testid="pli.me.pets">
        <h2>我的宠物</h2>
        {current ? (
          <p className="muted" style={{ margin: 0 }}>
            当前宠物：{current.name}（{current.species === "dog" ? "狗" : current.species === "cat" ? "猫" : current.species}）
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>还没有宠物。</p>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/pets" className="btn">
            管理宠物
          </Link>
        </div>
      </div>

      <div className="v5-me-section" data-testid="pli.me.care-network">
        <h2>家庭与照护网络</h2>
        <p className="muted" style={{ margin: 0 }}>与家人、照护者共享记录与任务，授权逐项管理。</p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/care" className="btn">
            照护协作
          </Link>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="field">
            接受家庭邀请
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="输入邀请码"
              autoComplete="off"
            />
          </label>
          <button className="btn" onClick={acceptHouseholdInvitation} disabled={!inviteCode.trim()}>
            接受邀请
          </button>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            邀请码只用于加入家庭，不会授予超出邀请角色的权限。
          </p>
        </div>
      </div>

      <div className="v5-me-section" data-testid="pli.me.notifications">
        <h2>通知</h2>
        <p className="muted" style={{ margin: 0 }}>任务提醒、用药提醒与异常提醒。</p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/notifications" className="btn">
            管理通知
          </Link>
        </div>
      </div>

      <div className="v5-me-section" data-testid="pli.me.devices">
        <h2>在家与设备</h2>
        <p className="muted" style={{ margin: 0 }}>查看真实设备连接、离线状态与最近一次同步；没有设备时不会伪装在线。</p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/monitoring" className="btn">
            查看设备状态
          </Link>
        </div>
      </div>

      <div data-testid="pli.me.privacy">
        <ConsentsCard consents={consents} onToggle={toggleConsent} />
      </div>

      <div data-testid="pli.me.data">
        <EmergencyProfileCard profile={profile} form={form} onFieldChange={set} onSave={saveProfile} />
        <DataControlsCard pid={pid} />
        <DeletionRequestCard
          pid={pid}
          value={delReason}
          rows={deletionRequests.data ?? []}
          state={deletionRequests.state}
          onValueChange={setDelReason}
          onRequest={requestDeletion}
        />
      </div>

      <div data-testid="pli.me.help">
        <AuditAndFeedbackSection
          audit={audit}
          fbCat={fbCat}
          onFbCatChange={setFbCat}
          fbMsg={fbMsg}
          onFbMsgChange={setFbMsg}
          onSendFeedback={sendFeedback}
          fbDone={fbDone}
        />
        <div className="v5-me-section">
          <h2>帮助</h2>
          <p className="muted" style={{ margin: 0 }}>
            使用问题可查看「助手」页的解释入口，或通过上方反馈告诉我们。
          </p>
        </div>
      </div>

      <div data-testid="pli.me.settings">
        <AccountSecurityCard />
      </div>
    </main>
  );
}
