"use client";

/**
 * Pet3DViewer — web adapter for the shared demo pet 3D scene.
 *
 * Renders the SAME 豆豆/咪咪 asset as the mobile app (apps/mobile expo-gl
 * adapter) through three.js WebGL. Drag rotates (full in life variant),
 * wheel/buttons zoom (life variant), reset restores the default view.
 * Exposes data-testid + status/orientation attrs for deterministic Playwright
 * assertions. On WebGL failure the parent falls back to photo/2.5D — 3D is
 * never a single point of failure.
 */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  addStageLights,
  applyOrbit,
  createPetStageScene,
  createTwinScene,
  DEFAULT_ORBIT,
  frameCamera,
  orbitFromDrag,
  orbitZoom,
  PET_3D_ASSETS,
  STAGE_FOG,
  STAGE_TARGET,
} from "@pli/pet-3d";
import type { OrbitState, Pet3DIdentity, PoseName, TwinDescriptor } from "@pli/pet-3d";

export type Pet3DStatus = "boot" | "ready" | "failed";

interface Props {
  identity: Pet3DIdentity;
  variant?: "stage" | "life";
  interactive?: boolean;
  /** Individual twin descriptor from the backend pipeline (R2P3D-R1). */
  twin?: TwinDescriptor | null;
  /** Active motion clip for the 3D stage. */
  pose?: PoseName | null;
  onStatus?: (status: Pet3DStatus) => void;
}

export function Pet3DViewer({ identity, twin = null, pose = null, variant = "stage", interactive = false, onStatus }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef<OrbitState>({ ...DEFAULT_ORBIT });
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

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer?.setSize(w, h, false);
      if (camera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        applyOrbit(camera, STAGE_TARGET, orbitRef.current);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

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
      orbitRef.current = orbitZoom(orbitRef.current, factor);
      syncOrientation();
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    const frame = (t: number) => {
      if (!alive) return;
      // Gentle idle drift for the life stage (cosmetic only; off for reduced motion).
      if (interactive && !draggingRef.current && !reducedMotion) {
        orbitRef.current = { ...orbitRef.current, yaw: orbitRef.current.yaw + 0.0008 };
      }
      if (camera && scene) {
        applyOrbit(camera, STAGE_TARGET, orbitRef.current);
        if (twin) {
          // Twin scene: setPose(poseName, timeSeconds) — real joint animation.
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
  }, [identity, interactive, variant, onStatus, twin]);

  // Keep poseRef in sync so the frame loop picks up pose switches.
  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  const zoom = (factor: number) => {
    orbitRef.current = orbitZoom(orbitRef.current, factor);
    if (wrapRef.current) wrapRef.current.dataset.orientation = orbitRef.current.yaw.toFixed(2);
  };
  const reset = () => {
    orbitRef.current = { ...DEFAULT_ORBIT };
    if (wrapRef.current) wrapRef.current.dataset.orientation = orbitRef.current.yaw.toFixed(2);
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
      aria-label={`${meta.name}的 3D 形象（演示，开发环境）。${meta.description}`}
      className="pet3d-wrap"
      style={{ touchAction: "none" }}
    >
      {variant === "life" ? (
        <div className="pet3d-controls" aria-label="3D 视图控制">
          <button type="button" className="pet3d-btn" aria-label="缩小" onClick={() => zoom(1 / 1.15)}>
            −
          </button>
          <button type="button" className="pet3d-btn" aria-label="放大" onClick={() => zoom(1.15)}>
            +
          </button>
          <button type="button" className="pet3d-btn" aria-label="重置视图" onClick={reset}>
            ⟲
          </button>
        </div>
      ) : null}
    </div>
  );
}
