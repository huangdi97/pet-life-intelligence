/**
 * Pet3D demo palette — presentation-only material colors for the demo 3D pets.
 *
 * The values mirror the Warm Living Intelligence tokens in
 * artifacts/r2p3d/R2P3D_VISUAL_DIRECTION.md. These are cosmetic colors for
 * DEMO/SYNTHETIC assets only; they carry no biological meaning and must never
 * be interpreted as health state.
 */

// Stage environment (used by clients for CSS background + fog tint).
export const STAGE = {
  /** Warm living base — the R4 Reality Field, never a dark viewer. */
  base: "#F4E9D8",
  /** Far field matches the owner's botanical green living canvas. */
  deep: "#E7D5BC",
  /** Daylight diffuses softly through the pet's living space. */
  glow: "#FFF7E9",
  /** The transparent 3D canvas and RN/Web host must share the same haze. */
  fog: "#EFE0C8",
} as const;

// R4.2 stage themes — the WebView/WebGL surface itself is themed per screen
// role (never a dark viewer on owner hero pages):
//   living      -> warm cream reality field (Today / Pet / Life View)
//   review      -> neutral identity studio (Twin Review)
//   engineering -> dark debug stage (engineering manifests only)
export const STAGE_THEMES = {
  living: {
    base: "#F4E9D8",
    deep: "#E7D5BC",
    glow: "#FFF7E9",
    fog: "#EFE0C8",
  },
  review: {
    base: "#F4F1EA",
    deep: "#EBE5D8",
    glow: "#FFFDF8",
    fog: "#EAE4D8",
  },
  engineering: {
    base: "#171310",
    deep: "#100D0B",
    glow: "#3A2E24",
    fog: "#241C16",
  },
} as const;

export type StageTheme = keyof typeof STAGE_THEMES;

// Coat materials (corgi 豆豆).
export const CORGI = {
  coat: "#E8C79A",
  coatDeep: "#D9A968",
  cream: "#FBF6EB",
  earInner: "#C08A4E",
  nose: "#4A3A2C",
  eye: "#33241C",
  paw: "#F2D9AD",
} as const;

// Coat materials (cat 咪咪).
export const MIMI = {
  coat: "#C9BFB2",
  coatDeep: "#A99C8D",
  cream: "#EFE6DA",
  earInner: "#D9B8B0",
  nose: "#8A6F63",
  eye: "#5C6B4C",
  paw: "#D9CFC2",
} as const;

// Shared scene helpers.
export const GROUND_SHADOW = {
  /** Warm dark tone for the soft contact shadow under the pet. */
  color: 0x2a2018,
  opacity: 0.18,
} as const;

export const LIGHTS = {
  /** Warm low ambient so nothing is pitch black. */
  ambient: 0xffe8d2,
  ambientIntensity: 0.82,
  /** Warm key light from upper front-left. */
  key: 0xffd9b8,
  keyIntensity: 1.12,
  /** Cooler fill from the right to keep shapes readable. */
  fill: 0xe8e2d8,
  fillIntensity: 0.58,
  /** Soft rim from behind to lift the silhouette off the background. */
  rim: 0xfff3e0,
  rimIntensity: 0.68,
} as const;