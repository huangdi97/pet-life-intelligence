import type { ReactNode } from "react";
import { cx } from "../lib/cx";

/** Canonical Vet Brief section order (信息整理，不是兽医诊断). */
export const VET_BRIEF_SECTIONS = [
  { id: "identity", label: "宠物身份", label_en: "Pet Identity" },
  { id: "chief_complaint", label: "主诉", label_en: "Chief Complaint" },
  { id: "onset", label: "起病与开始时间", label_en: "Onset" },
  { id: "trend", label: "趋势", label_en: "Trend" },
  { id: "timeline", label: "相关时间线", label_en: "Relevant Timeline" },
  { id: "evidence", label: "证据", label_en: "Evidence" },
  { id: "medication", label: "用药", label_en: "Medication" },
  { id: "history", label: "病史", label_en: "History" },
  { id: "risk", label: "风险", label_en: "Risk" },
  { id: "provenance", label: "来源与可信度", label_en: "Provenance" },
] as const;

/** Vet Brief section: title + children, print-friendly (break-inside: avoid). */
export function VetBriefSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("pli-vet-brief-section", className)}>
      <h3 className="pli-vet-brief-title">{title}</h3>
      <div className="pli-vet-brief-body">{children}</div>
    </section>
  );
}
