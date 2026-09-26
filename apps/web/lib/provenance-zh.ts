
/** Owner-facing provenance copy: raw enums (OWNER_REPORTED / AI_DERIVED / …)
 *  must never appear on owner pages — always map to user language. */
export function provenanceLabel(sourceType: string, provenanceLevel: string): string {
  const s = `${sourceType} ${provenanceLevel}`;
  if (s.includes("AI")) return "AI 整理";
  if (s.includes("PROFESSIONAL") || s.includes("LAB")) return "专业人员";
  if (s.includes("DEVICE")) return "设备记录";
  if (s.includes("SYSTEM")) return "系统计算";
  return "主人记录";
}
