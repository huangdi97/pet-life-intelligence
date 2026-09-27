// pet-stage-entry.js — runtime bootstrap for the WebView-hosted pet 3D page.
// Bundled by scripts/build-3d-page.mjs with three + the shared @pli/pet-3d
// asset. Communicates with React Native via window.ReactNativeWebView.postMessage:
//   { type: "status", status: "ready" | "failed" }
//   { type: "orientation", yaw, pitch, radius }
import * as THREE from "three";
import {
  addStageLights,
  applyOrbit,
  createPetStageScene,
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
const stage = createPetStageScene(identity, {});
scene.add(stage.pet);
scene.add(stage.shadow);
addStageLights(scene);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
const orbit = { ...DEFAULT_ORBIT };

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

let lastYaw = orbit.yaw;
function reportOrientation(): void {
  if (Math.abs(orbit.yaw - lastYaw) > 0.02) {
    lastYaw = orbit.yaw;
    post({ type: "orientation", yaw: orbit.yaw, pitch: orbit.pitch, radius: orbit.radius });
  }
}

function frame(t: number): void {
  stage.setPose(t / 1000, true);
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