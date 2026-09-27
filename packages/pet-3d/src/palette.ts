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
  /** Warm charcoal base — the dark, warm room the pet lives in. */
  base: "#171310",
  /** Slightly warmer brown-black for the deep layer. */
  deep: "#100D0B",
  /** Warm radial glow behind the pet. */
  glow: "#3A2E24",
  /** Fog / far-layer tint. */
  fog: "#241C16",
} as const;

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
  opacity: 0.32,
} as const;

export const LIGHTS = {
  /** Warm low ambient so nothing is pitch black. */
  ambient: 0xffe8d2,
  ambientIntensity: 0.55,
  /** Warm key light from upper front-left. */
  key: 0xffd9b8,
  keyIntensity: 1.05,
  /** Cooler fill from the right to keep shapes readable. */
  fill: 0xe8e2d8,
  fillIntensity: 0.35,
  /** Soft rim from behind to lift the silhouette off the background. */
  rim: 0xfff3e0,
  rimIntensity: 0.55,
} as const;