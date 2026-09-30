/**
 * types.ts — machine snapshot + visual contract types for the blind UI system.
 * Pure data types; no DOM/RN dependency so the evaluator runs in Node.
 */
export type DimensionName =
  | "petIdentity"
  | "composition"
  | "hierarchy"
  | "surface"
  | "contentPurity"
  | "interaction"
  | "accessibility"
  | "runtimeTruth";

export interface ElementSnap {
  id: string;
  role?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  z?: number;
  text?: string;
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
  /** Runtime platform for platform-dependent expectations ("web" default). */
  platform?: "web" | "android";
  /** Element id -> disabled flag (interaction contract, filled by functional tests). */
  interactive?: Record<string, boolean>;
  /** Element id -> selected option id (e.g. twin review verification choice). */
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
  /** Skip this check (pass) on listed platforms; used for platform-dependent truth expectations. */
  unlessPlatform?: string[];
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

export type CheckSpec =
  | ElementCheckSpec
  | RatioCheckSpec
  | CenterCheckSpec
  | CountCheckSpec
  | TextFreeCheckSpec
  | TextHasCheckSpec
  | ManifestCheckSpec
  | SurfaceCheckSpec
  | InteractionCheckSpec;

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
