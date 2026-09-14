/** Platform camera/gallery: choose image or video. Handles permission deny. */
import Taro from "@tarojs/taro";

export interface PlatformMedia {
  chooseImage(count?: number): Promise<string[]>;
  chooseVideo(): Promise<string | null>;
}

class WechatMedia implements PlatformMedia {
  async chooseImage(count = 1): Promise<string[]> {
    const resp = await Taro.chooseImage({ count, sizeType: ["compressed"] });
    return resp.tempFilePaths ?? [];
  }
  async chooseVideo(): Promise<string | null> {
    const resp = await Taro.chooseVideo({ compressed: true, maxDuration: 60 });
    return resp.tempFilePath ?? null;
  }
}

export const media: PlatformMedia = new WechatMedia();