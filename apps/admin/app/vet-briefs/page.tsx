"use client";

import { useState } from "react";
import { api, ApiError } from "@pli/api-client";

interface ShareContent {
  pet?: { name: string; species: string; breed: string };
  chief_complaint?: string;
  red_flags?: string[];
  active_medications?: Array<{ medicine_name: string; dose_text: string }>;
  ai_narrative_draft?: string;
  notice?: string;
}

export default function VetBriefsPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "expired">("idle");
  const [content, setContent] = useState<ShareContent | null>(null);

  async function open() {
    if (!token.trim()) return;
    setState("loading");
    try {
      const r = await api.get<{ content: ShareContent }>(`/vet-briefs/shared/${token.trim()}`);
      setContent(r.content);
      setState("ready");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) setState("expired");
      else setState("error");
    }
  }

  return (
    <main>
      <h1>就诊摘要查看</h1>
      <p className="sub">专业端：通过主人分享的受控链接打开就诊摘要（信息整理，非兽医诊断）</p>

      <div className="card">
        <div className="row">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="粘贴分享 token，如 ckNb2V…"
            style={{ flex: 1, minWidth: 240, padding: "9px 10px", borderRadius: 10, border: "1px solid #e8e2d9" }}
          />
          <button className="btn primary" onClick={open} disabled={state === "loading" || !token.trim()}>
            {state === "loading" ? "加载中…" : "打开"}
          </button>
        </div>
      </div>

      {state === "idle" && (
        <div className="card">
          <h2>使用说明</h2>
          <p className="muted">
            主人可从 Web / 小程序生成就诊摘要分享链接，将 token 提供给兽医。
            专业端无需部署整套 PLI；所有访问都会被记录与审计。
          </p>
        </div>
      )}
      {state === "expired" && <div className="state">此分享链接已过期或已被撤销。</div>}
      {state === "error" && <div className="state error">暂时无法读取，请检查 token。</div>}

      {state === "ready" && content && (
        <div className="card">
          <h2>{content.pet?.name ?? "宠物"} 就诊摘要</h2>
          <p className="muted">
            {content.pet?.species ?? ""}
            {content.pet?.breed ? ` · ${content.pet.breed}` : ""}
          </p>
          {content.chief_complaint && <p>主诉：{content.chief_complaint}</p>}
          {content.red_flags?.length ? (
            <p>
              风险：{content.red_flags.map((r) => <span key={r} className="badge">{r}</span>)}
            </p>
          ) : null}
          {content.active_medications?.length ? (
            <div>
              <h3 style={{ fontSize: 14 }}>当前用药</h3>
              <ul>
                {content.active_medications.map((m) => (
                  <li key={m.medicine_name}>
                    {m.medicine_name} · {m.dose_text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {content.ai_narrative_draft && (
            <div>
              <h3 style={{ fontSize: 14 }}>病情叙述（AI 草稿）</h3>
              <p>{content.ai_narrative_draft}</p>
            </div>
          )}
          <p className="muted">{content.notice ?? "本摘要为信息整理，不是兽医诊断。"}</p>
        </div>
      )}
    </main>
  );
}