/**
 * Pet3D — shared pet 3D scene module (web + mobile) + individual twin system.
 *
 * Exports the registry (identity + provenance), the scene builder, orbit math,
 * the demo palette, and the R2P3D-R1 Individual Twin engine (morph contract,
 * rig, 12-pose motion library, twin scene builder).
 *
 * Consumers: apps/web Pet3DViewer (WebGL), apps/mobile Pet3DViewer (WebView)
 * and the mobile pet-stage page. One 豆豆/咪咪 asset across all screens,
 * plus per-pet individual twin representation from owner media.
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

// R2P3D-R1 Individual Twin engine.
export {
  TWIN_TEMPLATES,
  TWIN_TEMPLATE_FAMILIES,
  sanitizeMorph,
  resolveTemplate,
  describeMorph,
  morphFingerprint,
} from "./morph";
export type { PetMorphParams, TwinTemplate, TwinTemplateFamily } from "./morph";
export { buildTwinRig, resetRigPose, jointCount } from "./rig";
export type { TwinRig, JointName, JointSpec } from "./rig";
export {
  POSE_NAMES,
  POSE_META,
  POSE_CLIPS,
  applyPose,
  buildClip,
  motionManifest,
  poseForEvent,
} from "./motion";
export type { PoseName, PoseTruth, PoseMeta, PoseClipData, PoseFrame } from "./motion";
export { createTwinScene, twinFingerprint } from "./twinScene";
export type { TwinDescriptor, TwinScene, TwinTextureRegions } from "./twinScene";