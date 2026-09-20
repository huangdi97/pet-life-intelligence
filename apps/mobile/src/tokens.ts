/** tokens.ts — mirror of packages/ui-tokens/tokens.json (Stage H).
 *  Plain TS constants for the warm/professional look across mobile screens.
 *  Do not hardcode colors outside this file. */

// --- color.bg ---
export const COLORS = {
  bgCanvas: "#FAF8F5",
  bgSurface: "#FFFFFF",
  bgSurfaceMuted: "#F3F0EB",
  bgSurfaceStrong: "#ECE8E0",
  inkPrimary: "#2B2723",
  inkSecondary: "#57504A",
  inkMuted: "#7C7369",
  inkDisabled: "#B5ACA0",
  lineDefault: "#E8E2D9",
  lineStrong: "#D8D0C4",
  lineFocus: "#61795C",
  primary500: "#61795C",
  primary600: "#4E6349",
  primary700: "#3D4F3A",
  primary800: "#2F3D2D",
  primary100: "#E4EAE0",
  accent50: "#FBF6EE",
  accent200: "#EAD3A8",
  accent500: "#B9762A",
  accent600: "#9C5F22",
  // semantic (incl. risk colors; display backend triage values only)
  ok: "#4E7A5A",
  okBg: "#EDF3EE",
  notice: "#B08A2E",
  noticeBg: "#FBF4E2",
  monitor: "#61795C",
  monitorBg: "#F3F6F2",
  vetSoon: "#C07A2D",
  vetSoonBg: "#FDF2E3",
  urgent: "#C2503C",
  urgentBg: "#FBECE7",
  emergency: "#B42318",
  emergencyBg: "#FBEAE6",
  info: "#3E7C83",
  infoBg: "#E8F1F2",
  danger: "#B42318",
  dangerBg: "#FBEAE6",
} as const;

// --- typography scale (logical px) ---
export const TYPE = {
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
  pill: 999,
} as const;

// --- elevation (iOS shadow style, mirrored from tokens.json) ---
export const ELEVATION = {
  sm: {
    shadowColor: "#2B2723",
    shadowOpacity: 0.06,
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
} as const;
