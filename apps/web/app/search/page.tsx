"use client";

import { useState } from "react";
import { api } from "@pli/api-client";
import { fmtTime, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";
import { eventTypeLabel, eventPayloadSummary } from "../../lib/ownerLabels";

interface SearchHit {
  event_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

interface AskResult {
  answer: string;
  citations: string[];
  sufficient: boolean;
  disclaimer: string;
}

/** v0.2 surface: Personal Pet Search / QA (PLI-190/197/198) — answers cite
 *  real events; no evidence means no answer. */
export default function SearchPage() {
  const { petId } = useCurrentPet();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [ask, setAsk] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSearch() {
    if (!petId || !q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.get<{ hits: SearchHit[] }>(
        `/pets/${petId}/search?q=${encodeURIComponent(q.trim())}`,
      );
      setHits(r.hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runAsk() {
    if (!petId || !q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<AskResult>(`/pets/${petId}/ask`, { question: q.trim() });
      setAsk(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede">
        <h1>记录搜索与个人问答</h1>
        <p className="sub">
          从它自己的真实记录里查找和回答；没有证据时就明确说没有找到。
        </p>
      </div>
      <section className="v5-form-surface">
        <div className="row">
          <input
            style={{ maxWidth: 420 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="如：猫砂盆 / 疫苗 / 散步"
          />
          <button className="btn" onClick={runSearch} disabled={busy || !petId}>
            搜索
          </button>
          <button className="btn primary" onClick={runAsk} disabled={busy || !petId}>
            问一问
          </button>
        </div>
        <ErrorNote message={error} />
      </section>

      {ask && (
        <section className="v5-utility-surface v5-utility-surface--soft">
          <h2>回答</h2>
          <p>{ask.answer}</p>
          {ask.citations.length > 0 && (
            <p className="muted">证据引用：{ask.citations.join(", ")}</p>
          )}
          <div className="notice-ai">{ask.disclaimer}</div>
        </section>
      )}

      <State state={hits === null ? "loading" : "ready"} empty={null}>
        {hits !== null && (
          <ul className="tl">
            {hits.length === 0 && <div className="state">没有匹配的真实记录（不生成历史）。</div>}
            {hits.map((h) => (
              <li key={h.event_id}>
                <div className="tl-head">
                  <span className="tl-type">{eventTypeLabel(h.event_type)}</span>
                  <span className="tl-time">{fmtTime(h.occurred_at)}</span>
                </div>
                <div className="tl-body">{eventPayloadSummary(h.payload) || "已记录事件"}</div>
              </li>
            ))}
          </ul>
        )}
      </State>
    </main>
  );
}
