/**
 * Pet3D — shared demo pet 3D scene module (web + mobile).
 *
 * Exports the registry (identity + provenance), the scene builder, orbit math
 * and the demo palette. Consumers: apps/web Pet3DViewer (WebGL) and
 * apps/mobile Pet3DViewer (expo-gl). One 豆豆/咪咪 asset across all screens.
 */
export { PET_3D_ASSETS, resolvePet3DIdentity } from "./registry";
export type { Pet3DIdentity, Pet3DAssetMeta } from "./registry";
export {
  createPetStageScene,
  addStageLights,
  applyOrbit,
  frameCamera,
  orbitFromDrag,
  orbitZoom,
  DEFAULT_ORBIT,
  STAGE_TARGET,
  STAGE_FOG,
} from "./scene";
export type { PetStageScene, OrbitState } from "./scene";
export { STAGE, CORGI, MIMI } from "./palette";
export { corgiFingerprint } from "./buildCorgi";
export { catFingerprint } from "./buildCat";