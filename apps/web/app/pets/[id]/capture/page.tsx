"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "@pli/api-client";
import { mapErrorMessage } from "../../../../lib/i18n";
import { State } from "../../../../components/ui";

/** CAPTURE WIZARD — Stage H.2 PHASE E（GOAL E1/E2/E3）。
 *  引导主人采集：正面/左侧/右侧/背部/站立全身/清晰头部。
 *  每张照片经 artifacts 上传（MIME+签名白名单）；全部上传后创建 capture →
 *  运行 deterministic QC（数量/角度覆盖/privacy 提示）→ 引导去生命视图生成。
 *  真实 AI QC provider 未接入时如实标注 heuristic_only。
 */

const ANGLES = [
  { key: "front", label: "正面", hint: "宠物正对你，眼睛可见" },
  { key: "left", label: "左侧", hint: "身体侧面完整入镜" },
  { key: "right", label: "右侧", hint: "另一侧完整入镜" },
  { key: "back", label: "背部", hint: "从上往下拍到背部" },
  { key: "full", label: "站立全身", hint: "四脚站立，全身无裁剪" },
  { key: "head", label: "清晰头部", hint: "特写，五官清晰" },
] as const;

const QC_CHECKS = [
  "光线充足（避免逆光/强阴影）",
  "距离合适（宠物占画面主要部分）",
  "全身完整（不裁剪四肢/尾巴）",
  "无遮挡（没有手/玩具/栏杆挡住）",
  "画面清晰（不模糊）",
  "画面里只有一只宠物",
  "避免出现人脸/车牌/地址等隐私内容",
] as const;

interface CaptureResult {
  capture_id: string;
  status: string;
  qc_passed: boolean | null;
  qc_result: Record<string, unknown>;
}

export default function CaptureWizard({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [shots, setShots] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);

  async function onFile(angle: string, file: File | undefined) {
    if (!file || !petId) return;
    setUploading(true);
    setError(null);
    try {
      const r = await api.upload<{ artifact_id: string }>(`/pets/${petId}/artifacts`, file);
      setShots((s) => ({ ...s, [angle]: r.artifact_id }));
    } catch (e) {
      setError(mapErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!petId) return;
    const ids = Object.values(shots);
    if (ids.length === 0) {
      setError("至少上传一张照片。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cap = await api.post<{ capture_id: string }>(`/pets/${petId}/visual-captures`, {
        artifact_ids: ids,
        capture_type: "PHOTO_SET",
        consent_visual_model_training: false,
      });
      const qc = await api.post<CaptureResult>(
        `/pets/${petId}/visual-captures/${cap.capture_id}/qc`,
        {},
      );
      setResult(qc);
    } catch (e) {
      setError(mapErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const uploaded = Object.keys(shots).length;

  return (
    <main>
      <h1>拍摄宠物照片 · 3D 形象素材</h1>
      <p className="sub">
        拍 6 个角度的照片（或 12–20 张 / 10–20 秒环绕视频），生成 3D 形象会更像它。
        照片只用于生成它的 3D 形象，默认不用于任何模型训练。
      </p>
      {error && <div className="alert emergency" role="alert">{error}</div>}

      <div className="card">
        <h2>拍摄角度</h2>
        <div className="grid2">
          {ANGLES.map((a) => (
            <label key={a.key} className="field" style={{ border: "1px solid var(--pli-line-default, #e8e2d9)", borderRadius: 10, padding: 10, margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{a.label}</span>
              <span className="muted" style={{ display: "block", marginBottom: 6 }}>{a.hint}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => onFile(a.key, e.target.files?.[0])}
              />
              {shots[a.key] && <span className="badge MONITOR" style={{ marginTop: 6 }}>已上传 ✓</span>}
            </label>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          已上传 {uploaded}/6 · 也可以只传 1 张先试（推荐凑齐 4 张以上以提高相似度）。
        </p>
        <button className="btn primary" onClick={submit} disabled={busy || uploaded === 0}>
          {busy ? "上传并质检…" : "上传并质检"}
        </button>
      </div>

      <div className="card">
        <h2>拍摄与隐私提示</h2>
        <ul className="tl">
          {QC_CHECKS.map((c) => (
            <li key={c}>
              <div className="tl-body">{c}</div>
            </li>
          ))}
        </ul>
      </div>

      {result && (
        <div className="card">
          <h2>质检结果</h2>
          <State state="ready" error={null} onRetry={() => {}} empty="">
            <p className="sub" style={{ margin: 0 }}>
              <span className={`badge ${result.qc_passed ? "MONITOR" : "EMERGENCY"}`}>
                {result.qc_passed ? "质检通过" : "质检未通过（最少需要 1 张照片）"}
              </span>
              <span className="badge">{result.status}</span>
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              {String(result.qc_result?.note ?? "")}
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <Link href={`/pets/${petId}/life-view`} className="btn primary">
                去生命视图提交生成
              </Link>
              <button className="btn" onClick={() => setResult(null)}>
                重新拍摄
              </button>
            </div>
          </State>
        </div>
      )}
    </main>
  );
}
