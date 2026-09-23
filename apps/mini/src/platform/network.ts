/** Platform network adapter. In mini program this wraps Taro.request;
 *  in future H5/mobile could swap in fetch. No wx.xxx leaks here. */
import Taro from "@tarojs/taro";

export interface PlatformNetwork {
  request<T>(options: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: unknown;
    header?: Record<string, string>;
    timeout?: number;
  }): Promise<{ status: number; data: T }>;
  upload<T>(options: {
    url: string;
    filePath: string;
    name: string;
    formData?: Record<string, string>;
    header?: Record<string, string>;
  }): Promise<{ status: number; data: T }>;
}

/** # PROVIDER:
 *  WeChat/Taro runtime hands back `any` payloads from its JSON transport.
 *  These two helpers are the ONLY places raw provider data crosses into typed
 *  code; consumers still own the contract because they typed the request.
 *  Casts here are bounded, single-site, and auditable (Stage V.2 type-escape
 *  adjudication) — never spread `as unknown as T` through the app. */
function passThrough<T>(raw: unknown): T {
  return raw as T;
}

/** Upload bodies from WeChat are sometimes a JSON string; parse when possible,
 *  otherwise keep the raw value (identical to the previous inline behavior). */
function decodeUpload<T>(raw: unknown): T {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }
  return raw as T;
}
class WechatNetwork implements PlatformNetwork {
  async request<T>(options: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: unknown;
    header?: Record<string, string>;
    timeout?: number;
  }): Promise<{ status: number; data: T }> {
    const resp = await Taro.request({
      url: options.url,
      method: options.method ?? "GET",
      data: options.data as Record<string, unknown> | undefined,
      header: options.header,
      timeout: options.timeout ?? 15000,
    });
    return { status: resp.statusCode, data: passThrough<T>(resp.data) };
  }
  async upload<T>(options: {
    url: string;
    filePath: string;
    name: string;
    formData?: Record<string, string>;
    header?: Record<string, string>;
  }): Promise<{ status: number; data: T }> {
    const resp = await Taro.uploadFile({
      url: options.url,
      filePath: options.filePath,
      name: options.name,
      formData: options.formData,
      header: options.header,
      timeout: 20000,
    });
    return { status: resp.statusCode, data: decodeUpload<T>(resp.data) };
  }
}

export const network: PlatformNetwork = new WechatNetwork();