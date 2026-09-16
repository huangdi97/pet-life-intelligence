/** Platform auth: session persistence + login. Adapter-based (WeChat now,
 *  Alipay/Douyin later). Real flow: wx.login → code → POST /auth/wechat/login.
 *  Without AppID/AppSecret the backend returns EXTERNAL_BLOCKED; the adapter
 *  surfaces that honestly and never fakes a session. */
import Taro from "@tarojs/taro";
import { network } from "./network";

const SESSION_KEY = "pli_mini_session";
const BASE = process.env.TARO_APP_API_URL ?? "http://localhost:8800";

export interface SessionInfo {
  user_id: string | null;
  token: string | null;
  refresh_token: string | null;
  display_name: string | null;
}

export interface PlatformAuth {
  readonly available: boolean;
  isLoggedIn(): boolean;
  getUserId(): string | null;
  getToken(): string | null;
  /** mini-program login → exchange code for a real session. */
  login(): Promise<SessionInfo>;
  logout(): void;
}

class WechatAuth implements PlatformAuth {
  available = true;

  isLoggedIn(): boolean {
    const s = Taro.getStorageSync(SESSION_KEY) as SessionInfo | undefined;
    return !!(s && s.token);
  }

  getUserId(): string | null {
    return (Taro.getStorageSync(SESSION_KEY) as SessionInfo | undefined)?.user_id ?? null;
  }

  getToken(): string | null {
    return (Taro.getStorageSync(SESSION_KEY) as SessionInfo | undefined)?.token ?? null;
  }

  async login(): Promise<SessionInfo> {
    const loginResp = await Taro.login();
    if (!loginResp || !loginResp.code) throw new Error("LOGIN_UNAVAILABLE");

    const resp = await network.request<{
      error?: { code: string; message: string };
      access_token?: string;
      refresh_token?: string;
      user_id?: string;
      display_name?: string;
    }>({
      url: `${BASE}/api/v1/auth/wechat/login`,
      method: "POST",
      data: { code: loginResp.code, device_label: "微信小程序" },
    });

    if (resp.status >= 400 || !resp.data?.access_token) {
      const code = resp.data?.error?.code ?? "EXTERNAL_BLOCKED";
      throw new Error(code === "EXTERNAL_BLOCKED"
        ? "微信登录暂未开放（需小程序主体与 AppID）。"
        : (resp.data?.error?.message ?? "登录失败"));
    }

    const info: SessionInfo = {
      user_id: resp.data.user_id ?? null,
      token: resp.data.access_token ?? null,
      refresh_token: resp.data.refresh_token ?? null,
      display_name: resp.data.display_name ?? null,
    };
    Taro.setStorageSync(SESSION_KEY, info);
    return info;
  }

  logout(): void {
    Taro.removeStorageSync(SESSION_KEY);
  }
}

export const auth: PlatformAuth = new WechatAuth();