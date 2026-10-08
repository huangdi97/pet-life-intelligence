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
print(f"PASS: self-contained debuggable JS variant configured at {path}")
