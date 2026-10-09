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
      </div>
    </section>
  );
}
