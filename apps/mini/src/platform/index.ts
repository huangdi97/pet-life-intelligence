/** Platform adapter registry — the single seam between business code and
 *  the underlying mini-program platform (WeChat today; Alipay/Douyin adapters
 *  can be swapped in without touching pages). */
import { auth, type PlatformAuth } from "./auth";
import { storage, type PlatformStorage } from "./storage";
import { network, type PlatformNetwork } from "./network";
import { media, type PlatformMedia } from "./media";
import { uploader, type PlatformUploader } from "./upload";
import { share, type PlatformShare } from "./share";
import { notification, type PlatformNotification } from "./notification";

export interface Platform {
  auth: PlatformAuth;
  storage: PlatformStorage;
  network: PlatformNetwork;
  media: PlatformMedia;
  uploader: PlatformUploader;
  share: PlatformShare;
  notification: PlatformNotification;
}

let _platform: Platform | null = null;

export function getPlatform(): Platform {
  if (!_platform) {
    _platform = {
      auth,
      storage,
      network,
      media,
      uploader,
      share,
      notification,
    };
  }
  return _platform;
}

export const PlatformAdapter = {
  init(): Platform {
    return getPlatform();
  },
};