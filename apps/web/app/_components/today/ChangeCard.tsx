"use client";

interface ChangeCardProps {
  hints: Array<Record<string, string>>;
}

/** OWN-001 Change — 与它自己相比（基线对比，非诊断）。 */
export function ChangeCard({ hints }: ChangeCardProps) {
  return (
    <div className="card">
      <h2>变化</h2>
      {hints.length > 0 ? (
        <ul className="tl">
          {hints.slice(0, 3).map((h, i) => (
            <li key={i}>
              <div className="tl-body">
                {h.message || h.hint || h.detail || "部分指标低于自己的近期范围"}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          与它自己的近期基线相比，今天没有明显变化。
        </p>
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        基于它自己的近期范围（Personal Baseline），不是医疗诊断。
      </p>
    </div>
  );
}
