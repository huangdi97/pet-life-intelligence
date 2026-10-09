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
  canPersonalizeTwinGLB,
  countMeshes,
  createPetStageScene,
  createTwinScene,
  DEFAULT_ORBIT,
  fitOrbitRadius,
  loadTwinGLB,
  orbitFromDrag,
  orbitZoom,
  POSE_NAMES,
  POSE_META,
  projectPetBounds,
  setTwinAssetResolver,
  STAGE_THEMES,
  STAGE_TARGET,
} from "@pli/pet-3d";
import type { LoadedTwin, PoseName, StageTheme } from "@pli/pet-3d";

declare const window: any;

const rootEl = document.getElementById("stage") as HTMLElement;
const identity = (window.__PLI_IDENTITY as string) === "mimi" ? "mimi" : "doudou";
const interactive = !!window.__PLI_INTERACTIVE;
// R4.2 stage theme: warm living field / neutral identity studio / engineering
// debug. Owner hero pages (Today/Pet/Life/Twin Review) never use engineering.
const stageTheme: StageTheme =
  window.__PLI_STAGE_THEME === "review" || window.__PLI_STAGE_THEME === "engineering"
    ? (window.__PLI_STAGE_THEME as StageTheme)
    : "living";
const injectedStageRole =
  window.__PLI_STAGE_ROLE === "today" ||
  window.__PLI_STAGE_ROLE === "pet" ||
  window.__PLI_STAGE_ROLE === "life" ||
  window.__PLI_STAGE_ROLE === "review" ||
  window.__PLI_STAGE_ROLE === "companion"
    ? String(window.__PLI_STAGE_ROLE)
    : stageTheme === "review"
      ? "review"
      : "life";
const twinDescriptor = window.__PLI_TWIN ?? null;
// Injected by Pet3DViewer for the V2 identity gate (pet id + media count).
const injectedPetId: string | null = window.__PLI_PET_ID ?? null;
const injectedSourceMediaCount: number = Number(window.__PLI_SOURCE_MEDIA_COUNT ?? 0);
const injectedDemoTwin: boolean = window.__PLI_DEMO_TWIN === true;
// §31 framing target injected per screen (0 = demo framing, no autofit).
const frameTarget: number = Number(window.__PLI_FRAME_TARGET ?? 0);
const reduceMotionQuery =
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

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
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
} catch {
  post({ type: "status", status: "failed" });
  throw new Error("webgl unavailable");
}
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
rootEl.appendChild(renderer.domElement);

const theme = STAGE_THEMES[stageTheme];
const scene = new THREE.Scene();
// R5: owner product surfaces are composed by the native Living Stage. Keep
// the WebGL canvas transparent so it cannot re-introduce a rectangular viewer
// inside that field. Engineering/debug remains deliberately opaque.
if (stageTheme === "engineering") {
  scene.background = new THREE.Color(theme.base);
  renderer.setClearColor(new THREE.Color(theme.base), 1);
} else {
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
}
scene.fog = new THREE.FogExp2(new THREE.Color(theme.fog), stageTheme === "engineering" ? 0.035 : 0.022);

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

// Subtle grounding + ambient radial light (light environment cues). The pet
// stays centered; these are low-contrast, low-saturation additions so the
// hero reads as an open warm room, not a lab viewer.
if (stageTheme !== "engineering") {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.base),
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    }),
  );
  floor.name = "pliAmbientFloor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  scene.add(floor);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.glow),
      transparent: true,
      opacity: 0.10,
      depthWrite: false,
    }),
  );
  glow.name = "pliAmbientGlow";
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  scene.add(glow);
}

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
const orbit = { ...DEFAULT_ORBIT };
// Review surfaces own an explicit canonical yaw. Normal Living surfaces leave
// this null and keep the warm 3/4 DEFAULT_ORBIT framing.
let reviewPresetYaw: number | null = null;
// Zoom clamp is re-derived from the fitted baseline when auto-framing.
const zoomBounds = { min: 2.6, max: 7 };

// R2P3D-R4: swap in the embedded high-fidelity GLB twin when it loads (web
// parity); the procedural stage stays until then or on failure — never a SPOF.
let petRoot: THREE.Object3D = stage.pet;
let hdTwin: LoadedTwin | null = null;
// If the product GLB fails, the procedural bridge remains usable but is
// explicitly classified as fallback in the runtime manifest.
let hdLoadFailed = false;
// A compatible owner Corgi/cat descriptor may deform the corresponding
// embedded skinned template. Other families stay procedural/photo fallback;
// never route an arbitrary dog through the Corgi GLB just to satisfy a gate.
const supportsIndividualGlb = Boolean(
  twinDescriptor && canPersonalizeTwinGLB(identity, twinDescriptor),
);
const productGlbRequested = injectedDemoTwin || supportsIndividualGlb;
const bundledTwin = productGlbRequested
  ? loadTwinGLB(identity, injectedDemoTwin ? null : twinDescriptor)
  : Promise.resolve(null);
bundledTwin.then((twin) => {
  if (!twin) {
    hdLoadFailed = Boolean(productGlbRequested);
    post({ type: "manifest", manifest: buildManifest() });
    return;
  }
  scene.remove(stage.pet);
  scene.add(twin.group);
  petRoot = twin.group;
  hdTwin = twin;
  applyFit();
  post({ type: "manifest", manifest: buildManifest() });
}).catch(() => {
  // PROVIDER: GLB failure keeps the procedural stage, but never masquerades
  // as the high-fidelity product representation.
  hdLoadFailed = Boolean(productGlbRequested);
  post({ type: "manifest", manifest: buildManifest() });
});
// §31 aspect-aware auto-framing (mirrors web): fit the projected pet box onto frameTarget of the full viewport.
function applyFit(): void {
  if (!twinDescriptor || !(frameTarget > 0)) return;
  const fit = fitOrbitRadius(
    petRoot,
    camera,
    {
      yaw: reviewPresetYaw ?? orbit.yaw,
      pitch: orbit.pitch,
      radius: DEFAULT_ORBIT.radius,
    },
    frameTarget,
    Math.max(1, Math.round(window.innerWidth || 1)),
    Math.max(1, Math.round(window.innerHeight || 1)),
    { fitYaws: injectedStageRole === "review" ? [0, Math.PI / 2, Math.PI] : injectedStageRole === "life" ? [-0.35, 0, 0.35, Math.PI / 2, Math.PI] : undefined, canvasRect: renderer.domElement.getBoundingClientRect() },
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
    undefined,
    rect,
  );
  const manifestPose = (activePose ?? "Idle") as PoseName;
  const poseTruth = POSE_META[manifestPose]?.truth ?? "AMBIENT";
  const m = buildManifestV2({
    ready: true,
    // Phase E: canonical representation names the asset that is REALLY on
    // screen — the embedded HIGH_FIDELITY_SKINNED GLB twin when loaded;
    // legacyRepresentation keeps the R3-era procedural label for
    // backward-compatible readers. No auditor should see HIGH_FIDELITY_SKINNED
    // + "procedural-demo-stage" on the same line without an explanation.
    representation: hdTwin
      ? "high-fidelity-glb-twin"
      : twinDescriptor
        ? "procedural-twin"
        : "procedural-demo-stage",
    legacyRepresentation: twinDescriptor ? "procedural-twin" : "procedural-demo-stage",
    generic: !twinDescriptor,
    petId: injectedPetId ?? null,
    sourceMediaCount: twinDescriptor ? injectedSourceMediaCount : 0,
    assetVersion: twinDescriptor?.version ?? "demo-v1",
    fallbackUsed: hdLoadFailed,
    wireframe: false,
    meshCount,
    skinnedMeshCount,
    skeleton: !!twinDescriptor || !!hdTwin,
    animationClips: clips,
    materialMode: "pbr",
    baseColorTexture: hdTwin !== null,
    camera: { fov: camera.fov, distance: orbit.radius, yaw: orbit.yaw, pitch: orbit.pitch, radius: orbit.radius },
    screenBounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    activeClip: manifestPose,
    availableClips: clips,
    playbackState: "playing",
    reducedMotion:
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
    pose: manifestPose,
    poseSource: poseTruth,
    poseConfidence: poseTruth === "OBSERVED" ? 1.0 : poseTruth === "REPRESENTATIVE" ? 0.9 : 0.3,
    projected: projected ?? null,
    // --- Blind Contract V3 (§51) — additive; V2 fields above stay intact ---
    // Technical completeness and visual/identity fidelity are independent.
    // A bundled rigged PBR template with zero owner-media evidence remains a
    // stylized reference, never an asserted likeness of the owner's pet.
    representationQuality: hdTwin ? "HIGH_FIDELITY_SKINNED" : "engineering",
    technicalRepresentationQuality: hdTwin ? "RIGGED_PBR_SKINNED" : "PROCEDURAL_ENGINEERING",
    visualFidelityTier: injectedDemoTwin && hdTwin
      ? "STYLIZED_REFERENCE"
      : twinDescriptor && injectedSourceMediaCount > 0 && !injectedDemoTwin
        ? "OWNER_MEDIA_REFERENCED"
        : "ENGINEERING_FALLBACK",
    individualIdentityEvidence: Boolean(twinDescriptor && injectedSourceMediaCount > 0 && !injectedDemoTwin),
    productCandidate: hdTwin !== null,
    personalizedSkinnedTemplate: Boolean(hdTwin?.personalized),
    ownerCoatTintApplied: Boolean(hdTwin?.ownerCoatTint),
    triangleCount: hdTwin?.triangleCount ?? 0,
    uvPresent: hdTwin !== null,
    texturePresent: hdTwin !== null,
    baseColorTextureResolution: hdTwin ? 2048 : 0,
    canonicalPose: manifestPose,
    stageRole: injectedStageRole,
    surfaceVariant:
      stageTheme === "review"
        ? ("neutral-identity-studio" as const)
        : stageTheme === "engineering"
          ? ("dark-debug" as const)
          : ("warm-living-field" as const),
    realityField: stageTheme === "review" ? ("review-studio" as const) : stageTheme === "engineering" ? ("engineering-debug" as const) : ("warm-living" as const),
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
    const effectivePose = (reduceMotionQuery?.matches ?? false) && !activePose ? "Stand" : (activePose ?? "Idle");
    hdTwin.setPose(effectivePose as PoseName, (reduceMotionQuery?.matches ?? false) && !activePose ? 0 : time); // ambient motion respects OS preference
  } else if (twinDescriptor) {
    const effectivePose = (reduceMotionQuery?.matches ?? false) && !activePose ? "Stand" : (activePose ?? "Idle");
    (stage as any).setPose(effectivePose, (reduceMotionQuery?.matches ?? false) && !activePose ? 0 : time); // individual twin respects OS preference
  } else {
    (stage as any).setPose(time, !(reduceMotionQuery?.matches ?? false)); // ambient breathing respects OS motion preference
  }
  applyOrbit(camera, STAGE_TARGET, orbit);
  renderer.render(scene, camera);
  reportOrientation();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
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
      if (factor > 0.01 && factor < 100) Object.assign(orbit, orbitZoom(orbit, factor, zoomBounds));
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
  applyOrbit(camera, STAGE_TARGET, orbit);
  post({ type: "manifest", manifest: buildManifest(), force: true });
};
window.resetView = () => {
  // Reset restores the canonical framing while preserving an explicit Review
  // angle. A selected "正面/侧面/背面" chip must never disagree with camera yaw.
  Object.assign(orbit, {
    ...DEFAULT_ORBIT,
    yaw: reviewPresetYaw ?? DEFAULT_ORBIT.yaw,
  });
  applyFit();
  applyOrbit(camera, STAGE_TARGET, orbit);
  post({ type: "manifest", manifest: buildManifest(), force: true });
};
// R4.1 (Phase C): Twin Review view presets must drive the real camera —
// front = 0, side = π/2, back = π (mirrors the web Twin Review + pixel
// contract). The yaw is applied in the page so the manifest camera evidence
// (3d.json yaw) proves the view switch is a true camera move.
window.__PLI_SET_VIEW = (yaw: number) => {
  reviewPresetYaw = yaw;
  Object.assign(orbit, { yaw, pitch: DEFAULT_ORBIT.pitch });
  applyOrbit(camera, STAGE_TARGET, orbit);
  post({ type: "manifest", manifest: buildManifest(), force: true });
};

const controls = document.getElementById("controls") as HTMLElement;
// Product owner pages use the native React Native controls so there is one
// interaction layer, not duplicated WebView + native +/-/reset buttons.
if (interactive && stageTheme === "engineering") controls.classList.add("show");

// Host-ready means both renderer AND imperative camera controls exist. Posting
// ready earlier allowed the React Native host to issue the initial Review
// preset before __PLI_SET_VIEW had been installed.
post({ type: "status", status: "ready" });
post({ type: "manifest", manifest: buildManifest(), force: true });
// Blind harness: keep the persisted runtime truth fresh.
setInterval(() => post({ type: "manifest", manifest: buildManifest() }), 2000);