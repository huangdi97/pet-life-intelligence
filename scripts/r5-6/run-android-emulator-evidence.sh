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

# Hosted Pixel images occasionally surface Launcher/SystemUI ANR dialogs over
# the foreground app even though PLI itself is healthy. Suppress host-shell
# error UI at the platform level; capture-android-final.py still refuses to
# dismiss PLI's own crash/ANR dialogs.
"$ADB" -s "$SERIAL" shell settings put global hide_error_dialogs 1 || true
"$ADB" -s "$SERIAL" shell settings put global anr_show_background 0 || true
"$ADB" -s "$SERIAL" shell am force-stop com.google.android.apps.nexuslauncher || true

# Port forwarding is configured after APK installation below. If an install
# retry restarts the adb server, all reverse mappings established beforehand
# are lost, so doing it here would make the app/backend channel flaky.

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

# The evidence APK is self-contained: JS is bundled into the debug variant and
# RN DevSupport is disabled, so Metro must not be part of this path. Only the
# real API port is reversed. Establish mappings after install/retry because an
# adb server restart drops every existing reverse mapping.
"$ADB" -s "$SERIAL" reverse --remove-all || true
"$ADB" -s "$SERIAL" reverse tcp:8800 tcp:8800

# INVARIANT: runtime evidence must never silently fall back to a live packager.
if curl -fsS --max-time 2 http://127.0.0.1:8081/status >/dev/null 2>&1; then
  echo "Metro is listening on 8081; the evidence run must not depend on it." >&2
  exit 1
fi

# Fail here, before UI capture, if the device cannot see the evidence API.
# curl is not guaranteed on Android images, so verify the reverse table and
# leave the application-level session gate to capture-android-final.py.
"$ADB" -s "$SERIAL" reverse --list | tee /tmp/pli-adb-reverse.txt
grep -q "tcp:8800 tcp:8800" /tmp/pli-adb-reverse.txt
if grep -q "tcp:8081" /tmp/pli-adb-reverse.txt; then
  echo "A Metro reverse mapping leaked into the evidence run." >&2
  exit 1
fi

"$ADB" -s "$SERIAL" shell wm size 1080x2340
"$ADB" -s "$SERIAL" shell wm density 440

python scripts/r5-6/capture-android-final.py \
  --serial "$SERIAL" \
  --api-url http://localhost:8800

# Self-contained-BUNDLE proof: the embedded bundle must have executed without a
# packager. A missing script or a dev-server connection attempt invalidates the
# whole capture regardless of how readable the screenshots look.
"$ADB" -s "$SERIAL" logcat -d > /tmp/pli-android-logcat.txt 2>/dev/null || true
if grep -Eq "Unable to load script|Could not connect to development server|JS bundle missing|Unable to load JS bundle|packager-status" /tmp/pli-android-logcat.txt; then
  echo "The evidence APK tried to use a JS packager; bundled-JS contract is broken." >&2
  grep -E "Unable to load script|Could not connect to development server|JS bundle missing|Unable to load JS bundle" /tmp/pli-android-logcat.txt >&2 || true
  exit 1
fi
echo "PASS: evidence run executed the embedded JS bundle with Metro absent."
