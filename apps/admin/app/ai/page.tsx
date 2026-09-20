"use client";

import Link from "next/link";
import { api } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/**
 * ADM-006 AI — ai-gateway 状态 / AI 输出审计（model / prompt / schema version）。
 * 网关状态来自 /ai/status（真实接口，区分 mock 与真实 provider）；
 * AI 输出审计的管理端查询接口尚未接入，渲染诚实状态。
 */
interface AiProviderStatus {
  provider: string;
  real: boolean;
  model?: string;
  base_url?: string;
  reason?: string;
}

export default function AiPage() {
  const ai = useAsync<AiProviderStatus>(() => api.get<AiProviderStatus>("/ai/status"), []);

  return (
    <main>
      <h1>AI 能力</h1>
      <p className="sub">ai-gateway 状态与 AI 输出审计（所有 AI 输出必须带 model / prompt / schema version）</p>

      <div className="card">
        <h2>AI 网关状态</h2>
        <State state={ai.state} error={ai.error} onRetry={ai.reload} empty="暂无网关状态">
          <div className="row">
            <span className={`badge ${ai.data?.real ? "on" : "off"}`}>
              {ai.data?.real ? "真实 provider" : "mock / 未接入真实厂商"}
            </span>
            <span className="mono">{ai.data?.provider ?? "—"}</span>
            {ai.data?.model && <span className="badge">模型：{ai.data.model}</span>}
          </div>
          {ai.data?.reason && <p className="muted">说明：{ai.data.reason}</p>}
          {ai.data?.base_url && <p className="muted mono">base_url：{ai.data.base_url}</p>}
          <p className="muted">AI 输出与原始观察严格分开；AI 摘要从不替代真实记录。</p>
        </State>
      </div>

      <div className="card">
        <h2>AI 输出审计</h2>
        <div className="state">
          能力未开放
          <br />
          <span className="muted">
            管理端的 AI 输出审计查询接口尚未接入，此页暂不展示数据（后端已记录 AI 推理日志，含 model / prompt / schema version）。
          </span>
        </div>
      </div>

      <div className="card">
        <h2>就诊摘要（专业向）</h2>
        <p className="muted">
          就诊摘要由 AI 整理并标注来源，属信息整理，不是兽医诊断。
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" href="/vet-briefs">
            打开就诊摘要查看
          </Link>
        </div>
      </div>
    </main>
  );
}
