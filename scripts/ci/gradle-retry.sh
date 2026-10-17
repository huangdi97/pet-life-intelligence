#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: gradle-retry.sh <gradle-task> [gradle-args...]" >&2
  exit 2
fi

attempts="${GRADLE_NETWORK_ATTEMPTS:-3}"
base_sleep="${GRADLE_NETWORK_RETRY_SLEEP:-12}"

for attempt in $(seq 1 "$attempts"); do
  echo "Gradle attempt $attempt/$attempts: $*"
  set +e
  ./gradlew "$@" --no-daemon 2>&1 | tee "/tmp/pli-gradle-attempt-${attempt}.log"
  status=${PIPESTATUS[0]}
  set -e
  if [[ "$status" -eq 0 ]]; then
    exit 0
  fi

  if [[ "$attempt" -ge "$attempts" ]]; then
    exit "$status"
  fi

  if grep -Eq "Could not resolve|Could not parse POM|Could not GET|Could not HEAD|Connection reset|Read timed out|Remote host terminated" "/tmp/pli-gradle-attempt-${attempt}.log"; then
    echo "Transient Gradle/Maven resolution failure detected; retrying with refreshed dependency metadata."
    sleep $((base_sleep * attempt))
    continue
  fi

  echo "Gradle failed for a non-network reason; not masking it with retries." >&2
  exit "$status"
done
