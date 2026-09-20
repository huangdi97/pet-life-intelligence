"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  authApi,
  clearSession,
  getSessionMode,
  setDevUserId,
  setRealSession,
  type Pet,
} from "@pli/api-client";
import { useCurrentPet } from "../../lib/hooks";
import { mapActionError } from "../../lib/errors";

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

  async function selectPet() {
    const pets = await api.get<Pet[]>("/pets");
    if (pets.length) choose(pets[0].id);
  }

  async function realLogin() {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.login(email, password, "pro");
      setRealSession(r);
      await selectPet();
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(mapActionError(e));
    } finally {
      setBusy(false);
    }
  }

  async function devLogin(devEmail: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user_id: string; display_name: string; email: string }>(
        "/auth/dev/login",
        { email: devEmail },
      );
      setDevUserId(r.user_id);
      await selectPet();
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(mapActionError(e));
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
      <h1>登录</h1>
      <p className="sub">宠物生活智能 · 专业工作台（兽医 / 训导师 / 上门服务）</p>

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
          {error && <div className="alert warn">{error}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={realLogin} disabled={busy || !email || !password}>
              {busy ? "登录中…" : "登录"}
            </button>
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

      {mode === "dev" && (
        <div className="card" style={{ width: 360, maxWidth: "100%" }}>
          <p>已登录（开发模式）。</p>
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
            <p className="muted">仅限本地 / 测试 / 演示环境（DEV_AUTH_ENABLED）。与 Owner 端相同的开发账号，跨 web / pro 通用。</p>
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
