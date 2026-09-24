// Local Expo config plugin — Stage R.1 (LAN cleartext policy).
//
// Android's default since API 28 blocks cleartext HTTP. A LAN device build
// (API URL injected as http://<LAN_IP>:8800 via EXPO_PUBLIC_PLI_API_URL)
// needs `android:usesCleartextTraffic="true"` on the <application> node of
// the RELEASE manifest. Debug manifests already allow cleartext by RN's
// template, so without this plugin a release APK could never reach a plain-
// HTTP dev machine.
//
// SAFETY / COMPATIBILITY:
//  - http:// builds  -> attribute injected (DEV/INTERNAL only, per contract).
//  - https / no URL  -> plugin is a no-op; Android default stays (blocked).
//
// The decision is read from config.extra.apiUrl, which app.config.js derives
// from the build-time EXPO_PUBLIC_PLI_API_URL, so the same source of truth
// drives both the JS bundle base URL and the native cleartext posture.
const { withAndroidManifest } = require("@expo/config-plugins");

/** @param {import('@expo/config-types').ExpoConfig} config */
module.exports = function withLanCleartext(config) {
  const apiUrl = String(config.extra?.apiUrl ?? "").trim();
  if (!apiUrl.startsWith("http://")) return config; // keep Android default

  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && !app.$["android:usesCleartextTraffic"]) {
      app.$["android:usesCleartextTraffic"] = "true";
    }
    return cfg;
  });
};