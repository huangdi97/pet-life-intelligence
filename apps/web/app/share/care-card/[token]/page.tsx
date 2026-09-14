"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@pli/api-client";

interface CareCardContent {
  pet_name: string;
  pet_species?: string;
  pet_breed?: string;
  generated_at?: string;
  [key: string]: unknown;
}

export default function ShareCareCardPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [state, setState] = useState<"loading" | "ready" | "error" | "expired">("loading");
  const [content, setContent] = useState<CareCardContent | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ card_id: string; content: CareCardContent }>(`/care-card/${token}`)
      .then((r) => {
        setContent(r.content);
        setState("ready");
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) setState("expired");
        else setState("error");
      });
  }, [token]);

  return (
    <main className="share-page">
      <header className="share-head">
        <img src="/icons/icon-192.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
        <div>
          <div className="share-title">照护卡 · Care Card</div>
          <div className="share-sub">宠物生活智能 · 临时照护交接信息</div>
        </div>
      </header>

      {state === "loading" && <div className="state loading"><span className="spinner" />加载中……</div>}
      {state === "expired" && (
        <div className="state">
          此照护卡链接已过期或已被撤销。
          <p className="muted">如需获取，请联系宠物主人重新生成。</p>
        </div>
      )}
      {state === "error" && <div className="state error">暂时无法读取此照护卡，请稍后重试。</div>}

      {state === "ready" && content && (
        <article>
          <section className="card">
            <h2>{content.pet_name ?? "宠物"}</h2>
            {(content.pet_species || content.pet_breed) && (
              <p className="muted">
                {content.pet_species === "dog" ? "狗" : content.pet_species === "cat" ? "猫" : content.pet_species}
                {content.pet_breed ? ` · ${content.pet_breed}` : ""}
              </p>
            )}
          </section>
          {Object.entries(content)
            .filter(([k]) => !["pet_name", "pet_species", "pet_breed", "generated_at"].includes(k))
            .map(([k, v]) => (
              <section className="card" key={k}>
                <h3>{k}</h3>
                <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                </p>
              </section>
            ))}
          <p className="notice-ai" style={{ margin: "0 0 12px" }}>
            本照护卡为信息整理；特殊健康状况请以兽医意见为准。
          </p>
        </article>
      )}

      <footer className="share-foot">本页面为受控临时分享 · 访问已记录 · 宠物生活智能</footer>
    </main>
  );
}