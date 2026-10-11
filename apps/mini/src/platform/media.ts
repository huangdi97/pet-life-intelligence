/** Platform camera/gallery + governed memory playback.
 *  Media playback always downloads the authenticated original artifact first;
 *  no generated placeholder substitutes for a missing/denied source. */
import Taro from "@tarojs/taro";
import { auth } from "./auth";

const BASE = process.env.TARO_APP_API_URL ?? "http://localhost:8800";
let activeAudio: ReturnType<typeof Taro.createInnerAudioContext> | null = null;

export type ArtifactKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

export interface PlatformMedia {
  chooseImage(count?: number): Promise<string[]>;
  chooseVideo(): Promise<string | null>;
  openArtifact(artifactId: string, kind: ArtifactKind): Promise<void>;
  stopAudio(): void;
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

  async openArtifact(artifactId: string, kind: ArtifactKind): Promise<void> {
    const token = auth.getToken();
    const header: Record<string, string> = {};
    if (token) header.Authorization = `Bearer ${token}`;
    const downloaded = await Taro.downloadFile({
      url: `${BASE}/api/v1/artifacts/${artifactId}/content`,
      header,
    });
    if (downloaded.statusCode < 200 || downloaded.statusCode >= 300) {
      throw new Error("MEDIA_DOWNLOAD_FAILED");
    }
    const path = downloaded.tempFilePath;
    if (kind === "IMAGE") {
      await Taro.previewImage({ current: path, urls: [path] });
      return;
    }
    if (kind === "VIDEO") {
      await Taro.previewMedia({
        current: 0,
        sources: [{ url: path, type: "video" }],
      });
      return;
    }
    if (kind === "AUDIO") {
      activeAudio?.stop();
      activeAudio?.destroy();
      activeAudio = Taro.createInnerAudioContext();
      activeAudio.src = path;
      activeAudio.autoplay = true;
      activeAudio.onError(() => {
        Taro.showToast({ title: "声音暂时无法播放", icon: "none" });
      });
      return;
    }
    await Taro.openDocument({ filePath: path, showMenu: true });
  }

  stopAudio(): void {
    activeAudio?.stop();
    activeAudio?.destroy();
    activeAudio = null;
  }
}

export const media: PlatformMedia = new WechatMedia();
