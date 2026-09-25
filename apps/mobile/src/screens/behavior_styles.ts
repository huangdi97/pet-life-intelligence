/** StyleSheet for BehaviorScreen (colocated so the screen file stays ≤200). */
import { StyleSheet } from "react-native";
import { COLORS, SPACE, TYPE } from "../tokens";

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: 10,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.base,
    color: COLORS.inkPrimary,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  fieldRow: { flexDirection: "row", gap: SPACE.s3 },
  fieldHalf: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  itemHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary, flex: 1 },
  itemTime: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  itemRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s2 },
  itemMeta: { fontSize: TYPE.xs, color: COLORS.inkSecondary, marginTop: SPACE.s2 },
});

/** Intensity picker options + zh labels (colocated behavior helpers). */
export const INTENSITIES: Array<{ value: string; label: string }> = [
  { value: "", label: "未标注" },
  { value: "MILD", label: "轻度" },
  { value: "MODERATE", label: "中度" },
  { value: "SEVERE", label: "重度" },
];

export function intensityLabel(v: string): string {
  if (v === "MILD") return "轻度";
  if (v === "MODERATE") return "中度";
  if (v === "SEVERE") return "重度";
  return v;
}