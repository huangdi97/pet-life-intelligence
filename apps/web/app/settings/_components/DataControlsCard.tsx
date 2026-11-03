"use client";

import { useEffect, useState } from "react";
import { api } from "@pli/api-client";

interface PrivacyState {
  pet_id: string;
  hidden_fields: string[];
  maskable_fields: string[];
}

const FIELD_LABELS: Record<string, string> = {
  birth_date: "生日",
  breed: "品种",
  weight_note: "体重备注",
};

export function DataControlsCard({ pid }: { pid?: string }) {
  const [privacy, setPrivacy] = useState<PrivacyState | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pid) {
      setPrivacy(null);
      setState("idle");
      return;
    }
    let alive = true;
    setState("loading");
    setMessage(null);
    api.get<PrivacyState>(`/pets/${pid}/field-privacy`)
      .then((value) => {
        if (!alive) return;
        setPrivacy(value);
        setState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [pid]);

  async function toggle(field: string) {
    if (!pid || !privacy || busy) return;
    const hidden = privacy.hidden_fields.includes(field)
      ? privacy.hidden_fields.filter((item) => item !== field)
      : [...privacy.hidden_fields, field];
    setBusy(field);
    setMessage(null);
    try {
      const result = await api.put<PrivacyState>(`/pets/${pid}/field-privacy`, { hidden_fields: hidden });
      setPrivacy({
        pet_id: result.pet_id,
        hidden_fields: result.hidden_fields,
        maskable_fields: privacy.maskable_fields,
      });
      setMessage("隐私范围已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法更新隐私范围。");
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    if (!pid || busy) return;
    setBusy("export");
    setMessage(null);
    try {
      const bundle = await api.get<Record<string, unknown>>(`/pets/${pid}/export`);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pli-pet-${pid}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("资料导出包已生成。请妥善保管其中的敏感信息。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法生成导出包。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="v5-me-section" data-testid="pli.me.data-controls">
      <h2>数据与可见范围</h2>
      <p className="muted" style={{ margin: 0 }}>
        可选择哪些身份字段对没有管理权限的照护者隐藏；主人和共同管理者仍可查看完整档案。
      </p>

      {!pid ? <p className="v4-note">选择宠物后可管理。</p> : null}
      {pid && state === "loading" ? <p className="v4-note">正在读取隐私范围……</p> : null}
      {pid && state === "error" ? (
        <p className="v4-note">隐私范围暂时没有加载成功；不会用默认设置覆盖真实状态。</p>
      ) : null}

      {state === "ready" && privacy ? (
        <div className="v4-statsline" style={{ marginTop: 10 }}>
          {privacy.maskable_fields.map((field) => {
            const hidden = privacy.hidden_fields.includes(field);
            return (
              <button
                key={field}
                type="button"
                className={`v4-chip ${hidden ? "v4-chip--brand" : ""}`}
                aria-pressed={hidden}
                disabled={busy !== null}
                onClick={() => void toggle(field)}
              >
                {FIELD_LABELS[field] ?? "身份字段"} · {hidden ? "对普通照护者隐藏" : "按权限可见"}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn" onClick={() => void exportData()} disabled={!pid || busy !== null}>
          {busy === "export" ? "生成中…" : "导出宠物资料"}
        </button>
      </div>
      <p className="v4-note" style={{ marginTop: 8 }}>
        导出包含带来源的生活记录与照护数据；下载后的文件由你自行保管。
      </p>
      {message ? <div className="alert info" aria-live="polite">{message}</div> : null}
    </div>
  );
}
