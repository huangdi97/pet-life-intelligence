/**
 * OpenSection — the §9 surface taxonomy replacement for "Card everywhere":
 * a heading + content with no white border box. Information has a natural
 * boundary (typography + spacing + dividers) instead of a bordered Card.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SPACE, TYPE } from "../../tokens";

interface OpenSectionProps {
  title?: string;
  caption?: string;
  children: React.ReactNode;
}

export function OpenSection({ title, caption, children }: OpenSectionProps) {
  return (
    <View style={styles.wrap}>
      {title ? (
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: SPACE.s2 },
  title: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary },
  caption: { fontSize: TYPE.caption, color: COLORS.textTertiary },
});
