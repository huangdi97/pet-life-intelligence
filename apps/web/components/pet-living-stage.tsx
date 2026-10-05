"use client";

/**
 * PetLivingStage — shared web stage composition (R2-P3D §16/§19/§23).
 * Three depth layers: warm living environment, midground REAL 3D pet,
 * foreground state anchors + identity/now overlay. The same canonical asset
 * is used by Today / Pet / Life View so one pet identity persists across all
 * three surfaces. When no demo identity or WebGL failure, it degrades to the
 * certified 2.5D layer (labeled fallback — never the P0 target).
 */
import Link from "next/link";
import { useState } from "react";
import { Icon, type WebIconName } from "./icons";
import { resolvePet3DIdentity } from "@pli/pet-3d";
import { Pet3DViewer, type Pet3DStatus } from "./three/pet3d-viewer";

export interface StageAnchor {
  id: string;
  label: string;
  value: string;
  icon: WebIconName;
  href?: string;
}

interface Props {
  name: string;
  petId?: string;
  species?: string | null;
  breed?: string | null;
  variant?: "today" | "pet" | "life";
  anchors?: StageAnchor[];
  headline?: string;
  caption?: string;
  note?: string;
  demo?: boolean;
  /** Blind-UI: number of source media views used to build the individual twin. */
  sourceMediaCount?: number;
  /** Individual twin descriptor (R2P3D-R3 D): drives the real per-pet asset. */
  twin?: import("@pli/pet-3d").TwinDescriptor | null;
  /** Enables drag rotate + pinch zoom (Life View). */
  interactive?: boolean;
  /** Blind-UI contract: id on the outer stage section (e.g. pli.today.living-stage). */
  stageTestId?: string;
  /** Blind-UI contract: id on the element containing the 3D/2.5D renderer. */
  /** §31 framing target (fraction of full viewport) for the twin renderer. */
  frameTarget?: number;
  twinTestId?: string;
  /** Blind-UI contract: id prefix for state anchors (`${prefix}.${anchor.id}`). */
  anchorTestIdPrefix?: string;
  /** Blind-UI contract: id on the headline element. */
  headlineTestId?: string;
  /** V3 stage role (today/pet/life) — drives manifest + surface semantics. */
  stageRole?: string;
  /** V3 reality field id (warm-living / twin-space ...). */
  realityField?: string;
}

export function PetLivingStage({
  name,
  petId,
  sourceMediaCount: sourceMediaCountProp = 0,
  twin = null,
  species,
  breed,
  variant = "today",
  anchors = [],
  headline,
  caption,
  note,
  demo = false,
  interactive = false,
  frameTarget = 0,
  stageTestId,
  twinTestId,
  anchorTestIdPrefix,
  headlineTestId,
  stageRole,
  realityField,
}: Props) {
  const role = stageRole ?? variant;
  const field = realityField ?? "warm-living";
  const identity = resolvePet3DIdentity({ name, species, breed });
  const [pet3d, setPet3d] = useState<Pet3DStatus>("boot");
  const show3d = identity !== null && pet3d !== "failed";
  const stageClass = [
    "r2p-stage",
    variant === "life" ? "r2p-stage--life" : variant === "pet" ? "r2p-stage--pet" : "",
    show3d ? "r2p-stage--3d" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isCorgiLike = species === "dog" && /corgi|柯基/i.test(breed ?? "");
  const fallbackVisual = isCorgiLike ? (
    <div className="r2p-corgi" role="img" aria-label={`${name}的 2.5D 柯基形象：奶油色、额头白色花纹、竖立圆耳`}>
      <span className="part shadow" aria-hidden="true" />
      <span className="part ear-l" aria-hidden="true" />
      <span className="part ear-r" aria-hidden="true" />
      <span className="part ear-in-l" aria-hidden="true" />
      <span className="part ear-in-r" aria-hidden="true" />
      <span className="part leg-l" aria-hidden="true" />
      <span className="part leg-r" aria-hidden="true" />
      <span className="part body" aria-hidden="true" />
      <span className="part belly" aria-hidden="true" />
      <span className="part head" aria-hidden="true" />
      <span className="part blaze" aria-hidden="true" />
      <span className="part muzzle" aria-hidden="true" />
      <span className="part nose" aria-hidden="true" />
      <span className="part eye-l" aria-hidden="true" />
      <span className="part eye-r" aria-hidden="true" />
      <span className="part rim" aria-hidden="true" />
    </div>
  ) : (
    <div
      className={`r2p-species-fallback r2p-species-fallback--${species === "cat" ? "cat" : species === "dog" ? "dog" : "pet"}`}
      role="img"
      aria-label={`${name}的轻量${species === "cat" ? "猫" : species === "dog" ? "犬" : "宠物"}形象；高保真 3D 当前不可用`}
    >
      <span className="r2p-species-fallback-halo" aria-hidden="true" />
      <span className="r2p-species-fallback-glyph" aria-hidden="true">
        <Icon name="paw" size={76} strokeWidth={1.15} />
      </span>
      <span className="r2p-species-fallback-label">
        {species === "cat" ? "猫" : species === "dog" ? "犬" : "宠物"}
      </span>
    </div>
  );

  return (
    <section
      className={stageClass}
      aria-label={`${name}的此刻舞台`}
      data-testid={stageTestId}
      data-pli-type={stageTestId ? "stage" : undefined}
      data-pli-surface="STAGE"
      data-appearance-role="warm-living-field"
      data-surface-role={variant === "life" ? "digital-field" : "open-stage"}
      data-reality-field={variant === "life" ? "true" : "false"}
      data-stage-role={role}
      data-pet-presence-role="individual-twin"
      data-material-role="pbr-warm"
      data-anchor-count={Math.min(anchors.length, 4)}
      data-pli-interactive={(interactive || variant === "life") ? "true" : "false"}
    >
      <span className="r2p-stage-wash" aria-hidden="true" />
      <span className="r2p-stage-glow" aria-hidden="true" />
      {petId && variant !== "life" ? (
        <Link
          href={`/pets/${petId}/life-view`}
          className={`r2p-stage-pet ${show3d ? "r2p-stage-pet--3d" : ""}`}
          aria-label={`打开 ${name} 的生命视图`}
          data-testid={twinTestId}
          data-pli-type={twinTestId ? "twin" : undefined}
        >
          {show3d ? (
            <Pet3DViewer
              identity={identity}
              displayName={name}
              demoTwin={demo}
              twin={twin}
              variant="stage"
              frameTarget={frameTarget}
              petId={petId}
              sourceMediaCount={sourceMediaCountProp}
              stageRole={role}
              realityField={field}
              onStatus={setPet3d}
            />
          ) : fallbackVisual}
        </Link>
      ) : (
        <span
          className={`r2p-stage-pet ${show3d ? "r2p-stage-pet--3d" : ""}`}
          data-testid={twinTestId}
          data-pli-type={twinTestId ? "twin" : undefined}
        >
          {show3d ? (
            <Pet3DViewer
              identity={identity}
              displayName={name}
              demoTwin={demo}
              twin={twin}
              variant={variant === "life" ? "life" : "stage"}
              interactive={variant === "life"}
              frameTarget={frameTarget}
              petId={petId ?? null}
              sourceMediaCount={sourceMediaCountProp}
              stageRole={role}
              realityField={field}
              onStatus={setPet3d}
            />
          ) : fallbackVisual}
        </span>
      )}
      {anchors.slice(0, 4).map((a, i) =>
        a.href ? (
          <Link
            key={a.id}
            href={a.href}
            className={`r2p-anchor r2p-anchor--${i}`}
            data-testid={anchorTestIdPrefix ? `${anchorTestIdPrefix}.${a.id}` : undefined}
          >
            <span className="r2p-anchor-icon"><Icon name={a.icon} size={13} /></span>
            <span>
              <span className="r2p-anchor-label" style={{ display: "block" }}>{a.label}</span>
              <span className="r2p-anchor-value">{a.value}</span>
            </span>
          </Link>
        ) : (
          <span key={a.id} className={`r2p-anchor r2p-anchor--${i}`} data-testid={anchorTestIdPrefix ? `${anchorTestIdPrefix}.${a.id}` : undefined}>
            <span className="r2p-anchor-icon"><Icon name={a.icon} size={13} /></span>
            <span>
              <span className="r2p-anchor-label" style={{ display: "block" }}>{a.label}</span>
              <span className="r2p-anchor-value">{a.value}</span>
            </span>
          </span>
        ),
      )}

      <p className="r2p-stage-name">
        {name}
        {demo ? <span className="r2p-stage-demo">示例数据</span> : null}
      </p>
      <div className="r2p-stage-now">
        {headline ? <p className="r2p-stage-headline" data-testid={headlineTestId}>{headline}</p> : null}
        {caption ? <p className="r2p-stage-caption">{caption}</p> : null}
        {note ? (
          <p className="r2p-stage-note">
            <Icon name="paw" size={11} /> {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}