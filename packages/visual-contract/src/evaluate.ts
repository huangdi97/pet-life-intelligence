/**
 * evaluate.ts â€?pure evaluator for screen visual contracts.
 * Runs on extracted machine snapshots (layout/styles/semantics/manifest).
 * No vision model, no image interpretation. Shared by:
 *  - scripts/blind-ui (scorecard for web/Android captures)
 *  - pytest tests/blind_ui (calibration) via scripts/blind-ui/eval-contract.mjs
 */
import type {
  CheckResult,
  ContractCheck,
  ScreenSnapshot,
  ScreenVisualContract,
  ScoreResult,
} from "./types.js";

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
        const deviation = Math.abs(center - regionCenter) / region.width;
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
        if (spec.unlessPlatform?.includes(snap.platform ?? "web")) {
          return detailOk(`skipped on platform ${snap.platform ?? "web"}`);
        }
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
      case "surface": {
        const area = spec.minArea ?? 20000;
        const surfaces = snap.elements.filter((e) => {
          if (e.type !== "card") return false;
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

/** elementArea â€?helper used by extractors to normalize twin occupancy. */
export function elementArea(el: { width: number; height: number }): number {
  return el.width * el.height;
}
