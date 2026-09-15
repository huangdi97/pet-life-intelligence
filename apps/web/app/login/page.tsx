"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setRealSession, setDevUserId, clearSession, getSessionMode, type Pet } from "@pli/api-client";
import { api } from "@pli/api-client";
import { useCurrentPet } from "../../lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { choose } = useCurrentPet();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("none");
  const [showDev, setShowDev] = useState(false);

  useEffect(() => {
    setMode(getSessionMode());
  }, []);

  async function selectPet(userId: string) {
    const pets = await api.get<Pet[]>("/pets");
    if (pets.length) choose(pets[0].id);
    void userId;
  }

  async function realLogin() {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.login(email, password, "web");
      setRealSession(r);
      await selectPet(r.user_id);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function devLogin(devEmail: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user_id: string }>("/auth/dev/login", { email: devEmail });
      setDevUserId(r.user_id);
      await selectPet(r.user_id);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    setMode("none");
  }

  return (
    <main className="page-center">
      <img src="/icons/icon-192.png" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
      <h1>登录</h1>
      <p className="sub">宠物生活智能 · 全生命周期记录与健康照护</p>

      {mode === "none" && (
        <div className="card" style={{ width: 360, maxWidth: "100%", textAlign: "left" }}>
          <label className="field">
            邮箱
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            密码
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <div className="alert emergency">{error}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={realLogin} disabled={busy || !email || !password}>
              {busy ? "登录中…" : "登录"}
            </button>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link href="/register" className="btn">
              注册新账号
            </Link>
            <Link href="/forgot-password" className="muted" style={{ marginLeft: "auto" }}>
              忘记密码？
            </Link>
          </div>
        </div>
      )}

      {mode === "real" && (
        <div className="card" style={{ width: 360, maxWidth: "100%" }}>
          <p>已登录（真实账号）。</p>
          <div className="row">
            <Link href="/" className="btn primary">进入</Link>
            <button className="btn" onClick={logout}>退出登录</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button className="btn" onClick={() => setShowDev((s) => !s)}>
          {showDev ? "收起" : "开发模式登录"}
        </button>
        {showDev && (
          <div className="card" style={{ width: 360, maxWidth: "100%", textAlign: "left", marginTop: 12 }}>
            <p className="muted">仅限本地 / 测试 / 演示环境（DEV_AUTH_ENABLED）。</p>
            {["owner@pli.demo", "family@pli.demo", "sitter@pli.demo"].map((m) => (
              <button key={m} className="btn" style={{ margin: 4 }} onClick={() => devLogin(m)} disabled={busy}>
                {m.split("@")[0]}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}