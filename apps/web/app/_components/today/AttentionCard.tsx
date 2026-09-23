"use client";

import Link from "next/link";

interface AttentionCardProps {
  hints: Array<Record<string, string>>;
}

/** OWN-001 Attention — 今天最值得注意什么。 */
export function AttentionCard({ hints }: AttentionCardProps) {
  return (
    <div className="card">
      <h2>值得注意</h2>
      {hints.length > 0 ? (
        <>
          <ul className="tl">
            {hints.slice(0, 2).map((h, i) => (
              <li key={i}>
                <div className="tl-body">{h.message || h.hint || h.detail || "值得关注"}</div>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 8 }}>
            <Link
              href={`/agent?tab=explain&ctx=${encodeURIComponent("今日值得关注的事项")}`}
              className="btn"
              style={{ fontSize: 12, minHeight: 30, padding: "3px 10px" }}
            >
              [查看依据]
            </Link>
          </div>
        </>
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          没有需要特别注意的事项。
        </p>
      )}
    </div>
  );
}
