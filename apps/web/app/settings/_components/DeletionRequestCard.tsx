"use client";

interface DeletionRequestCardProps {
  pid: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  onRequest: () => void;
}

/** PLI-216 数据删除请求：只登记请求并审计，实际删除需人工确认后离线执行。 */
export function DeletionRequestCard({ pid, value, onValueChange, onRequest }: DeletionRequestCardProps) {
  return (
    <div className="card">
      <h2>数据删除请求</h2>
      <p className="muted">
        v0.1 只登记请求并审计；实际删除是高风险动作，需要显式人工确认后离线执行（不会自动删除）。
      </p>
      <label className="field">
        原因（可选）
        <input value={value} onChange={(e) => onValueChange(e.target.value)} />
      </label>
      <button className="btn danger" onClick={onRequest} disabled={!pid}>
        登记删除请求
      </button>
    </div>
  );
}
