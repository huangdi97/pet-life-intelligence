/**
 * Dynamic Expo manifest — Stage R.1 (API env injection).
 *
 * The API base URL is injected at build time from EXPO_PUBLIC_PLI_API_URL and
 * exposed through extra.apiUrl (read by expo-constants) in addition to being
 * inlined into the JS bundle by babel-preset-expo. There is deliberately NO
 * localhost fallback: a build without a valid URL must fail loudly at runtime
 * (config-error screen) instead of silently dialing the phone's own loopback.
 *
 * Cleartext posture (COMPATIBILITY): HTTP is only allowed for explicit
 * DEV/INTERNAL targets. When the injected URL is a plain http:// URL we relax
 * Android's cleartext policy so a LAN build can reach the dev machine; https
 * and missing URLs keep the Android default (cleartext blocked).
 */
const { expo } = require("./app.json");

const apiUrl = (process.env.EXPO_PUBLIC_PLI_API_URL ?? "").trim();

module.exports = {
  expo: {
    ...expo,
    extra: {
      ...(expo.extra ?? {}),
      ...(apiUrl ? { apiUrl } : {}),
    },
    // Local plugin turns release cleartext on ONLY for http:// internal
    // builds (see manifest-cleartext.js). No schema key is used because
    // expo.android.usesCleartextTraffic is not honored by prebuild without
    // expo-build-properties.
    plugins: [...(expo.plugins ?? []), "./manifest-cleartext"],
  },
};