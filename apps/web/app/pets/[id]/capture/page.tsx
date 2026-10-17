"use client";

import { use, useEffect, useState } from "react";
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

const QC_DIMS: Array<{ key: string; label: string }> = [
  { key: "clarity", label: "清晰度" },
  { key: "occlusion", label: "遮挡" },
  { key: "coverage", label: "覆盖" },
  { key: "identity", label: "身份一致性" },
];

interface CaptureResult {
  capture_id: string;
  status: string;
  qc_passed: boolean | null;
  qc_result: Record<string, unknown>;
}

function captureStatusLabel(status: string): string {
  if (status === "READY") return "素材已就绪";
  if (status === "QC_PASSED") return "质检通过";
  if (status === "QC_FAILED") return "需要补拍";
  if (status === "UPLOADING") return "上传中";
  return "素材已记录";
}

function qcValueLabel(value: unknown): string {
  if (value === true) return "通过";
  if (value === false) return "需改善";
  if (typeof value === "string") {
    const v = value.toUpperCase();
    if (v === "PASS" || v === "GOOD" || v === "OK") return "通过";
    if (v === "FAIL" || v === "BAD") return "需改善";
    return "已评估";
  }
  return "待评估";
}

export default function CaptureWizard({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [petName, setPetName] = useState<string | null>(null);
  const [shots, setShots] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);

  useEffect(() => {
    if (!petId) return;
    api
      .get<{ name: string }>(`/pets/${petId}`)
      .then((p) => setPetName(p.name))
      .catch(() => setPetName(null));
  }, [petId]);

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
    const canonicalShots = Object.fromEntries(
      Object.entries(shots).map(([angle, artifactId]) => [
        angle === "full" ? "full_body" : angle,
        artifactId,
      ]),
    );
    const ids = Object.values(canonicalShots);
    const requiredReady = Boolean(canonicalShots.front && canonicalShots.full_body && canonicalShots.head);
    if (!requiredReady) {
      setError("请先完成正面、站立全身和清晰头部三张必需照片。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cap = await api.post<{ capture_id: string }>(`/pets/${petId}/visual-captures`, {
        artifact_ids: ids,
        capture_type: "PHOTO_SET",
        consent_visual_model_training: false,
        coverage: Object.fromEntries(
          ANGLES.map((a) => [a.key === "full" ? "full_body" : a.key, Boolean(shots[a.key])]),
        ),
        angle_artifact_ids: canonicalShots,
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
  const requiredReady = Boolean(shots.front && shots.full && shots.head);

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.twincapture.identity">
        <h1 data-testid="pli.twincapture.title">{petName ? `${petName} · 拍摄宠物照片 · 3D 形象素材` : "拍摄宠物照片 · 3D 形象素材"}</h1>
        <p className="sub">
          拍 6 个角度的照片（或 12–20 张 / 10–20 秒环绕视频），生成 3D 形象会更像它。
          照片只用于生成它的 3D 形象，默认不用于任何模型训练。
        </p>
      </div>
      {error && <div className="alert emergency" role="alert">{error}</div>}

      <section className="v5-form-surface" data-testid="pli.twincapture.preview">
        <h2>拍摄角度</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>
          已上传 {uploaded}/6 · 正面、站立全身、清晰头部为生成门禁；补齐左右侧与背部会提供更多个体外观证据。
        </p>
        <div className="v5-capture-grid">
          {ANGLES.map((a) => (
            <label key={a.key} className="field v5-capture-tile" data-testid={`pli.twincapture.view.${a.key}`}>
              <span style={{ fontWeight: 600 }}>{a.label}</span>
              <span className="muted" style={{ display: "block", marginBottom: 6 }}>{a.hint}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => onFile(a.key, e.target.files?.[0])}
              />
              <span className="muted" style={{ display: "block", marginTop: 6 }} data-testid={`pli.twincapture.status.${a.key}`}>
                {shots[a.key] ? "已上传 ✓" : "未上传"}
              </span>
            </label>
          ))}
        </div>
        <button className="btn primary" onClick={submit} disabled={busy || !requiredReady} data-testid="pli.twincapture.action">
          {busy ? "上传并质检…" : requiredReady ? "上传并质检" : "先完成正面、全身和头部"}
        </button>
      </section>

      <section className="v5-utility-surface v5-utility-surface--soft">
        <h2>拍摄与隐私提示</h2>
        <ul className="tl">
          {QC_CHECKS.map((c) => (
            <li key={c}>
              <div className="tl-body">{c}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="v5-utility-surface" data-testid="pli.twincapture.qc">
        <h2>质检结果</h2>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }} data-testid="pli.twincapture.qc.dims">
          {QC_DIMS.map((d) => (
            <span key={d.key} className="badge" data-testid={`pli.twincapture.qc.${d.key}`}>
              {d.label}：{result ? qcValueLabel(result.qc_result?.[d.key]) : "待上传后评估"}
            </span>
          ))}
        </div>
        {result && (
          <State state="ready" error={null} onRetry={() => {}} empty="">
            <p className="sub" style={{ margin: 0 }}>
              <span className={`badge ${result.qc_passed ? "MONITOR" : "EMERGENCY"}`}>
                {result.qc_passed ? "质检通过" : "质检未通过（请按提示补齐必需角度）"}
              </span>
              <span className="badge">{captureStatusLabel(result.status)}</span>
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
        )}
      </section>

      <section className="v5-utility-surface v5-utility-surface--soft" data-testid="pli.twincapture.retake">
        <h2>需要补拍？</h2>
        <p className="muted" style={{ margin: 0 }}>
          某个角度缺失或画面不清晰时，重新选择对应角度的照片即可覆盖。
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setResult(null)} data-testid="pli.twincapture.retake.button">
            重新拍摄
          </button>
        </div>
      </section>
    </main>
  );
}
