"use client";

import { useEffect, useState } from "react";
import { api } from "@pli/api-client";

interface ArtifactMeta {
  artifact_id: string;
  pet_id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  content_type: string;
  size_bytes: number;
  original_filename: string;
  sensitive: boolean;
  created_at: string;
}

export function ArtifactMemory({
  artifactId,
  compact = false,
}: {
  artifactId: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [meta, setMeta] = useState<ArtifactMeta | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function open() {
    if (state === "loading") return;
    if (state === "ready") {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const [metadata, blob] = await Promise.all([
        api.get<ArtifactMeta>(`/artifacts/${artifactId}`),
        api.blob(`/artifacts/${artifactId}/content`),
      ]);
      setMeta(metadata);
      setUrl(URL.createObjectURL(blob));
      setState("ready");
    } catch {
      setState("error");
    }
  }

  const label =
    state === "ready"
      ? "收起媒体"
      : state === "loading"
        ? "正在读取…"
        : state === "error"
          ? "重试媒体"
          : "查看媒体";

  return (
    <div
      data-testid={`pli.timeline.media.${artifactId}`}
      style={{ marginTop: compact ? 6 : 8 }}
    >
      <button
        type="button"
        className="v4-chip"
        onClick={() => void open()}
        disabled={state === "loading"}
        aria-expanded={state === "ready"}
      >
        {label}
      </button>
      {state === "error" ? (
        <p className="v4-note" style={{ margin: "5px 0 0" }}>
          媒体暂时没有读取成功；不会用占位内容冒充原始回忆。
        </p>
      ) : null}
      {state === "ready" && meta && url ? (
        <div style={{ marginTop: 8 }}>
          {meta.kind === "IMAGE" ? (
            <img
              src={url}
              alt={meta.original_filename || "宠物生活记录照片"}
              style={{
                display: "block",
                maxWidth: compact ? 240 : 360,
                width: "100%",
                maxHeight: 300,
                objectFit: "contain",
                borderRadius: 16,
              }}
            />
          ) : meta.kind === "VIDEO" ? (
            <video
              src={url}
              controls
              preload="metadata"
              style={{
                display: "block",
                maxWidth: compact ? 260 : 420,
                width: "100%",
                maxHeight: 320,
                borderRadius: 16,
              }}
            >
              当前浏览器无法播放这段视频。
            </video>
          ) : meta.kind === "AUDIO" ? (
            <audio src={url} controls preload="metadata" style={{ width: "100%", maxWidth: 420 }}>
              当前浏览器无法播放这段声音。
            </audio>
          ) : (
            <a className="v4-action v4-action--secondary" href={url} download={meta.original_filename || "document"}>
              打开原始文件
            </a>
          )}
          <p className="v4-note" style={{ margin: "5px 0 0" }}>
            原始媒体 · {meta.original_filename || meta.content_type} · {Math.max(1, Math.round(meta.size_bytes / 1024))} KB
          </p>
        </div>
      ) : null}
    </div>
  );
}
