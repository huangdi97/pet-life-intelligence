/**
 * Visual Regression V3 — Stage R.2 (GOAL §95-§97).
 *
 * Diffs frozen approved baselines (artifacts/visual-v3-approved/) against the
 * fresh captures from stage-v3-visual.spec.ts (artifacts/visual-v3-current/).
 * Per-pixel tolerance 5/255, max 0.2% differing pixels.
 *
 * Baseline freeze is EXPLICIT (§97): intentional design change → screenshot
 * review → explicit approval → run with PLI_UPDATE_VISUAL_BASELINE=1. Never
 * update merely because a diff failed. V2 baselines remain historical.
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APPROVED = join(__dirname, "..", "..", "..", "artifacts", "visual-v3-approved");
const CURRENT = join(__dirname, "..", "artifacts", "visual-v3-current");
const FAIL_DIR = join(__dirname, "..", "artifacts", "visual-v3-failures");

const UPDATE = process.env.PLI_UPDATE_VISUAL_BASELINE === "1";
const TOLERANCE = 5;
const MAX_DIFF_RATIO = 0.002;

test.describe.configure({ mode: "serial" });

interface DiffResult {
  name: string;
  width: number;
  height: number;
  diffRatio: number;
  diffDataUrl: string;
}

test("VISUAL-V3-01 approved baseline vs current pixel diff", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(FAIL_DIR, { recursive: true });

  if (UPDATE) {
    // Explicit freeze: replace approved baselines with the current captures.
    mkdirSync(APPROVED, { recursive: true });
    for (const name of readdirSync(CURRENT).filter((f) => f.endsWith(".png"))) {
      writeFileSync(join(APPROVED, name), readFileSync(join(CURRENT, name)));
    }
    writeFileSync(
      join(APPROVED, "README.md"),
      "# PLI Visual Regression V3 — approved baseline\n\nFrozen after Stage R.2 wave approval (intentional design change + screenshot review + explicit approval).\nUpdate protocol: run stage-v3-visual.spec.ts, review captures, then run this spec with PLI_UPDATE_VISUAL_BASELINE=1.\n",
    );
    console.log(`baseline updated: ${readdirSync(APPROVED).length} files`);
    return;
  }

  const names = readdirSync(APPROVED).filter((f) => f.endsWith(".png")).sort();
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
      writeFileSync(join(FAIL_DIR, `${name.replace(/\.png$/, "")}.diff.png`), Buffer.from(result.diffDataUrl.split(",")[1], "base64"));
      writeFileSync(join(FAIL_DIR, `${name.replace(/\.png$/, "")}.actual.png`), readFileSync(actualPath));
      writeFileSync(join(FAIL_DIR, `${name.replace(/\.png$/, "")}.expected.png`), readFileSync(expectedPath));
    }
  }

  const maxDiff = Math.max(...results.map((r) => r.diffRatio), 0);
  console.log(`VISUAL-V3: ${results.length} pages, max diff ${(maxDiff * 100).toFixed(3)}%`);
  expect(failures, `visual regressions:\n${failures.join("\n")}`).toEqual([]);
});
