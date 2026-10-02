// pet-stage-entry.js — WebView bootstrap for the pet 3D page (bundled by
// scripts/build-3d-page.mjs, three + @pli/pet-3d; talks to RN via postMessage).
// R2P3D-R1: procedural individual twin from __PLI_TWIN. R2P3D-R4: high-fidelity
// GLB twins embedded at build time replace the procedural pet; failures fall
// back. Poses (Idle/Sit/Walk/...) are real joint animations via __PLI_SET_POSE.
import * as THREE from "three";
import {
  addStageLights,
  applyOrbit,
  buildManifestV2,
  countMeshes,
  createPetStageScene,
  createTwinScene,
  DEFAULT_ORBIT,
  fitOrbitRadius,
  loadTwinGLB,
  orbitFromDrag,
  orbitZoom,
  POSE_NAMES,
  projectPetBounds,
  setTwinAssetResolver,
  STAGE_FOG,
  STAGE_TARGET,
} from "@pli/pet-3d";
import type { LoadedTwin, PoseName } from "@pli/pet-3d";

declare const window: any;

const rootEl = document.getElementById("stage") as HTMLElement;
const identity = (window.__PLI_IDENTITY as string) === "mimi" ? "mimi" : "doudou";
const interactive = !!window.__PLI_INTERACTIVE;
const twinDescriptor = window.__PLI_TWIN ?? null;
// Injected by Pet3DViewer for the V2 identity gate (pet id + media count).
const injectedPetId: string | null = window.__PLI_PET_ID ?? null;
const injectedSourceMediaCount: number = Number(window.__PLI_SOURCE_MEDIA_COUNT ?? 0);
// §31 framing target injected per screen (0 = demo framing, no autofit).
const frameTarget: number = Number(window.__PLI_FRAME_TARGET ?? 0);

// R2P3D-R4: the WebView has no HTTP server (file:///android_asset/), so the GLB
// bytes are embedded at build time and decoded here; null = procedural fallback.
setTwinAssetResolver((identity) => {
  const b64 = window.__PLI_TWIN_GLB_B64__?.[identity];
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
});

function post(msg: Record<string, unknown>): void {
  try {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rn) {
      window.webkit.messageHandlers.rn.postMessage(msg);
    }
  } catch {
    // host bridge unavailable (e.g., static preview) — ignore
  }
}

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
} catch {
  post({ type: "status", status: "failed" });
  throw new Error("webgl unavailable");
}
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
rootEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(STAGE_FOG, 0.05);

// Individual twin (R2P3D-R1) beats demo identity when a descriptor is present.
const stage = twinDescriptor
  ? createTwinScene({
      family: twinDescriptor.family ?? "standard-dog",
      morph: twinDescriptor.morph ?? {},
      texture: twinDescriptor.texture ?? {},
      version: twinDescriptor.version,
      provenance: twinDescriptor.provenance,
    })
  : createPetStageScene(identity, {});
scene.add(stage.pet);
scene.add(stage.shadow);
addStageLights(scene);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
const orbit = { ...DEFAULT_ORBIT };
// Zoom clamp is re-derived from the fitted baseline when auto-framing.
const zoomBounds = { min: 2.6, max: 7 };

// R2P3D-R4: swap in the embedded high-fidelity GLB twin when it loads (web
// parity); the procedural stage stays until then or on failure — never a SPOF.
let petRoot: THREE.Object3D = stage.pet;
let hdTwin: LoadedTwin | null = null;
loadTwinGLB(identity).then((twin) => {
  if (!twin) return;
  scene.remove(stage.pet);
  scene.add(twin.group);
  petRoot = twin.group;
  hdTwin = twin;
  applyFit();
  post({ type: "manifest", manifest: buildManifest() });
}).catch(() => {
  // PROVIDER: GLB failure keeps the procedural stage (engineering manifest).
});
// §31 aspect-aware auto-framing (mirrors web): fit the projected pet box onto frameTarget of the full viewport.
function applyFit(): void {
  if (!twinDescriptor || !(frameTarget > 0)) return;
  const fit = fitOrbitRadius(
    petRoot,
    camera,
    { yaw: DEFAULT_ORBIT.yaw, pitch: DEFAULT_ORBIT.pitch, radius: DEFAULT_ORBIT.radius },
    frameTarget,
    Math.max(1, Math.round(window.innerWidth || 1)),
    Math.max(1, Math.round(window.innerHeight || 1)),
  );
  Object.assign(orbit, fit);
  zoomBounds.min = fit.radius * 0.5;
  zoomBounds.max = fit.radius * 2.5;
  applyOrbit(camera, STAGE_TARGET, orbit);
}
// --- blind scene manifest (test/debug only, never owner UI) ---
function buildManifest(): Record<string, unknown> {
  const rect = renderer.domElement.getBoundingClientRect();
  const { meshCount, skinnedMeshCount } = countMeshes(petRoot);
  const clips = [...POSE_NAMES];
  // §31: projected area ratio is measured against the full viewport (window).
  const projected = projectPetBounds(
    petRoot,
    camera,
    Math.max(1, Math.round(window.innerWidth || 1)),
    Math.max(1, Math.round(window.innerHeight || 1)),
  );
  const m = buildManifestV2({
    ready: true,
    representation: twinDescriptor ? "procedural-twin" : "procedural-demo-stage",
    generic: !twinDescriptor,
    petId: injectedPetId ?? null,
    sourceMediaCount: twinDescriptor ? injectedSourceMediaCount : 0,
    assetVersion: twinDescriptor?.version ?? "demo-v1",
    fallbackUsed: false,
    wireframe: false,
    meshCount,
    skinnedMeshCount,
    skeleton: !!twinDescriptor || !!hdTwin,
    animationClips: clips,
    materialMode: "pbr",
    baseColorTexture: true,
    camera: { fov: camera.fov, distance: orbit.radius, yaw: orbit.yaw, pitch: orbit.pitch, radius: orbit.radius },
    screenBounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    activeClip: activePose ?? "Idle",
    availableClips: clips,
    playbackState: "playing",
    reducedMotion:
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
    pose: activePose ?? "Idle",
    poseSource: twinDescriptor ? ("REPRESENTATIVE" as const) : ("AMBIENT" as const),
    poseConfidence: twinDescriptor ? 0.9 : 0.3,
    projected: projected ?? null,
    // --- Blind Contract V3 (§51) — additive; V2 fields above stay intact ---
    representationQuality: hdTwin ? "HIGH_FIDELITY_SKINNED" : "engineering",
    productCandidate: hdTwin !== null,
    triangleCount: hdTwin?.triangleCount ?? 0,
    uvPresent: hdTwin !== null,
    texturePresent: hdTwin !== null,
    baseColorTextureResolution: hdTwin ? 2048 : 0,
    canonicalPose: activePose ?? "Stand",
    stageRole: "life",
    realityField: "warm-living",
  });
  // Release builds strip console.log (Hermes), so uiautomator accessibility can
  // see the manifest via document.title (machine-readable runtime evidence).
  document.title = "PLI_MANIFEST:" + JSON.stringify(m);
  return m;
}
(window as any).__PLI_GET_MANIFEST = () => buildManifest();
(window as any).__PLI_REQUEST_MANIFEST = () => post({ type: "manifest", manifest: buildManifest() });

function resize(): void {
  const w = Math.max(1, rootEl.clientWidth || window.innerWidth);
  const h = Math.max(1, rootEl.clientHeight || window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyOrbit(camera, STAGE_TARGET, orbit);
  // Auto-frame after each real resize to keep the contract's projected range.
  applyFit();
}
window.addEventListener("resize", resize);
resize();

// --- pose control ---
let activePose: string | null = null;
const poseTimeOffset = { value: 0 };
(window as any).__PLI_SET_POSE = (name: string | null) => {
  activePose = name && name !== "Idle" ? name : null;
  poseTimeOffset.value = 0;
  post({ type: "pose", pose: activePose ?? "Idle" });
};

let lastYaw = orbit.yaw;
function reportOrientation(): void {
  if (Math.abs(orbit.yaw - lastYaw) > 0.02) {
    lastYaw = orbit.yaw;
    post({ type: "orientation", yaw: orbit.yaw, pitch: orbit.pitch, radius: orbit.radius });
  }
}

function frame(t: number): void {
  const time = (t / 1000) + poseTimeOffset.value;
  if (hdTwin) {
    hdTwin.setPose((activePose ?? "Idle") as PoseName, time); // R4 GLB twin: real bones
  } else if (twinDescriptor) {
    (stage as any).setPose(activePose ?? "Idle", time); // twin scene: joint clips
  } else {
    (stage as any).setPose(time, true); // demo stage: breathing only
  }
  applyOrbit(camera, STAGE_TARGET, orbit);
  renderer.render(scene, camera);
  reportOrientation();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
post({ type: "status", status: "ready" });
post({ type: "manifest", manifest: buildManifest() });
// Blind harness: keep the manifest fresh on the [plimanifest] logcat channel.
setInterval(() => post({ type: "manifest", manifest: buildManifest() }), 2000);
// --- touch / pointer interaction (interactive only) ---
let pointers = new Map<number, { x: number; y: number }>();
let lastPinch = 0;

rootEl.addEventListener(
  "touchstart",
  (e: TouchEvent) => {
    if (!interactive) return;
    e.preventDefault();
    pointers.clear();
    for (const t of Array.from(e.touches)) pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
    lastPinch = pinchDist(e);
  },
  { passive: false },
);
rootEl.addEventListener(
  "touchmove",
  (e: TouchEvent) => {
    if (!interactive || e.touches.length === 0) return;
    e.preventDefault();
    if (e.touches.length >= 2 && lastPinch > 0) {
      const d = pinchDist(e);
      const factor = d / lastPinch;
      if (factor > 0.01 && factor < 100) Object.assign(orbit, orbitZoom(orbit, factor));
      lastPinch = d;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const prev = pointers.get(t.identifier);
      if (prev) {
        Object.assign(orbit, orbitFromDrag(orbit, t.clientX - prev.x, t.clientY - prev.y));
        pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
  },
  { passive: false },
);
rootEl.addEventListener("touchend", () => {
  pointers.clear();
  lastPinch = 0;
});

function pinchDist(e: TouchEvent): number {
  if (e.touches.length < 2) return 0;
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- buttons ---
window.zoom = (inward: boolean) => {
  Object.assign(orbit, orbitZoom(orbit, inward ? 1.2 : 1 / 1.2, zoomBounds));
};
window.resetView = () => {
  // Reset restores the canonical framing — re-fitted so the zoom/reset camera
  // evidence always compares against the SAME fitted baseline.
  Object.assign(orbit, { ...DEFAULT_ORBIT });
  applyFit();
};

const controls = document.getElementById("controls") as HTMLElement;
if (interactive) controls.classList.add("show");