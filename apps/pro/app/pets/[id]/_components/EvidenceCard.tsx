"use client";

export function EvidenceCard({ evidenceCount }: { evidenceCount: number }) {
  return (
    <div className="card">
      <h2>证据 · Evidence 预览</h2>
      {evidenceCount > 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          证据：{evidenceCount} 个附件（媒体 / 观察）。完整证据在时间线中按条目查看。
        </p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>暂无证据附件。</p>
      )}
    </div>
  );
}
