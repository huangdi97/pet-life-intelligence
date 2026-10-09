#!/usr/bin/env python3
"""Bundle JS into the *debuggable* R5.6 Android evidence APK.

React Native defaults to excluding JS from debug variants and requesting
Metro at runtime. Hosted emulators can reach the native package without
reaching Metro, yielding a blank window and no RUNTIME 3D manifest.
This scoped generated-Gradle edit makes the CI evidence APK self-contained;
it does not change production source or the release build.
"""
from pathlib import Path

path = Path("apps/mobile/android/app/build.gradle")
source = path.read_text(encoding="utf-8")
needle = "react {"
if source.count(needle) != 1:
    raise SystemExit(f"expected one RN Gradle react block in {path}")
if "debuggableVariants = []" not in source:
    source = source.replace(
        needle,
        needle + "\n    // R5.6 runtime-evidence only: include JS while retaining debug run-as\n    debuggableVariants = []",
        1,
    )
    path.write_text(source, encoding="utf-8")
if "debuggableVariants = []" not in path.read_text(encoding="utf-8"):
    raise SystemExit("debug JS bundle configuration was not installed")

# A debug package is intentionally retained so capture can use `run-as`, but
# DevSupport must be off or React Native will prefer the live Metro connection
# over the embedded bundle and can tear down the instance on a later deep link.
java_root = Path("apps/mobile/android/app/src/main/java")
candidates = list(java_root.rglob("MainApplication.kt")) + list(java_root.rglob("MainApplication.java"))
if len(candidates) != 1:
    raise SystemExit(f"expected exactly one generated MainApplication, found {candidates}")
app = candidates[0]
app_source = app.read_text(encoding="utf-8")
replacements = (
    ("override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG",
     "override fun getUseDeveloperSupport(): Boolean = false"),
    ("public boolean getUseDeveloperSupport() { return BuildConfig.DEBUG; }",
     "public boolean getUseDeveloperSupport() { return false; }"),
)
changed = False
for before, after in replacements:
    if before in app_source:
        app_source = app_source.replace(before, after, 1)
        changed = True
        break
if not changed and "getUseDeveloperSupport" in app_source and "Boolean = false" not in app_source and "return false;" not in app_source:
    raise SystemExit(f"generated DevSupport shape changed; refuse an unverified patch: {app}")
app.write_text(app_source, encoding="utf-8")
verified = app.read_text(encoding="utf-8")
if "getUseDeveloperSupport" not in verified or not ("Boolean = false" in verified or "return false;" in verified):
    raise SystemExit(f"DevSupport was not disabled in {app}")

print(f"PASS: self-contained debuggable JS variant configured at {path}; DevSupport disabled in {app}")
