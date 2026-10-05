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
  const [version, setVersion] = useState(0);
  const [pet, setPet] = useState<PetRow | null>(null);
  const [model, setModel] = useState<VisualModelRow | null>(null);
  const [modelNote, setModelNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<"like" | "basic_like" | "not_like" | null>(null);
  const [issueKeys, setIssueKeys] = useState<string[]>([]);
  const [view, setView] = useState<"front" | "side" | "back">("front");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const requestedVersion = Number(new URLSearchParams(window.location.search).get("version")) || 0;

    const modelRequest = async (): Promise<VisualModelRow | null> => {
      try {
        let resolved = requestedVersion;
        if (resolved <= 0) {
          const list = await api.get<{ models: VisualModelRow[] }>(`/pets/${petId}/visual-models`);
          resolved = Number(list.models?.[0]?.version ?? 0);
        }
        if (resolved <= 0) {
          if (alive) {
            setVersion(0);
            setModelNote("还没有已生成的 3D 形象。");
          }
          return null;
        }
        const value = await api.get<VisualModelRow>(`/pets/${petId}/visual-models/${resolved}`);
        if (alive) {
          setVersion(resolved);
          setModelNote(null);
        }
        return value;
      } catch (e: unknown) {
        if (alive) setModelNote(mapErrorMessage(e));
        return null;
      }
    };

    Promise.all([
      api.get<PetRow>(`/pets/${petId}`).catch(() => null),
      modelRequest(),
    ]).then(([p, m]) => {
      if (!alive) return;
      setPet(p);
      setModel(m);
    });

    return () => {
      alive = false;
    };
  }, [petId]);

  function chooseReview(option: "like" | "basic_like" | "not_like") {
    setSelected(option);
    setMsg(null);
    if (option !== "not_like") setIssueKeys([]);
  }

  async function submitReview() {
    if (!selected || busy || version <= 0 || !model) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/visual-models/${version}/verify`, {
        result: selected,
        issues: selected === "not_like" ? issueKeys : [],
        notes: "",
      });
      if (selected === "not_like") {
        // Negative feedback is persisted with the final selected issue set but
        // can never activate the candidate.
        setMsg("已记录哪里不像。补充更多素材后可以重新生成；当前 3D 形象不会被替换。");
        return;
      }
      await api.post(`/pets/${petId}/visual-models/${version}/activate`, {});
      setMsg("已确认并激活这个 3D 形象。");
    } catch (e) {
      setMsg(mapErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const identity = resolvePet3DIdentity({ name: pet?.name, species: pet?.species, breed: pet?.breed });
  const modelDescriptor = (model?.artifact_map as Record<string, unknown>)?.twin_descriptor as import("@pli/pet-3d").TwinDescriptor | undefined;
  const show3d = identity !== null && modelDescriptor != null;
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
            // Preserve the backend's per-candidate family. Never coerce every
            // dog into a Corgi template just because the current demo dog is a
            // Corgi; fallback only when an older descriptor omitted family.
            family:
              modelDescriptor.family ??
              (pet?.species === "cat" ? "standard-cat" : "standard-dog"),
            version: model.version,
            provenance: model.provenance_kind,
          }
        : null,
    [model, modelDescriptor, pet?.species, model?.version, model?.provenance_kind],
  );

  return (
    <main className="v4-main v5-review-page" data-pli-selected={selected ?? ""}>
      <div className="v5-review-identity" data-testid="pli.twinreview.identity">
        <h1>{pet ? `${pet.name} · 确认 3D 形象` : "确认 3D 形象"}</h1>
        <p className="sub">
          {version > 0 ? `第 ${version} 版 · ` : ""}从正面、侧面和背面重点看脸、耳朵、毛色、身形与尾巴。只有你确认相似后才会启用。
        </p>
        <p className="v4-note" style={{ marginTop: 6 }}>
          {twinSourceMediaCount > 0
            ? `已关联 ${twinSourceMediaCount} 处素材区域；未观察到的部分仍可能来自模板推断。`
            : `当前外观来自演示/模板，不代表${pet?.name ?? "宠物"}的真实扫描或已验证个体外观。`}
        </p>
      </div>

      <div className="r5-review-studio v5-review-stage" data-testid="pli.twinreview.stage">
        <div data-testid="pli.twinreview.twin" style={{ position: "absolute", inset: 0 }}>
          {show3d ? (
            <Pet3DViewer
              identity={identity}
              displayName={pet?.name}
              variant="life"
              interactive
              petId={petId}
              frameTarget={0.38}
              stageRole="review"
              realityField="review-studio"
              sourceMediaCount={twinSourceMediaCount}
              twin={viewerTwin}
              view={view}
            />
          ) : (
            <div className="page-center" style={{ minHeight: 240 }}>
              <p className="muted">还没有可展示的 3D 形象。先拍摄素材并生成后再确认。</p>
            </div>
          )}
        </div>
      </div>
      {modelNote && <p className="muted" style={{ marginTop: 6 }}>还没有可确认的 3D 形象 · {modelNote}</p>}

      <div className="v5-review-tools">
        <h2>观察角度</h2>
        <p className="v5-review-hint">先从不同角度看清脸、耳朵、身形与尾巴，再判断是否像它。</p>
      </div>
      <div className="v5-segmented" aria-label="查看角度">
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
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            data-testid={`pli.twinreview.view.${v.id}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="v5-review-confirm">
        <h2>它像吗？</h2>
        <p className="v5-review-hint">只确认外观是否像它；这个选择不会改变健康、行为或时间线里的真实记录。</p>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {VERIFY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`btn${selected === o.id ? " primary" : ""}`}
              onClick={() => chooseReview(o.id)}
              disabled={busy || !model}
              aria-pressed={selected === o.id}
              data-testid={`pli.twinreview.verify.${o.id}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {selected === "not_like" && (
          <div className="v5-review-issues">
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
      <div className="v5-review-status">
        <h2 data-testid="pli.twinreview.status">
          {selected === null
            ? "还未确认"
            : selected === "not_like"
              ? "不像：可提交反馈，不会启用"
              : selected === "basic_like"
                ? "基本像：确认提交后才会启用"
                : "很像：确认提交后才会启用"}
        </h2>
        {selected === "not_like" ? (
          <button
            type="button"
            className="btn"
            onClick={submitReview}
            disabled={busy}
            data-testid="pli.twinreview.action.feedback"
          >
            {busy ? "提交中…" : "提交不像反馈"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn primary"
          onClick={submitReview}
          disabled={busy || !model || version <= 0 || !selected || selected === "not_like"}
          data-testid="pli.twinreview.action.activate"
        >
          {selected === "not_like" ? "需补充素材后重新生成" : busy ? "提交中…" : "确认并启用"}
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
