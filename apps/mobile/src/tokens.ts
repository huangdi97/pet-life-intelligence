/**
 * tokens.ts — PLI Visual System V4 (Stage R.2).
 *
 * Warm Living Intelligence color/type/spacing/radius system.
 * Legacy Stage H keys (bgCanvas, inkPrimary, ...) are kept as aliases so
 * screens not yet rebuilt keep compiling; rebuilt screens use the V4 names.
 * Never hardcode colors outside this file.
 */

// --- color V4: canvas / surface / text / brand / semantic ---
export const COLORS = {
  // canvas & surfaces
  canvas: "#F6F1E9",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFDF8",
  surfaceGlass: "#FFFFFFCC",
  surfaceOverlay: "#FFFFFFF2",
  surfaceDark: "#2B2620",
  surfaceDarkRaised: "#3A332B",
  // text
  textPrimary: "#2B2723",
  textSecondary: "#5C554C",
  textTertiary: "#8A8074",
  textInverse: "#FBF7F0",
  textOnDark: "#EFE8DD",
  // brand (warm plant + amber, preserved direction)
  brandPrimary: "#6E8B5E",
  brandPrimaryDeep: "#4E6349",
  brandPrimaryDark: "#3D4F3A",
  brandSecondary: "#B9762A",
  brandSoft: "#E7E3D8",
  brandSoftGreen: "#E4EAE0",
  brandSoftAmber: "#F6ECDC",
  // semantic
  attention: "#A97B2C",
  attentionBg: "#FBF3E0",
  warning: "#C07A2D",
  warningBg: "#FDF2E3",
  danger: "#B42318",
  dangerBg: "#FBEAE6",
  success: "#4E7A5A",
  successBg: "#EDF3EE",
  info: "#3E7C83",
  infoBg: "#E8F1F2",
  // media / overlay
  mediaOverlay: "#0000001A",
  scrimLight: "#00000033",
  scrimDark: "#00000066",
  dividerSubtle: "#E9E2D6",
  dividerStrong: "#D8D0C4",
  lineDefault: "#E9E2D6",
  lineStrong: "#D8D0C4",
  lineFocus: "#6E8B5E",
  // legacy aliases (Stage H) — keep until screens migrate
  bgCanvas: "#F6F1E9",
  bgSurface: "#FFFFFF",
  bgSurfaceMuted: "#F0EBE2",
  bgSurfaceStrong: "#E8E0D2",
  inkPrimary: "#2B2723",
  inkSecondary: "#5C554C",
  inkMuted: "#8A8074",
  inkDisabled: "#B5ACA0",
  primary500: "#6E8B5E",
  primary600: "#4E6349",
  primary700: "#3D4F3A",
  primary800: "#2F3D2D",
  primary100: "#E4EAE0",
  accent50: "#FBF6EE",
  accent200: "#EAD3A8",
  accent500: "#B9762A",
  accent600: "#9C5F22",
  ok: "#4E7A5A",
  okBg: "#EDF3EE",
  notice: "#A97B2C",
  noticeBg: "#FBF3E0",
  monitor: "#6E8B5E",
  monitorBg: "#F3F6F2",
  vetSoon: "#C07A2D",
  vetSoonBg: "#FDF2E3",
  urgent: "#C2503C",
  urgentBg: "#FBECE7",
  emergency: "#B42318",
  emergencyBg: "#FBEAE6",
  infoLegacy: "#3E7C83",
  infoBgLegacy: "#E8F1F2",
  dangerLegacy: "#B42318",
  dangerBgLegacy: "#FBEAE6",
} as const;

// --- typography V4 (logical px) ---
export const TYPE = {
  display: 34,
  heroName: 30,
  pageTitle: 22,
  section: 16,
  body: 14,
  bodyStrong: 14,
  meta: 12,
  caption: 11,
  metric: 20,
  button: 14,
  // legacy scale (Stage H) — keep until screens migrate
  xs: 12,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  weightRegular: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",
} as const;

// --- spacing ---
export const SPACE = {
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

// --- radius ---
export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  hero: 24,
  pill: 999,
} as const;

// --- elevation (iOS shadow style) ---
export const ELEVATION = {
  sm: {
    shadowColor: "#2B2723",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: "#2B2723",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lg: {
    shadowColor: "#2B2723",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

// --- demo environment flag (build-time): EXPO_PUBLIC_PLI_DEMO_ENV=1 marks a
// demo build with the global "示例数据" marker and demo auto-login. Production
// builds never set it. ---
export const DEMO_ENV =
  (process.env.EXPO_PUBLIC_PLI_DEMO_ENV ?? "").trim() === "1";
