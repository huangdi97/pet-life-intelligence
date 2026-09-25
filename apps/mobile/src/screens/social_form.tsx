/** SocialRecordForm — 记录互动表单（从 SocialScreen 拆出，保持屏幕 ≤200 行）。 */
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { Pet } from "../api";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Chip, PrimaryButton } from "./ui";

export const QUALITIES: Array<{ value: string; label: string }> = [
  { value: "UNKNOWN", label: "未知" },
  { value: "GOOD", label: "顺利" },
  { value: "NEUTRAL", label: "平静" },
  { value: "TENSE", label: "紧张" },
  { value: "BAD", label: "冲突" },
];

export function SocialRecordForm({
  candidates,
  friendPetId,
  onFriendChange,
  quality,
  onQualityChange,
  duration,
  onDurationChange,
  notes,
  onNotesChange,
  busy,
  msg,
  onRecord,
}: {
  candidates: Pet[];
  friendPetId: string;
  onFriendChange: (id: string) => void;
  quality: string;
  onQualityChange: (q: string) => void;
  duration: string;
  onDurationChange: (d: string) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  busy: boolean;
  msg: string | null;
  onRecord: () => void;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>好友宠物</Text>
      <View style={styles.chipRow}>
        {candidates.map((p) => (
          <Chip key={p.id} label={p.name} active={friendPetId === p.id} onPress={() => onFriendChange(p.id)} />
        ))}
      </View>
      <Text style={styles.fieldLabel}>互动质量</Text>
      <View style={styles.chipRow}>
        {QUALITIES.map((q) => (
          <Chip key={q.value} label={q.label} active={quality === q.value} onPress={() => onQualityChange(q.value)} />
        ))}
      </View>
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <Text style={styles.fieldLabel}>时长（分钟）</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={onDurationChange}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.fieldLabel}>备注</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={onNotesChange}
            placeholder="可选"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </View>
      </View>
      <PrimaryButton label={busy ? "提交中…" : "记录互动"} onPress={onRecord} disabled={!friendPetId || busy} />
      {msg && <Text style={styles.msg}>{msg}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
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
  fieldRow: { flexDirection: "row", gap: SPACE.s3 },
  fieldHalf: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  msg: { fontSize: TYPE.sm, color: COLORS.ok, marginTop: SPACE.s2 },
});