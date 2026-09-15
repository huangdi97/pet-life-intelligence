"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@pli/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [token, setToken] = useState<string | null>(null);

  async function submit() {
    try {
      const r = await authApi.forgotPassword(email.trim());
      setState("sent");
      setToken((r as { reset_token?: string }).reset_token ?? null);
    } catch {
      setState("error");
    }
  }

  return (
    <main className="page-center">
      <h1>忘记密码</h1>
      <p className="sub">我们会向您的邮箱发送重置链接</p>
      <div className="card" style={{ width: 360, maxWidth: "100%", textAlign: "left" }}>
        {state === "idle" && (
          <>
            <label className="field">
              邮箱
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button className="btn primary" onClick={submit} disabled={!email.trim()} style={{ width: "100%" }}>
              发送重置链接
            </button>
          </>
        )}
        {state === "sent" && (
          <>
            <div className="alert info">重置链接已生成并发送（开发环境在下方显示 token）。</div>
            {token && (
              <p className="muted" style={{ wordBreak: "break-all" }}>
                token: {token}
              </p>
            )}
            <Link href={`/reset-password?token=${encodeURIComponent(token ?? "")}`} className="btn primary" style={{ display: "block", textAlign: "center" }}>
              前往重置
            </Link>
          </>
        )}
        {state === "error" && <div className="alert emergency">发送失败，请稍后重试。</div>}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link href="/login" className="muted">返回登录</Link>
        </div>
      </div>
    </main>
  );
}