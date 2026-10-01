/**
 * Pet3DViewer — mobile adapter for the pet 3D scene (individual twin capable).
 *
 * Android mechanism (R2-P3D, documented in R2P3D_3D_STAGE_ARCHITECTURE.md):
 * a self-contained page (three + the shared @pli/pet-3d asset, embedded as an
 * inline string via scripts/build-3d-page.mjs) runs inside react-native-webview.
 * The page handles drag-rotate / pinch-zoom / reset and reports status +
 * orientation via postMessage, so Life View rotation is real rendered 3D.
 *
 * R2P3D-R1: when a twin descriptor (family/morph/texture from the backend
 * individual-twin pipeline) is provided, the page builds THAT individual twin
 * instead of the demo identity. The `pose` prop switches the active motion
 * clip (Idle/Sit/Walk/...) by injecting a page call — poses are real joint
 * animations driven by the shared motion library.
 *
 * On WebGL failure the page reports "failed" and screens fall back to
 * photo / 2.5D — 3D is never a single point of failure.
 */
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { PET_3D_ASSETS, type PoseName } from "@pli/pet-3d";
import type { Pet3DIdentity } from "@pli/pet-3d";
import { PET_STAGE_HTML } from "../../three/petStageHtml";
import type { TwinDescriptor } from "@pli/pet-3d";
export type Pet3DStatus = "boot" | "ready" | "failed";

interface Props {
  identity: Pet3DIdentity;
  /** Individual twin descriptor from the backend pipeline (family/morph/texture). */
  twin?: TwinDescriptor | null;
  /** Active motion clip name (persisted across remounts). */
  pose?: PoseName | null;
  interactive?: boolean;
  /** Pet id + source media count for the V2 identity manifest gate. */
  petId?: string | null;
  sourceMediaCount?: number;
  onStatus?: (status: Pet3DStatus) => void;
  onOrientation?: (yaw: number) => void;
}
export function Pet3DViewer({ identity, twin = null, pose = null, interactive = false, petId = null, sourceMediaCount = 0, onStatus, onOrientation }: Props) {
  const [status, setStatus] = useState<Pet3DStatus>("boot");
  const webRef = useRef<WebView>(null);
  const lastPose = useRef<string | undefined>(undefined);
  const lastPersist = useRef(0);

  // Persist the latest runtime manifest to app storage (release-proof channel
  // for the blind harness; Hermes strips console.log in release builds so the
  // old [plimanifest] logcat path never fires).
  const persistManifest = (manifest: Record<string, unknown>) => {
    const now = Date.now();
    if (now - lastPersist.current < 1500) return;
    lastPersist.current = now;
    FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + "pli_manifest.json",
      JSON.stringify(manifest),
    ).catch(() => {});
  };

  // Diagnostic markers so the C-phase runtime diagnosis can distinguish
  // "WebView never loaded" from "render process crashed" on emulators.
  const persistMarker = (marker: string) => {
    FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + "pli_diag.json",
      JSON.stringify({ marker, at: new Date().toISOString() }),
    ).catch(() => {});
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; [k: string]: unknown };
      if (msg.type === "status") {
        const s = msg.status === "ready" ? "ready" : "failed";
        setStatus(s);
        onStatus?.(s);
        if (s === "failed") {
          // Honest fallback manifest: WebGL unavailable on this runtime. The
          // blind harness uses it for the wireframe/truth gates; the owner UI
          // never sees it. This is a truthful 2.5D fallback, never FAKE_3D.
          persistManifest({
            ready: false,
            manifestOrigin: "SYNTHETIC_FALLBACK_EVIDENCE",
            representation: "2.5d-photo-fallback",
            fallbackUsed: true,
            assetVersion: "demo-v1",
            wireframe: false,
            materialMode: "pbr",
            animationClips: [],
            availableClips: [],
            camera: { fov: 38, distance: 4.6, yaw: 0.35, pitch: 0.28, radius: 4.6 },
            pose: "Idle",
            poseSource: "AMBIENT",
            poseConfidence: 0.3,
          });
        }
        // PROVIDER: telemetry-only bridge state (never shown in the owner UI).
        console.log(`[pet3d] status=${s}`);
      } else if (msg.type === "orientation" && typeof msg.yaw === "number") {
        onOrientation?.(msg.yaw);
        // PROVIDER: telemetry-only; proves real rotation on device (logcat).
        console.log(`[pet3d] orientation yaw=${msg.yaw.toFixed(2)}`);
      } else if (msg.type === "manifest" && msg.manifest && typeof msg.manifest === "object") {
        // Blind harness channel: persist the runtime manifest so the Android
        // extractor can read it even in release builds (Hermes strips
        // console.log, so [plimanifest] logcat never fires). Throttled.
        persistManifest(msg.manifest as Record<string, unknown>);
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  // Push pose changes into the page after it is ready.
  useEffect(() => {
    if (!pose || status !== "ready" || pose === lastPose.current) return;
    lastPose.current = pose;
    webRef.current?.injectJavaScript(`window.__PLI_SET_POSE && window.__PLI_SET_POSE(${JSON.stringify(pose)}); true;`);
  }, [pose, status]);

  const twinJson = twin ? JSON.stringify(twin).replace(/\\/g, "\\\\").replace(/'/g, "\\'") : "";
  const injected = `window.__PLI_IDENTITY = "${identity}"; window.__PLI_INTERACTIVE = ${interactive}; window.__PLI_PET_ID = ${petId ? JSON.stringify(petId) : "null"}; window.__PLI_SOURCE_MEDIA_COUNT = ${Number(sourceMediaCount) || 0}; ${
    twin ? `window.__PLI_TWIN = JSON.parse('${twinJson}');` : ""
  } true;`;

  const meta = PET_3D_ASSETS[identity];
  const label = twin
    ? `${meta.name}的 3D 形象（由照片/模板生成，待你确认后才显示）。`
    : `${meta.name}的 3D 形象（演示）。${meta.description}`;

  return (
    <View
      style={styles.container}
      accessibilityLabel={label}
      accessibilityRole="image"
      testID="pet3d-stage-mobile"
    >
      <WebView
        // The twin descriptor arrives asynchronously after mount; keying the
        // WebView on twinVersion+petId forces a clean reload so
        // injectedJavaScriptBeforeContentLoaded carries the real individual
        // twin (demo stage must not win when the twin loads late).
        key={`${petId ?? "no-pet"}:${twin ? String(twin.version ?? "") : "demo"}`}
        ref={webRef}
        source={{ html: PET_STAGE_HTML, baseUrl: "file:///android_asset/" }}
        style={styles.web}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={injected}
        onLoadStart={() => persistMarker("load-start")}
        onLoadEnd={() => persistMarker("load-end")}
        onError={(e) => persistMarker(`error:${e.nativeEvent.description ?? "unknown"}`)}
        onRenderProcessGone={() => {
          persistMarker("render-process-gone");
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