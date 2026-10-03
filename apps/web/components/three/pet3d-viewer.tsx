"use client";

/**
 * Pet3DViewer — web adapter for the shared demo pet 3D scene.
 *
 * Renders the SAME 豆豆/咪咪 asset as the mobile app through three.js WebGL.
 * Drag rotates (full in life variant), wheel/buttons zoom (life variant),
 * reset restores the default view.
 * Exposes data-testid + status/orientation attrs for deterministic Playwright
 * assertions. On WebGL failure the parent falls back to photo/2.5D — 3D is
 * never a single point of failure.
 *
 * Blind Contract V2: publishes a RUNTIME manifest (window.__PLI_3D_MANIFEST__)
 * with manifestOrigin=RUNTIME, identity fields (generic/petId/sourceMediaCount)
 * and the real projected pet bounds — never the stage container box.
 */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  addStageLights,
  applyOrbit,
  buildManifestV2,
  clampRadius,
  countMeshes,
  createPetStageScene,
  createTwinScene,
  DEFAULT_ORBIT,
  fitOrbitRadius,
  frameCamera,
  orbitFromDrag,
  orbitZoom,
  POSE_NAMES,
  PET_3D_ASSETS,
  projectPetBounds,
  STAGE_FOG,
  STAGE_TARGET,
} from "@pli/pet-3d";
import type { OrbitState, Pet3DIdentity, PoseName, TwinDescriptor } from "@pli/pet-3d";
import { loadTwinGLB, setTwinAssetResolver } from "@pli/pet-3d";
import type { LoadedTwin } from "@pli/pet-3d";
export type Pet3DStatus = "boot" | "ready" | "failed";

interface Props {
  identity: Pet3DIdentity;
  variant?: "stage" | "life";
  interactive?: boolean;
  /** Individual twin descriptor from the backend pipeline (R2P3D-R1). */
  twin?: TwinDescriptor | null;
  /** Active motion clip for the 3D stage. */
  pose?: PoseName | null;
  /** Individual identity metadata for the V2 manifest (blind harness). */
  petId?: string | null;
  sourceMediaCount?: number;
  /**
   * §31 framing target: the projected pet box should occupy this fraction of
   * the full viewport. >0 enables aspect-aware auto-framing for the twin
   * (renderer knob — the contract ranges stay canonical). 0 = demo framing.
  */
  frameTarget?: number;
  stageRole?: string;
  realityField?: string;
  onStatus?: (status: Pet3DStatus) => void;
}

export function Pet3DViewer({
  identity,
  twin = null,
  pose = null,
  variant = "stage",
  interactive = false,
  petId = null,
  sourceMediaCount = 0,
  frameTarget = 0,
  stageRole = "life",
  realityField = "",
  onStatus,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef<OrbitState>({ ...DEFAULT_ORBIT });
  /** Fitted canonical orbit (reset restores this framing, not the demo one). */
  const canonicalFitRef = useRef<OrbitState>({ ...DEFAULT_ORBIT });
  /** Zoom clamp bounds derived from the fitted framing baseline. */
  const zoomBoundsRef = useRef<{ min: number; max: number }>({ min: 2.6, max: 7 });

  const draggingRef = useRef(false);
  const poseRef = useRef<PoseName | null>(pose);
  const [status, setStatus] = useState<Pet3DStatus>("boot");


  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let raf = 0;
    let alive = true;
    let reducedMotion = false;
    const reduceQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const syncOrientation = () => {
      wrap.dataset.orientation = orbitRef.current.yaw.toFixed(2);
      publishManifest();
    };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch {
      setStatus("failed");
      onStatus?.("failed");
      return;
    }

    renderer.domElement.setAttribute("data-testid", "pet3d-canvas");
    wrap.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(STAGE_FOG, 0.045);
    // Individual twin (R2P3D-R1) beats demo identity when a descriptor exists.
    const stage = twin
      ? createTwinScene({
          family: twin.family ?? "standard-dog",
          morph: twin.morph ?? {},
          texture: twin.texture ?? {},
          version: twin.version,
          provenance: twin.provenance,
        })
      : createPetStageScene(identity);
    scene.add(stage.pet);
    scene.add(stage.shadow);
    addStageLights(scene);

    // R4: the product candidate is a HIGH_FIDELITY_SKINNED GLB. The
    // procedural twin stays only as the engineering fallback while the GLB
    // loads (or when it fails). Manifest reclassifies accordingly.
    let petRoot: THREE.Object3D = stage.pet;
    let hdTwin: LoadedTwin | null = null;
    if (twin && identity) {
      setTwinAssetResolver(null);
      loadTwinGLB(identity)
        .then((twin3d) => {
          if (!alive || !twin3d || !scene || !camera) return undefined;
          scene.remove(stage.pet);
          scene.add(twin3d.group);
          petRoot = twin3d.group;
          hdTwin = twin3d;
          applyOrbit(camera, STAGE_TARGET, orbitRef.current);
          if (frameTarget > 0) {
            const fit = fitOrbitRadius(
              twin3d.group,
              camera,
              { yaw: DEFAULT_ORBIT.yaw, pitch: DEFAULT_ORBIT.pitch, radius: DEFAULT_ORBIT.radius },
              frameTarget,
              Math.max(1, Math.round(window.innerWidth)),
              Math.max(1, Math.round(window.innerHeight)),
            );
            canonicalFitRef.current = fit;
            zoomBoundsRef.current = { min: fit.radius * 0.5, max: fit.radius * 2.5 };
            orbitRef.current = { ...fit };
            applyOrbit(camera, STAGE_TARGET, orbitRef.current);
          }
          syncOrientation();
          return undefined;
        })
        .catch((err) => {
          // PROVIDER: GLB load failures must never take down the hero; the
          // procedural twin stays as the engineering fallback. Log for QA.
          if (typeof console !== "undefined") console.error("R4_TWIN_GLB_LOAD_FAIL", err);
          return undefined;
        });
    }

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer?.setSize(w, h, false);
      if (camera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (twin) {
          // Twin scenes are ground-anchored; use the shared orbit framing.
          applyOrbit(camera, STAGE_TARGET, orbitRef.current);
          if (frameTarget > 0) {
            // §31 aspect-aware auto-framing: fit the projected pet box onto
            // frameTarget of the full viewport whatever the stage aspect, so
            // the real rendered size matches the contract's composition range
            // on portrait/landscape alike. Reset restores this fitted frame.
            const fit = fitOrbitRadius(
              petRoot,
              camera,
              { yaw: DEFAULT_ORBIT.yaw, pitch: DEFAULT_ORBIT.pitch, radius: DEFAULT_ORBIT.radius },
              frameTarget,
              Math.max(1, Math.round(window.innerWidth)),
              Math.max(1, Math.round(window.innerHeight)),
            );
            canonicalFitRef.current = fit;
            zoomBoundsRef.current = { min: fit.radius * 0.5, max: fit.radius * 2.5 };
            orbitRef.current = { ...fit };
          }
          applyOrbit(camera, STAGE_TARGET, orbitRef.current);
        } else {
          // Demo stage: keep the original frameCamera behavior so approved
          // visual baselines stay pixel-identical (no refactor churn).
          frameCamera(camera, stage as import("@pli/pet-3d").PetStageScene, w / h);
        }
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    // Blind harness: publish the 3D runtime manifest to window (test/debug
    // only; never rendered in the owner UI). capture-web reads it.
    const publishManifest = () => {
      const { meshCount, skinnedMeshCount } = countMeshes(petRoot);
      const rect = wrap.getBoundingClientRect();
      const clips = [...POSE_NAMES];
      // §31: projected area ratio is measured against the full viewport
      // (window), not the stage container, so "twin too small / too big" is
      // judged like a human would see the screen.
      const projected = projectPetBounds(
        petRoot,
        camera as THREE.PerspectiveCamera,
        Math.max(1, Math.round(window.innerWidth)),
        Math.max(1, Math.round(window.innerHeight)),
      );
      const orbit = orbitRef.current;
      (window as any).__PLI_3D_MANIFEST__ = buildManifestV2({
        ready: true,
        // Phase E: canonical representation names the asset REALLY on screen
        // (the HIGH_FIDELITY_SKINNED GLB twin when loaded); the V3 patch
        // below carries the asset classification. legacyRepresentation keeps
        // the R3-era label for backward-compatible readers.
        representation: hdTwin
          ? "high-fidelity-glb-twin"
          : twin
            ? "procedural-twin"
            : "procedural-demo-stage",
        legacyRepresentation: twin ? "procedural-twin" : "procedural-demo-stage",
        generic: !twin,
        petId: petId ?? null,
        sourceMediaCount,
        assetVersion: twin?.version ?? "demo-v1",
        fallbackUsed: false,
        wireframe: false,
        meshCount,
        skinnedMeshCount,
        skeleton: !!twin,
        animationClips: clips,
        materialMode: "pbr",
        baseColorTexture: true,
        camera: {
          fov: camera?.fov ?? 38,
          distance: orbit.radius,
          yaw: orbit.yaw,
          pitch: orbit.pitch,
          radius: orbit.radius,
        },
        screenBounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        activeClip: poseRef.current ?? "Idle",
        availableClips: clips,
        playbackState: "playing",
        reducedMotion,
        pose: poseRef.current ?? "Idle",
        poseSource: twin ? "REPRESENTATIVE" : "AMBIENT",
        poseConfidence: twin ? 0.9 : 0.3,
        projected: projected ?? null,
      });
      const v3 = {
        representationQuality: hdTwin ? "HIGH_FIDELITY_SKINNED" : "engineering",
        productCandidate: hdTwin !== null,
        triangleCount: hdTwin?.triangleCount ?? 0,
        uvPresent: hdTwin !== null,
        texturePresent: hdTwin !== null,
        baseColorTextureResolution: hdTwin ? 2048 : 0,
        canonicalPose: poseRef.current ?? "Stand",
        stageRole,
        realityField: realityField || "warm-living",
      } as const;
      Object.assign((window as any).__PLI_3D_MANIFEST__, v3);
    };

    const canRotate = () => interactive || variant === "life";

    const onDown = (e: PointerEvent) => {
      if (!canRotate() || e.button !== 0) return;
      draggingRef.current = true;
      wrap.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      orbitRef.current = orbitFromDrag(orbitRef.current, e.movementX, e.movementY);
      syncOrientation();
    };
    const onUp = (e: PointerEvent) => {
      draggingRef.current = false;
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      if (!canRotate()) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      orbitRef.current = orbitZoom(orbitRef.current, factor, zoomBoundsRef.current);
      syncOrientation();
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    let frameCounter = 0;
    const frame = (t: number) => {
      if (!alive) return;
      frameCounter += 1;
      if (frameCounter % 20 === 0) publishManifest();
      // R2P3D-R3: removed the continuous idle yaw drift — it silently mutates
      // the camera between harness reads and breaks the reset≈canonical gate.
      // The pose loop still animates the pet itself (breathing/joints).
      if (camera && scene) {
        applyOrbit(camera, STAGE_TARGET, orbitRef.current);
        if (hdTwin) {
          // R4 high-fidelity twin: GLB bones driven by the same pose library.
          hdTwin.setPose(poseRef.current ?? "Idle", t / 1000);
        } else if (twin) {
          // Procedural twin (engineering fallback): real joint animation.
          (stage as any).setPose(poseRef.current ?? "Idle", t / 1000);
        } else {
          // Demo stage: setPose(timeSeconds, enabled) — breathing only.
          (stage as any).setPose(t / 1000, !reducedMotion);
        }
        renderer?.render(scene, camera);
      }
      raf = requestAnimationFrame(frame);
    };
    reducedMotion = reduceQuery?.matches ?? false;
    const onReduce = () => {
      reducedMotion = reduceQuery?.matches ?? false;
    };
    reduceQuery?.addEventListener("change", onReduce);

    raf = requestAnimationFrame(frame);
    setStatus("ready");
    onStatus?.("ready");
    syncOrientation();

    return () => {
      alive = false;
      delete (window as any).__PLI_3D_MANIFEST__;
      cancelAnimationFrame(raf);
      reduceQuery?.removeEventListener("change", onReduce);
      ro.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("wheel", onWheel);
      scene?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer?.dispose();
      if (renderer?.domElement?.parentElement === wrap) wrap.removeChild(renderer.domElement);
    };
  }, [identity, interactive, variant, onStatus, twin, petId, sourceMediaCount, frameTarget]);

  // Keep poseRef in sync so the frame loop picks up pose switches.
  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  const zoom = (factor: number) => {
    orbitRef.current = orbitZoom(orbitRef.current, factor, zoomBoundsRef.current);
    if (wrapRef.current) wrapRef.current.dataset.orientation = orbitRef.current.yaw.toFixed(2);
    publishNow();
  };
  const reset = () => {
    // Reset restores the canonical framing — the fitted one when the twin is
    // auto-framed, the demo one otherwise — so reset≈canonical stays exact.
    orbitRef.current = { ...canonicalFitRef.current };
    if (wrapRef.current) wrapRef.current.dataset.orientation = orbitRef.current.yaw.toFixed(2);
    publishNow();
  };

  // Blind harness: expose the SAME handlers the buttons call so the capture
  // driver can trigger real zoom/reset without synthetic clicks colliding with
  // the stage's pointer capture (mirrors mobile window.zoom/resetView).
  useEffect(() => {
    const win = window as any;
    win.__PLI_SET_ZOOM = (factor: number) => zoom(factor);
    win.__PLI_RESET_VIEW = () => reset();
    win.__PLI_SET_VIEW = (yawDeg: number) => {
      orbitRef.current.yaw = yawDeg;
      if (wrapRef.current) wrapRef.current.dataset.orientation = yawDeg.toFixed(2);
      publishNow();
    };
    return () => {
      delete win.__PLI_SET_ZOOM;
      delete win.__PLI_RESET_VIEW;
      delete win.__PLI_SET_VIEW;
    };
  }, [interactive, variant, twin, frameTarget]);

  // Publish immediately after a control action so harness camera evidence
  // (zoom/reset) is fresh without waiting for the next 20-frame tick.
  const publishNow = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const man = (window as any).__PLI_3D_MANIFEST__;
    if (man && typeof man === "object") {
      man.camera = {
        fov: man.camera?.fov ?? 38,
        distance: orbitRef.current.radius,
        yaw: orbitRef.current.yaw,
        pitch: orbitRef.current.pitch,
        radius: orbitRef.current.radius,
      };
    }
  };

  const meta = PET_3D_ASSETS[identity];

  return (
    <div
      ref={wrapRef}
      data-testid="pet3d-stage"
      data-pet3d={status}
      data-orientation={DEFAULT_ORBIT.yaw.toFixed(2)}
      data-variant={variant}
      role="img"
      aria-label={`${meta.name}的 3D 形象（演示）。${meta.description}`}
      className="pet3d-wrap"
      style={{ touchAction: "none" }}
    >
      {variant === "life" ? (
        <div className="pet3d-controls" aria-label="3D 视图控制">
          <button type="button" className="pet3d-btn" aria-label="缩小" data-testid="pli.lifeview.control.zoom" onClick={() => zoom(1 / 1.15)}>
            −
          </button>
          <button type="button" className="pet3d-btn" aria-label="放大" data-testid="pli.lifeview.control.zoom" onClick={() => zoom(1.15)}>
            +
          </button>
          <button type="button" className="pet3d-btn" aria-label="重置视图" data-testid="pli.lifeview.control.reset" onClick={reset}>
            ⟲
          </button>
        </div>
      ) : null}
    </div>
  );
}