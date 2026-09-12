"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setDevUserId, type Pet } from "@pli/api-client";
import { useCurrentPet } from "../../lib/hooks";


interface DemoUser {
  user_id: string;
  display_name: string;
  email: string;
}

/** Dev login: POST /auth/dev/login then pick a household user. In v0.1 the
 *  demo household members are listed from seeded pets' household members. */
export default function LoginPage() {
  const router = useRouter();
  const { choose } = useCurrentPet();
  const [email, setEmail] = useState("owner@pli.demo");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [already, setAlready] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ user_id: string }>("/auth/whoami")
      .then((w) => {
        setAlready(w.user_id);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<DemoUser>("/auth/dev/login", { email });
      setDevUserId(r.user_id);
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
    <main>
      <h1>登录（开发模式）</h1>
      <p className="sub">
        v0.1 使用开发认证（DEV_AUTH_ENABLED）。生产认证在 v0.2 计划中（PLI-217 部分）。
      </p>
      {checked && already && (
        <div className="alert info">
          已有会话（user {already.slice(0, 8)}…）。可直接使用顶部导航，或重新登录。
        </div>
      )}
      <div className="card">
        <h2>Demo 用户</h2>
        <p className="muted">
          种子数据提供三个账号：owner@pli.demo（Owner）、family@pli.demo（Family）、
          sitter@pli.demo（临时照护者，无默认权限）。
        </p>
        <label className="field">
          用户邮箱
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="row">
          <button className="btn primary" onClick={login} disabled={busy}>
            {busy ? "登录中…" : "登录"}
          </button>
          <span className="muted">
            或用快速按钮：
          </span>
          {["owner@pli.demo", "family@pli.demo", "sitter@pli.demo"].map((m) => (
            <button
              key={m}
              className="btn"
              disabled={busy}
              onClick={() => {
                setEmail(m);
                void login();
              }}
            >
              {m.split("@")[0]}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return <div className="alert emergency">{message}</div>;
}
