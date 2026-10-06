// R5.6 CI-only Android evidence build preparation.
//
// React Native debug variants are debuggable but, by default, do NOT bundle
// the JS payload; they expect a live Metro server. The hosted evidence runner
// needs both:
//   1) a self-contained JS bundle (no Metro dependency), and
//   2) android:debuggable=true so run-as can read the runtime evidence files.
//
// Expo prebuild generates android/app/build.gradle. For the evidence APK only,
// make the RN Gradle plugin bundle JS into the existing debug variant by
// clearing debuggableVariants. Production/release configuration is untouched.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve("apps/mobile/android/app/build.gradle");
let source = readFileSync(path, "utf8");

const marker = "react {";
if (!source.includes(marker)) {
  throw new Error("React Gradle block not found in generated app/build.gradle");
}

if (!source.includes("debuggableVariants = []")) {
  source = source.replace(
    marker,
    `${marker}
    // PLI R5.6 evidence APK: keep the debug variant debuggable for run-as,
    // but bundle JS/assets so the emulator never depends on Metro.
    debuggableVariants = []`,
  );
}

writeFileSync(path, source, "utf8");
console.log("Prepared self-contained debuggable Android evidence build:", path);
