// Source helpers for @pli/ui-tokens consumers.
// The build (scripts/build.mjs) generates dist/ artifacts from tokens.json;
// this module gives the package a typecheck target (tsconfig include) and
// exports lightweight TS utilities for working with the tokens.

export type RiskLevel = "NORMAL" | "NOTICE" | "MONITOR" | "VET_SOON" | "URGENT" | "EMERGENCY";

const RISK_LEVELS: readonly RiskLevel[] = [
  "NORMAL",
  "NOTICE",
  "MONITOR",
  "VET_SOON",
  "URGENT",
  "EMERGENCY",
];

/** Narrow an unknown value to a RiskLevel. */
export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}
