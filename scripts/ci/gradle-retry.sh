#!/usr/bin/env bash
# Bounded Gradle retry for *dependency resolution* flakiness only.
#
# Why this exists: hosted Maven Central / CDN resolution intermittently fails
# ("Could not download com.facebook.react:react-android:... AAR"). A retry is
# only useful if the next attempt actually re-resolves metadata, so attempt 2+
# passes --refresh-dependencies. A genuine compile/test failure must never be
# retried or reclassified as network flakiness — that would hide real defects.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: gradle-retry.sh <gradle-task> [gradle-args...]" >&2
  exit 2
fi

args=("$@")
task="${args[*]}"
attempts="${GRADLE_NETWORK_ATTEMPTS:-4}"
base_sleep="${GRADLE_NETWORK_RETRY_SLEEP:-12}"
log_dir="${GRADLE_RETRY_LOG_DIR:-/tmp}"
summary_path="${GRADLE_RETRY_SUMMARY:-${log_dir}/pli-gradle-summary.txt}"

# Dependency-resolution / transport failures only. Compile or test errors never
# match these patterns, so they exit immediately instead of burning attempts.
NETWORK_PATTERN='Could not resolve|Could not parse POM|Could not GET|Could not HEAD|Could not download|Connection reset|Read timed out|Remote host terminated|Connect timed out|Network is unreachable'

mkdir -p "$log_dir"

head_sha="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"

write_summary() {
  local attempt_used="$1"
  local classification="$2"
  local status="$3"
  local i
  {
    echo "PLI Gradle retry summary"
    echo "head_sha: ${head_sha}"
    echo "gradle_task: ${task}"
    echo "attempts_allowed: ${attempts}"
    echo "attempts_used: ${attempt_used}"
    echo "classification: ${classification}"
    echo "exit_status: ${status}"
    echo "logs:"
    for ((i = 1; i <= attempt_used; i++)); do
      echo "  ${log_dir}/pli-gradle-attempt-${i}.log"
    done
    echo "dependency_resolution_error:"
    grep -E "$NETWORK_PATTERN" "${log_dir}/pli-gradle-attempt-${attempt_used}.log" 2>/dev/null | head -20 || true
  } | tee "$summary_path"

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    cat "$summary_path" >> "$GITHUB_STEP_SUMMARY" || true
  fi
}

attempt=1
while ((attempt <= attempts)); do
  cmd=(./gradlew "${args[@]}" --no-daemon)
  refreshed="no"
  if ((attempt > 1)); then
    # Retrying without refreshed metadata replays the same poisoned cache entry.
    cmd+=(--refresh-dependencies)
    refreshed="yes"
  fi

  log="${log_dir}/pli-gradle-attempt-${attempt}.log"
  echo "Gradle attempt ${attempt}/${attempts}: ${cmd[*]} (refresh_dependencies=${refreshed})"

  set +e
  "${cmd[@]}" 2>&1 | tee "$log"
  status="${PIPESTATUS[0]}"
  set -e

  if [[ "$status" -eq 0 ]]; then
    write_summary "$attempt" "success" "$status"
    exit 0
  fi

  if ! grep -Eq "$NETWORK_PATTERN" "$log"; then
    write_summary "$attempt" "non_network_build_failure" "$status"
    echo "Gradle failed for a non-network reason; not masking it with retries." >&2
    exit "$status"
  fi

  if ((attempt >= attempts)); then
    write_summary "$attempt" "network_dependency_resolution_exhausted" "$status"
    echo "::error::Gradle dependency resolution failed after ${attempts} attempts (HEAD ${head_sha})." || true
    exit "$status"
  fi

  sleep_for=$((base_sleep * (1 << (attempt - 1))))
  echo "Gradle/Maven dependency resolution failed transiently; retrying in ${sleep_for}s with --refresh-dependencies."
  sleep "$sleep_for"
  attempt=$((attempt + 1))
done
