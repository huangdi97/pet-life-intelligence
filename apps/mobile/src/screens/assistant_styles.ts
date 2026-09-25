/** StyleSheet for AssistantScreen (colocated so the screen file stays ≤200). */
import { StyleSheet } from "react-native";
import { COLORS, SPACE, TYPE } from "../tokens";

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginVertical: SPACE.s2 },
  cardTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginVertical: SPACE.s2 },
  askRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
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
  askInput: { flex: 1 },
  askBtn: { color: COLORS.primary600, fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, padding: SPACE.s2 },
  answer: { marginTop: SPACE.s3 },
  answerHead: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  answerTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  answerBody: { fontSize: TYPE.base, color: COLORS.inkPrimary, marginTop: SPACE.s2, lineHeight: 22 },
  sectionLabel: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: SPACE.s3 },
  factLine: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: 2 },
  inferenceBody: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: 2 },
  noticeBox: {
    backgroundColor: COLORS.noticeBg,
    borderRadius: 8,
    padding: SPACE.s2,
    marginTop: SPACE.s3,
  },
  noticeText: { fontSize: TYPE.sm, color: COLORS.notice },
  actionBody: { fontSize: TYPE.sm, color: COLORS.primary700, marginTop: SPACE.s2 },
});