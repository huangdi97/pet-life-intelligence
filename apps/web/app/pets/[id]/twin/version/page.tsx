"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@pli/api-client";
import { fmtTime, fmtDate } from "../../../../../lib/hooks";
import { mapErrorMessage } from "../../../../../lib/i18n";

/** TWIN VERSION — 3D 形象版本历史（R2-P3D GOAL G）。
 *  当前版本信息来自 /visual-models（真实 runtime）；未生成过时显示诚实空态。
 *  「完善 3D 形象」入口 → /capture。
 */

interface VisualModelRow {
  model_id: string;
  version: number;
  status: string;
  owner_verified: boolean | null;
  provenance_kind: string;
  created_at: string;
  activated_at: string | null;
  artifact_map: Record<string, string>;
  identity_qc: Record<string, unknown>;
  observed_surface_manifest?: Record<string, string>;
  metadata_json?: {
    demo_fixture?: boolean;
    opts?: { observed_photo_count?: number; media_provenance?: string };
  };
}

/** 模型状态 → 用户语言（不泄漏 raw 枚举）。 */
function statusZh(status: string): string {
  if (status === "GENERATING") return "生成中";
  if (status === "READY") return "待确认";
  if (status === "VERIFYING") return "已确认";
  if (status === "ACTIVE") return "使用中";
  if (status === "RETIRED") return "已停用";
  if (status === "FAILED") return "生成失败";
  return "待确认";
}

export default function TwinVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [petName, setPetName] = useState<string | null>(null);
  const [models, setModels] = useState<VisualModelRow[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ name: string }>(`/pets/${petId}`)
      .then((p) => setPetName(p.name))
      .catch(() => setPetName(null));
    api
      .get<{ models: VisualModelRow[] }>(`/pets/${petId}/visual-models`)
      .then((r) => setModels(r.models))
      .catch((e: unknown) => setNote(mapErrorMessage(e)));
  }, [petId]);

  const current = models[0] ?? null;
  const history = models.slice(1);
  const currentIsDemo = current?.metadata_json?.demo_fixture === true;
  const currentPhotoCount = Number(current?.metadata_json?.opts?.observed_photo_count ?? 0);
  const currentObservedCount = Object.keys(current?.observed_surface_manifest ?? {}).length;

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.twinversion.identity">
        <h1>{petName ? `${petName} · 3D 形象版本` : "3D 形象版本"}</h1>
        <p className="sub">每一次生成与确认都会留下版本记录，来源与时间都可追溯。</p>
      </div>

      {current ? (
        <section className="v5-utility-surface v5-utility-surface--soft" data-testid="pli.twinversion.current">
          <h2>当前版本 · 第 {current.version} 版</h2>
          <p className="sub" style={{ margin: 0 }}>{statusZh(current.status)}</p>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <span className="badge" data-testid="pli.twinversion.time">生成于 {fmtTime(current.created_at)}</span>
            <span className="badge" data-testid="pli.twinversion.source">
              {currentIsDemo
                ? "来源 · 示例模板"
                : currentPhotoCount > 0
                  ? `来源 · ${currentPhotoCount} 张照片`
                  : currentObservedCount > 0
                    ? `来源素材区域 · ${currentObservedCount} 项`
                    : "来源素材 · 未观察到"}
            </span>
            <span className="badge" data-testid="pli.twinversion.verify">
              {currentIsDemo ? "示例体验 · 非真实宠物身份确认" : current.owner_verified ? "已通过主人确认" : "待主人确认"}
            </span>
          </div>
        </section>
      ) : (
        <section className="v5-utility-surface v5-utility-surface--soft" data-testid="pli.twinversion.current">
          <h2>当前版本</h2>
          <p className="sub" style={{ margin: 0 }}>还没有生成 3D 形象。拍摄素材并生成后，这里会显示版本信息。</p>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <span className="badge" data-testid="pli.twinversion.time">生成时间 · 暂无</span>
            <span className="badge" data-testid="pli.twinversion.source">来源素材 · 暂无</span>
            <span className="badge" data-testid="pli.twinversion.verify">主人确认 · 待确认</span>
          </div>
          {note && <p className="muted" style={{ marginTop: 8 }}>{note}</p>}
        </section>
      )}

      <section className="v4-sec" data-testid="pli.twinversion.info">
        <h2>版本说明</h2>
        <p className="muted" style={{ margin: 0 }}>
          每个版本都记录来源、生成时间与确认状态；示例模板会明确标注，真实候选只有在主人确认后才会成为当前形象。
        </p>
      </section>

      <section className="v5-utility-surface" data-testid="pli.twinversion.history">
        <h2>历史版本</h2>
        {history.length > 0 ? (
          history.map((m) => (
            <button
              key={m.model_id}
              type="button"
              className="tl-head v5-version-row"
              style={{ textAlign: "left", cursor: "pointer" }}
              data-testid="pli.twinversion.history"
              onClick={() => {
                window.location.assign(`/pets/${petId}/twin/review?version=${m.version}`);
              }}
            >
              <span className="tl-type">第 {m.version} 版</span>
              <span className="badge">{statusZh(m.status)}</span>
              <span className="tl-time">{m.created_at ? fmtDate(m.created_at) : ""}</span>
            </button>
          ))
        ) : (
          <button
            type="button"
            className="tl-head v5-version-row"
            style={{ textAlign: "left", cursor: "pointer" }}
            data-testid="pli.twinversion.history"
            onClick={() => window.location.assign(`/pets/${petId}/capture`)}
          >
            <span className="tl-type">第 1 版 · 尚未生成</span>
            <span className="badge">去拍摄素材</span>
          </button>
        )}
      </section>

      <section className="v5-utility-surface v5-utility-surface--soft">
        <h2>完善 3D 形象</h2>
        <p className="muted" style={{ margin: 0 }}>补充更多角度的照片，可以让 3D 形象更像它。</p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href={`/pets/${petId}/capture`} className="btn primary" data-testid="pli.twinversion.entry">
            完善 3D 形象
          </Link>
        </div>
      </section>
    </main>
  );
}
