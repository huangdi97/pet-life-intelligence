/** Secure storage via expo-secure-store (Keychain / Keystore).
 *  Tokens must never live in plain AsyncStorage. */
import * as SecureStore from "expo-secure-store";

export const SESSION_KEY = "pli_session";
export const CURRENT_PET_KEY = "pli_current_pet";

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