/** Platform notification: subscribe to message templates (requires template ids). */
import Taro from "@tarojs/taro";

export interface PlatformNotification {
  requestPermission(): Promise<boolean>;
}

class WechatNotification implements PlatformNotification {
  async requestPermission(): Promise<boolean> {
    try {
      // 需要已申请的小程序订阅消息模板 id；本地 sandbox 无模板时直接返回 false。
      const resp = await Taro.requestSubscribeMessage({
        tmplIds: [],
        entityIds: [],
      });
      return !!resp && Object.values(resp).every((v) => v === "accept");
    } catch {
      return false;
    }
  }
}

export const notification: PlatformNotification = new WechatNotification();