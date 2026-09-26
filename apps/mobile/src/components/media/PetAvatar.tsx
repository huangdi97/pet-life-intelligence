/**
 * PetAvatar — round pet identity mark: photo when available, else a warm
 * species glyph (never a letter circle by default).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import type { Pet } from "../../services/types";
import { RADIUS } from "../../tokens";
import { PetMedia } from "./PetMedia";

export function PetAvatar({
  pet,
  uri,
  size = 40,
}: {
  pet: Pet | null;
  uri?: string | null;
  size?: number;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: RADIUS.pill }]}>
      <PetMedia
        pet={pet}
        uri={uri ?? null}
        variant="square"
        radius={RADIUS.pill}
        accessibilityLabel={`${pet?.name ?? "宠物"}的头像`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", alignSelf: "flex-start" },
});
