/** Environment-driven API base resolution — Stage R.1 (PLI-07 real access).
 *
 *  Priority: EXPO_PUBLIC_PLI_API_URL (inlined at bundle time by
 *  babel-preset-expo AND carried via app.config.js into extra.apiUrl) over
 *  expoConfig.extra.apiUrl. There is deliberately NO localhost fallback:
 *  a build without a valid URL must surface a config-error screen instead of
 *  silently dialing the phone's own loopback. */
import Constants from "expo-constants";

export const API_URL_ENV = "EXPO_PUBLIC_PLI_API_URL";

export type ApiConfigIssue = "MISSING" | "INVALID";

function rawValue(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_PLI_API_URL ?? "").trim();
  if (fromEnv) return fromEnv;
  const fromConfig = (Constants.expoConfig?.extra?.apiUrl as string | undefined ?? "").trim();
  return fromConfig;
}

export function getApiConfigIssue(): ApiConfigIssue | null {
  const raw = rawValue();
  if (!raw) return "MISSING";
  if (!/^https?:\/\/\S+$/i.test(raw)) return "INVALID";
  return null;
}

export function resolveApiBaseUrl(): string | null {
  if (getApiConfigIssue() !== null) return null;
  return rawValue().replace(/\/+$/, "");
}

/** Human-readable issue description for the config-error screen. */
export function describeApiConfigIssue(issue: ApiConfigIssue): string {
  if (issue === "MISSING") {
    return `未检测到 API 地址：构建包中没有注入 ${API_URL_ENV}，且 app.config 未提供 apiUrl。`;
  }
  return `API 地址格式不合法：需要以 http:// 或 https:// 开头的完整地址。`;
}