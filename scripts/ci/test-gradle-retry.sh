#!/usr/bin/env bash
# Executable proof for scripts/ci/gradle-retry.sh.
#
# The retry wrapper is CI infrastructure, so its behaviour must be verified
# rather than trusted: refreshed metadata on retry, no retry for real build
# errors, bounded attempts, and per-attempt logs for failure diagnostics.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
retry="${script_dir}/gradle-retry.sh"
work_root="$(mktemp -d)"
trap 'rm -rf "${work_root}"' EXIT

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1" >&2; exit 1; }

make_fake_gradlew() {
  local dir="$1" body="$2"
  mkdir -p "${dir}"
  cat > "${dir}/gradlew" <<EOF
#!/usr/bin/env bash
${body}
EOF
  chmod +x "${dir}/gradlew"
}

run_retry() {
  local dir="$1"
  shift
  ( cd "${dir}" && \
    GRADLE_NETWORK_RETRY_SLEEP=0 \
    GRADLE_RETRY_LOG_DIR="${dir}/logs" \
    GRADLE_RETRY_SUMMARY="${dir}/summary.txt" \
    GRADLE_NETWORK_ATTEMPTS="${GRADLE_NETWORK_ATTEMPTS:-4}" \
    bash "${retry}" "$@" > "${dir}/stdout.txt" 2>&1 )
}

# --- Case 1: transient resolution failure retries with refreshed metadata -----
case1="${work_root}/case1"
make_fake_gradlew "${case1}" '
printf "%s\n" "$*" >> "$(dirname "$0")/args.log"
attempts=$(wc -l < "$(dirname "$0")/args.log")
if [ "$attempts" -eq 1 ]; then
  echo "> Could not download com.facebook.react:react-android:0.74.5 debug"
  echo "Could not resolve all files for configuration :app:debugRuntimeClasspath."
  exit 1
fi
echo "BUILD SUCCESSFUL"
exit 0'
if ! run_retry "${case1}" assembleDebug; then
  fail "case1: transient network failure must eventually succeed"
fi
first_args="$(sed -n '1p' "${case1}/args.log")"
second_args="$(sed -n '2p' "${case1}/args.log")"
[[ "${first_args}" == *"assembleDebug"* ]] || fail "case1: task name missing on attempt 1"
[[ "${first_args}" != *"--refresh-dependencies"* ]] || fail "case1: attempt 1 must not refresh metadata"
[[ "${second_args}" == *"--refresh-dependencies"* ]] || fail "case1: retry must pass --refresh-dependencies"
grep -q "classification: success" "${case1}/summary.txt" || fail "case1: summary classification"
grep -q "attempts_used: 2" "${case1}/summary.txt" || fail "case1: summary attempt count"
[[ -f "${case1}/logs/pli-gradle-attempt-1.log" ]] || fail "case1: attempt 1 log missing"
[[ -f "${case1}/logs/pli-gradle-attempt-2.log" ]] || fail "case1: attempt 2 log missing"
pass "transient dependency failure retries with --refresh-dependencies"

# --- Case 2: real build failure is never retried ------------------------------
case2="${work_root}/case2"
make_fake_gradlew "${case2}" '
printf "%s\n" "$*" >> "$(dirname "$0")/args.log"
echo "e: file:///app/src/Main.kt:4:1 Unresolved reference: pli"
echo "Execution failed for task ':app:compileDebugKotlin'."
exit 1'
set +e
run_retry "${case2}" assembleDebug
case2_status=$?
set -e
[[ "${case2_status}" -eq 1 ]] || fail "case2: original exit status must be preserved (got ${case2_status})"
[[ "$(wc -l < "${case2}/args.log")" -eq 1 ]] || fail "case2: compile failure must not be retried"
grep -q "non_network_build_failure" "${case2}/summary.txt" || fail "case2: classification"
grep -q "not masking it with retries" "${case2}/stdout.txt" || fail "case2: explanation missing"
pass "compile/test failure fails fast without retry"

# --- Case 3: persistent dependency failure is bounded -------------------------
case3="${work_root}/case3"
make_fake_gradlew "${case3}" '
printf "%s\n" "$*" >> "$(dirname "$0")/args.log"
echo "Could not GET https://repo1.maven.org/maven2/... Read timed out"
exit 1'
set +e
GRADLE_NETWORK_ATTEMPTS=3 run_retry "${case3}" assembleDebug
case3_status=$?
set -e
[[ "${case3_status}" -ne 0 ]] || fail "case3: exhausted retries must still fail"
[[ "$(wc -l < "${case3}/args.log")" -eq 3 ]] || fail "case3: attempts must be bounded to 3"
grep -c -- "--refresh-dependencies" "${case3}/args.log" | grep -qx 2 \
  || fail "case3: attempts 2 and 3 must refresh dependencies"
grep -q "network_dependency_resolution_exhausted" "${case3}/summary.txt" || fail "case3: classification"
[[ -f "${case3}/logs/pli-gradle-attempt-3.log" ]] || fail "case3: final attempt log missing"
grep -q "dependency_resolution_error" "${case3}/summary.txt" || fail "case3: error excerpt missing"
head_sha_line="$(grep -c 'head_sha:' "${case3}/summary.txt")"
[[ "${head_sha_line}" -eq 1 ]] || fail "case3: summary must record HEAD sha"
pass "persistent dependency failure exhausts a bounded attempt budget"

# --- Case 4: usage guard ------------------------------------------------------
set +e
bash "${retry}" > /dev/null 2>&1
case4_status=$?
set -e
[[ "${case4_status}" -eq 2 ]] || fail "case4: missing task must exit 2 (got ${case4_status})"
pass "missing gradle task is rejected"

echo "ALL GRADLE RETRY CONTRACT CASES PASS"
