"use client";

interface ChangeCardProps {
  summary: string;
  evidence?: string;
  unknown?: boolean;
}

/** OWN-001 Change — compare this pet with its own recorded baseline.
 * A change is not a medical conclusion and must stay visually quieter than Attention. */
export function ChangeCard({ summary, evidence, unknown = false }: ChangeCardProps) {
  return (
    <section className="v4-sec v5-today-change" data-pli-type="section" data-testid="pli.today.change">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">与它自己相比</h2>
      </div>
      <div className={`v5-change-line${unknown ? " v5-change-line--unknown" : ""}`}>
        <p className="v5-change-summary">{summary}</p>
        {evidence ? <p className="v5-change-evidence">{evidence}</p> : null}
        <button
          type="button"
          className="v5-change-why"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          为什么
        </button>
        {expanded ? (
          <div className="v5-change-explain" data-testid="pli.today.change.explain">
            <strong>事实</strong><p>{summary}</p>
            <strong>比较依据</strong><p>{evidence ?? "只比较已经记录的事实。"}</p>
            <strong>不确定性</strong><p>这里只说明与它自己的已记录常态的差异，不能据此判断疾病、疼痛或情绪。</p>
            <strong>下一步</strong><p>继续记录饮水、进食、活动和睡眠；变化持续或出现明确健康信号时，再进入健康页查看。</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
