/** Secure storage via expo-secure-store (Keychain / Keystore).
 *  Tokens must never live in plain AsyncStorage. */
import * as SecureStore from "expo-secure-store";

export const SESSION_KEY = "pli_session";
export const CURRENT_PET_KEY = "pli_current_pet";
/** Dev-mode user id (X-Dev-User-Id header), mirrors packages/api-client. */
export const DEV_USER_KEY = "pli_dev_user_id";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(SESSION_KEY, token);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getCurrentPet(): Promise<string | null> {
  return SecureStore.getItemAsync(CURRENT_PET_KEY);
}

export async function setCurrentPet(id: string): Promise<void> {
  await SecureStore.setItemAsync(CURRENT_PET_KEY, id);
}

/** Dev-mode session: POST /auth/dev/login → user_id → X-Dev-User-Id on every
 *  request (same pattern as packages/api-client / apps/web dev login). */
export async function getDevUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEV_USER_KEY);
}

export async function setDevUserId(id: string | null): Promise<void> {
  if (id) await SecureStore.setItemAsync(DEV_USER_KEY, id);
  else await SecureStore.deleteItemAsync(DEV_USER_KEY);
}
