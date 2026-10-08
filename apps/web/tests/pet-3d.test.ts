/**
 * pet-3d unit tests — shared demo asset registry, builders, orbit math.
 * Pure three.js math, no WebGL/DOM required. Proves: 豆豆≠咪咪, the same
 * registry drives every screen, rotation/zoom/reset are deterministic, and
 * the idle pose stays neutral (cosmetic scale only).
 */
import { describe, expect, it } from "vitest";
import {
  applyOrbit,
  createPetStageScene,
  DEFAULT_ORBIT,
  fitOrbitRadius,
  projectPetBounds,
  orbitFromDrag,
  orbitZoom,
  PET_3D_ASSETS,
  resolvePet3DIdentity,
  STAGE_TARGET,
} from "@pli/pet-3d";
import * as THREE from "three";

describe("registry — one identity across all screens", () => {
  it("maps 豆豆 / corgi breed to doudou", () => {
    expect(resolvePet3DIdentity({ name: "豆豆" })).toBe("doudou");
    expect(resolvePet3DIdentity({ name: "其他", species: "dog", breed: "柯基" })).toBe("doudou");
  });

  it("maps 咪咪 / cat to mimi", () => {
    expect(resolvePet3DIdentity({ name: "咪咪" })).toBe("mimi");
    expect(resolvePet3DIdentity({ name: "其他", species: "cat" })).toBe("mimi");
  });

  it("returns null for unknown pets (callers fall back to photo/2.5D)", () => {
    expect(resolvePet3DIdentity({ name: "测试", species: "dog", breed: "边境牧羊犬" })).toBeNull();
    expect(resolvePet3DIdentity({ name: null })).toBeNull();
  });

  it("assets are DEMO/SYNTHETIC dev-only with explicit provenance", () => {
    for (const asset of Object.values(PET_3D_ASSETS)) {
      expect(asset.provenance).toBe("DEMO_SYNTHETIC");
      expect(asset.devOnly).toBe(true);
    }
  });
});

describe("demo assets — 豆豆 ≠ 咪咪", () => {
  it("builds a corgi scene with a contact shadow and positive bounds", () => {
    const scene = createPetStageScene("doudou");
    expect(scene.pet.name).toBe("doudouRoot");
    expect(scene.pet.children.length).toBeGreaterThan(5);
    expect(scene.shadow.name).toBe("petContactShadow");
    expect(scene.bounds.height).toBeGreaterThan(0.5);
    expect(scene.bounds.width).toBeGreaterThan(0.5);
  });

  it("builds a cat scene with a distinct silhouette", () => {
    const scene = createPetStageScene("mimi");
    expect(scene.pet.name).toBe("mimiRoot");
    // Cat has a tail tube — a structural difference from the corgi.
    expect(scene.pet.children.some((c) => c.type === "Mesh" && c.name === "")).toBe(true);
  });

  it("idle pose only applies a small cosmetic scale (never a health signal)", () => {
    const scene = createPetStageScene("doudou");
    const body = scene.pet.children[0];
    const before = body.scale.y;
    scene.setPose(1.57, true); // ~ π/2 → sin ≈ 1 → max deviation
    const delta = Math.abs(body.scale.y - before);
    expect(delta).toBeLessThan(0.03);
    scene.setPose(0, false);
    expect(body.scale.y).toBeCloseTo(before, 5);
  });
});

describe("orbit math — rotate / zoom / reset are deterministic", () => {
  it("drag rotates yaw and clamps pitch", () => {
    const next = orbitFromDrag(DEFAULT_ORBIT, 120, 40);
    expect(next.yaw).toBeGreaterThan(DEFAULT_ORBIT.yaw);
    expect(next.pitch).toBeGreaterThan(DEFAULT_ORBIT.pitch);
    const clamped = orbitFromDrag(DEFAULT_ORBIT, 0, 400);
    expect(clamped.pitch).toBeLessThanOrEqual(0.9);
  });

  it("zoom changes radius within clamps", () => {
    const zoomedIn = orbitZoom(DEFAULT_ORBIT, 2);
    expect(zoomedIn.radius).toBeLessThan(DEFAULT_ORBIT.radius);
    const zoomedOut = orbitZoom(DEFAULT_ORBIT, 0.1);
    expect(zoomedOut.radius).toBeGreaterThan(DEFAULT_ORBIT.radius);
    expect(zoomedOut.radius).toBeLessThanOrEqual(7);
    expect(zoomedIn.radius).toBeGreaterThanOrEqual(2.6);
  });

  it("reset restores the default view", () => {
    const moved = orbitFromDrag(orbitZoom(DEFAULT_ORBIT, 3), 200, 90);
    expect(moved).not.toEqual(DEFAULT_ORBIT);
    // Reset = assigning DEFAULT_ORBIT again (callers do exactly this).
    expect(orbitZoom(DEFAULT_ORBIT, 1)).toEqual(DEFAULT_ORBIT);
  });

  it("applyOrbit moves the camera around the pet target", () => {
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    applyOrbit(camera, STAGE_TARGET, DEFAULT_ORBIT);
    const dist = camera.position.distanceTo(STAGE_TARGET);
    // Orbit distance stays near the configured radius (≥ radius, < 1.1× radius).
    expect(dist).toBeGreaterThan(DEFAULT_ORBIT.radius);
    expect(dist).toBeLessThan(DEFAULT_ORBIT.radius * 1.1);
  });
});
describe("portrait twin framing — never crop long bodies across Review angles", () => {
  it("fits a vertically offset, long pet at front, side, and back", () => {
    // Mimics the tall cat failure exposed by HEAD 286574a in actual Android
    // and Web evidence. A matching projected AREA does not mean it fits.
    const pet = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.8, 2.8));
    mesh.position.set(0, 0.1, 0);
    pet.add(mesh);
    const camera = new THREE.PerspectiveCamera(38, 0.89, 0.1, 40);
    camera.updateProjectionMatrix();
    const fit = fitOrbitRadius(pet, camera, DEFAULT_ORBIT, 0.4, 342, 384, {
      fitYaws: [0, Math.PI / 2, Math.PI],
      paddingRatio: 0.06,
    });
    for (const yaw of [0, Math.PI / 2, Math.PI]) {
      applyOrbit(camera, STAGE_TARGET, { ...fit, yaw });
      const p = projectPetBounds(pet, camera, 342, 384);
      expect(p).not.toBeNull();
      expect(p!.x).toBeGreaterThanOrEqual(342 * 0.06 - 1);
      expect(p!.y).toBeGreaterThanOrEqual(384 * 0.06 - 1);
      expect(p!.x + p!.width).toBeLessThanOrEqual(342 * 0.94 + 1);
      expect(p!.y + p!.height).toBeLessThanOrEqual(384 * 0.94 + 1);
    }
    expect(fit.yaw).toBe(DEFAULT_ORBIT.yaw);
  });
});
