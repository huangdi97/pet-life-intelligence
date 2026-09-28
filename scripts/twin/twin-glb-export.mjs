// twin-glb-export.mjs — export individual twin demo fixtures to GLB (R2P3D-R1).
//
// Builds two demo twins (corgi-like dog with photo-region texture + standard
// cat) via @pli/pet-3d, attaches the full 12-clip motion library, and exports
// a binary GLB per fixture using three's GLTFExporter. Also writes a sidecar
// animation manifest (JSON) so QA can compare runtime motion vs exported clip
// names without decoding the binary.
//
// Run: node scripts/twin/twin-glb-export.mjs  (esbuild-bundled, see below)
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  buildClip,
  createTwinScene,
  motionManifest,
  POSE_NAMES,
} from "../../packages/pet-3d/src/index.ts";

// Node runtime shim: GLTFExporter's binary path uses FileReader (browser API).
// MUST be installed before any export runs.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    result = null;
    onloadend = null;
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (typeof this.onloadend === "function") this.onloadend();
      });
    }
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, "..", "..");
const outDir = join(repo, "artifacts", "r2p3d-r1", "glb");
mkdirSync(outDir, { recursive: true });

const fixtures = [
  {
    id: "doudou-individual-dog",
    descriptor: {
      family: "corgi-like",
      morph: { body_length: 1.5, leg_length_front: 0.52, tail_curve: 0.35 },
      texture: {
        observed: { coat: "#E8C79A", cream: "#FBF6EB", ear: "#C08A4E" },
        inferred: { tail: "#D9A968", paw: "#F2D9AD" },
      },
      version: 1,
      provenance: "DEMO_SYNTHETIC",
    },
  },
  {
    id: "mimi-individual-cat",
    descriptor: {
      family: "standard-cat",
      morph: { body_length: 1.15, tail_length: 1.4, tail_thickness: 0.55 },
      texture: {
        observed: { coat: "#C9BFB2", cream: "#EFE6DA", ear: "#D9B8B0" },
        inferred: { tail: "#B5A99A", paw: "#D9CFC2" },
      },
      version: 1,
      provenance: "DEMO_SYNTHETIC",
    },
  },
];

function toGLB(scene, clips) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => resolve(gltf),
      (err) => reject(err),
      { binary: true, animations: clips },
    );
  });
}

const manifest = motionManifest();
function exportableScene(twin) {
  // Export a wrapper Group containing the rig root so that every joint
  // (including joint_root) is a child node and can carry animation tracks.
  const root = new THREE.Group();
  root.name = "twinScene";
  root.add(twin.pet);
  return root;
}
for (const fx of fixtures) {
  const twin = createTwinScene(fx.descriptor);
  const clips = POSE_NAMES.map((n) => buildClip(n)).filter((c) => c.tracks.length > 0);
  const glb = await toGLB(exportableScene(twin), clips);
  const glbPath = join(outDir, `${fx.id}.glb`);
  writeFileSync(glbPath, Buffer.from(glb));
  const jsonPath = join(outDir, `${fx.id}.manifest.json`);
  writeFileSync(jsonPath, JSON.stringify({
    descriptor: fx.descriptor,
    animation: { clips: manifest.clips, names: manifest.names, truth: manifest.truth },
    exportedClips: clips.map((c) => ({ name: c.name, duration: c.duration, tracks: c.tracks.length })),
  }, null, 2));
  console.log(`exported ${glbPath} (${Buffer.byteLength(glb)} bytes, ${clips.length} clips)`);
}
writeFileSync(join(outDir, "motion-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("done");
