# PLI R5.6 — IMPLEMENTATION_CHANGELOG

> Real source changes made by the local autonomous agent on branch
> `feat/r2p3d-r3-render-truth-ui-closure`. Both commits are normal fast-forward
> pushes; PR #2 is not merged, `main`/tags/releases are untouched.

## Commit 1 — `a03295c73e328af30bd3bd42a3aa90ea8224a346`

**fix(android-evidence): make hosted UIAutomator dump failures recoverable and diagnosable**

### Evidence that started it (L0 runtime)

- Run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38063682536 (head `6738f3c`),
  job `Android R5.6 runtime evidence (NO_VISION_MODEL_USED)` = failure at step
  *Capture real Android runtime evidence*.
- Job log: `scripts/r5-6/capture-android-final.py:616 in main →
  android.dump_xml(primary_select_dir / "ui.xml") → line 193 →
  CaptureError: unable to obtain unobscured UIAutomator XML`.
- Uploaded diagnostics (`r5-6-android-runtime-diagnostics`, artifact `11674606294`):
  - `artifacts/r5-6-final/android/_primary-select/ui.xml` = **0 bytes**,
  - `tmp/pli-android-logcat.txt` stops at `15:37:59` although the dump ran at `15:38:49`
    → the device had stopped emitting for ~50 s,
  - `tmp/pli-api.log` shows the app itself healthy and polling
    `/pets/<id>/today`, `/tasks`, `/health-events`.

Conclusion: a hosted-emulator stall, not an app failure, but the capture script could
neither recover from it nor explain it (no tool output was recorded anywhere, only the
final `CaptureError`).

### Change (scope: evidence tooling only — no production path)

`scripts/r5-6/capture-android-final.py`

1. `run()` gained a bounded wall-clock budget (`ADB_TIMEOUT_SECONDS = 60`, overridable
   per call). A stalled adb call now fails locally with a clear message instead of
   blocking until the runner's 6-hour limit.
2. `dump_xml()` now
   - tries two independent hierarchy targets (`/sdcard/…` and `/data/local/tmp/…`),
   - records the real `uiautomator` stdout/stderr plus a device-liveness state line into
     `dump-diagnostics.txt` next to the failing `ui.xml` (that directory is already
     uploaded by the existing evidence artifact),
   - probes `adb shell echo` (`is_responsive()`) before retrying and issues
     `adb wait-for-device` when the emulator has dropped, so a stalled device is waited
     for instead of silently burning the retry budget.
3. Attempts per dump stayed at the previous order of magnitude (4 → 5) and **no product
   gate was relaxed**: every caller still requires the exact expected UI root id
   (`pli.today.living-stage`, …) and the rigged `RUNTIME` 3D manifest.

New test: `tests/blind_ui/test_android_capture_dump_recovery.py` (5 cases) pins the
recovery contract with a scripted adb double — fallback target, persisted diagnostics,
unresponsive-device probe, bounded command timeout.

### Verification

| Check | Command | Result |
| --- | --- | --- |
| Blind-UI suite (incl. 5 new cases) | `.venv\Scripts\python.exe -m pytest tests/blind_ui -q` | 186 passed |
| Syntax / lint | `python -m py_compile scripts/r5-6/capture-android-final.py`, `python -m ruff check …` | clean |
| Real device mechanism | `adb -s emulator-5554 shell uiautomator dump /sdcard/pli_test.xml` on a booted API-36 emulator | file written + readable, `exec-out … /dev/tty` variant also valid |
| Hosted job at new head | run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38087011941 | **success** — `Android R5.6 runtime evidence` now completes |

Risk: low, evidence tooling only. The hosted emulator stall itself is an infrastructure
condition; this change makes it recoverable and leaves a diagnostic trail when it is not.

## Commit 2 — `3aacdf6cfabd105f18b9197ce65d8981a15a48f4`

**test(v10): make abnormal-day-hint expectation follow the same-clock rule**

### Evidence that started it (L0 runtime)

- Run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38087011901 (head `a03295c7`),
  job `Backend (lint + unit + integration + safety)` (id `114315519623`) = failure at
  step *Pytest*: `tests/v10/test_final_extras.py::test_abnormal_day_hint_uses_same_clock_duration_not_event_count`
  → `assert 20.0 == 50.0`; `1 failed, 472 passed`.
- Nothing in that commit touches backend code, and the identical job passed at `6738f3c`
  earlier the same day → time-dependent behaviour, not a regression.

### Root cause

`services/api/app/api/routes/v10_extras_services.py` (lines 172–196) rebuilds the
comparison *at the current local clock*: same-day events contribute only while
`local <= now`, deliberately, so an owner screen at 05:15 is never compared with a
full-day total. The test derived its expected value from `/today`, whose local-day
window also contains the **seeded same-day walk scheduled later in the morning**. The
assertion therefore held whenever CI ran after that seeded walk and broke in the
early-morning window — this run executed at `2026-10-10T21:20Z` = `05:20 Asia/Shanghai`.
The endpoint's `20.0` was the correct value.

### Change (scope: test only)

`tests/v10/test_final_extras.py` — the expected value now sums today's walk durations
with the same recorded-fact rule the endpoint documents (skip rows that are future-dated
at the current local clock, skip retracted rows) and asserts the compared window really
contains the walk the test posted (`expected_walk_minutes >= 20`). Unit, `sample_count`,
`same_time_baseline` and `source_scope` assertions are unchanged — no gate weakened, and
product behaviour is untouched.

### Verification

| Check | Command | Result |
| --- | --- | --- |
| Failing file, run inside the failing window (05:3x Asia/Shanghai) | `.venv\Scripts\python.exe -m pytest tests/v10/test_final_extras.py -q` | 6 passed |
| Hosted CI at new head | run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783213 | **success** (all four jobs) |

## Commit 3 — `fix(android-evidence): decode adb output as UTF-8 and survive a missing python3`

Found by **actually running the capture locally**, which is why the local run exists.

### Evidence (L0 runtime, this workstation)

- First local run: `UnicodeDecodeError: 'gbk' codec can't decode byte 0x86 in position 7130`
  followed by `AttributeError: 'NoneType' object has no attribute 'strip'` in
  `Android.shell()` → the whole capture aborted.
- Root cause: `subprocess.run(..., text=True)` decoded adb's UTF-8 payload with the host's
  GBK locale, and `CompletedProcess.stdout` came back `None`.
- Second local run (after the decode fix): the capture advanced past nine surfaces and failed
  only at `python3 scripts/blind-ui/android_extract.py` with Windows exit code 9009
  (`python3` does not exist on Windows).

### Change (scope: evidence tooling only)

`scripts/r5-6/capture-android-final.py`

1. `run()` now pins `encoding="utf-8", errors="replace"` for text capture, so the host locale
   can never corrupt or crash adb parsing; binary capture is unchanged.
2. `Android.shell()` tolerates a `None` stdout instead of raising `AttributeError`.

The extractor invocation already supports the documented `PYTHON` environment override, which
is what the local run sets (`$env:PYTHON = <venv>\Scripts\python.exe`); no code change was
needed there and the Windows-first PowerShell wrapper remains untouched.

### Verification

| Check | Result |
| --- | --- |
| `.venv\Scripts\python.exe -m pytest tests/blind_ui/test_android_capture_dump_recovery.py -q` | 5 passed |
| `python -m py_compile` + `ruff check` on the changed script | clean |
| Full local capture on the API-36 emulator after the change | **exit 0**, 71 evidence files, `capture-manifest.json` `source_head = checkout_head = 3aacdf6c…` |
| Hosted CI | re-run recorded in `FINAL_CLOSURE_REPORT.md` |

## Commit 4 — `fix(android-evidence): poll the Life View mode rail inside the bounded surface wait`

- Run 38095816809 failed with
  `CaptureError: Life View primary mode rail is missing from the real Android viewport`
  although the parent commit passed the same gate: the surface poll waited only for
  `pli.lifeview.identity`, while `pli.lifeview.modebar` mounts afterwards.
- `capture_surface()` now polls (same 12-attempt budget) until the root **and**, for Life
  View, the mode rail are present. The rail stays mandatory, its bounds are still parsed,
  and it still has to be ≥44px visible; a failure now reports `observed_ui_ids`.
- Verified: hosted Android runtime-evidence job green at `fc334c63`
  (run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38097949218).

## Commit 5 — `fix(android-evidence): require the requested pet's runtime manifest before accepting a Today frame`

- Observed on a **repeated local run**: the app was relaunched with the secondary pet still
  persisted, the primary-pet select loop broke out on the *previous* pet's Today surface, and
  the run failed later with
  `required rigged RUNTIME 3D manifest unavailable for pet <primary> … observed petId=<secondary>`.
- The loop already re-issued the deterministic demo deep link; it simply never checked which
  pet the stage had republished.
- Added `Android.peek_runtime_manifest()` (non-raising read) and both select loops now keep
  polling/re-issuing until the published manifest belongs to the requested pet, within the
  existing bounded budget. No product gate changed and the app is untouched.
- Verified: local capture `exit 0` from a clean app state; hosted Android runtime-evidence job
  green at `1be8888e` (run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38100446555).

## Not changed (deliberately)

- Owner five-tab IA, page hierarchy and visual system: no rewrite. The tab label `我的`
  in `apps/mobile/src/navigation.tsx` matches the canonical `docs/ui/OWNER_NAVIGATION_V4.md`
  (`今天 / 时间线 / 宠物 / 助手 / 我的`) and the blind contract; the GOAL's `我` is
  shorthand, so it was **not** changed.
- No visual baseline was regenerated, no `--update-snapshots`, no test removed or skipped,
  no lint/type/safety gate relaxed, no domain schema or permission semantics touched.
- Locally regenerated build outputs (`apps/mobile/assets/3d/pet-stage.html`,
  `apps/mobile/src/three/petStageHtml.ts`) were restored to HEAD before committing so the
  diff stays reviewable.
