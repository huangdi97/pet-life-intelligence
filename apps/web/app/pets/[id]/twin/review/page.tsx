"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@pli/api-client";
import { Pet3DViewer } from "../../../../../components/three/pet3d-viewer";
import { resolvePet3DIdentity } from "@pli/pet-3d";
import { mapErrorMessage } from "../../../../../lib/i18n";

/** TWIN REVIEW — 主人确认 3D 形象（R2-P3D GOAL G/G3）。
 *  很像/基本像/不像 → 不像时「哪里不像」可选 → 激活按钮禁用（需补充素材后重新生成）。
 *  验证与激活 POST 走真实 API（/visual-models/{version}/verify|activate）；
 *  未生成过形象时如实提示，不伪造成功。
 */

const VERIFY_OPTIONS: Array<{ id: "like" | "basic_like" | "not_like"; label: string }> = [
  { id: "like", label: "很像" },
  { id: "basic_like", label: "基本像" },
  { id: "not_like", label: "不像" },
];

const ISSUES: Array<{ key: string; label: string }> = [
  { key: "face", label: "脸型" },
  { key: "ear", label: "耳朵" },
  { key: "coat", label: "毛发" },
  { key: "pattern", label: "花纹" },
  { key: "body", label: "身形" },
  { key: "tail", label: "尾巴" },
  { key: "legs", label: "四肢" },
  { key: "unique_marks", label: "独特标记" },
];

interface PetRow {
  name: string;
  species?: string | null;
  breed?: string | null;
}

interface VisualModelRow {
  model_id: string;
  version: number;
  status: string;
  provenance_kind: string;
  created_at: string;
  artifact_map: Record<string, string>;
  identity_qc: Record<string, unknown>;
}

export default function TwinReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [version, setVersion] = useState(1);
  const [pet, setPet] = useState<PetRow | null>(null);
  const [model, setModel] = useState<VisualModelRow | null>(null);
  const [modelNote, setModelNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<"like" | "basic_like" | "not_like" | null>(null);
  const [issueKeys, setIssueKeys] = useState<string[]>([]);
  const [view, setView] = useState<"front" | "side" | "back">("front");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const v = Number(new URLSearchParams(window.location.search).get("version")) || 1;
    setVersion(v);
    Promise.all([
      api.get<PetRow>(`/pets/${petId}`).catch(() => null),
      api.get<VisualModelRow>(`/pets/${petId}/visual-models/${v}`).catch((e: unknown) => {
        setModelNote(mapErrorMessage(e));
        return null;
      }),
    ]).then(([p, m]) => {
      setPet(p);
      setModel(m);
    });
  }, [petId, version]);

  async function verify(option: "like" | "basic_like" | "not_like") {
    setSelected(option);
    setMsg(null);
    if (option !== "not_like") setIssueKeys([]);
    // 真实 API 存在（POST /visual-models/{version}/verify）；失败时保持客户端诚实态。
    try {
      await api.post(`/pets/${petId}/visual-models/${version}/verify`, {
        result: option,
        issues: option === "not_like" ? issueKeys : [],
        notes: "",
      });
    } catch (e) {
      setMsg("还没有可确认的 3D 形象，先拍摄素材并生成后再确认。");
      setModelNote(mapErrorMessage(e));
    }
  }

  async function activate() {
    if (!selected || selected === "not_like" || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/visual-models/${version}/activate`, {});
      setMsg("已确认并激活这个 3D 形象。");
    } catch (e) {
      setMsg(mapErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const identity = resolvePet3DIdentity({ name: pet?.name, species: pet?.species, breed: pet?.breed });
  const show3d = identity !== null;
  const modelDescriptor = (model?.artifact_map as Record<string, unknown>)?.twin_descriptor as import("@pli/pet-3d").TwinDescriptor | undefined;
  const modelSurface = (modelDescriptor as { surface?: { observed_regions?: string[] } } | undefined)?.surface?.observed_regions;
  const twinSourceMediaCount = modelSurface?.length ?? 0;
  // INVARIANT: pass a STABLE twin object. The spread below is intentionally
  // memoized — a fresh object per render would remount the 3D scene (the
  // viewer keys its effect on `twin`), resetting the camera and defeating the
  // front/side/back presets that drive the real camera on click.
  const viewerTwin = useMemo<import("@pli/pet-3d").TwinDescriptor | null>(
    () =>
      model && modelDescriptor
        ? {
            ...modelDescriptor,
            family: pet?.species === "cat" ? "standard-cat" : "corgi-like",
            version: model.version,
            provenance: model.provenance_kind,
          }
        : null,
    [model, modelDescriptor, pet?.species, model?.version, model?.provenance_kind],
  );

  return (
    <main data-pli-selected={selected ?? ""}>
      <div data-testid="pli.twinreview.identity">
        <h1>{pet ? `${pet.name} · 确认 3D 形象` : "确认 3D 形象"}</h1>
        <p className="sub">
          第 {version} 版 · 对比照片确认它是否像。确认后才会作为它的 3D 形象显示。
        </p>
      </div>

      <div className="card" data-testid="pli.twinreview.stage" style={{ position: "relative", minHeight: 380 }}>
        <div data-testid="pli.twinreview.twin" style={{ position: "absolute", inset: 0 }}>
          {show3d ? (
            <Pet3DViewer
              identity={identity}
              variant="life"
              interactive
              petId={petId}
              frameTarget={0.28}
              stageRole="review"
              realityField="review-studio"
              sourceMediaCount={twinSourceMediaCount}
              twin={viewerTwin}
            />
          ) : (
            <div className="page-center" style={{ minHeight: 240 }}>
              <p className="muted">还没有可展示的 3D 形象。先拍摄素材并生成后再确认。</p>
            </div>
          )}
        </div>
      </div>
      {modelNote && <p className="muted" style={{ marginTop: 6 }}>还没有可确认的 3D 形象 · {modelNote}</p>}

      <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {(
          [
            { id: "front", label: "正面" },
            { id: "side", label: "侧面" },
            { id: "back", label: "背面" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            className={`btn${view === v.id ? " primary" : ""}`}
            onClick={() => {
              setView(v.id);
              const yaw = v.id === "front" ? 0 : v.id === "side" ? Math.PI / 2 : Math.PI;
              (window as any).__PLI_SET_VIEW?.(yaw);
            }}
            data-testid={`pli.twinreview.view.${v.id}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>它像吗？</h2>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {VERIFY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`btn${selected === o.id ? " primary" : ""}`}
              onClick={() => verify(o.id)}
              disabled={busy}
              aria-pressed={selected === o.id}
              data-testid={`pli.twinreview.verify.${o.id}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {selected === "not_like" && (
          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {ISSUES.map((i) => (
              <button
                key={i.key}
                type="button"
                className={`btn${issueKeys.includes(i.key) ? " primary" : ""}`}
                onClick={() =>
                  setIssueKeys((ks) => (ks.includes(i.key) ? ks.filter((k) => k !== i.key) : [...ks, i.key]))
                }
                data-testid={`pli.twinreview.issue.${i.key}`}
              >
                {i.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {msg && <div className="alert info">{msg}</div>}
      <div className="card">
        <h2 data-testid="pli.twinreview.status">
          {selected === null
            ? "还未确认"
            : selected === "not_like"
              ? "不像：需补充素材后重新生成"
              : selected === "basic_like"
                ? "基本像：已记录确认"
                : "很像：已记录确认"}
        </h2>
        <button
          type="button"
          className="btn primary"
          onClick={activate}
          disabled={busy || !selected || selected === "not_like"}
          data-testid="pli.twinreview.action.activate"
        >
          {selected === "not_like" ? "需补充素材后重新生成" : "激活这个 3D 形象"}
        </button>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href={`/pets/${petId}/capture`} className="btn">
            拍摄更多素材
          </Link>
          <Link href={`/pets/${petId}/twin/version`} className="btn">
            查看版本
          </Link>
        </div>
      </div>
    </main>
  );
}
