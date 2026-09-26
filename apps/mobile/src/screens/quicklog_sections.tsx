/**
 * QuickLog presentational sections (Stage R.2 §41-43): icon tiles grouped as
 * 高频（喂食/饮水/排泄/散步）then 其他; the selected-type light form keeps
 * every common action within two taps. Pure rendering — state lives in the
 * screen component. Vector icons only (no emoji as functional icons).
 */
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { Chip } from "./ui";
import { ELIMINATION_KINDS, type LogType } from "./quicklog_types";

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

export interface QuickLogTile {
  key: string;
  zh: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  meal: "restaurant-outline",
  drink: "water-outline",
  elimination: "remove-outline",
  walk: "walk-outline",
  play: "game-controller-outline",
  sleep: "moon-outline",
  weight: "scale-outline",
  medication: "medkit-outline",
  behavior: "paw-outline",
  diary: "create-outline",
  health: "heart-outline",
};

export const PRIMARY_TILES: QuickLogTile[] = ["meal", "drink", "elimination", "walk"].map((k) => ({
  key: k,
  zh: tileZh(k),
  icon: TILE_ICONS[k],
}));

export const SECONDARY_TILES: QuickLogTile[] = ["play", "sleep", "weight", "medication", "behavior", "diary", "health"].map((k) => ({
  key: k,
  zh: tileZh(k),
  icon: TILE_ICONS[k],
}));

function tileZh(key: string): string {
  const map: Record<string, string> = {
    meal: "喂食",
    drink: "饮水",
    elimination: "排泄",
    walk: "散步",
    play: "玩耍",
    sleep: "睡觉",
    weight: "体重",
    medication: "用药",
    behavior: "行为",
    diary: "备注",
    health: "健康",
  };
  return map[key] ?? key;
}

export function QuickLogForm({ t, fields, saving, onSave }: { t: LogType; fields: QuickLogFields; saving: boolean; onSave: () => void }) {
  const { amount, setAmount, unit, setUnit, minutes, setMinutes, weight, setWeight, behavior, setBehavior, diaryText, setDiaryText, kind, setKind } = fields;
  return (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>{t.zh}</Text>
      {(t.event_type === "daily.meal" || t.event_type === "daily.drink") && (
        <>
          <Text style={styles.fieldLabel}>数量</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="如 50" placeholderTextColor={COLORS.textTertiary} />
          <Text style={styles.fieldLabel}>单位</Text>
          <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder={t.event_type === "daily.drink" ? "ml" : "g"} placeholderTextColor={COLORS.textTertiary} />
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
          <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="如 30" placeholderTextColor={COLORS.textTertiary} />
        </>
      )}
      {t.event_type === "daily.weight" && (
        <>
          <Text style={styles.fieldLabel}>体重（kg）</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="如 11.5" placeholderTextColor={COLORS.textTertiary} />
        </>
      )}
      {t.event_type === "medication.administered" && <Text style={styles.mutedForm}>将记录一次用药时间（未绑定用药计划）。</Text>}
      {t.event_type === "behavior.observed" && (
        <>
          <Text style={styles.fieldLabel}>行为描述</Text>
          <TextInput style={styles.input} value={behavior} onChangeText={setBehavior} placeholder="如 对门铃吠叫约 20 秒" placeholderTextColor={COLORS.textTertiary} />
        </>
      )}
      {t.event_type === "diary.created" && (
        <>
          <Text style={styles.fieldLabel}>备注</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={diaryText} onChangeText={setDiaryText} multiline placeholder="想记录点什么？" placeholderTextColor={COLORS.textTertiary} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="保存"
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [styles.saveBtn, saving && styles.saveDisabled, pressed && !saving && styles.pressed]}
      >
        <Text style={styles.saveText}>{saving ? "保存中…" : "保存"}</Text>
      </Pressable>
    </View>
  );
}

export function QuickLogGrid({ onPick, onOpenHealth }: { onPick: (key: string) => void; onOpenHealth: () => void }) {
  return (
    <View>
      <TileGroup title="常用" tiles={PRIMARY_TILES} onPick={onPick} />
      <TileGroup title="更多" tiles={SECONDARY_TILES} onPick={(k) => (k === "health" ? onOpenHealth() : onPick(k))} />
    </View>
  );
}

function TileGroup({ title, tiles, onPick }: { title: string; tiles: QuickLogTile[]; onPick: (key: string) => void }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={t.zh} style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={() => onPick(t.key)}>
            <Ionicons name={t.icon} size={22} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.tileText}>{t.zh}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formWrap: { paddingHorizontal: SPACE.s4 },
  formTitle: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACE.s3 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  mutedForm: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: SPACE.s3 },
  saveBtn: {
    marginTop: SPACE.s4,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  saveDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  group: { marginBottom: SPACE.s4 },
  groupTitle: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s3, paddingHorizontal: SPACE.s4 },
  tile: {
    width: "22%",
    minWidth: 72,
    flexGrow: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.dividerSubtle,
    alignItems: "center",
    gap: 6,
  },
  tileText: { fontSize: TYPE.sm, color: COLORS.textPrimary, fontWeight: "500" },
});
