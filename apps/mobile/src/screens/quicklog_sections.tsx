/** Presentational sections for QuickLogScreen (colocated): the selected-type
 *  input form and the type-tile grid. Pure rendering — all state and handlers
 *  live in the screen component. */
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { Chip, PrimaryButton } from "./ui";
import { ELIMINATION_KINDS, LOG_TYPES, type LogType } from "./quicklog_types";

export interface QuickLogFields {
  amount: string;
  setAmount: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  minutes: string;
  setMinutes: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  behavior: string;
  setBehavior: (v: string) => void;
  diaryText: string;
  setDiaryText: (v: string) => void;
  kind: string | null;
  setKind: (v: string | null) => void;
}

export function QuickLogForm({
  t,
  fields,
  saving,
  onSave,
}: {
  t: LogType;
  fields: QuickLogFields;
  saving: boolean;
  onSave: () => void;
}) {
  const { amount, setAmount, unit, setUnit, minutes, setMinutes, weight, setWeight, behavior, setBehavior, diaryText, setDiaryText, kind, setKind } = fields;
  return (
    <View>
      {(t.event_type === "daily.meal" || t.event_type === "daily.drink") && (
        <>
          <Text style={styles.fieldLabel}>数量</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="如 50"
            placeholderTextColor={COLORS.inkDisabled}
          />
          <Text style={styles.fieldLabel}>单位</Text>
          <TextInput
            style={styles.input}
            value={unit}
            onChangeText={setUnit}
            placeholder={t.event_type === "daily.drink" ? "ml" : "g"}
            placeholderTextColor={COLORS.inkDisabled}
          />
        </>
      )}
      {t.event_type === "daily.elimination" && (
        <>
          <Text style={styles.fieldLabel}>类型</Text>
          <View style={styles.chipRow}>
            {ELIMINATION_KINDS.map((k) => (
              <Chip key={k.key} label={k.zh} active={kind === k.key} onPress={() => setKind(k.key)} />
            ))}
          </View>
        </>
      )}
      {(t.event_type === "daily.walk" || t.event_type === "daily.play" || t.event_type === "daily.sleep") && (
        <>
          <Text style={styles.fieldLabel}>时长（分钟）</Text>
          <TextInput
            style={styles.input}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="如 30"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </>
      )}
      {t.event_type === "daily.weight" && (
        <>
          <Text style={styles.fieldLabel}>体重（kg）</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="如 4.5"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </>
      )}
      {t.event_type === "medication.administered" && (
        <Text style={styles.mutedForm}>将记录一次用药时间（未绑定用药计划）。</Text>
      )}
      {t.event_type === "behavior.observed" && (
        <>
          <Text style={styles.fieldLabel}>行为描述</Text>
          <TextInput
            style={styles.input}
            value={behavior}
            onChangeText={setBehavior}
            placeholder="如 连续吠叫约1分钟"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </>
      )}
      {t.event_type === "diary.created" && (
        <>
          <Text style={styles.fieldLabel}>备注</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={diaryText}
            onChangeText={setDiaryText}
            multiline
            placeholder="想记录点什么？"
            placeholderTextColor={COLORS.inkDisabled}
          />
        </>
      )}
      <PrimaryButton label={saving ? "保存中…" : "保存"} onPress={onSave} disabled={saving} />
    </View>
  );
}

export function QuickLogGrid({ onPick, onOpenHealth }: { onPick: (key: string) => void; onOpenHealth: () => void }) {
  return (
    <View style={styles.grid}>
      {LOG_TYPES.map((t) => (
        <Pressable key={t.key} style={styles.tile} onPress={() => onPick(t.key)}>
          <Text style={styles.tileText}>{t.zh}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.tile} onPress={onOpenHealth}>
        <Text style={styles.tileText}>健康</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.base,
    color: COLORS.inkPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  mutedForm: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s3 },
  tile: {
    width: 104,
    paddingVertical: SPACE.s5,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    alignItems: "center",
  },
  tileText: { fontSize: TYPE.base, color: COLORS.inkPrimary },
});
