/**
 * Visual Regression V3 — Stage R.2 (criterion §95-§97).
 *
 * stage-v3-visual.spec.ts CAPTURES the frozen-approved V4 owner UI into
 * tests/e2e-browser/artifacts/visual-v3-current/; visual-regression-v3.spec.ts
 * pixel-diffs them against artifacts/visual-v3-approved/.
 *
 * Baselines freeze is EXPLICIT (GOAL §97): intentional design change →
 * screenshot review → explicit approval → run with PLI_UPDATE_VISUAL_BASELINE=1
 * (documented in artifacts/visual-v3-approved/README.md). Never update merely
 * because a diff failed.
 *
 * Widths per client capability (§96): web at 390 and 1440.
 */
import { test } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = join(__dirname, "..", "artifacts", "visual-v3-current");

/** Resolve the seeded demo pet id (豆豆) via the API. */
async function demoPetId(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const login = await request.post("http://localhost:8800/api/v1/auth/dev/login", { data: { email: "owner@pli.demo" } });
  const { user_id } = (await login.json()) as { user_id: string };
  const r = await request.get("http://localhost:8800/api/v1/pets", { headers: { "X-Dev-User-Id": user_id } });
  const pets = (await r.json()) as Array<{ id: string; name: string }>;
  const doudou = pets.find((p) => p.name === "豆豆");
  return doudou!.id;
}

async function login(page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext): Promise<void> {
  const login = await request.post("http://localhost:8800/api/v1/auth/dev/login", { data: { email: "owner@pli.demo" } });
  const { user_id } = (await login.json()) as { user_id: string };
  await page.goto("/login");
  await page.evaluate((uid) => {
    localStorage.setItem("pli_dev_user_id", uid);
  }, user_id);
}

test.describe.configure({ mode: "serial" });

const WIDTHS = [390, 1440];

test("VISUAL-V3-CAPTURE — owner pages", async ({ page, request }) => {
  test.setTimeout(600_000);
  await login(page, request);
  const petId = await demoPetId(request);
  mkdirSync(OUT, { recursive: true });

  const routes: Array<{ file: string; url: string }> = [
    { file: "today", url: "/" },
    { file: "timeline", url: "/timeline" },
    { file: "pet", url: `/pets/${petId}` },
    { file: "life-view", url: `/pets/${petId}/life-view` },
    { file: "assistant", url: "/agent" },
    { file: "health", url: "/health" },
    { file: "behavior", url: "/behavior" },
    { file: "training", url: "/training" },
    { file: "welfare", url: "/welfare" },
    { file: "social", url: "/social" },
    { file: "companion", url: "/companion" },
    { file: "monitoring", url: "/monitoring" },
  ];

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const r of routes) {
      await page.goto(r.url);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(800);
      const buf = await page.screenshot({ fullPage: false });
      const name = `${r.file}-${w}.png`;
      writeFileSync(join(OUT, name), buf);
      console.log(`captured ${name} (${buf.length} bytes)`);
    }
  }

  const count = existsSync(OUT) ? readFileSync(join(OUT, "today-390.png")).length : 0;
  test.expect(count).toBeGreaterThan(0);
});
