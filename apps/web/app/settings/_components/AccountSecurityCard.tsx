"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, clearSession, getRefreshToken, getUserMeta } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";

// ---- account & security (Stage E real auth) ----

export function AccountSecurityCard() {
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
