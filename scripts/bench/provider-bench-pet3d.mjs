// R2P3D-R1 provider benchmark — pet-3d procedural runtime metrics.
//
// Builds the demo scenes (doudou corgi / mimi cat) and measures part counts,
// mesh budgets, bounds and per-identity build cost. No model downloads, no
// WebGL needed (pure scene-graph construction). Writes JSON into
// artifacts/r2p3d-r1/provider-benchmark/pet3d_scene_metrics.json.
//
// Run: node scripts/bench/provider-bench-pet3d.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import * as THREE from "three";
// Import pet-3d TS sources directly so esbuild bundles them (the dist/
// package emits extensionless imports that only bundlers resolve; the
// workspace exports map would otherwise keep @pli/pet-3d external).
import { createPetStageScene, addStageLights } from "../../packages/pet-3d/src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, "..", "..");
const outDir = join(repo, "artifacts", "r2p3d-r1", "provider-benchmark");
mkdirSync(outDir, { recursive: true });

function countMeshes(group, acc = { meshes: 0, triangles: 0, vertices: 0 }) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      acc.meshes += 1;
      const geo = obj.geometry;
      const pos = geo.getAttribute?.("position");
      if (pos) acc.vertices += pos.count;
      const index = geo.getIndex?.();
      acc.triangles += index ? index.count / 3 : pos ? pos.count / 3 : 0;
    }
  });
  return acc;
}

const results = {};
for (const identity of ["doudou", "mimi"]) {
  const t0 = performance.now();
  const scene = createPetStageScene(identity, { shadow: true });
  const t1 = performance.now();
  const stats = countMeshes(scene.pet);
  const box = new THREE.Box3().setFromObject(scene.pet);
  const size = box.getSize(new THREE.Vector3());
  results[identity] = {
    buildMs: Math.round(t1 - t0),
    meshes: stats.meshes,
    triangles: Math.round(stats.triangles),
    vertices: stats.vertices,
    bounds: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
    animProvider: "scene.setPose (idle breathing)",
  };
}

// Lighting rig availability check (scene construction only).
const t0 = performance.now();
const s = new THREE.Scene();
addStageLights(s);
const lightMs = Math.round((performance.now() - t0) * 100) / 100;

const row = {
  benchmark: "pet3d_runtime",
  provider: "packages/pet-3d (in-repo procedural)",
  real: false,
  model_download: "none",
  license_state: "in-repo MIT",
  environments: ["web WebGL", "mobile WebView"],
  identity_metrics: results,
  lightRigBuildMs: lightMs,
  output_format: "three.js scene graph (GLB export via twin GLB QA gateway)",
  verdict: "RECOMMENDED_STANDARD_PIPELINE (runtime base)",
};

const outPath = join(outDir, "pet3d_scene_metrics.json");
writeFileSync(outPath, JSON.stringify(row, null, 2), "utf-8");
console.log(JSON.stringify(row, null, 2));
console.log(`\nwrote ${outPath}`);