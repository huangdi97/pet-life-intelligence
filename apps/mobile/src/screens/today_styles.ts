/** StyleSheet for TodayScreen (colocated so the screen file stays small). */
import { StyleSheet } from "react-native";
import { COLORS, SPACE, TYPE } from "../tokens";

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginBottom: SPACE.s2 },
  stateRow: { flexDirection: "row", marginTop: SPACE.s2 },
  stateLabel: { fontSize: TYPE.sm, color: COLORS.inkMuted, width: 72 },
  stateValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary, flex: 1 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: SPACE.s2 },
  taskRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.lineDefault },
  taskMark: { fontSize: TYPE.base, color: COLORS.primary600, width: SPACE.s5 },
  taskTextWrap: { flex: 1 },
  taskTitle: { fontSize: TYPE.base, color: COLORS.inkPrimary },
  taskDue: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: 2 },
  hintText: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginBottom: SPACE.s1 },
  hintRule: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: SPACE.s2 },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s6 },
  // Pet hero card — pet identity as the visual subject of Today (Living Canvas).
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    padding: SPACE.s4,
    marginBottom: SPACE.s2,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { fontSize: TYPE.xxl, fontWeight: TYPE.weightBold, color: COLORS.primary700 },
  heroText: { flex: 1, marginLeft: SPACE.s3 },
  heroName: { fontSize: TYPE.lg, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  heroMeta: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: 2 },
  heroChevron: { fontSize: TYPE.md, color: COLORS.inkMuted },
});
