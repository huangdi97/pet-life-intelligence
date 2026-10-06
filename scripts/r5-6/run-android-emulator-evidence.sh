#!/usr/bin/env bash
set -euo pipefail

ADB="${ADB:-adb}"
APK="apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
SERIAL="${ANDROID_SERIAL:-emulator-5554}"
PACKAGE="${PLI_ANDROID_PACKAGE:-com.pli.mobile}"

capture_diagnostics() {
  "$ADB" -s "$SERIAL" logcat -d > /tmp/pli-android-logcat.txt 2>/dev/null || true
  "$ADB" -s "$SERIAL" shell run-as "$PACKAGE" cat files/pli_diag.json > /tmp/pli-diag.json 2>/dev/null || true
  "$ADB" -s "$SERIAL" shell run-as "$PACKAGE" cat files/pli_manifest.json > /tmp/pli-runtime-manifest.json 2>/dev/null || true
}
trap capture_diagnostics EXIT

"$ADB" -s "$SERIAL" wait-for-device

ready=0
for _ in $(seq 1 60); do
  if "$ADB" -s "$SERIAL" shell service check package 2>/dev/null | grep -q "found"; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "Android package service never became ready" >&2
  "$ADB" -s "$SERIAL" shell getprop || true
  exit 1
fi

installed=0
for attempt in 1 2 3; do
  if "$ADB" -s "$SERIAL" install -r "$APK"; then
    installed=1
    break
  fi
  echo "APK install attempt $attempt failed; restarting adb and retrying" >&2
  "$ADB" kill-server || true
  "$ADB" start-server
  "$ADB" -s "$SERIAL" wait-for-device
  sleep 10
done

if [[ "$installed" -ne 1 ]]; then
  echo "APK installation failed after 3 attempts" >&2
  exit 1
fi

"$ADB" -s "$SERIAL" shell wm size 1080x2340
"$ADB" -s "$SERIAL" shell wm density 440

python scripts/r5-6/capture-android-final.py \
  --serial "$SERIAL" \
  --api-url http://localhost:8800
