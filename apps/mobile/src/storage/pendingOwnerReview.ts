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

// All SecureStore reads AND writes participate in one queue. Waiting for
// queue and reading outside it allows another component to overwrite/remove
// an instruction during the async getItemAsync (stale-snapshot race).
let queue: Promise<void> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const pending = queue.then(work);
  // Keep the queue live even if a read or write fails; propagate the failure
  // only to the original caller, never silently consider it an acknowledgement.
  queue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function read(): Promise<SavedOwnerIntent[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch {
    throw new Error("R8_SECURE_INTENT_CORRUPTED");
  }
  if (!Array.isArray(decoded) || decoded.length > MAX_PENDING)
    throw new Error("R8_SECURE_INTENT_CORRUPTED");
  const seen = new Set<string>();
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
    // Never interpret two locally persisted decisions for the same Case and
    // source fingerprint as two valid owner instructions. Preserve the raw
    // SecureStore value for explicit recovery; do not silently pick or delete.
    const identity = JSON.stringify([item.petId, item.caseId, item.sourceIdsKey]);
    if (seen.has(identity)) throw new Error("R8_SECURE_INTENT_CORRUPTED");
    seen.add(identity);
    // This store must never become a cache for private note/media/payload data.
    const keys = Object.keys(item).sort().join("|");
    const payloadKeys = Object.keys(item.payload).sort().join("|");
    if (keys !== "caseId|decision|payload|petId|sourceIdsKey" ||
        payloadKeys !== "decision|expected_latest_review_id|idempotency_key") {
      throw new Error("R8_SECURE_INTENT_CORRUPTED");
    }
  }
  return decoded as SavedOwnerIntent[];
}

/** Read only intents belonging to this pet. Never enumerate another pet in UI. */
export function listOwnerIntentsForPet(petId: string): Promise<SavedOwnerIntent[]> {
  return serialized(async () =>
    (await read()).filter((entry) => entry.petId === petId)
  );
}

export function restoreOwnerIntent(
  petId: string, caseId: string, sourceIdsKey: string,
): Promise<SavedOwnerIntent | null> {
  return serialized(async () =>
    (await read()).find((x) =>
      x.petId === petId && x.caseId === caseId && x.sourceIdsKey === sourceIdsKey
    ) ?? null
  );
}

export async function saveOwnerIntent(intent: SavedOwnerIntent): Promise<void> {
  return serialized(async () => {
    const existing = await read();
    const previous = existing.find((x) =>
      x.petId === intent.petId && x.caseId === intent.caseId && x.sourceIdsKey === intent.sourceIdsKey
    );
    if (previous) {
      // The same instruction can be durably retried, but a different decision
      // or predecessor cannot silently overwrite a still-unconfirmed choice.
      // Resolve the previous one through exact server ack or explicit opt-out.
      if (previous.decision !== intent.decision ||
          previous.payload.decision !== intent.payload.decision ||
          previous.payload.idempotency_key !== intent.payload.idempotency_key ||
          previous.payload.expected_latest_review_id !== intent.payload.expected_latest_review_id) {
        throw new Error("R8_UNCONFIRMED_INTENT_CONFLICT");
      }
      return;
    }
    if (existing.length >= MAX_PENDING) throw new Error("R8_UNCONFIRMED_INTENT_CAPACITY");
    await SecureStore.setItemAsync(KEY, JSON.stringify([...existing, intent]));
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
