"use client";

import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import type { AuditRow } from "./types";

function actionLabel(action: string): string {
  const value = action.toLowerCase();
  if (value.includes("consent") || value.includes("grant") || value.includes("share")) return "授权变更";
  if (value.includes("feedback")) return "提交反馈";
  if (value.includes("delete")) return "删除相关操作";
  if (value.includes("create") || value.includes("add")) return "新增记录";
  if (value.includes("update") || value.includes("edit") || value.includes("patch")) return "更新记录";
  if (value.includes("view") || value.includes("read") || value.includes("list")) return "查看记录";
  if (value.includes("login")) return "账号登录";
  return "操作记录";
}

function resourceLabel(resourceType: string): string {
  const value = resourceType.toLowerCase();
  if (value.includes("visual")) return "3D 形象";
  if (value.includes("health")) return "健康记录";
  if (value.includes("consent") || value.includes("grant")) return "授权";
  if (value.includes("care")) return "照护协作";
  if (value.includes("device")) return "设备";
  if (value.includes("task")) return "任务";
  if (value.includes("event")) return "生活记录";
  if (value.includes("pet")) return "宠物档案";
  if (value.includes("feedback")) return "反馈";
  return "宠物数据";
}

interface AuditAndFeedbackSectionProps {
  audit: Async<AuditRow[]>;
  fbCat: string;
  onFbCatChange: (value: string) => void;
  fbMsg: string;
  onFbMsgChange: (value: string) => void;
  onSendFeedback: () => void;
  fbDone: boolean;
}

/** PLI-046 访问记录 + 试点反馈：owner language, no raw enum/id chrome. */
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
    <div className="v5-me-sections">
      <section className="v5-me-section">
        <h2>访问记录</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          查看最近谁对宠物数据执行过操作。这里使用用户语言，不展示内部资源编号或系统枚举。
        </p>
        <State state={audit.state} error={audit.error} onRetry={audit.reload} empty="暂无访问记录。">
          <ul className="tl">
            {audit.data?.slice(0, 30).map((a) => (
              <li key={a.id}>
                <div className="tl-head">
                  <span className="tl-type">{actionLabel(a.action)}</span>
                  <span className="badge">{resourceLabel(a.resource_type)}</span>
                  <span className="muted">{a.actor_user_id ? "已授权账号" : "系统"}</span>
                  <span className="tl-time">{fmtTime(a.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      </section>

      <section className="v5-me-section v5-me-section--soft">
        <h2>试点反馈</h2>
        <p className="muted">
          告诉我们哪里出错、难懂或缺少内容。安全与隐私问题会单独归类；请不要填写病历全文或联系方式。
        </p>
        <label className="field">
          类别
          <select value={fbCat} onChange={(e) => onFbCatChange(e.target.value)}>
            <option value="bug">出错</option>
            <option value="confusing">看不懂</option>
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
            placeholder="描述你遇到的问题或建议"
          />
        </label>
        <button className="btn primary" onClick={onSendFeedback} disabled={!fbMsg.trim()}>
          提交反馈
        </button>
        {fbDone && <div className="alert info">反馈已提交，感谢！</div>}
      </section>
    </div>
  );
}
