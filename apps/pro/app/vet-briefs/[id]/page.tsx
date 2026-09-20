"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type HealthEventDetail, type Pet } from "@pli/api-client";
import { fmtDate, fmtTime, useAsync } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/errors";
import { ProvenanceBadge, State, TriageBadge } from "../../../components/ui";

const NO_HE = "NO_HEALTH_EVENT_SELECTED";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

/** PRO-003 就诊摘要视图（Vet Brief）：
 *  API 限制——没有按 brief id 读取内容的已认证端点（/vet-briefs/shared/{token} 需要一次性
 *  分享 token），因此 [id] 为健康事件 id，页面用 GET /health-events/{id} + /pets/{pet_id}
 *  渲染摘要分区：Identity / 主诉 / 起病 / 趋势 / 相关时间线 / 证据 / 用药 / 病史 / 风险 /
 *  来源与溯源。「本摘要为信息整理，不是兽医诊断」声明始终可见（非仅打印）。 */
/** 相关时间线：起病 + 观察记录时间点（来自健康事件详情，真实数据，不虚构）。 */
function relevantTimes(d: HealthEventDetail): Array<{ label: string; at: string }> {
  const out: Array<{ label: string; at: string }> = [];
  if (d.onset_at) out.push({ label: "起病 Onset", at: d.onset_at });
  for (const o of d.observations.slice(0, 12)) {
    out.push({ label: o.kind === "AI_OBSERVATION" ? "AI 观察" : "观察记录", at: o.created_at });
  }
  return out;
}
export default function VetBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const detail = useAsync<HealthEventDetail>(
    () =>
      id
        ? api.get<HealthEventDetail>(`/health-events/${id}`)
        : Promise.reject(new Error(NO_HE)),
    [id],
  );
  const pet = useAsync<Pet | null>(
    () =>
      detail.data
        ? api.get<Pet>(`/pets/${detail.data.pet_id}`)
        : Promise.resolve(null),
    [detail.data],
  );

  if (detail.state === "denied") {
    return (
      <main>
        <h1>就诊摘要 · Vet Brief</h1>
        <div className="brief-disclaimer">本摘要为信息整理，不是兽医诊断；分级建议来自独立规则引擎。</div>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const d = detail.data;
  const p = pet.data;
  const heId = d?.health_event_id ?? id ?? "";

  return (
    <main>
      <header className="brief-head">
        <div className="brief-title">就诊摘要 · Vet Brief</div>
        <div className="muted">由宠物生活智能整理 · 生成给专业用户查看</div>
      </header>

      {/* 免责声明：始终可见（屏幕 + 打印） */}
      <div className="brief-disclaimer" role="note">
        本摘要为信息整理，不是兽医诊断；风险分级建议来自独立 Red Flag Rule Engine。
      </div>

      <div className="row no-print" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={() => window.print()}>
          打印 / 导出 PDF
        </button>
        {heId && (
          <Link href={`/pets/${d?.pet_id ?? ""}/timeline`} className="btn">
            查看完整时间线
          </Link>
        )}
        <Link href="/vet-briefs" className="btn">
          返回列表
        </Link>
      </div>

      <State
        state={detail.state}
        error={detail.error ? mapErrorMessage(detail.error) : null}
        onRetry={detail.reload}
        empty="暂无健康事件详情。"
      >
        {d && (
          <>
            <div className="card">
              <h2>宠物身份 · Pet Identity</h2>
              <State
                state={pet.state}
                error={pet.error ? mapErrorMessage(pet.error) : null}
                onRetry={pet.reload}
                empty="暂无患者信息。"
              >
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge">名字：{p?.name ?? "—"}</span>
                  <span className="badge">种类：{p?.species ?? "—"}</span>
                  <span className="badge">品种：{p?.breed || "—"}</span>
                  <span className="badge">性别：{p?.sex ?? "—"}</span>
                  <span className="badge">出生：{p?.birth_date ? fmtDate(p.birth_date) : "—"}</span>
                  <span className="badge">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
                </div>
              </State>
            </div>

            <div className="card">
              <h2>主诉 · Chief Complaint</h2>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.chief_complaint || "—"}</p>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <span className={`badge status-${d.status}`}>状态：{STATUS_LABELS[d.status] ?? d.status}</span>
                {d.onset_at && <span className="badge">起病时间：{fmtTime(d.onset_at)}</span>}
              </div>
            </div>

            <div className="card">
              <h2>起病 · Onset</h2>
              {d.onset_at ? (
                <p className="muted" style={{ margin: 0 }}>起病于 {fmtTime(d.onset_at)}。</p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>暂未记录起病时间。</p>
              )}
            </div>

            <div className="card">
              <h2>趋势 · Trend</h2>
              {d.outcomes.length > 0 ? (
                <table className="pli-table">
                  <thead>
                    <tr>
                      <th>结局</th>
                      <th>备注</th>
                      <th>记录时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.outcomes.map((o, i) => (
                      <tr key={`${o.recorded_at}-${i}`}>
                        <td><span className={`badge status-${o.outcome}`}>{o.outcome}</span></td>
                        <td>{o.notes || "—"}</td>
                        <td>{fmtTime(o.recorded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted" style={{ margin: 0 }}>暂无结局记录；趋势需多次观察/结局后才有意义。</p>
              )}
            </div>

            <div className="card">
              <h2>相关时间线 · Relevant Timeline</h2>
              <ul className="tl">
                {d.onset_at && (
                  <li>
                    <div className="tl-head">
                      <span className="tl-type">起病</span>
                      <span className="tl-time">{fmtTime(d.onset_at)}</span>
                    </div>
                  </li>
                )}
                {relevantTimes(d).map((t) => (
                  <li key={`${t.label}-${t.at}`}>
                    <div className="tl-head">
                      <span className="tl-type">{t.label}</span>
                      <span className="tl-time">{fmtTime(t.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {d.pet_id && (
                <div className="row no-print" style={{ marginTop: 8 }}>
                  <Link href={`/pets/${d.pet_id}/timeline`} className="btn">
                    打开完整时间线
                  </Link>
                </div>
              )}
            </div>

            <div className="card">
              <h2>证据 · Evidence</h2>
              {d.observations.length > 0 ? (
                <table className="pli-table">
                  <thead>
                    <tr>
                      <th>来源类型</th>
                      <th>观察</th>
                      <th>记录时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.observations.map((o) => (
                      <tr key={o.id}>
                        <td><ProvenanceBadge level={o.kind === "AI_OBSERVATION" ? "AI_DERIVED" : o.kind === "OWNER_STATEMENT" ? "OWNER_REPORTED" : o.kind} /></td>
                        <td>{o.text}</td>
                        <td>{fmtTime(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted" style={{ margin: 0 }}>暂无观察证据。</p>
              )}
            </div>

            <div className="card">
              <h2>用药 · Medication</h2>
              {d.current_meds_text ? (
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.current_meds_text}</p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>暂无在用药物记录。</p>
              )}
            </div>

            <div className="card">
              <h2>病史 · History</h2>
              {d.relevant_history_text ? (
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.relevant_history_text}</p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>暂无相关病史记录。</p>
              )}
            </div>

            <div className="card">
              <h2>风险 · Risk（来自独立规则引擎，非本页判断）</h2>
              <div className="row" style={{ gap: 6 }}>
                <TriageBadge level={d.latest_triage_level} />
              </div>
              {d.triage_history.length > 0 ? (
                <table className="pli-table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>分级</th>
                      <th>引擎</th>
                      <th>版本</th>
                      <th>命中规则</th>
                      <th>评估时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.triage_history.map((t) => (
                      <tr key={t.id}>
                        <td><span className={`badge ${t.level}`}>{t.level}</span></td>
                        <td><span className="badge">{t.engine}</span></td>
                        <td>{t.version || "—"}</td>
                        <td>{t.matched_rules.length ? t.matched_rules.join("、") : "—"}</td>
                        <td>{fmtTime(t.assessed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>暂无分级评估记录。</p>
              )}
              <p className="notice-ai">分级建议由独立规则引擎产生；未触发红旗规则时本页仅显示事实记录，不作健康结论。</p>
            </div>

            <div className="card">
              <h2>来源与溯源 · Source & Provenance</h2>
              <table className="pli-table">
                <tbody>
                  <tr>
                    <th>健康事件 ID</th>
                    <td>{d.health_event_id}</td>
                  </tr>
                  <tr>
                    <th>事件状态</th>
                    <td><span className={`badge status-${d.status}`}>{STATUS_LABELS[d.status] ?? d.status}</span></td>
                  </tr>
                  <tr>
                    <th>主人备注</th>
                    <td>{d.owner_notes || "—"}</td>
                  </tr>
                  <tr>
                    <th>已生成 Vet Brief</th>
                    <td>
                      {d.vet_briefs.length > 0 ? (
                        <span className="badge">{d.vet_briefs.length} 份（{d.vet_briefs.join("、")}）</span>
                      ) : (
                        <span className="muted">暂无（生成入口在健康全流程，web 端）</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>分级引擎</th>
                    <td>{d.triage_history.length ? `${d.triage_history[d.triage_history.length - 1].engine}${d.triage_history[d.triage_history.length - 1].version ? ` · ${d.triage_history[d.triage_history.length - 1].version}` : ""}` : "—"}</td>
                  </tr>
                </tbody>
              </table>
              <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                所有记录带 pet / actor / time / source；AI 输出与真实记录在时间线中视觉区分。
              </p>
            </div>
          </>
        )}
      </State>
    </main>
  );
}
