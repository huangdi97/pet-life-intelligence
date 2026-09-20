import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";

export interface EvidenceMedia {
  url: string;
  kind?: string;
  alt?: string;
}

/** Artifact/observation evidence card. Image results are presented as
 *  reference records — never as a diagnosis. */
export function EvidenceCard({
  title,
  kind,
  text,
  createdAt,
  media,
  caption,
  children,
  className,
}: {
  title?: string;
  kind?: string;
  text?: string | null;
  createdAt?: string | null;
  media?: EvidenceMedia | null;
  caption?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  const isImage =
    media?.kind === "image" ||
    (media !== null && media !== undefined && /\.(png|jpe?g|gif|webp|avif)$/i.test(media.url));
  return (
    <div className={cx("pli-card", "pli-evidence-card", className)}>
      <div className="pli-evidence-item-head">
        {kind ? <span className="pli-badge">{kind}</span> : null}
        {title ? <span className="pli-evidence-item-title">{title}</span> : null}
        {createdAt ? (
          <time dateTime={createdAt}>{formatDateTime(createdAt)}</time>
        ) : null}
      </div>
      {text ? <div className="pli-evidence-item-text">{text}</div> : null}
      {media ? (
        <div className="pli-evidence-media-wrap">
          {isImage ? (
            <img
              className="pli-evidence-media"
              src={media.url}
              alt={media.alt ?? "证据图片"}
              loading="lazy"
            />
          ) : (
            <a className="pli-evidence-link" href={media.url} target="_blank" rel="noreferrer">
              查看附件
            </a>
          )}
          {isImage || caption ? (
            <div className="pli-evidence-caption">
              {caption ?? "图片仅作为记录参考，不构成诊断。"}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
