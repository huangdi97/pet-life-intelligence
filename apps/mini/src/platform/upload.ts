/** Platform uploader: uploads a local file path to the API artifacts endpoint. */
import Taro from "@tarojs/taro";
import { network } from "./network";

export interface PlatformUploader {
  uploadImage(petId: string, filePath: string): Promise<{ artifact_id: string; kind: string }>;
  uploadVideo(petId: string, filePath: string): Promise<{ artifact_id: string; kind: string }>;
}

class WechatUploader implements PlatformUploader {
  async uploadArtifact(petId: string, filePath: string): Promise<{ artifact_id: string; kind: string }> {
    const base = process.env.TARO_APP_API_URL ?? "http://localhost:8800";
    const session = Taro.getStorageSync("pli_mini_session") as { token?: string } | undefined;
    const header: Record<string, string> = {};
    if (session?.token) header.Authorization = `Bearer ${session.token}`;
    const resp = await network.upload<{ artifact_id: string; kind: string }>({
      url: `${base}/api/v1/pets/${petId}/artifacts`,
      filePath,
      name: "file",
      header,
    });
    if (resp.status >= 400) throw new Error("UPLOAD_FAILED");
    return resp.data;
  }

  async uploadImage(petId: string, filePath: string): Promise<{ artifact_id: string; kind: string }> {
    return this.uploadArtifact(petId, filePath);
  }

  async uploadVideo(petId: string, filePath: string): Promise<{ artifact_id: string; kind: string }> {
    return this.uploadArtifact(petId, filePath);
  }
}

export const uploader: PlatformUploader = new WechatUploader();