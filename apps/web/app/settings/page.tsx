"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  authApi,
  clearSession,
  getRefreshToken,
  getUserMeta,
  type Consent,
  type Pet,
} from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface EmergencyProfile {
  owner_contact: string;
  backup_contact: string;
  vet_clinic_name: string;
  vet_clinic_phone: string;
  vet_clinic_address_text: string;
  critical_care_notes: string;
  updated_at: string;
}

interface AuditRow {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
}

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
  const [delReason, setDelReason] = useState("");

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
        紧急联系卡（PLI-014）、细粒度同意（PLI-016/215）、删除请求（PLI-216）与访问审计（PLI-046）。
      </p>
      {flash && <div className="alert info">{flash}</div>}
      <ErrorNote message={error} />

      <AccountSecurityCard />

      <div className="card">
        <h2>数据同意</h2>
        <State state={consents.state} error={consents.error} onRetry={consents.reload}>
          {consents.data?.map((c) => (
            <div className="row" key={c.purpose} style={{ margin: "6px 0" }}>
              <span style={{ minWidth: 220 }}>{c.purpose}</span>
              <span className={`badge ${c.granted ? "MONITOR" : "EMERGENCY"}`}>
                {c.granted ? "已同意" : "未同意"}
              </span>
              <button
                className="btn"
                disabled={c.purpose === "SERVICE_ESSENTIAL"}
                onClick={() => toggleConsent(c.purpose, !c.granted)}
              >
                {c.granted ? "撤回" : "同意"}
              </button>
              <span className="muted">{fmtTime(c.updated_at)}</span>
            </div>
          ))}
        </State>
        <p className="muted">SERVICE_ESSENTIAL 为产品必需同意，不可撤回（撤回即无法使用服务）。</p>
      </div>

      <div className="card">
        <h2>紧急联系卡</h2>
        <State state={profile.state} error={profile.error} onRetry={profile.reload}>
          {(form ?? profile.data) && (
            <>
              <div className="grid2">
                <label className="field">
                  主人联系方式
                  <input
                    value={form?.owner_contact ?? profile.data?.owner_contact ?? ""}
                    onChange={(e) => set("owner_contact", e.target.value)}
                  />
                </label>
                <label className="field">
                  备用联系人
                  <input
                    value={form?.backup_contact ?? profile.data?.backup_contact ?? ""}
                    onChange={(e) => set("backup_contact", e.target.value)}
                  />
                </label>
                <label className="field">
                  首选医院（文字，非地图）
                  <input
                    value={form?.vet_clinic_name ?? profile.data?.vet_clinic_name ?? ""}
                    onChange={(e) => set("vet_clinic_name", e.target.value)}
                  />
                </label>
                <label className="field">
                  医院电话
                  <input
                    value={form?.vet_clinic_phone ?? profile.data?.vet_clinic_phone ?? ""}
                    onChange={(e) => set("vet_clinic_phone", e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                医院地址（文字）
                <textarea
                  rows={2}
                  value={form?.vet_clinic_address_text ?? profile.data?.vet_clinic_address_text ?? ""}
                  onChange={(e) => set("vet_clinic_address_text", e.target.value)}
                />
              </label>
              <label className="field">
                关键照护备注 / 行为禁忌
                <textarea
                  rows={2}
                  value={form?.critical_care_notes ?? profile.data?.critical_care_notes ?? ""}
                  onChange={(e) => set("critical_care_notes", e.target.value)}
                />
              </label>
              <button className="btn primary" onClick={saveProfile}>
                保存
              </button>
            </>
          )}
        </State>
      </div>

      <div className="card">
        <h2>数据删除请求</h2>
        <p className="muted">
          v0.1 只登记请求并审计；实际删除是高风险动作，需要显式人工确认后离线执行（不会自动删除）。
        </p>
        <label className="field">
          原因（可选）
          <input value={delReason} onChange={(e) => setDelReason(e.target.value)} />
        </label>
        <button className="btn danger" onClick={requestDeletion} disabled={!pid}>
          登记删除请求
        </button>
      </div>

      <div className="card">
        <h2>访问审计（谁看过/改过什么）</h2>
        <State state={audit.state} error={audit.error} onRetry={audit.reload} empty="暂无审计记录。">
          <ul className="tl">
            {audit.data?.slice(0, 30).map((a) => (
              <li key={a.id}>
                <div className="tl-head">
                  <span className="tl-type">{a.action}</span>
                  <span className="badge">{a.resource_type}</span>
                  <span className="muted">{a.actor_user_id?.slice(0, 8) ?? "anonymous"}</span>
                  <span className="tl-time">{fmtTime(a.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      </div>
    </main>
  );
}

// ---- account & security (Stage E real auth) ----

function AccountSecurityCard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Array<{ session_id: string; device_label: string; ip_address: string; created_at: string; revoked: boolean }> | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [delPw, setDelPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ email: string; display_name: string } | null>(null);

  useEffect(() => {
    const m = getUserMeta();
    if (m) setMeta(m);
    authApi
      .listSessions()
      .then((rows) => {
        setSessions(rows as Array<{ session_id: string; device_label: string; ip_address: string; created_at: string; revoked: boolean }>);
      })
      .catch(() => setSessions(null));
  }, []);

  async function doLogout() {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    clearSession();
    router.push("/login");
    router.refresh();
  }

  async function changePw() {
    setErr(null);
    setMsg(null);
    try {
      await authApi.changePassword(curPw, newPw);
      setMsg("密码已更新，其他设备已下线。");
      setCurPw("");
      setNewPw("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteAccount() {
    setErr(null);
    setMsg(null);
    if (!window.confirm("确定删除账号？此操作不可恢复。")) return;
    try {
      await authApi.deleteAccount(delPw);
      clearSession();
      router.push("/login");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card">
      <h2>账号与安全</h2>
      {meta && (
        <p className="muted">
          当前账号：{meta.display_name || meta.email}
          {meta.email ? `（${meta.email}）` : ""}
        </p>
      )}
      {msg && <div className="alert info">{msg}</div>}
      {err && <div className="alert emergency">{err}</div>}
      {sessionError && <div className="alert warn">{sessionError}</div>}

      <h3>登录设备</h3>
      {sessions === null ? (
        <p className="muted">（开发模式或无法读取会话）</p>
      ) : (
        <ul className="tl">
          {sessions.map((s) => (
            <li key={s.session_id}>
              <div className="tl-head">
                <span className="tl-type">{s.device_label || "未知设备"}</span>
                <span className="muted">{s.ip_address}</span>
                <span className={`badge ${s.revoked ? "status-COMPLETED" : "status-OPEN"}`}>
                  {s.revoked ? "已下线" : "在线"}
                </span>
                <span className="tl-time">{fmtTime(s.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3>修改密码</h3>
      <div className="grid2">
        <label className="field">
          当前密码
          <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
        </label>
        <label className="field">
          新密码
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </label>
      </div>
      <button className="btn primary" onClick={changePw} disabled={!curPw || !newPw}>
        更新密码
      </button>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={doLogout}>
          退出登录
        </button>
      </div>

      <h3>删除账号</h3>
      <p className="muted">删除会停用账号并使所有会话失效。高风险操作。</p>
      <label className="field">
        输入密码确认
        <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
      </label>
      <button className="btn danger" onClick={deleteAccount} disabled={!delPw}>
        删除账号
      </button>
    </div>
  );
}
