"use client";

import { use, useState } from "react";

import Link from "next/link";
import { api } from "@pli/api-client";
import { useAsync } from "../../../../lib/hooks";
import { mapErrorMessage, t } from "../../../../lib/i18n";
import { ModelVersionsCard } from "./_components/ModelVersionsCard";
import { ProviderStatusCard } from "./_components/ProviderStatusCard";
import { RealPhotoCard } from "./_components/RealPhotoCard";
import { StateOverlayCard } from "./_components/StateOverlayCard";
import type { Manifest, PetRow, StateOverlay, VisualModel, VisualStatus } from "./_components/types";

/** PET 3D LIFE VIEW — Stage H.2（GOAL PHASE H / I / K）。
 *  真实宠物照片 + Current State + Baseline + Actions 永远可用；
 *  3D 模型仅在有已激活版本时展示，且明确标注 GENERATED_3D（不是 Live/录像）。
 *  无真实 provider 时诚实显示「3D 服务暂未开放」，不伪装成功。
 *  用户侧文案：3D 形象 / 生命视图 / 看看它 —— 不使用「数字孪生」。
 */
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
      <main>
        <h1>{t("pets.detail")} · 生命视图</h1>
        <div className="state denied" role="alert">
          没有查看此内容的权限（403）。如需访问，请联系宠物主人授权。
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/" className="btn primary" role="button">
            {t("notFound.home")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>{pet.data?.name ?? t("pets.detail")} · 生命视图</h1>
      <p className="sub">
        这是 {pet.data?.name ?? "它"}的 3D 形象与当前状态。3D 形象由主人的真实照片生成并经过你确认后才显示；
        它只是外观，不包含任何健康信息推断。真实照片与记录永远是基础。
      </p>
      {flash && <div className="alert info">{flash}</div>}

      <ProviderStatusCard
        status={status}
        providerBlocked={providerBlocked}
        generating={generating}
        petId={petId}
        onStartGeneration={startGeneration}
      />

      <ModelVersionsCard models={models} />

      <StateOverlayCard overlay={overlay} />

      <RealPhotoCard petId={petId} />
    </main>
  );
}
