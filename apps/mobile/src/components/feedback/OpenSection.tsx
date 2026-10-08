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
  /** Machine-readable testID (blind-UI acceptance). */
  testID?: string;
  children: React.ReactNode;
}

export function OpenSection({ title, caption, testID, children }: OpenSectionProps) {
  return (
    <View style={styles.wrap} testID={testID} accessible={testID ? true : undefined} accessibilityLabel={title || (testID ?? undefined)}>
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
  wrap: { paddingHorizontal: SPACE.s5, marginTop: SPACE.s8 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: SPACE.s3 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, letterSpacing: -0.4 },
  caption: { fontSize: TYPE.caption, color: COLORS.textTertiary },
});
