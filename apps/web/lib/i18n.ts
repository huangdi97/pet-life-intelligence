"use client";

import { ApiError } from "@pli/api-client";
import { zhCN } from "./i18n_zh_cn";

/** 极简 i18n 基础：zh-CN 优先，键值集中管理，避免 UI 文案散落硬编码。
 *  v1.0 不引入多语言运行时，仅为未来 en-US 预留结构。
 *  文案数据本体在 lib/i18n_zh_cn.ts（Stage V.2 拆分），本文件只保留逻辑。 */

export { zhCN };

export type I18nDict = typeof zhCN;

const dicts: Record<string, I18nDict> = { "zh-CN": zhCN };
export const DEFAULT_LOCALE = "zh-CN";

export function getLocale(): string {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const nav = navigator.language;
  return dicts[nav] ? nav : DEFAULT_LOCALE;
}

export function t(key: string, vars?: Record<string, string>): string {
  const dict = dicts[getLocale()] ?? zhCN;
  const parts = key.split(".");
  let val: unknown = dict;
  for (const p of parts) {
    if (val && typeof val === "object" && p in val) val = (val as Record<string, unknown>)[p];
    else return key;
  }
  if (typeof val !== "string") return key;
  let out = val;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
  return out;
}

/** 错误映射（Stage H COPY_GUIDELINES §6）：用户不可见 raw codes。 */
export function mapErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "PERMISSION_DENIED") return zhCN.common.permissionDenied;
    if (err.status === 404 || err.code === "NOT_FOUND") return zhCN.notFound.title;
    if (err.status === 401 || err.code === "UNAUTHORIZED") return "请先登录。";
    if (err.status === 422 || err.code === "VALIDATION_ERROR") return "提交的内容格式有误，请检查后重试";
    if (err.status !== undefined && err.status >= 500) return "服务暂时不可用，请稍后重试";
    if (err.code === "EXTERNAL_BLOCKED" || err.code === "EXTERNAL") return zhCN.common.externalBlocked;
    if (err.code === "TIMEOUT" || err.code === "ABORT") return "连接超时，请重试";
    return "服务暂时不可用，请稍后重试";
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg === "NO_PET_SELECTED") return zhCN.today.noPetSelected;
    if (msg.includes("EXTERNAL_BLOCKED")) return zhCN.common.externalBlocked;
    if (msg.includes("timeout") || msg.includes("abort")) return "连接超时，请重试";
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch"))
      return "服务暂时不可用，请稍后重试";
    return "服务暂时不可用，请稍后重试";
  }
  return "服务暂时不可用，请稍后重试";
}
