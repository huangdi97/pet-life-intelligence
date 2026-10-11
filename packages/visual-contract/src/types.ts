/**
 * types.ts — machine snapshot + visual contract types for the blind UI system.
 * Pure data types; no DOM/RN dependency so the evaluator runs in Node.
 *
 * V2 (R2P3D-R3): fixed 8-dimension Blind Score V2 weights (§80 of the master
 * goal): Individual Pet Truth 25 / Visual Composition 20 / Information
 * Hierarchy 15 / Surface Governance 10 / Content Purity 10 / Interaction
 * Truth 10 / Accessibility 5 / Pixel-Style Truth 5 = 100.
 */
export type DimensionName =
  | "individualPetTruth"
  | "visualComposition"
  | "informationHierarchy"
  | "surfaceGovernance"
  | "contentPurity"
  | "interactionTruth"
  | "accessibility"
  | "pixelStyleTruth";

/** Camera state snapshot (mirrors the 3D manifest camera object). */
export interface CameraState {
  fov?: number;
  distance?: number;
  radius?: number;
  yaw?: number;
  pitch?: number;
}

/** Real runtime states captured by functional interaction evidence. */
export interface CameraEvidence {
  /** Camera state at rest (before interaction). */
  rotateA?: CameraState;
  /** Camera state after a real drag/rotation gesture. */
  rotateB?: CameraState;
  /** Camera state at default zoom. */
  zoomA?: CameraState;
  /** Camera state after a real zoom gesture/command. */
  zoomB?: CameraState;
  /** Camera state after pressing reset. */
  reset?: CameraState;
}

/** Pixel/Style truth filled by the pixel oracle + computed-style extractors. */
export interface StyleTruth {
  /** Mean luma of the main pet stage region (0..1). */
  stageLuma?: number;
  /** Dark-viewer prohibition: stage is predominantly near-black. */
  darkViewer?: boolean;
  /** Stage element computed backgroundColor parsed to luma (web). */
  stageBgLuma?: number;
  /** Declared reality-field media (photo background) is present. */
  realityFieldMedia?: boolean;
  /** Cross-check of declared appearanceRole vs computed style. */
  styleTruthConflict?: boolean;
  /** White card dominance ratio (full screen). */
  whiteCardRatio?: number;
  /** Cool accent ratio (full screen). */
  coolAccentRatio?: number;
}

export interface ElementSnap {
  id: string;
  role?: string;
  /** Surface type: OPEN/SOFT_PANEL/CARD/CHIP/STAGE/NAV/MEDIA (V2, real runtime). */
  type?: string;
  surfaceType?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  z?: number;
  text?: string;
  /** Declared design role assertions (Design-as-Data V2). */
  appearanceRole?: string;
  surfaceRole?: string;
  realityField?: boolean;
  petPresenceRole?: string;
  materialRole?: string;
  styles?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: string | number;
    borderRadius?: number;
    opacity?: number;
    display?: string;
    position?: string;
    zIndex?: number;
    overflow?: string;
  };
}

export interface ScreenSnapshot {
  screen: string;
  viewport: { width: number; height: number };
  /** App content area (below status bar, above bottom nav) when known. */
  contentBounds?: { top: number; bottom: number; width: number; height: number; left?: number };
  elements: ElementSnap[];
  /** All visible owner-facing text on the screen. */
  text: string[];
  /** 3D twin manifest when a pet-twin stage is present. */
  manifest?: Record<string, unknown>;
  /** Real camera states from functional interaction evidence (V2). */
  cameras?: CameraEvidence;
  /** Pixel/style truth filled by oracle + computed styles (V2). */
  styleTruth?: StyleTruth;
  /** Runtime platform for platform-dependent expectations ("web" default). */
  platform?: "web" | "android";
  /** Element id -> disabled flag (interaction contract, from real runtime state). */
  interactive?: Record<string, boolean>;
  /** Element id -> selected option id (e.g. twin review verification choice, from real UI state). */
  selected?: Record<string, string>;
}

export interface ElementCheckSpec {
  kind: "element";
  idPrefix: string;
  count?: [number, number];
  visible?: boolean;
  minHeight?: number;
}

export interface RatioCheckSpec {
  kind: "ratio";
  target: string;
  region: "content" | "viewport";
  property: "height" | "width" | "area";
  range: [number, number];
}

export interface CenterCheckSpec {
  kind: "center";
  target: string;
  region: "content" | "viewport";
  axis: "x" | "y";
  tolerance: number;
}

export interface CountCheckSpec {
  kind: "count";
  filter?: { role?: string; type?: string; idPrefix?: string };
  range: [number, number];
}

export interface TextFreeCheckSpec {
  kind: "text-free";
  tokens: string[];
  scope?: "all" | "element";
  target?: string;
}

export interface TextHasCheckSpec {
  kind: "text-has";
  target: string;
  patterns: string[];
}

export interface ManifestCheckSpec {
  kind: "manifest";
  field: string;
  eq?: string | boolean | number | null;
  truthy?: boolean;
  in?: [number, number];
}

/** Manifest origin gate: the 3D truth must come from the real runtime, never
 * from a synthetic extractor-constructed fallback manifest. */
export interface ManifestOriginCheckSpec {
  kind: "manifest-origin";
  eq: "RUNTIME" | "SYNTHETIC_FALLBACK_EVIDENCE";
}

/** Identity-evidence gate: the runtime candidate must be bound to the
 * current pet and, when sourceMediaMin is requested, carry real owner-media
 * evidence. generic=false alone never proves visual likeness or high fidelity. */
export interface IdentityCheckSpec {
  kind: "identity";
  generic?: false;
  petIdMatch?: boolean;
  sourceMediaMin?: number;
}

/** Camera truth gate: real drag/zoom/reset evidence must change/restore the
 * camera. `event` selects which pair of evidence states to compare. */
export interface CameraCheckSpec {
  kind: "camera";
  event: "rotate" | "zoom" | "reset";
  field: "yaw" | "pitch" | "distance" | "radius";
  /** For rotate/zoom: minimum absolute delta between A and B states. */
  minDelta?: number;
  /** For reset: maximum deviation from the canonical (state before interaction). */
  maxDeviation?: number;
}

/** Pixel/Style truth gate: dark viewer prohibition + warm living field or
 * declared reality-field media on Today/Pet; Life View allows a slightly
 * darker warm digital field but never pure black. */
export interface PixelStyleCheckSpec {
  kind: "pixel-style";
  /** Where this pixel rule applies: today/pet/lifeview/other. */
  surface: "today" | "pet" | "lifeview" | "other";
  /** If true, a declared reality-field media satisfies the bright rule. */
  allowRealityMedia?: boolean;
}

export interface SurfaceCheckSpec {
  kind: "surface";
  max: number;
  minArea?: number;
  aboveFold?: boolean;
}

export interface InteractionCheckSpec {
  kind: "interaction";
  id: string;
  disabledWhen?: { selected?: string };
}

/** Design-as-Data V2 cross-check: a declared design role on the element must
 * not conflict with its computed style (e.g. appearanceRole=warm-living-field
 * but computed backgroundColor is near-black). */
export interface StyleTruthCheckSpec {
  kind: "style-truth";
  idPrefix: string;
  notDarkBg?: boolean;
}

export type CheckSpec =
  | ElementCheckSpec
  | RatioCheckSpec
  | CenterCheckSpec
  | CountCheckSpec
  | TextFreeCheckSpec
  | TextHasCheckSpec
  | ManifestCheckSpec
  | ManifestOriginCheckSpec
  | IdentityCheckSpec
  | CameraCheckSpec
  | PixelStyleCheckSpec
  | SurfaceCheckSpec
  | InteractionCheckSpec
  | StyleTruthCheckSpec;

export interface ContractCheck {
  id: string;
  dimension: DimensionName;
  points: number;
  description: string;
  check: CheckSpec;
}

export interface ScreenVisualContract {
  screen: string;
  version: number;
  dimensions: Record<DimensionName, number>;
  thresholds: { pass: number; heroPass?: number };
  critical: string[];
  checks: ContractCheck[];
}

export interface CheckResult {
  id: string;
  dimension: DimensionName;
  points: number;
  description: string;
  passed: boolean;
  detail: string;
}

export interface ScoreResult {
  screen: string;
  total: number;
  max: number;
  perDimension: Record<string, { earned: number; max: number }>;
  passed: CheckResult[];
  failed: CheckResult[];
  criticalFailed: string[];
  pass: boolean;
  heroPass: boolean;
  blockers: string[];
}

/** V2 fixed dimension weights (§80 master goal). */
export const DIMENSION_WEIGHTS: Record<DimensionName, number> = {
  individualPetTruth: 25,
  visualComposition: 20,
  informationHierarchy: 15,
  surfaceGovernance: 10,
  contentPurity: 10,
  interactionTruth: 10,
  accessibility: 5,
  pixelStyleTruth: 5,
};