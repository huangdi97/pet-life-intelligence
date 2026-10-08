import { useEffect, useState, type ReactNode } from "react";
import { Sheet } from "./sheet";

export interface QuickLogType {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
  /** Route instead of writing an event immediately. */
  href?: string;
  /** Owner-authored text must be collected before writing; never fabricate an empty payload. */
  textInput?: {
    label: string;
    placeholder?: string;
    maxLength?: number;
  };
}

/** Primary quick-log keys → blind-UI tile keys (meal→feed, drink→water). */
const TILE_KEY: Record<string, string> = {
  "daily.meal": "feed",
  "daily.drink": "water",
  "daily.elimination": "elimination",
  "daily.walk": "walk",
};

function tileKey(type: string): string {
  return TILE_KEY[type] ?? type;
}

/** Quick log bottom sheet: grid of configured log types, loading state while writing. */
export function QuickLogSheet({
  open,
  onClose,
  types,
  onQuickLog,
  loading = false,
  title = "快速记录",
  hint,
  identity,
}: {
  open: boolean;
  onClose: () => void;
  types: QuickLogType[];
  onQuickLog: (type: string, textValue?: string, files?: File[]) => void | Promise<void>;
  loading?: boolean;
  title?: string;
  hint?: ReactNode;
  /** Current pet identity line (name · species) rendered at the top of the sheet. */
  identity?: string;
}) {
  const [textType, setTextType] = useState<QuickLogType | null>(null);
  const [textValue, setTextValue] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) {
      setTextType(null);
      setTextValue("");
      setMediaFiles([]);
    }
  }, [open]);

  const primary = types.filter((t) => TILE_KEY[t.type]);
  const more = types.filter((t) => !TILE_KEY[t.type]);

  function actionFor(t: QuickLogType): ReactNode {
    if (t.href) {
      return (
        <a
          key={t.type}
          href={t.href}
          className="pli-quicklog-btn"
          data-testid={`pli.quicklog.tile.${tileKey(t.type)}`}
        >
          {t.label}
        </a>
      );
    }
    return (
      <button
        key={t.type}
        type="button"
        className={`pli-quicklog-btn${TILE_KEY[t.type] ? " pli-quicklog-btn--primary" : ""}`}
        disabled={loading}
        onClick={() => {
          if (t.textInput) {
            setTextType(t);
            setTextValue("");
            setMediaFiles([]);
            return;
          }
          void Promise.resolve(onQuickLog(t.type, undefined, mediaFiles)).then(() => setMediaFiles([]));
        }}
        data-testid={`pli.quicklog.tile.${tileKey(t.type)}`}
      >
        {t.label}
      </button>
    );
  }

  async function saveTextEntry() {
    if (!textType || !textValue.trim() || loading) return;
    await onQuickLog(textType.type, textValue.trim());
    setTextType(null);
    setTextValue("");
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {identity ? (
        <p className="pli-quicklog-identity" data-testid="pli.quicklog.identity">
          为 {identity} 记录
        </p>
      ) : null}
      {hint ? <p className="pli-quicklog-hint">{hint}</p> : null}
      {types.length === 0 ? (
        <div className="pli-empty" role="status">
          <div className="pli-empty-title">暂无可用的记录类型</div>
          <div className="pli-empty-desc">可记录的类型由当前页面配置。</div>
        </div>
      ) : textType?.textInput ? (
        <div className="pli-quicklog-text-form" data-testid="pli.quicklog.text-form">
          <label className="pli-quicklog-text-label" htmlFor="pli-quicklog-text-input">
            {textType.textInput.label}
          </label>
          <textarea
            id="pli-quicklog-text-input"
            className="pli-quicklog-text-input"
            value={textValue}
            maxLength={textType.textInput.maxLength ?? 1000}
            placeholder={textType.textInput.placeholder}
            onChange={(event) => setTextValue(event.currentTarget.value)}
            data-testid="pli.quicklog.text-input"
          />
          <div className="pli-quicklog-text-actions">
            <button
              type="button"
              className="pli-quicklog-btn"
              onClick={() => {
                setTextType(null);
                setTextValue("");
              }}
            >
              返回
            </button>
            <button
              type="button"
              className="pli-quicklog-save"
              disabled={loading || !textValue.trim()}
              onClick={() => void saveTextEntry()}
              data-testid="pli.quicklog.text-save"
            >
              {loading ? "保存中……" : "保存备注"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="pli-quicklog-media" data-testid="pli.quicklog.media">
            <label className="pli-quicklog-media-pick">
              绑定照片/视频（可选）
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                multiple
                disabled={loading}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []).slice(0, 3);
                  setMediaFiles(files);
                  event.currentTarget.value = "";
                }}
                data-testid="pli.quicklog.media-input"
              />
            </label>
            <span className="pli-quicklog-hint">
              {mediaFiles.length ? `已选择 ${mediaFiles.length} 个文件；会和下一条生活记录一起保存。` : "最多 3 个；上传成功后会作为该事件的证据。"}
            </span>
            {mediaFiles.length ? (
              <button type="button" className="pli-quicklog-media-clear" onClick={() => setMediaFiles([])}>
                清除
              </button>
            ) : null}
          </div>
          <div className="pli-quicklog-grid" data-testid="pli.quicklog.form">
          {primary.map(actionFor)}
          {more.length > 0 && (
            <div className="pli-quicklog-more" data-testid="pli.quicklog.more">
              {more.map(actionFor)}
            </div>
          )}
          </div>
        </>
      )}
      <div className="pli-quicklog-feedback" data-testid="pli.quicklog.feedback" aria-live="polite">
        {loading ? (
          <span className="pli-state pli-state--loading" role="status">
            <span className="pli-spinner" aria-hidden="true" />
            记录中……
          </span>
        ) : (
          <span className="pli-quicklog-feedback-note">记录会保存来源与时间，可在时间线查看。</span>
        )}
      </div>
      <button type="button" className="pli-quicklog-save" data-testid="pli.quicklog.save" onClick={onClose}>
        完成
      </button>
    </Sheet>
  );
}
