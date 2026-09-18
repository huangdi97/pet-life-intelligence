"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setRealSession, type Pet } from "@pli/api-client";
import { api } from "@pli/api-client";
import { useCurrentPet } from "../../lib/hooks";

export default function RegisterPage() {
  const router = useRouter();
  const { choose } = useCurrentPet();
  const [form, setForm] = useState({ display_name: "", email: "", password: "", confirm: "", invite_code: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!form.display_name.trim()) return setError("请填写昵称。");
    if (form.password.length < 8) return setError("密码至少 8 位。");
    if (form.password !== form.confirm) return setError("两次密码不一致。");
    setBusy(true);
    try {
      const r = await authApi.register(
        form.email.trim(),
        form.password,
        form.display_name.trim(),
        form.invite_code,
      );
      if (r.verification_token) {
        // dev/console delivery: auto-verify so pilot users can proceed
        await authApi.verifyEmail(r.verification_token);
      }
      const login = await authApi.login(form.email.trim(), form.password, "web");
      setRealSession(login);
      const pets = await api.get<Pet[]>("/pets");
      if (pets.length) choose(pets[0].id);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-center">
      <img src="/icons/icon-192.png" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
      <h1>注册</h1>
      <p className="sub">创建账号，开始记录宠物生活</p>

      <div className="card" style={{ width: 360, maxWidth: "100%", textAlign: "left" }}>
        <label className="field">
          昵称
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="如：小明" />
        </label>
        <label className="field">
          邮箱
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </label>
        <label className="field">
          密码
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="至少 8 位" />
        </label>
        <label className="field">
          确认密码
          <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="再次输入密码" />
        </label>
        <label className="field">
          邀请码（试点邀请制填写，选填）
          <input
            value={form.invite_code}
            onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
            placeholder="如：AB12CD34EF（机构/个人邀请码）"
            autoCapitalize="characters"
          />
        </label>
        {error && <div className="alert emergency">{error}</div>}
        {verifyToken && <div className="alert info">验证 token：{verifyToken}</div>}
        <button className="btn primary" onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 12 }}>
          {busy ? "注册中…" : "注册"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          注册即表示同意 <Link href="/privacy">隐私说明</Link> 与 <Link href="/terms">服务条款</Link>。
        </p>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Link href="/login" className="muted">已有账号？去登录</Link>
        </div>
      </div>
    </main>
  );
}