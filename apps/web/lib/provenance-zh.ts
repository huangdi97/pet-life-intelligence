import { provenanceLabel } from "./ownerLabels";

/** Owner-facing provenance copy. Raw enums (OWNER_REPORTED / AI_DERIVED / …)
 *  must never appear on owner pages.
 *
 *  Timeline/today call sites receive both the source type and the provenance
 *  level (both are SourceType enums). The level is authoritative; the source
 *  type is only a fallback for older records that omit it. The mapping table
 *  itself lives in ./ownerLabels.ts. */
export function provenanceLabelForSource(sourceType: string, provenanceLevel: string): string {
  return provenanceLabel(provenanceLevel || sourceType);
}
