/**
 * Visual Regression V2 — Stage R.1 Phase L (criterion F.20-F.23).
 *
 * Compares the frozen approved baseline (artifacts/visual-baseline-approved/)
 * against the fresh captures produced by stage-v-visual.spec.ts into
 * tests/e2e-browser/artifacts/visual-current/.
 *
 * Per-pixel diff (tolerance 5/255 per channel, max 0.2% differing pixels).
 * Over threshold => FAIL, writing the actual / expected / diff trio under
 * tests/e2e-browser/artifacts/visual-regression-failures/<page>_<width>/.
 *
 * Baseline refresh is EXPLICIT and never automatic: with
 * PLI_UPDATE_VISUAL_BASELINE=1 the current captures replace the approved
 * baseline and the test reports "baseline updated" instead of failing.
 * See artifacts/visual-baseline-approved/README.md.
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APPROVED = join(__dirname, "..", "..", "..", "artifacts", "visual-baseline-approved");
const CURRENT = join(__dirname, "..", "artifacts", "visual-current");
const FAIL_DIR = join(__dirname, "..", "artifacts", "visual-regression-failures");

const UPDATE = process.env.PLI_UPDATE_VISUAL_BASELINE === "1";
const TOLERANCE = 5; // per-channel sum-of-deltas threshold (5/255)
const MAX_DIFF_RATIO = 0.002; // 0.2% of pixels may differ (AA/rendering noise)

test.describe.configure({ mode: "serial" });

interface DiffResult {
  name: string;
  width: number;
  height: number;
  diffRatio: number;
  diffDataUrl: string;
}

test("VISUAL-V2-01 approved baseline vs current pixel diff", async ({ page }) => {
  test.setTimeout(300_000);
  const names = readdirSync(APPROVED)
    .filter((f) => f.endsWith(".png"))
    .sort();
  expect(names.length, "approved baseline must be non-empty").toBeGreaterThan(0);

  const results: DiffResult[] = [];
  const failures: string[] = [];

  for (const name of names) {
    const expectedPath = join(APPROVED, name);
    const actualPath = join(CURRENT, name);
    expect(existsSync(actualPath), `missing current capture for ${name}`).toBe(true);

    const result = await page.evaluate(
      async ({ expectedB64, actualB64, tolerance }): Promise<DiffResult> => {
        const load = async (b64: string): Promise<HTMLImageElement> => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          return img;
        };
        const a = await load(actualB64);
        const e = await load(expectedB64);
        const width = Math.min(a.width, e.width);
        const height = Math.min(a.height, e.height);

        const canvasA = document.createElement("canvas");
        canvasA.width = width;
        canvasA.height = height;
        const ctxA = canvasA.getContext("2d", { willReadFrequently: true })!;
        ctxA.drawImage(a, 0, 0);
        const aData = ctxA.getImageData(0, 0, width, height).data;

        const canvasE = document.createElement("canvas");
        canvasE.width = width;
        canvasE.height = height;
        const ctxE = canvasE.getContext("2d", { willReadFrequently: true })!;
        ctxE.drawImage(e, 0, 0);
        const eData = ctxE.getImageData(0, 0, width, height).data;

        // diff image: expected as base, differing pixels highlighted magenta
        const canvasD = document.createElement("canvas");
        canvasD.width = width;
        canvasD.height = height;
        const ctxD = canvasD.getContext("2d")!;
        ctxD.drawImage(e, 0, 0);
        const dImage = ctxD.getImageData(0, 0, width, height);
        const dData = dImage.data;

        let diffCount = 0;
        for (let i = 0; i < aData.length; i += 4) {
          const delta =
            Math.abs(aData[i] - eData[i]) +
            Math.abs(aData[i + 1] - eData[i + 1]) +
            Math.abs(aData[i + 2] - eData[i + 2]);
          if (delta > tolerance) {
            diffCount++;
            dData[i] = 255;
            dData[i + 1] = 0;
            dData[i + 2] = 255;
            dData[i + 3] = 255;
          }
        }
        ctxD.putImageData(dImage, 0, 0);

        return {
          name: "",
          width,
          height,
          diffRatio: diffCount / (width * height),
          diffDataUrl: canvasD.toDataURL("image/png"),
        };
      },
      { expectedB64: readFileSync(expectedPath).toString("base64"), actualB64: readFileSync(actualPath).toString("base64"), tolerance: TOLERANCE },
    );
    result.name = name;
    results.push(result);

    if (result.diffRatio > MAX_DIFF_RATIO) {
      failures.push(`${name}: diff ${(result.diffRatio * 100).toFixed(3)}%`);
      const dir = join(FAIL_DIR, name.replace(/\.png$/, ""));
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "expected.png"), readFileSync(expectedPath));
      writeFileSync(join(dir, "actual.png"), readFileSync(actualPath));
      writeFileSync(join(dir, "diff.png"), Buffer.from(result.diffDataUrl.split(",")[1] ?? "", "base64"));
    }
  }

  console.log("VISUAL-V2 diffs (name: ratio):");
  for (const r of results) console.log(`  ${r.name}: ${(r.diffRatio * 100).toFixed(4)}%`);

  if (UPDATE) {
    for (const name of names) {
      writeFileSync(join(APPROVED, name), readFileSync(join(CURRENT, name)));
    }
    console.log("PLI_UPDATE_VISUAL_BASELINE=1: approved baseline explicitly refreshed from current captures.");
  } else {
    expect(failures, `visual regression V2 failed:\n${failures.join("\n")}`).toEqual([]);
  }
});