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
    return { status: resp.statusCode, data: resp.data as T };
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
    let data: T = resp.data as unknown as T;
    if (typeof resp.data === "string") {
      try {
        data = JSON.parse(resp.data) as T;
      } catch {
        /* keep raw */
      }
    }
    return { status: resp.statusCode, data };
  }
}

export const network: PlatformNetwork = new WechatNetwork();