/**
 * PetContextHeader — compact pet identity strip used on write/secondary
 * screens ("为豆豆记录") with a small pet photo/species avatar. Keeps the
 * pet-first context without competing with the page content.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";
import { PetMedia } from "../media/PetMedia";

interface PetContextHeaderProps {
  pet: Pet | null;
  title: string;
  sub?: string;
  mediaUri?: string | null;
  onPress?: () => void;
}

export function PetContextHeader({ pet, title, sub, mediaUri, onPress }: PetContextHeaderProps) {
  return (
    <View style={styles.row} accessibilityLabel={`${title}${pet ? `（${pet.name}）` : ""}`}>
      {pet ? (
        <View style={styles.avatar}>
          <PetMedia pet={pet} uri={mediaUri ?? null} variant="square" style={styles.avatarMedia} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="切换宠物" onPress={onPress} hitSlop={10}>
          <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerSubtle,
  },
  avatar: { borderRadius: RADIUS.pill, overflow: "hidden", width: 40, height: 40 },
  avatarMedia: { width: 40, height: 40, borderRadius: RADIUS.pill },
  textWrap: { flex: 1 },
  title: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 1 },
});
