/** Visual variant for a provenance/source level.
 *  Mirrors the badge variants in apps/web/app/globals.css so kit components
 *  and existing pages read consistently. Unknown levels stay neutral. */
export function provenanceBadgeClass(level: string): string {
  if (level.startsWith("AI")) return "pli-badge--ai";
  if (level.startsWith("OWNER") || level.startsWith("CAREGIVER")) return "pli-badge--owner";
  if (level.startsWith("PROFESSIONAL") || level.startsWith("LAB")) return "pli-badge--professional";
  if (level.startsWith("SYSTEM")) return "pli-badge--system";
  return "";
}
