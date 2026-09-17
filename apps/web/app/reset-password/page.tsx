"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { authApi } from "@pli/api-client";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!token) return setError("缺少重置 token。");
    if (password.length < 8) return setError("密码至少 8 位。");
    if (password !== confirm) return setError("两次密码不一致。");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (done)
    return (
      <div className="card" style={{ width: 360, maxWidth: "100%" }}>
        <div className="alert info">密码已重置，请重新登录。</div>
        <Link href="/login" className="btn primary" style={{ display: "block", textAlign: "center" }}>
          去登录
        </Link>
      </div>
    );

  return (
    <div className="card" style={{ width: 360, maxWidth: "100%", textAlign: "left" }}>
      <label className="field">
        新密码
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" />
      </label>
      <label className="field">
        确认新密码
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入" />
      </label>
      {error && <div className="alert emergency">{error}</div>}
      <button className="btn primary" onClick={submit} disabled={!password || !confirm} style={{ width: "100%" }}>
        重置密码
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="page-center">
      <h1>重置密码</h1>
      <p className="sub">设置新的登录密码</p>
      {/* @ts-expect-error environmental mixed @types/react (web 19 vs older JSX ns): runtime identical */}
      <Suspense fallback={<div className="state loading">加载中……</div>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}