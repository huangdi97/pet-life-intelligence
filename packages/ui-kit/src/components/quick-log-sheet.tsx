import { useEffect, useState, type ReactNode } from "react";
import { Sheet } from "./sheet";

export interface QuickLogField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: "text" | "decimal" | "numeric";
  min?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface QuickLogType {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
  /** Optional lightweight owner-confirmed fields. No hidden factual defaults. */
  fields?: QuickLogField[];
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

function fieldInvalid(field: QuickLogField, value: string | undefined): boolean {
  const raw = String(value ?? "").trim();
  if (field.required && !raw) return true;
  if (!raw || field.min == null) return false;
  const numeric = Number(raw);
  return !Number.isFinite(numeric) || numeric < field.min;
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
  onQuickLog: (
    type: string,
    textValue?: string,
    files?: File[],
    fields?: Record<string, string>,
  ) => void | Promise<void>;
  loading?: boolean;
  title?: string;
  hint?: ReactNode;
  /** Current pet identity line (name · species) rendered at the top of the sheet. */
  identity?: string;
}) {
  const [textType, setTextType] = useState<QuickLogType | null>(null);
  const [textValue, setTextValue] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTextType(null);
      setTextValue("");
      setFieldValues({});
      setMediaFiles([]);
      setSaveError(null);
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
          if (t.textInput || t.fields?.length) {
            setTextType(t);
            setTextValue("");
            setFieldValues({});
            // Structured life-event forms keep media selected in the sheet so
            // the evidence is bound to the confirmed event. Diary uses its
            // separate canonical endpoint and therefore clears unsupported
            // media instead of silently dropping it on save.
            if (t.textInput) setMediaFiles([]);
            return;
          }
          setSaveError(null);
          // A failed artifact upload must NOT clear selected evidence.
          void Promise.resolve().then(() => onQuickLog(t.type, undefined, mediaFiles))
            .then(() => setMediaFiles([]))
            .catch(() => setSaveError("记录尚未保存，请检查网络或素材后重试。"));
        }}
        data-testid={`pli.quicklog.tile.${tileKey(t.type)}`}
      >
        {t.label}
      </button>
    );
  }

  async function saveTextEntry() {
    if (!textType || loading) return;
    setSaveError(null);
    try {
      if (textType.textInput) {
        if (!textValue.trim()) return;
        await onQuickLog(textType.type, textValue.trim());
      } else if (textType.fields?.length) {
        const invalidField = textType.fields.some(
          (field) => fieldInvalid(field, fieldValues[field.key]),
        );
        if (invalidField) return;
        await onQuickLog(textType.type, undefined, mediaFiles, fieldValues);
      } else {
        return;
      }
      setTextType(null);
      setTextValue("");
      setFieldValues({});
      setMediaFiles([]);
    } catch {
      // Keep the text, form values and File references in the active sheet.
      // A parent callback rejected because the record was NOT persisted.
      setSaveError("记录尚未保存，已保留填写内容和所选素材，请检查后重试。");
    }
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
      ) : textType?.textInput || textType?.fields?.length ? (
        <div className="pli-quicklog-text-form" data-testid="pli.quicklog.text-form">
          {textType.textInput ? (
            <>
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
            </>
          ) : (
            <>
              <p className="pli-quicklog-hint">只填写你实际知道的内容；留空不会自动补成默认事实。</p>
              {(textType.fields ?? []).map((field) => (
                <label key={field.key} className="pli-quicklog-text-label">
                  {field.label}{field.required ? " *" : ""}
                  {field.options?.length ? (
                    <select
                      className="pli-quicklog-text-input"
                      value={fieldValues[field.key] ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFieldValues((old) => ({ ...old, [field.key]: value }));
                      }}
                      data-testid={`pli.quicklog.field.${field.key}`}
                    >
                      <option value="">请选择</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="pli-quicklog-text-input"
                      type={field.inputMode === "numeric" || field.inputMode === "decimal" ? "number" : "text"}
                      inputMode={field.inputMode}
                      min={field.min}
                      value={fieldValues[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFieldValues((old) => ({ ...old, [field.key]: value }));
                      }}
                      data-testid={`pli.quicklog.field.${field.key}`}
                    />
                  )}
                </label>
              ))}
              <div className="pli-quicklog-media" data-testid="pli.quicklog.media">
                <label className="pli-quicklog-media-pick">
                  绑定照片/视频（可选）
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                    multiple
                    disabled={loading}
                    onChange={(event) => {
                      setMediaFiles(Array.from(event.currentTarget.files ?? []).slice(0, 3));
                      event.currentTarget.value = "";
                    }}
                    data-testid="pli.quicklog.media-input"
                  />
                </label>
                <span className="pli-quicklog-hint">
                  {mediaFiles.length ? `已选择 ${mediaFiles.length} 个文件` : "最多 3 个；作为这条记录的证据。"}
                </span>
              </div>
            </>
          )}
          <div className="pli-quicklog-text-actions">
            <button
              type="button"
              className="pli-quicklog-btn"
              onClick={() => {
                setTextType(null);
                setTextValue("");
                setFieldValues({});
                setMediaFiles([]);
              }}
            >
              返回
            </button>
            <button
              type="button"
              className="pli-quicklog-save"
              disabled={
                loading ||
                (textType.textInput
                  ? !textValue.trim()
                  : (textType.fields ?? []).some(
                      (field) => fieldInvalid(field, fieldValues[field.key]),
                    ))
              }
              onClick={() => void saveTextEntry()}
              data-testid="pli.quicklog.text-save"
            >
              {loading ? "保存中……" : textType.textInput ? "保存备注" : "保存记录"}
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
      {saveError ? <p className="pli-quicklog-hint" role="alert" data-testid="pli.quicklog.save-error">{saveError}</p> : null}
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
