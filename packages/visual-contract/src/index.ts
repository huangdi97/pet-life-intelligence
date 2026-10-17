/** index.ts — @pli/visual-contract public API (types + pure evaluator). */
export * from "./types.js";
export {
  evaluateContract,
  elementArea,
  isRuntimeProductManifest,
  V2_DIMENSION_WEIGHTS,
} from "./evaluate.js";