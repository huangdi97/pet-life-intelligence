/** Owner-facing review evidence is paged for responsiveness, never truncated.
 * Each resolved event has to belong to the same pet and immutable requested ID.
 * No AI interpretations, identity substitutes, or client-generated sources.
 */
export const OWNER_EVIDENCE_BATCH_SIZE = 8;

export interface OwnerEvidenceIdentity {
  event_id: string;
  pet_id: string;
}

export function nextOwnerEvidenceIds(
  sourceIds: readonly string[],
  loadedIds: readonly string[],
): string[] {
  const existing = new Set(loadedIds);
  const page: string[] = [];
  for (const id of sourceIds) {
    if (!id || existing.has(id)) continue;
    existing.add(id);
    page.push(id);
    if (page.length === OWNER_EVIDENCE_BATCH_SIZE) break;
  }
  return page;
}

export function verifyOwnerEvidenceBatch(
  rows: readonly OwnerEvidenceIdentity[],
  requestedIds: readonly string[],
  petId: string,
): void {
  if (rows.length !== requestedIds.length ||
      rows.some((row, index) =>
        !row || row.pet_id !== petId || row.event_id !== requestedIds[index])) {
    throw new Error("原始记录身份与当前宠物或来源不符，已停止展示；请重新核对。");
  }
}
