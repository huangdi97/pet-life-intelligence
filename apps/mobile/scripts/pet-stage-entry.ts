// pet-stage-entry.js — runtime bootstrap for the WebView-hosted pet 3D page.
// Bundled by scripts/build-3d-page.mjs with three + the shared @pli/pet-3d
// asset. Communicates with React Native via window.ReactNativeWebView.postMessage:
//   { type: "status", status: "ready" | "failed" }
//   { type: "orientation", yaw, pitch, radius }
//
// R2P3D-R1 individual twin: when window.__PLI_TWIN is injected (family/morph/
// texture from the backend pipeline), the page builds that individual twin via
// createTwinScene; otherwise it falls back to the demo identity stage. Pose
// switching is exposed as window.__PLI_SET_POSE(name) so RN can push motion
// clips (Idle/Sit/Walk/...) — real joint animations, never health-driven.
import * as THREE from "three";
import {
  addStageLights,
  applyOrbit,
  createPetStageScene,
  createTwinScene,
  DEFAULT_ORBIT,
  orbitFromDrag,
  orbitZoom,
  STAGE_FOG,
  STAGE_TARGET,
} from "@pli/pet-3d";

declare const window: any;

const rootEl = document.getElementById("stage") as HTMLElement;
const identity = (window.__PLI_IDENTITY as string) === "mimi" ? "mimi" : "doudou";
const interactive = !!window.__PLI_INTERACTIVE;
const twinDescriptor = window.__PLI_TWIN ?? null;

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
// Twin scenes are built ground-anchored and centered; keep default framing
// but widen a touch so morph-extended pets still fit.
if (twinDescriptor) orbit.radius = Math.max(orbit.radius, 5.2);

function resize(): void {
  const w = Math.max(1, rootEl.clientWidth || window.innerWidth);
  const h = Math.max(1, rootEl.clientHeight || window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyOrbit(camera, STAGE_TARGET, orbit);
}
window.addEventListener("resize", resize);
resize();
applyOrbit(camera, STAGE_TARGET, orbit);

// --- pose control ---
let activePose: string | null = null;
const poseTimeOffset = { value: 0 }; // deterministic start per pose switch
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
  if (twinDescriptor) {
    // Twin scene: setPose(poseName, timeSeconds) — real joint animation.
    (stage as any).setPose(activePose ?? "Idle", time);
  } else {
    // Demo stage: setPose(timeSeconds, enabled) — breathing only.
    (stage as any).setPose(time, true);
  }
  applyOrbit(camera, STAGE_TARGET, orbit);
  renderer.render(scene, camera);
  reportOrientation();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
post({ type: "status", status: "ready" });

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
    const next = new Map<number, { x: number; y: number }>();
    for (const t of Array.from(e.touches)) next.set(t.identifier, { x: t.clientX, y: t.clientY });

    if (e.touches.length >= 2 && lastPinch > 0) {
      const d = pinchDist(e);
      const factor = d / lastPinch;
      if (factor > 0.01 && factor < 100) Object.assign(orbit, orbitZoom(orbit, factor));
      lastPinch = d;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const prev = pointers.get(t.identifier);
      if (prev) {
        const dx = t.clientX - prev.x;
        const dy = t.clientY - prev.y;
        Object.assign(orbit, orbitFromDrag(orbit, dx, dy));
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
  Object.assign(orbit, orbitZoom(orbit, inward ? 1.2 : 1 / 1.2));
};
window.resetView = () => {
  Object.assign(orbit, { ...DEFAULT_ORBIT });
};

const controls = document.getElementById("controls") as HTMLElement;
if (interactive) controls.classList.add("show");