"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@pli/api-client";
import type { ShareContent } from "./types";

export default function ShareVetBriefPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [state, setState] = useState<"loading" | "ready" | "error" | "expired">("loading");
  const [content, setContent] = useState<ShareContent | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ vet_brief_id: string; content: ShareContent }>(`/vet-briefs/shared/${token}`)
      .then((r) => {
        setContent(r.content);
        setState("ready");
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) setState("expired");
        else setState("error");
      });
  }, [token]);

  const pet = content?.pet;

  return (
    <main className="share-page">
      <header className="share-head">
        <img src="/icons/icon-192.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
        <div>
          <div className="share-title">就诊摘要 · Vet Brief</div>
          <div className="share-sub">
            由宠物生活智能生成 · 信息整理，不是兽医诊断
          </div>
        </div>
      </header>

      {state === "loading" && <div className="state loading"><span className="spinner" />加载中……</div>}
      {state === "expired" && (
        <div className="state">
          此分享链接已过期或已被撤销。
          <p className="muted">如需获取，请联系宠物主人重新生成。</p>
        </div>
      )}
      {state === "error" && (
        <div className="state error">暂时无法读取此分享内容，请稍后重试。</div>
      )}

      {state === "ready" && content && (
        <article>
          {pet && (
            <section className="card">
              <h2>宠物基本信息</h2>
              <div className="row">
                <img src="/default-pet-avatar.png" alt="" width={44} height={44} style={{ borderRadius: 10 }} />
                <div>
                  <strong>{pet.name}</strong>
                  <span className="muted">
                    {" "}
                    {pet.species === "dog" ? "狗" : pet.species === "cat" ? "猫" : pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                    {pet.sex ? ` · ${pet.sex === "FEMALE" ? "雌性" : pet.sex === "MALE" ? "雄性" : "未知"}` : ""}
                    {pet.birth_date ? ` · 出生 ${pet.birth_date}` : ""}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="card">
            <h2>主诉</h2>
            <p>{content.chief_complaint}</p>
            <p className="muted">
              {content.onset_at ? `出现时间：${new Date(content.onset_at).toLocaleString("zh-CN")}` : ""}
              {content.duration_text ? ` · 持续：${content.duration_text}` : ""}
            </p>
            <div className="grid2">
              <div><span className="muted">食欲</span><br />{content.eating}</div>
              <div><span className="muted">饮水</span><br />{content.drinking}</div>
              <div><span className="muted">排泄</span><br />{content.elimination}</div>
              <div><span className="muted">活动</span><br />{content.activity}</div>
            </div>
          </section>

          {content.red_flags?.length ? (
            <section className="card alert warn" style={{ margin: 12, border: "1px solid #ecd9a8" }}>
              <h2 style={{ color: "var(--pli-semantic-vet_soon, #c07a2d)" }}>风险状态</h2>
              {content.red_flags.map((lvl, i) => (
                <span key={i} className={`badge ${lvl}`}>{lvl}</span>
              ))}
              <p className="muted" style={{ marginTop: 8 }}>风险分级来自独立规则引擎，非 AI 判断。</p>
            </section>
          ) : null}

          {content.key_findings?.length ? (
            <section className="card">
              <h2>关键观察</h2>
              <ul className="tl">
                {content.key_findings.map((f, i) => (
                  <li key={i}>
                    <div className="tl-head">
                      <span className="tl-type">{f.kind}</span>
                      <span className="tl-time">
                        {f.observed_at ? new Date(f.observed_at).toLocaleString("zh-CN") : ""}
                      </span>
                    </div>
                    <div className="tl-body">{f.text}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.active_medications?.length ? (
            <section className="card">
              <h2>当前用药</h2>
              <ul className="tl">
                {content.active_medications.map((m, i) => (
                  <li key={i}>
                    <strong>{m.medicine_name}</strong> · {m.dose_text} · {m.frequency_text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.relevant_history_text ? (
            <section className="card">
              <h2>既往史</h2>
              <p>{content.relevant_history_text}</p>
            </section>
          ) : null}

          {content.owner_notes ? (
            <section className="card">
              <h2>主人备注</h2>
              <p>{content.owner_notes}</p>
            </section>
          ) : null}

          {content.ai_narrative_draft ? (
            <section className="card">
              <h2>病情叙述（AI 草稿）</h2>
              <p>{content.ai_narrative_draft}</p>
              <div className="notice-ai">{content.ai_disclaimer ?? "AI 生成内容，仅供整理参考。"}</div>
            </section>
          ) : null}

          {content.triage_history?.length ? (
            <section className="card">
              <h2>分级记录</h2>
              <ul className="tl">
                {content.triage_history.map((t, i) => (
                  <li key={i}>
                    <span className={`badge ${t.level}`}>{t.level}</span>
                    <span className="muted" style={{ marginLeft: 8 }}>
                      {t.engine} · v{t.version} · {t.assessed_at ? new Date(t.assessed_at).toLocaleString("zh-CN") : ""}
                    </span>
                    {t.matched_rules?.length ? <div className="muted" style={{ marginTop: 4 }}>匹配规则：{t.matched_rules.join(", ")}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card" style={{ background: "var(--pli-bg-surface_muted, #f3f0eb)" }}>
            <h3>来源与生成信息</h3>
            <p className="muted">
              生成时间：{content.generated_at ? new Date(content.generated_at).toLocaleString("zh-CN") : ""}
              <br />
              规则引擎：{content.engine_versions?.rule_engine || ""} · AI：{content.engine_versions?.ai_model || ""} · 提示词版本：{content.engine_versions?.ai_gateway_prompt || ""}
            </p>
            <p className="notice-ai">{content.notice}</p>
          </section>
        </article>
      )}

      <footer className="share-foot">
        本页面为受控临时分享 · 访问已记录 · 宠物生活智能
      </footer>
    </main>
  );
}