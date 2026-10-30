/**
 * evaluate.ts — pure evaluator for screen visual contracts (Blind Contract V2).
 * Runs on extracted machine snapshots (layout/styles/semantics/manifest/camera
 * evidence). No vision model, no image interpretation. Shared by:
 *  - scripts/blind-ui (scorecard for web/Android captures)
 *  - pytest tests/blind_ui (calibration) via scripts/blind-ui/eval-contract.mjs
 *
 * V2 changes (R2P3D-R3):
 *  - removed `unlessPlatform` skip: Android must satisfy the same real-3D
 *    product gates as Web (no platform escape hatch).
 *  - added manifest-origin / identity / camera / pixel-style / style-truth
 *    gates so machine PASS means real individual 3D, real interaction, real
 *    visual composition — not element presence alone.
 */
import type {
  CameraState,
  CheckResult,
  CheckSpec,
  ContractCheck,
  ScreenSnapshot,
  ScreenVisualContract,
  ScoreResult,
  StyleTruth,
} from "./types.js";
import { DIMENSION_WEIGHTS } from "./types.js";

function matchesPrefix(id: string, prefix: string): boolean {
  if (prefix.endsWith("*")) return id.startsWith(prefix.slice(0, -1));
  return id === prefix;
}

function regionBounds(snap: ScreenSnapshot, region: "content" | "viewport") {
  if (region === "content" && snap.contentBounds) {
    return {
      width: snap.contentBounds.width,
      height: snap.contentBounds.height,
      top: snap.contentBounds.top,
      left: snap.contentBounds.left ?? 0,
    };
  }
  return { width: snap.viewport.width, height: snap.viewport.height, top: 0, left: 0 };
}

function textOf(snap: ScreenSnapshot, idPrefix: string): string[] {
  return snap.elements.filter((e) => matchesPrefix(e.id, idPrefix)).map((e) => e.text ?? "");
}

/** Parse a CSS color to luma in [0,1]; null when unparseable. */
function cssLuma(color: string | undefined): number | null {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return null;
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  const hex = color.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const v = parseInt(hex[1], 16);
    const [r, g, b] = [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  return null;
}

function isDarkLuma(luma: number | null | undefined): boolean {
  return luma !== null && luma !== undefined && luma < 0.18;
}

function camNum(cam: CameraState | undefined, field: string): number | undefined {
  const v = cam?.[field as keyof CameraState];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function evalCheck(check: ContractCheck, snap: ScreenSnapshot): CheckResult {
  const spec = check.check;
  const detailOk = (d: string) => ({ ...check, passed: true, detail: d });
  const detailNo = (d: string) => ({ ...check, passed: false, detail: d });
  try {
    switch (spec.kind) {
      case "element": {
        const matched = snap.elements.filter((e) => matchesPrefix(e.id, spec.idPrefix));
        const visible = matched.filter((e) => e.visible !== false);
        const countOk = spec.count
          ? matched.length >= spec.count[0] && matched.length <= spec.count[1]
          : matched.length > 0;
        const visOk = spec.visible === undefined || (spec.visible ? visible.length > 0 : true);
        const minHeight = spec.minHeight;
        const minHOk = minHeight === undefined || matched.some((e) => e.height >= minHeight);
        return countOk && visOk && minHOk
          ? detailOk(`elements[${spec.idPrefix}]=${matched.length}`)
          : detailNo(`elements[${spec.idPrefix}]=${matched.length} count=${spec.count} minH=${spec.minHeight}`);
      }
      case "ratio": {
        const el = snap.elements.find((e) => matchesPrefix(e.id, spec.target));
        if (!el) return detailNo(`missing target ${spec.target}`);
        const region = regionBounds(snap, spec.region);
        const value =
          spec.property === "height"
            ? el.height / region.height
            : spec.property === "width"
              ? el.width / region.width
              : (el.width * el.height) / (region.width * region.height);
        const ok = value >= spec.range[0] && value <= spec.range[1];
        return ok
          ? detailOk(`${spec.target} ${spec.property} ratio=${value.toFixed(3)} in [${spec.range}]`)
          : detailNo(`${spec.target} ${spec.property} ratio=${value.toFixed(3)} outside [${spec.range}]`);
      }
      case "center": {
        const el = snap.elements.find((e) => matchesPrefix(e.id, spec.target));
        if (!el) return detailNo(`missing target ${spec.target}`);
        const region = regionBounds(snap, spec.region);
        const center = el.x + el.width / 2;
        const regionCenter = spec.axis === "x" ? region.left + region.width / 2 : region.top + region.height / 2;
        const deviation = Math.abs(center - regionCenter) / (spec.axis === "x" ? region.width : region.height);
        return deviation <= spec.tolerance
          ? detailOk(`${spec.target} ${spec.axis} deviation=${(deviation * 100).toFixed(1)}% <= ${spec.tolerance * 100}%`)
          : detailNo(`${spec.target} ${spec.axis} deviation=${(deviation * 100).toFixed(1)}% > ${spec.tolerance * 100}%`);
      }
      case "count": {
        const f = spec.filter ?? {};
        const matched = snap.elements.filter((e) => {
          if (f.idPrefix && !e.id.startsWith(f.idPrefix)) return false;
          if (f.role && e.role !== f.role) return false;
          if (f.type && e.type !== f.type) return false;
          return true;
        });
        const ok = matched.length >= spec.range[0] && matched.length <= spec.range[1];
        return ok
          ? detailOk(`count=${matched.length} in [${spec.range}]`)
          : detailNo(`count=${matched.length} outside [${spec.range}]`);
      }
      case "text-free": {
        const sources = spec.scope === "element" && spec.target ? textOf(snap, spec.target) : snap.text;
        const all = sources.join("\n");
        const hits = spec.tokens.filter((t) => all.includes(t));
        return hits.length === 0
          ? detailOk("no raw tokens found")
          : detailNo(`raw tokens found: ${hits.join(", ")}`);
      }
      case "text-has": {
        const texts = spec.target ? textOf(snap, spec.target) : snap.text;
        const all = texts.join("\n");
        const found = spec.patterns.filter((p) => all.includes(p));
        return found.length > 0
          ? detailOk(`pattern found: ${found[0]}`)
          : detailNo(`none of patterns [${spec.patterns}] in target ${spec.target}`);
      }
      case "manifest": {
        if (!snap.manifest) return detailNo("no 3d manifest present");
        // V2: no unlessPlatform escape. Android must satisfy the same truth.
        const val = snap.manifest[spec.field];
        if (spec.eq !== undefined) {
          return val === spec.eq
            ? detailOk(`manifest.${spec.field}=${String(val)}`)
            : detailNo(`manifest.${spec.field}=${String(val)} != ${String(spec.eq)}`);
        }
        if (spec.truthy !== undefined) {
          const truthy = val === true || (typeof val === "number" && val > 0) || (typeof val === "string" && val.length > 0);
          return truthy === spec.truthy
            ? detailOk(`manifest.${spec.field} truthy=${truthy}`)
            : detailNo(`manifest.${spec.field} truthy=${truthy} != ${spec.truthy}`);
        }
        if (spec.in !== undefined) {
          const n = typeof val === "number" ? val : NaN;
          const ok = Number.isFinite(n) && n >= spec.in[0] && n <= spec.in[1];
          return ok
            ? detailOk(`manifest.${spec.field}=${n} in [${spec.in}]`)
            : detailNo(`manifest.${spec.field}=${String(val)} outside [${spec.in}]`);
        }
        return detailNo(`unsupported manifest check for ${spec.field}`);
      }
      case "manifest-origin": {
        if (!snap.manifest) return detailNo("no 3d manifest present");
        const origin = snap.manifest["manifestOrigin"];
        if (origin === "RUNTIME" || origin === "SYNTHETIC_FALLBACK_EVIDENCE") {
          const ok = origin === spec.eq;
          return ok
            ? detailOk(`manifestOrigin=${String(origin)}`)
            : detailNo(`manifestOrigin=${String(origin)} != ${spec.eq}`);
        }
        return detailNo(`manifestOrigin is ${String(origin)} — missing RUNTIME marker`);
      }
      case "identity": {
        const m = snap.manifest;
        if (!m) return detailNo("no 3d manifest present");
        const generic = m["generic"];
        const petId = m["petId"];
        const assetVersion = m["assetVersion"];
        const sourceMediaCount = m["sourceMediaCount"];
        // The snapshot knows the current pet id when set by the capture layer.
        const snapPetId =
          snap.elements.find((e) => matchesPrefix(e.id, "pli.current-pet-id"))?.text?.trim() || undefined;
        if (spec.generic === false && (generic === true || generic === undefined)) {
          return detailNo(`manifest.generic=${String(generic)} — generic twin must not be a product candidate`);
        }
        if (spec.petIdMatch && petId === undefined) {
          return detailNo("manifest.petId missing (identity not bound to a pet)");
        }
        if (spec.petIdMatch && snapPetId && petId !== snapPetId) {
          return detailNo(`manifest.petId=${String(petId)} != current pet ${snapPetId}`);
        }
        if (spec.sourceMediaMin !== undefined) {
          const n = typeof sourceMediaCount === "number" ? sourceMediaCount : NaN;
          if (!Number.isFinite(n) || n < spec.sourceMediaMin) {
            return detailNo(`sourceMediaCount=${String(sourceMediaCount)} < ${spec.sourceMediaMin}`);
          }
        }
        if (spec.petIdMatch && assetVersion === undefined) {
          return detailNo("assetVersion missing");
        }
        return detailOk(
          `identity generic=${String(generic)} petId=${String(petId)} assetVersion=${String(assetVersion)} sources=${String(sourceMediaCount)}`,
        );
      }
      case "camera": {
        const cams = snap.cameras;
        if (!cams) return detailNo("no camera evidence (cameras) captured");
        if (spec.event === "rotate") {
          const a = camNum(cams.rotateA, spec.field);
          const b = camNum(cams.rotateB, spec.field);
          if (a === undefined || b === undefined)
            return detailNo(`rotate ${spec.field} A/B missing (a=${a}, b=${b})`);
          const delta = Math.abs(b - a);
          const ok = delta >= (spec.minDelta ?? 0.01);
          return ok
            ? detailOk(`rotate ${spec.field} |Δ|=${delta.toFixed(4)} >= ${spec.minDelta}`)
            : detailNo(`rotate ${spec.field} |Δ|=${delta.toFixed(4)} < ${spec.minDelta} — rotation not measured`);
        }
        if (spec.event === "zoom") {
          const a = camNum(cams.zoomA, spec.field);
          const b = camNum(cams.zoomB, spec.field);
          if (a === undefined || b === undefined)
            return detailNo(`zoom ${spec.field} A/B missing (a=${a}, b=${b})`);
          const delta = Math.abs(b - a);
          const ok = delta >= (spec.minDelta ?? 0.01);
          return ok
            ? detailOk(`zoom ${spec.field} |Δ|=${delta.toFixed(4)} >= ${spec.minDelta}`)
            : detailNo(`zoom ${spec.field} |Δ|=${delta.toFixed(4)} < ${spec.minDelta} — zoom not measured`);
        }
        if (spec.event === "reset") {
          const a = camNum(cams.rotateA, spec.field) ?? camNum(cams.zoomA, spec.field);
          const reset = camNum(cams.reset, spec.field);
          if (a === undefined || reset === undefined)
            return detailNo(`reset ${spec.field} baseline/reset missing (baseline=${a}, reset=${reset})`);
          const dev = Math.abs(reset - a);
          const ok = dev <= (spec.maxDeviation ?? 0.02);
          return ok
            ? detailOk(`reset ${spec.field} deviation=${dev.toFixed(4)} <= ${spec.maxDeviation}`)
            : detailNo(`reset ${spec.field} deviation=${dev.toFixed(4)} > ${spec.maxDeviation}`);
        }
        return detailNo(`unknown camera event ${spec.event}`);
      }
      case "pixel-style": {
        const st: StyleTruth | undefined = snap.styleTruth;
        if (!st) return detailNo("no style truth (styleTruth) captured");
        if (spec.surface === "today" || spec.surface === "pet") {
          // Dark viewer prohibition is a hard rule on Today/Pet.
          if (st.darkViewer === true) return detailNo("darkViewer=true — dark debug viewer on Today/Pet");
          const lumaOk = (st.stageLuma ?? 0.3) >= 0.22;
          const conflict = st.styleTruthConflict === true;
          if (conflict) return detailNo("styleTruthConflict=true (declared role vs computed style)");
          return lumaOk
            ? detailOk(`stageLuma=${st.stageLuma} warm field or reality media ok`)
            : detailNo(`stageLuma=${st.stageLuma} too dark for Today/Pet`);
        }
        if (spec.surface === "lifeview") {
          if (st.darkViewer === true) return detailNo("darkViewer=true on Life View");
          const tooDark = (st.stageLuma ?? 0.25) < 0.08;
          return tooDark ? detailNo(`stageLuma=${st.stageLuma} below Life View floor 0.08`) : detailOk("life view field rule ok");
        }
        // generic "other" surface: no pixel style gate
        return detailOk("pixel-style rule not enforced on this surface");
      }
      case "surface": {
        const area = spec.minArea ?? 20000;
        const surfaces = snap.elements.filter((e) => {
          const type = e.type ?? e.surfaceType;
          const isCard = type === "card" || type === "CARD";
          if (!isCard) return false;
          if (!e.visible) return false;
          if (e.width * e.height < area) return false;
          if (spec.aboveFold && e.y + e.height > snap.viewport.height * 1.02) return false;
          return true;
        });
        const ok = surfaces.length <= spec.max;
        return ok
          ? detailOk(`card surfaces(aboveFold=${spec.aboveFold})=${surfaces.length} <= ${spec.max}`)
          : detailNo(`card surfaces(aboveFold=${spec.aboveFold})=${surfaces.length} > ${spec.max}`);
      }
      case "interaction": {
        const disabled = snap.interactive?.[spec.id];
        const selected = snap.selected?.[spec.id];
        if (spec.disabledWhen?.selected) {
          const shouldDisable = selected === spec.disabledWhen.selected;
          return shouldDisable === disabled
            ? detailOk(`interaction[${spec.id}] disabled=${disabled} when ${spec.disabledWhen.selected} selected`)
            : detailNo(`interaction[${spec.id}] disabled=${disabled}, expected ${shouldDisable} when ${spec.disabledWhen.selected}`);
        }
        return snap.interactive?.[spec.id] === undefined
          ? detailNo(`interaction[${spec.id}] not measured`)
          : detailOk(`interaction[${spec.id}] disabled=${disabled}`);
      }
      case "style-truth": {
        const el = snap.elements.find((e) => matchesPrefix(e.id, spec.idPrefix));
        if (!el) return detailNo(`missing target ${spec.idPrefix}`);
        const bgLuma = cssLuma(el.styles?.backgroundColor);
        if (spec.notDarkBg && isDarkLuma(bgLuma)) {
          return detailNo(`${spec.idPrefix} backgroundColor ${String(el.styles?.backgroundColor)} is dark (luma=${bgLuma})`);
        }
        if (spec.notDarkBg && el.appearanceRole === "warm-living-field" && bgLuma !== null && bgLuma < 0.18) {
          return detailNo(`STYLE_TRUTH_CONFLICT: declared warm-living-field but bg luma=${bgLuma}`);
        }
        return detailOk(`${spec.idPrefix} style truth ok (bg luma=${bgLuma ?? "n/a"})`);
      }
      default:
        return detailNo("unknown check kind");
    }
  } catch (err) {
    return detailNo(`evaluation error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Evaluate a screen contract against a machine snapshot. Pure function. */
export function evaluateContract(contract: ScreenVisualContract, snap: ScreenSnapshot): ScoreResult {
  const results = contract.checks.map((c) => evalCheck(c, snap));
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const total = passed.reduce((a, r) => a + r.points, 0);
  const max = contract.checks.reduce((a, r) => a + r.points, 0);
  const perDimension: Record<string, { earned: number; max: number }> = {};
  for (const dim of Object.keys(contract.dimensions)) {
    const dimMax = contract.checks.filter((c) => c.dimension === dim).reduce((a, r) => a + r.points, 0);
    const dimEarned = results.filter((r) => r.dimension === dim && r.passed).reduce((a, r) => a + r.points, 0);
    perDimension[dim] = { earned: dimEarned, max: dimMax };
  }
  const criticalFailed = failed.filter((r) => contract.critical.includes(r.id)).map((r) => r.id);
  const pass = total >= contract.thresholds.pass && criticalFailed.length === 0;
  const heroThreshold = contract.thresholds.heroPass ?? contract.thresholds.pass;
  const heroPass = total >= heroThreshold && criticalFailed.length === 0;
  return {
    screen: contract.screen,
    total,
    max,
    perDimension,
    passed,
    failed,
    criticalFailed,
    pass,
    heroPass,
    blockers: criticalFailed,
  };
}

/** elementArea — helper used by extractors to normalize twin occupancy. */
export function elementArea(el: { width: number; height: number }): number {
  return el.width * el.height;
}

export const V2_DIMENSION_WEIGHTS = DIMENSION_WEIGHTS;

/** Assert a manifest payload is a genuine RUNTIME product-gate manifest. */
export function isRuntimeProductManifest(m: Record<string, unknown> | null | undefined): boolean {
  return Boolean(
    m &&
      m["ready"] === true &&
      m["fallbackUsed"] === false &&
      m["manifestOrigin"] === "RUNTIME" &&
      m["wireframe"] !== true,
  );
}