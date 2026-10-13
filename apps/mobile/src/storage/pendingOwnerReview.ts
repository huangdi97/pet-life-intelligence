/** R8I: durable, scoped owner instructions, NOT a background retry worker.
 * No token, note, free text, or event payload is stored with the intent.
 * This is Keystore/Keychain-backed and must be cleared on account changes.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "pli_r8_unconfirmed_owner_review_v1";
const MAX_PENDING = 4;

export type SavedOwnerIntent = {
  petId: string;
  caseId: string;
  sourceIdsKey: string;
  decision: "FOLLOW_UP_LATER" | "NOT_RELEVANT" | "CORRECT_SOURCE";
  payload: {
    decision: "FOLLOW_UP_LATER" | "NOT_RELEVANT" | "CORRECT_SOURCE";
    expected_latest_review_id: string | null;
    idempotency_key: string;
  };
};

let queue: Promise<void> = Promise.resolve();
function serialized(work: () => Promise<void>): Promise<void> {
  const pending = queue.then(work);
  queue = pending.catch(() => {});
  return pending;
}

async function read(): Promise<SavedOwnerIntent[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch {
    throw new Error("R8_SECURE_INTENT_CORRUPTED");
  }
  if (!Array.isArray(decoded)) throw new Error("R8_SECURE_INTENT_CORRUPTED");
  for (const item of decoded) {
    if (!item || typeof item !== "object"
        || typeof item.petId !== "string"
        || typeof item.caseId !== "string"
        || typeof item.sourceIdsKey !== "string"
        || !["FOLLOW_UP_LATER", "NOT_RELEVANT", "CORRECT_SOURCE"].includes(item.decision)
        || !item.payload || item.payload.decision !== item.decision
        || typeof item.payload.idempotency_key !== "string"
        || item.payload.idempotency_key.length < 8
        || (item.payload.expected_latest_review_id !== null
          && typeof item.payload.expected_latest_review_id !== "string")) {
      throw new Error("R8_SECURE_INTENT_CORRUPTED");
    }
  }
  return decoded as SavedOwnerIntent[];
}

/** Read only intents belonging to this pet. Never enumerate another pet in UI. */
export async function listOwnerIntentsForPet(petId: string): Promise<SavedOwnerIntent[]> {
  await queue;
  return (await read()).filter((entry) => entry.petId === petId);
}

export async function restoreOwnerIntent(
  petId: string, caseId: string, sourceIdsKey: string,
): Promise<SavedOwnerIntent | null> {
  await queue;
  return (await read()).find((x) =>
    x.petId === petId && x.caseId === caseId && x.sourceIdsKey === sourceIdsKey
  ) ?? null;
}

export async function saveOwnerIntent(intent: SavedOwnerIntent): Promise<void> {
  return serialized(async () => {
    const others = (await read()).filter((x) => !(
      x.petId === intent.petId && x.caseId === intent.caseId && x.sourceIdsKey === intent.sourceIdsKey
    ));
    if (others.length >= MAX_PENDING) throw new Error("R8_UNCONFIRMED_INTENT_CAPACITY");
    await SecureStore.setItemAsync(KEY, JSON.stringify([...others, intent]));
  });
}

export async function clearOwnerIntent(
  petId: string, caseId: string, sourceIdsKey: string,
): Promise<void> {
  return serialized(async () => {
    const rest = (await read()).filter((x) => !(
      x.petId === petId && x.caseId === caseId && x.sourceIdsKey === sourceIdsKey
    ));
    if (rest.length) await SecureStore.setItemAsync(KEY, JSON.stringify(rest));
    else await SecureStore.deleteItemAsync(KEY);
  });
}

/** Remove this EXACT owner intent only if it is still the one the owner saw.
 * Replaced decisions with the same pet+Case+evidence are never removed.
 */
export async function clearOwnerIntentIfUnchanged(intent: SavedOwnerIntent): Promise<boolean> {
  let removed = false;
  await serialized(async () => {
    const rows = await read();
    const index = rows.findIndex((x) =>
      x.petId === intent.petId &&
      x.caseId === intent.caseId &&
      x.sourceIdsKey === intent.sourceIdsKey
    );
    if (index < 0) return;
    const saved = rows[index];
    if (saved.decision !== intent.decision ||
        saved.payload.decision !== intent.payload.decision ||
        saved.payload.idempotency_key !== intent.payload.idempotency_key ||
        saved.payload.expected_latest_review_id !== intent.payload.expected_latest_review_id) {
      return;
    }
    const rest = rows.filter((_, i) => i !== index);
    if (rest.length) await SecureStore.setItemAsync(KEY, JSON.stringify(rest));
    else await SecureStore.deleteItemAsync(KEY);
    removed = true;
  });
  return removed;
}

export async function clearAllOwnerIntents(): Promise<void> {
  await serialized(() => SecureStore.deleteItemAsync(KEY));
}
