/**
 * Pet3DViewer — mobile adapter for the shared demo pet 3D scene.
 *
 * Android mechanism (R2-P3D, documented in R2P3D_3D_STAGE_ARCHITECTURE.md):
 * a self-contained page (three + the shared @pli/pet-3d asset, embedded as an
 * inline string via scripts/build-3d-page.mjs) runs inside react-native-webview.
 * The page handles drag-rotate / pinch-zoom / reset and reports status +
 * orientation via postMessage, so Life View rotation is real rendered 3D.
 * On WebGL failure the page reports "failed" and screens fall back to
 * photo / 2.5D — 3D is never a single point of failure.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { PET_3D_ASSETS } from "@pli/pet-3d";
import type { Pet3DIdentity } from "@pli/pet-3d";
import { PET_STAGE_HTML } from "../../three/petStageHtml";

export type Pet3DStatus = "boot" | "ready" | "failed";

interface Props {
  identity: Pet3DIdentity;
  interactive?: boolean;
  onStatus?: (status: Pet3DStatus) => void;
  onOrientation?: (yaw: number) => void;
}

export function Pet3DViewer({ identity, interactive = false, onStatus, onOrientation }: Props) {
  const [status, setStatus] = useState<Pet3DStatus>("boot");

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; [k: string]: unknown };
      if (msg.type === "status") {
        const s = msg.status === "ready" ? "ready" : "failed";
        setStatus(s);
        onStatus?.(s);
        // PROVIDER: telemetry-only bridge state (never shown in the owner UI).
        console.log(`[pet3d] status=${s}`);
      } else if (msg.type === "orientation" && typeof msg.yaw === "number") {
        onOrientation?.(msg.yaw);
        // PROVIDER: telemetry-only; proves real rotation on device (logcat).
        console.log(`[pet3d] orientation yaw=${msg.yaw.toFixed(2)}`);
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  const injected = `window.__PLI_IDENTITY = "${identity}"; window.__PLI_INTERACTIVE = ${interactive}; true;`;

  const meta = PET_3D_ASSETS[identity];

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${meta.name}的 3D 形象（演示，开发环境）。${meta.description}`}
      accessibilityRole="image"
      testID="pet3d-stage-mobile"
    >
      <WebView
        source={{ html: PET_STAGE_HTML, baseUrl: "file:///android_asset/" }}
        style={styles.web}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={injected}
        onRenderProcessGone={() => {
          setStatus("failed");
          onStatus?.("failed");
        }}
        setBuiltInZoomControls={false}
        onShouldStartLoadWithRequest={() => true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  web: { flex: 1, backgroundColor: "transparent" },
});