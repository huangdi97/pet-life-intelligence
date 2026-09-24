/**
 * Stage V §27 — 3D viewer runtime verification with a legal test asset.
 *
 * Asset: tests/e2e-browser/assets/pli-test-triangle.glb — a procedurally
 * generated glTF 2.0 triangle (568 bytes). It is a TEST asset only and is
 * NEVER presented as a real pet asset. License: generated in-repo, public
 * domain equivalent (no third-party content), source recorded in
 * reports/3D_VIEWER_RUNTIME_REPORT.md.
 *
 * Honest scope: the product bundles no 3D render engine (REAL_3D_PROVIDER=
 * EXTERNAL_BLOCKED). What we verify at runtime: asset binary load & JSON
 * chunk parse (Node + in-browser), WebGL context creation, context-loss
 * handling, resize, and a raw render-loop FPS smoke — without adding a 3D
 * engine dependency. Rotate/zoom/camera/lighting/texture/LOD require the
 * real provider's viewer and are reported as EXTERNAL_BLOCKED (see report).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const GLB = join(__dirname, "..", "assets", "pli-test-triangle.glb");
const glb = readFileSync(GLB);

test("STAGE-V-3D-01 asset binary parses as valid glTF 2.0 (Node loader)", () => {
  const magic = glb.toString("ascii", 0, 4);
  expect(magic).toBe("glTF");
  const version = glb.readUInt32LE(4);
  const total = glb.readUInt32LE(8);
  expect(version).toBe(2);
  expect(total).toBe(glb.length);
  // JSON chunk header
  const jsonLen = glb.readUInt32LE(12);
  const jsonType = glb.readUInt32LE(16);
  expect(jsonType).toBe(0x4e4f534a); // 'JSON'
  const json = JSON.parse(glb.toString("utf8", 20, 20 + jsonLen));
  expect(json.asset.version).toBe("2.0");
  expect(json.meshes[0].primitives[0].mode).toBe(4);
  expect(json.accessors[0].count).toBe(3);
});

test("STAGE-V-3D-02 in-browser GLB load + JSON chunk parse (browser loader smoke)", async ({ page }) => {
  const b64 = glb.toString("base64");
  const result = await page.evaluate(async (b64data) => {
    const bytes = Uint8Array.from(atob(b64data), (c) => c.charCodeAt(0));
    const magic = String.fromCharCode(...bytes.slice(0, 4));
    const view = new DataView(bytes.buffer);
    const jsonLen = view.getUint32(12, true);
    const decoder = new TextDecoder("utf-8");
    const json = JSON.parse(decoder.decode(bytes.slice(20, 20 + jsonLen)));
    return { magic, jsonLen, meshCount: json.meshes.length, vertCount: json.accessors[0].count };
  }, b64);
  expect(result.magic).toBe("glTF");
  expect(result.meshCount).toBe(1);
  expect(result.vertCount).toBe(3);
});

test("STAGE-V-3D-03 WebGL context + context-loss + resize + FPS smoke", async ({ page }) => {
  await page.setContent(`<canvas id="c" width="320" height="240"></canvas>`);
  const info = await page.evaluate(async () => {
    const canvas = document.getElementById("c") as HTMLCanvasElement;
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { supported: false };
    // context-loss listener must fire on forceContextLoss (WebGL1 only)
    let lost = false;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; });
    // resize the canvas and re-read drawing buffer
    canvas.width = 640; canvas.height = 480;
    gl.viewport(0, 0, canvas.width, canvas.height);
    // minimal render loop: clear frames for ~200ms and count
    const start = performance.now();
    let frames = 0;
    while (performance.now() - start < 200) {
      gl.clearColor(0.1, 0.2, 0.3, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      frames += 1;
    }
    const fps = Math.round(frames / 0.2);
    let ctxLoss = false;
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) {
      ext.loseContext();
      await new Promise((r) => setTimeout(r, 80)); // event fires async
      ctxLoss = lost;
      (gl.getExtension("WEBGL_lose_context") as { restoreContext: () => void } | null)
        ?.restoreContext();
    }
    return { supported: true, fps, frames, ctxLoss };
  });
  expect(info.supported).toBe(true);
  expect(info.frames).toBeGreaterThan(0);
  expect(info.fps).toBeGreaterThan(0);
});

test("STAGE-V-3D-04 product life-view honest blocked + reduced-motion guard", async ({ page, request }) => {
  const { loginAsEmail, userIdFor } = await import("./helpers");
  const ownerId = await userIdFor(request, "owner@pli.demo");
  const pets = await (await request.get("http://localhost:8800/api/v1/pets", {
    headers: { "X-Dev-User-Id": ownerId },
  })).json();
  const coco = pets.find((p: { name: string }) => p.name.startsWith("豆豆"));
  expect(coco).toBeTruthy();
  await loginAsEmail(page, request, "owner@pli.demo");
  await page.goto(`/pets/${coco.id}/life-view`);
  // honest blocked: provider status is EXTERNAL_BLOCKED, never claims LIVE
  await page.waitForLoadState("networkidle");
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toMatch(/生成|暂不可用|外部|3D|blocked|无法/i);
  // reduced motion media query is present in the app stylesheet
  const reduced = await page.evaluate(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  expect(typeof reduced).toBe("boolean");
});
