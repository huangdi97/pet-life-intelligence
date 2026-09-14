/** Platform storage (session-scoped). Drafts & prefs only — medical records
 *  never persist exclusively here. */
import Taro from "@tarojs/taro";

export interface PlatformStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Structured value (JSON). */
  getJson<T>(key: string): T | null;
  setJson(key: string, value: unknown): void;
}

class WechatStorage implements PlatformStorage {
  get(key: string): string | null {
    const v = Taro.getStorageSync(key);
    return typeof v === "string" ? v : null;
  }
  set(key: string, value: string): void {
    Taro.setStorageSync(key, value);
  }
  remove(key: string): void {
    Taro.removeStorageSync(key);
  }
  getJson<T>(key: string): T | null {
    const raw = Taro.getStorageSync(key);
    if (raw === "" || raw === undefined || raw === null) return null;
    try {
      return typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T);
    } catch {
      return null;
    }
  }
  setJson(key: string, value: unknown): void {
    Taro.setStorageSync(key, JSON.stringify(value));
  }
}

export const storage: PlatformStorage = new WechatStorage();