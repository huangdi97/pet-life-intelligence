"use client";

import { use, useState } from "react";

import Link from "next/link";
import { api } from "@pli/api-client";
import { fmtTime, useAsync } from "../../../../lib/hooks";
import { mapErrorMessage, t } from "../../../../lib/i18n";
import { State } from "../../../../components/ui";

/** PET 3D LIFE VIEW — Stage H.2（GOAL PHASE H / I / K）。
 *  真实宠物照片 + Current State + Baseline + Actions 永远可用；
 *  3D 模型仅在有已激活版本时展示，且明确标注 GENERATED_3D（不是 Live/录像）。
 *  无真实 provider 时诚实显示「3D 服务暂未开放」，不伪装成功。
 *  用户侧文案：3D 形象 / 生命视图 / 看看它 —— 不使用「数字孪生」。
 */

interface VisualStatus {
  provider: string;
  real: boolean;
  status: string;
}

interface VisualModel {
  model_id: string;
  version: number;
  provider: string;
  status: string;
  failure_reason: string | null;
  owner_verified: boolean | null;
  identity_qc: { result?: string; issues?: string[] };
  provenance_kind: string;
  activated_at: string | null;
  retired_at: string | null;
  created_at: string;
}

interface Manifest {
  pet_id: string;
  model_id: string;
  version: number;
  render_targets: { poster?: string; low?: string; interactive?: string; turntable?: string };
  lod_policy: { order: string[]; fallback?: string };
  fallback_policy: { primary?: string };
  freshness_checked_at: string;
}

interface OverlayMetric {
  key: string;
  label: string;
  current: string | number;
  baseline_range: string | null;
  delta: number | null;
  freshness: string;
  source: string;
}

interface StateOverlay {
  pet_id: string;
  provenance_kind: string;
  provider_real: boolean;
  model_status: string | null;
  metrics: OverlayMetric[];
  note: string;
}

interface PetRow {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
}

export default function PetLifeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [generating, setGenerating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const pet = useAsync<PetRow>(
    () => (petId ? api.get(`/pets/${petId}`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const status = useAsync<VisualStatus>(() => api.get("/visual/status"), []);
  const models = useAsync<{ models: VisualModel[] }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const manifest = useAsync<Manifest>(
    () =>
      petId
        ? api.get(`/pets/${petId}/visual-model/render-manifest`)
        : Promise.reject(new Error("NO_PET")),
    [petId],
  );
  const overlay = useAsync<StateOverlay>(
    () =>
      petId
        ? api.get(`/pets/${petId}/state-overlay`)
        : Promise.reject(new Error("NO_PET")),
    [petId],
  );

  const active =
    models.data?.models.find((m) => m.status === "ACTIVE") ??
    models.data?.models.find((m) => m.status === "VERIFYING") ??
    null;
  const providerBlocked = status.data?.real === false;

  async function startGeneration() {
    if (!petId) return;
    setGenerating(true);
    setFlash(null);
    try {
      await api.post(`/pets/${petId}/visual-models`, { capture_id: null, opts: {} });
      setFlash("已提交 3D 形象生成请求（当前无真实生成服务，会诚实显示不可用状态）。");
      models.reload();
      status.reload();
    } catch (e) {
      setFlash(mapErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main>
      <h1>{pet.data?.name ?? t("pets.detail")} · 生命视图</h1>
      <p className="sub">
        这是 {pet.data?.name ?? "它"}的 3D 形象与当前状态。3D 形象由主人的真实照片生成并经过你确认后才显示；
        它只是外观，不包含任何健康信息推断。真实照片与记录永远是基础。
      </p>
      {flash && <div className="alert info">{flash}</div>}

      {/* Provider status — 诚实 */}
      <div className="card">
        <h2>3D 形象服务</h2>
        <State state={status.state} error={status.error ? mapErrorMessage(status.error) : null} onRetry={status.reload} empty="—">
          {providerBlocked ? (
            <>
              <div className="state">
                3D 生成服务暂未开放
                <div className="muted" style={{ marginTop: 6 }}>
                  当前未接入真实 3D 生成服务（provider: {status.data?.provider}）。此页面不会伪装生成成功。
                </div>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" disabled={generating} onClick={startGeneration}>
                  {generating ? "提交中…" : "尝试提交生成请求"}
                </button>
                <Link href={`/pets/${petId}/capture`} className="btn primary">
                  拍摄宠物照片
                </Link>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              3D 生成服务已就绪（provider: {status.data?.provider}）。
            </p>
          )}
        </State>
      </div>

      {/* 模型版本 */}
      <div className="card">
        <h2>3D 形象版本</h2>
        <State
          state={models.state}
          error={models.error ? mapErrorMessage(models.error) : null}
          onRetry={models.reload}
          empty="还没有 3D 形象版本。"
        >
          {models.data?.models.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              还没有 3D 形象。你可以尝试提交生成请求；真实生成服务接入后，这里会显示待确认与已激活的版本。
            </p>
          )}
          <ul className="tl">
            {models.data?.models.map((m) => (
              <li key={m.model_id}>
                <div className="tl-head">
                  <span className="tl-type">v{m.version}</span>
                  <span className={`badge ${m.status === "ACTIVE" ? "MONITOR" : m.status === "FAILED" ? "EMERGENCY" : ""}`}>
                    {m.status}
                  </span>
                  <span className="badge">{m.provenance_kind}</span>
                  {m.owner_verified === true && <span className="badge">已确认像它</span>}
                  {m.owner_verified === false && <span className="badge">待重新生成</span>}
                  {m.activated_at && <span className="tl-time">激活于 {fmtTime(m.activated_at)}</span>}
                </div>
                {m.failure_reason && (
                  <div className="tl-body muted">
                    失败原因：{m.failure_reason}（真实生成服务未接入，不会伪装成功）
                  </div>
                )}
                {m.identity_qc?.issues && m.identity_qc.issues.length > 0 && (
                  <div className="tl-body muted">待修正：{m.identity_qc.issues.join("、")}</div>
                )}
              </li>
            ))}
          </ul>
        </State>
      </div>

      {/* 当前状态（真实事实引用） */}
      <div className="card">
        <h2>当前状态</h2>
        <State
          state={overlay.state}
          error={overlay.error ? mapErrorMessage(overlay.error) : null}
          onRetry={overlay.reload}
          empty="今天还没有可展示的状态。"
        >
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {overlay.data?.metrics.map((m) => (
              <span key={m.key + m.label} className="badge">
                {m.label}：{String(m.current)}
                {m.baseline_range ? ` · 基线 ${m.baseline_range}` : ""}
                {m.delta != null ? ` · 变化 ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}
                {m.freshness ? ` · ${m.freshness}` : ""}
              </span>
            ))}
          </div>
          {overlay.data?.metrics.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              今天还没有记录。
            </p>
          )}
          {overlay.data?.note && (
            <p className="muted" style={{ marginTop: 8 }}>
              {overlay.data.note}
            </p>
          )}
        </State>
      </div>

      {/* 真实照片 fallback（始终可用，核心不依赖 3D） */}
      <div className="card">
        <h2>真实照片</h2>
        <p className="sub" style={{ margin: 0 }}>
          3D 不可用或失败时，这里始终展示它的真实照片与记录（照片上传功能见健康证据与 Quick Log）。
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href={`/pets/${petId}`} className="btn">
            宠物档案
          </Link>
          <Link href="/timeline" className="btn">
            查看时间线
          </Link>
          <Link href="/monitoring" className="btn">
            看看它
          </Link>
        </div>
      </div>
    </main>
  );
}

