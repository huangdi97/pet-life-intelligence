"use client";

import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import type { AuditRow } from "./types";

interface AuditAndFeedbackSectionProps {
  audit: Async<AuditRow[]>;
  fbCat: string;
  onFbCatChange: (value: string) => void;
  fbMsg: string;
  onFbMsgChange: (value: string) => void;
  onSendFeedback: () => void;
  fbDone: boolean;
}

/** PLI-046 访问审计 + 试点反馈（Stage G）。保留原始卡片嵌套结构。 */
export function AuditAndFeedbackSection({
  audit,
  fbCat,
  onFbCatChange,
  fbMsg,
  onFbMsgChange,
  onSendFeedback,
  fbDone,
}: AuditAndFeedbackSectionProps) {
  return (
    <div className="card">
      <h2>访问审计（谁看过/改过什么）</h2>
      <State state={audit.state} error={audit.error} onRetry={audit.reload} empty="暂无审计记录。">
        <ul className="tl">
          {audit.data?.slice(0, 30).map((a) => (
            <li key={a.id}>
              <div className="tl-head">
                <span className="tl-type">{a.action}</span>
                <span className="badge">{a.resource_type}</span>
                <span className="muted">{a.actor_user_id?.slice(0, 8) ?? "anonymous"}</span>
                <span className="tl-time">{fmtTime(a.occurred_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </State>
      <div className="card">
        <h2>试点反馈</h2>
        <p className="muted">
          反馈用于改进试点（Stage G）。安全 / 隐私问题请选对应类别，我们会优先处理。
        </p>
        <label className="field">
          类别
          <select value={fbCat} onChange={(e) => onFbCatChange(e.target.value)}>
            <option value="bug">Bug / 出错</option>
            <option value="confusing">困惑 / 看不懂</option>
            <option value="slow">慢 / 卡顿</option>
            <option value="missing">缺少内容</option>
            <option value="unnecessary">多余 / 没必要</option>
            <option value="safety">安全担忧</option>
            <option value="privacy">隐私担忧</option>
            <option value="feature_request">功能建议</option>
            <option value="health_concern">健康担忧</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label className="field">
          内容
          <textarea
            rows={3}
            value={fbMsg}
            onChange={(e) => onFbMsgChange(e.target.value)}
            placeholder="请描述你遇到的问题或建议（不填写病历全文 / 联系方式）。"
          />
        </label>
        <button className="btn" onClick={onSendFeedback} disabled={!fbMsg.trim()}>
          提交反馈
        </button>
        {fbDone && <div className="alert info">反馈已提交，感谢！</div>}
      </div>
    </div>
  );
}
