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
  /** Canonical living-field base: soft daylight sage, never a dark viewer. */
  base: "#E7EEE2",
  /** Far field adds depth without turning the stage into a saturated brand panel. */
  deep: "#D5E0D4",
  /** Near-white daylight around the real pet / individual Twin. */
  glow: "#F8FBF2",
  /** WebGL haze is deliberately matched to the native/Web Living Canvas host. */
  fog: "#E4EADF",
} as const;

// R4.2 stage themes — the WebView/WebGL surface itself is themed per screen
// role (never a dark viewer on owner hero pages):
//   living      -> warm lifestyle reality field (Today / Pet / Life View)
//   review      -> neutral identity studio (Twin Review)
//   engineering -> dark debug stage (engineering manifests only)
export const STAGE_THEMES = {
  living: {
    base: "#E7EEE2",
    deep: "#D5E0D4",
    glow: "#F8FBF2",
    fog: "#E4EADF",
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
  /** Neutral daylight ambient so coat colors stay readable without a beige cast. */
  ambient: 0xfff8ef,
  ambientIntensity: 0.46,
  /** Warm-neutral sky / ground separation gives coat volume without tinting fur green. */
  hemisphereSky: 0xfffbf4,
  hemisphereGround: 0xdccbb5,
  hemisphereIntensity: 0.62,
  /** Daylight key from upper front-left. */
  key: 0xfff1dd,
  keyIntensity: 1.18,
  /** Warm-neutral fill from the right keeps cream/brown/grey coats faithful. */
  fill: 0xf1e7d8,
  fillIntensity: 0.48,
  /** Soft warm daylight rim lifts the silhouette without a neon/hologram edge. */
  rim: 0xfff6e8,
  rimIntensity: 0.72,
} as const;