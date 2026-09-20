"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getSessionMode, type Pet } from "@pli/api-client";
import { fmtDate, useAsync, useProRole, type ProRole } from "../lib/hooks";
import { mapErrorMessage } from "../lib/errors";
import { State } from "../components/ui";

const ROLE_LABELS: Record<ProRole, string> = {
  vet: "兽医 Vet",
  trainer: "训导师 Trainer",
  service: "上门服务 Service",
};

const ROLE_HINTS: Record<ProRole, string> = {
  vet: "兽医视角：患者健康概览、就诊摘要 Vet Brief 与结局记录。",
  trainer: "训导师视角：行为 ABC 观察与训练目标进度。",
  service: "上门服务视角：照护交接执行与任务清单。",
};

const ROLE_EMPTY: Record<ProRole, string> = {
  vet: "暂无被授权的患者。如需访问，请联系宠物主人授权。",
  trainer: "暂无被授权的训练对象。如需访问，请联系宠物主人授权。",
  service: "暂无被授权的照护对象。如需访问，请联系宠物主人授权。",
};

/** PRO-001 Assigned Pets：被授权患者列表 + 角色切换（Vet/Trainer/Service，过滤导航入口）。 */
export default function AssignedPetsPage() {
  const { role, choose } = useProRole();
  const [mode, setMode] = useState<string>("none");
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const who = useAsync<{ user_id: string; display_name: string; email: string }>(
    () => api.get<{ user_id: string; display_name: string; email: string }>("/auth/whoami"),
    [],
  );

  useEffect(() => {
    setMode(getSessionMode());
  }, []);

  return (
    <main>
      <h1>专业工作台</h1>
      <p className="sub">患者列表 · Assigned Pets — 兽医 / 训导师 / 上门服务共用入口</p>
      {who.state === "ready" && who.data && (
        <p className="muted" style={{ marginTop: -8 }}>
          当前专业用户：{who.data.display_name}（{who.data.email}）
        </p>
      )}

      <div className="role-chips" role="group" aria-label="切换角色视图" style={{ marginBottom: 8 }}>
        {(Object.keys(ROLE_LABELS) as ProRole[]).map((r) => (
          <button
            key={r}
            className={`chip${role === r ? " active" : ""}`}
            onClick={() => choose(r)}
            aria-pressed={role === r}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <p className="muted">{ROLE_HINTS[role]}</p>

      {mode === "none" && (
        <div className="card">
          <h2>未登录</h2>
          <p className="muted">登录后查看被授权的患者。</p>
          <Link href="/login" className="btn primary">
            前往登录
          </Link>
        </div>
      )}

      {mode !== "none" && (
        <State
          state={pets.state}
          error={pets.error ? mapErrorMessage(pets.error) : null}
          onRetry={pets.reload}
          empty={ROLE_EMPTY[role]}
        >
          <div className="grid2">
            {(pets.data ?? []).map((p) => (
              <div className="card" key={p.id}>
                <h2>{p.name}</h2>
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge">{p.species}</span>
                  {p.breed && <span className="badge">{p.breed}</span>}
                  <span className="badge">性别：{p.sex}</span>
                  <span className="badge">绝育：{p.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
                </div>
                <p className="muted" style={{ margin: "8px 0" }}>
                  {p.birth_date ? `出生：${fmtDate(p.birth_date)}` : "出生日期未填写"}
                </p>
                <Link href={`/pets/${p.id}`} className="btn primary">
                  查看档案 · Pet Brief
                </Link>
              </div>
            ))}
          </div>
        </State>
      )}
    </main>
  );
}
