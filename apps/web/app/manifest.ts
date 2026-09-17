import type { MetadataRoute } from "next";

/**
 * Dynamic web manifest (Stage F): basePath-aware so a path-prefix deployment
 * (NEXT_BASE_PATH, e.g. "/pli") serves correct start_url/scope/icons.
 * Replaces the former static public/manifest.webmanifest (same URL, content
 * identical when no base path is set).
 */
const BASE = process.env.NEXT_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "宠物生活智能 Pet Life Intelligence",
    short_name: "PLI 宠物生活",
    description: "宠物全生命周期记录与健康照护助手",
    lang: "zh-CN",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F5",
    theme_color: "#61795C",
    icons: [
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "快速记录", url: `${BASE}/`, description: "打开今日快速记录" },
      { name: "时间线", url: `${BASE}/timeline`, description: "查看宠物生命时间线" },
      { name: "健康", url: `${BASE}/health`, description: "健康事件与就诊流程" },
    ],
  };
}
