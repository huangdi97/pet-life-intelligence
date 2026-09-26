"use client";

import { use, useState } from "react";

import Link from "next/link";
import { api } from "@pli/api-client";
import { useAsync } from "../../../../lib/hooks";
import { mapErrorMessage, t } from "../../../../lib/i18n";
import { Icon } from "../../../../components/icons";
import { ModelVersionsCard } from "./_components/ModelVersionsCard";
import { ProviderStatusCard } from "./_components/ProviderStatusCard";
import { RealPhotoCard } from "./_components/RealPhotoCard";
import { StateOverlayCard } from "./_components/StateOverlayCard";
import type { Manifest, PetRow, StateOverlay, VisualModel, VisualStatus } from "./_components/types";

/** PET 3D LIFE VIEW — Photo-first Life View（Stage R.2 §31-§36）。
 *  真实宠物视觉 + 当前状态 + 行动永远可用；3D 形象仅在有已激活版本时展示，
 *  且明确标注生成来源（不是 Live/录像）。无真实服务时诚实显示，不伪装成功。 */
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

  // Permission denied: render an explicit, human-language blocked state
  // (never a crash). Covers sitter-without-grant etc.
  if (pet.state === "denied") {
    return (
      <main className="v4-main">
        <h1>{t("pets.detail")} · 生命视图</h1>
        <div className="v4-error" role="alert">
          没有查看此内容的权限（403）。如需访问，请联系宠物主人授权。
        </div>
        <div className="v4-linkrow">
          <Link href="/" className="v4-action v4-action--primary" role="button">
            {t("notFound.home")}
          </Link>
        </div>
      </main>
    );
  }

  const name = pet.data?.name ?? "它";

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>生命视图</h1>
        <p className="v4-topline-sub">{name} · 此刻</p>
      </div>
      {flash && <div className="alert info">{flash}</div>}

      <div className="v4-stage">
        <div className="v4-art" aria-hidden="true">
          <Icon name="paw" size={120} strokeWidth={1.2} className="v4-art-paw" />
        </div>
        <div>
          <p className="v4-stage-title">{name}</p>
          <p className="v4-stage-line">这是它的可视生命状态入口：真实照片与记录始终是基础。</p>
          <p className="v4-stage-note">
            {active
              ? "3D 形象已激活，只描述外观，不包含任何健康信息推断。"
              : "3D 形象尚未创建；当前展示真实记录与状态。"}
          </p>
        </div>
      </div>

      <div className="v4-grid">
        <div>
          <StateOverlayCard overlay={overlay} />
          <RealPhotoCard petId={petId} />
          <div className="v4-sec">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">生命轨迹</h2>
              <Link href="/timeline" className="v4-sec-link">
                查看完整时间线
              </Link>
            </div>
            <p className="v4-sec-sub">每一天真实发生的事情，带时间与来源，一直累积成它的生命轨迹。</p>
          </div>
        </div>

        <div className="v4-rail">
          <ProviderStatusCard
            status={status}
            providerBlocked={providerBlocked}
            generating={generating}
            petId={petId}
            onStartGeneration={startGeneration}
          />
          <ModelVersionsCard models={models} />
          <p className="v4-note" style={{ margin: "10px 0 0" }}>
            生成的 3D 形象只来自真实照片，经过你确认后才显示；任何健康相关结论都来自独立规则引擎，不来自形象本身。
          </p>
          {/* manifest 加载保留：3D 渲染就绪后在此展示（当前为外部阻塞，不展示内部信息） */}
          {active && manifest.data && (
            <div className="v4-chip v4-chip--success" style={{ marginTop: 10 }}>
              <span className="v4-chip-icon">3D 形象已就绪</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
