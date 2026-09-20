// Build @pli/ui-tokens: reads tokens.json, emits:
//   dist/tokens.css   — CSS custom properties (design tokens + semantic/risk states)
//   dist/tokens.json  — raw JSON (readable artifact)
//   dist/index.js     — ESM exporting inline `tokens` object
//   dist/index.d.ts   — typed declarations
//   dist/css.js       — `css` string export (for CSS-in-JS / style tags)
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

// ---- flatten into CSS custom props ----
const cssLines = [
  ":root {",
  "  /* Pet Life Intelligence UI Tokens v" + tokens.version + " */",
];
const walk = (prefix, obj) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      walk(prefix + "-" + k, v);
    } else if (typeof v === "string" || typeof v === "number") {
      const name = "--pli" + prefix + "-" + k;
      cssLines.push(`  ${name}: ${v};`);
    }
  }
};
walk("", tokens.color);
walk("", tokens.typography);
walk("-space", tokens.spacing);
walk("-radius", tokens.radius);
walk("-elev", tokens.elevation);
if (tokens.border) walk("-border", tokens.border);
walk("-motion", tokens.motion);
if (tokens.grid) walk("-grid", tokens.grid);
if (tokens.breakpoint) walk("-breakpoint", tokens.breakpoint);
if (tokens.z_index) walk("-z", tokens.z_index);
for (const [k, v] of Object.entries(tokens.layout)) {
  if (typeof v === "string") cssLines.push(`  --pli-layout-${k}: ${v};`);
}
for (const [k, v] of Object.entries(tokens.touch)) {
  cssLines.push(`  --pli-touch-${k}: ${v};`);
}
cssLines.push("  color-scheme: light;", "}", "");

// risk status as semantic classes (colors must not be the only expression)
for (const [key, rs] of Object.entries(tokens.risk_status)) {
  const c = tokens.color.semantic[rs.color];
  const bg = tokens.color.semantic[rs.color + "_bg"] ?? "#fff";
  cssLines.push(`.pli-risk-${key.toLowerCase()} {`);
  cssLines.push(`  --pli-risk-color: ${c};`);
  cssLines.push(`  --pli-risk-bg: ${bg};`);
  cssLines.push("}");
}
cssLines.push("");

const css = cssLines.join("\n");
writeFileSync(join(dist, "tokens.css"), css);
writeFileSync(join(dist, "tokens.json"), JSON.stringify(tokens, null, 2));
writeFileSync(
  join(dist, "index.js"),
  "// auto-generated from tokens.json\n" +
    "export const tokens = " + JSON.stringify(tokens, null, 2) + ";\n",
);
writeFileSync(
  join(dist, "index.d.ts"),
  "export type RiskStatus = 'NORMAL' | 'NOTICE' | 'MONITOR' | 'VET_SOON' | 'URGENT' | 'EMERGENCY';\n" +
    "export interface RiskStatusDef { label: string; label_en: string; color: string; icon: string }\n" +
    "export declare const tokens: {\n" +
    "  version: string;\n" +
    "  brand: { name: string; direction: string; anti_direction: string[] };\n" +
    "  color: Record<string, Record<string, string>>;\n" +
    "  typography: Record<string, unknown>;\n" +
    "  spacing: Record<string, string>;\n" +
    "  radius: Record<string, string>;\n" +
    "  elevation: Record<string, string>;\n" +
    "  motion: Record<string, unknown>;\n" +
    "  icon: Record<string, unknown>;\n" +
"  risk_status: Record<RiskStatus, RiskStatusDef>;\n" +
"  border: Record<string, string>;\n" +
"  grid: Record<string, string>;\n" +
"  breakpoint: Record<string, string>;\n" +
"  z_index: Record<string, string>;\n" +
    "  semantic_state: Record<string, { label: string }>;\n" +
    "  layout: Record<string, unknown>;\n" +
    "  touch: Record<string, string>;\n" +
    "};\n",
);
writeFileSync(
  join(dist, "css.js"),
  "// auto-generated\n" +
    "export const css = " + JSON.stringify(css) + ";\n",
);
console.log("ui-tokens build OK ->", dist);