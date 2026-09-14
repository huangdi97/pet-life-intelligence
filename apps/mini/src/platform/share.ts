/** Platform share: WeChat share sheet. */
import Taro from "@tarojs/taro";

export interface SharePayload {
  title: string;
  path: string;
  imageUrl?: string;
}

export interface PlatformShare {
  share(payload: SharePayload): void;
}

class WechatShare implements PlatformShare {
  share(payload: SharePayload): void {
    void payload;
    // onShareAppMessage is declared at page level in WeChat; this is a
    // convenience surface so business code never calls wx.* directly.
  }
}

export const share: PlatformShare = new WechatShare();