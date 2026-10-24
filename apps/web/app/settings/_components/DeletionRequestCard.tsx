"use client";

export interface DeletionRequestRow {
  request_id: string;
  status: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
}

interface DeletionRequestCardProps {
  pid: string | undefined;
  value: string;
  rows: DeletionRequestRow[];
  state: "idle" | "loading" | "ready" | "error" | "denied";
  onValueChange: (value: string) => void;
  onRequest: () => void;
}

function statusLabel(status: string): string {
  if (status === "PENDING") return "等待人工确认";
  if (status === "COMPLETED" || status === "RESOLVED") return "已处理";
  if (status === "REJECTED") return "未执行";
  if (status === "CANCELLED") return "已取消";
  return "状态已记录";
}

/** PLI-216 数据删除请求：只登记请求并审计，实际删除需人工确认后离线执行。 */
export function DeletionRequestCard({
  pid,
  value,
  rows,
  state,
  onValueChange,
  onRequest,
}: DeletionRequestCardProps) {
  const pending = rows.find((row) => row.status === "PENDING") ?? null;
  return (
    <section className="v5-me-section">
      <h2>数据删除请求</h2>
      <p className="muted">
        提交后会先登记请求并保留审计记录；数据不会立即自动删除，需要再次确认后才会处理。
      </p>

      {state === "loading" ? <p className="muted">正在读取删除请求状态…</p> : null}
      {state === "error" ? (
        <p className="muted">删除请求状态暂时没有加载成功；不会因此假定“没有待处理请求”。</p>
      ) : state === "denied" ? (
        <p className="muted">当前账号没有查看或提交宠物数据删除请求的权限。</p>
      ) : null}
      {pending ? (
        <div className="v4-note" data-testid="pli.me.data.deletion-pending">
          当前已有一条删除请求等待人工确认（{new Date(pending.created_at).toLocaleString()}）。
          {pending.reason ? <> 原因：{pending.reason}</> : null}
        </div>
      ) : null}
      {rows.length ? (
        <div style={{ marginTop: 10 }}>
          <div className="muted">最近请求</div>
          {rows.slice(0, 3).map((row) => (
            <div className="row" key={row.request_id} style={{ marginTop: 4 }}>
              <span>{statusLabel(row.status)}</span>
              <span className="muted">{new Date(row.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : null}

      <label className="field">
        原因（可选）
        <input value={value} onChange={(e) => onValueChange(e.target.value)} disabled={Boolean(pending)} />
      </label>
      <button className="btn danger" onClick={onRequest} disabled={!pid || Boolean(pending) || state === "loading" || state === "denied"}>
        {pending ? "已有待处理请求" : "登记删除请求"}
      </button>
    </section>
  );
}
