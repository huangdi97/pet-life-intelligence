/**
 * PetAvatar — round pet identity mark: photo when available, else a warm
 * species glyph (never a letter circle by default).
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "../../api";
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
  const [persistedUri, setPersistedUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPersistedUri(null);
    if (!pet?.id || !pet.avatar_artifact_id) return () => { alive = false; };
    api
      .get<{ avatar_artifact_id: string | null; data_url: string | null }>(`/pets/${pet.id}/avatar`)
      .then((row) => {
        if (alive) setPersistedUri(row.data_url ?? null);
      })
      .catch(() => {
        // Protected avatar lookup failure must not break identity UI; retain
        // the existing honest species/demo fallback.
        if (alive) setPersistedUri(null);
      });
    return () => {
      alive = false;
    };
  }, [pet?.id, pet?.avatar_artifact_id]);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: RADIUS.pill }]}>
      <PetMedia
        pet={pet}
        uri={persistedUri ?? uri ?? null}
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
