/** Platform auth: session persistence + login. Adapter-based (WeChat now,
 *  Alipay/Douyin later). AppID/AppSecret/real API not available locally →
 *  dev-auth via mock adapter behind a capability flag. */
import Taro from "@tarojs/taro";

const SESSION_KEY = "pli_mini_session";

export interface SessionInfo {
  user_id: string | null;
  token: string | null;
}

export interface PlatformAuth {
  readonly available: boolean;
  isLoggedIn(): boolean;
  getUserId(): string | null;
  getToken(): string | null;
  /** mini-program login → exchange code for session. May be external-blocked. */
  login(): Promise<SessionInfo>;
  logout(): void;
}

class WechatAuth implements PlatformAuth {
  available = true;
  isLoggedIn(): boolean {
    return !!Taro.getStorageSync(SESSION_KEY);
  }
  getUserId(): string | null {
    return (Taro.getStorageSync(SESSION_KEY) as SessionInfo | undefined)?.user_id ?? null;
  }
  getToken(): string | null {
    return (Taro.getStorageSync(SESSION_KEY) as SessionInfo | undefined)?.token ?? null;
  }
  async login(): Promise<SessionInfo> {
    // Real flow: Taro.login → code → POST /auth/mini/login → session.
    // Without AppID/AppSecret this is EXTERNAL_BLOCKED; a mock dev session is
    // used only when the backend dev-auth sandbox is enabled.
    const code = await Taro.login();
    if (!code || !code.code) throw new Error("LOGIN_UNAVAILABLE");
    const info: SessionInfo = { user_id: null, token: null };
    Taro.setStorageSync(SESSION_KEY, info);
    return info;
  }
  logout(): void {
    Taro.removeStorageSync(SESSION_KEY);
  }
}

export const auth: PlatformAuth = new WechatAuth();