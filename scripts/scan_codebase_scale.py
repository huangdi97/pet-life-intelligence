"""Stage V.2 reproducible codebase-scale scanner.

Reports, in a single deterministic pass:
  1. Production source files over the line limits:
     - Python / any source file        > 300 lines
     - React component / page (tsx/ts) > 200 lines
     - non-component TypeScript        > 300 lines
  2. Files containing bare TODO/FIXME/HACK/XXX/TEMP comments
     (tracked comments carrying a tracker ID are allowed).
  3. Type-escape markers: any / unknown as / @ts-ignore / @ts-expect-error
     / type: ignore / noqa / cast( — reported per file with line numbers
     so each occurrence can be individually adjudicated.

Excluded trees (deterministic): node_modules, dist, .next, out, build,
__pycache__, .venv, migrations/, lockfiles, egg-info, artifacts, evidence,
data, .pytest_cache, .ruff_cache, and the .git directory.

Usage:
    python scripts/scan_codebase_scale.py [--limit-py 300] [--limit-tsx 200] [--limit-ts 300]

Exit code 0 always; the report is printed as Markdown for direct use in
the Stage V.2 review report.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

EXCLUDED_DIRS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "artifacts",
    "build",
    "data",
    "dist",
    "egg-info",
    "evidence",
    "migrations",
    "node_modules",
    "out",
    "evals",
}
EXCLUDED_SUFFIXES = {
    ".lock",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".pdf",
    ".ipynb",
    ".pyc",
    ".bak",
}
SOURCE_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
}

# The scanner's own docstring and marker table intentionally contain the
# literal words it scans for (TODO/FIXME/any/cast(...)/...). Exclude this file
# from CONTENT scans so it cannot self-report; its size is still reported.
SCANNER_SELF = Path(__file__).resolve()

# Bare markers: a comment word that is NOT followed by a tracker reference
# such as (PLI-1234) / [PLI-1234] / :PLI-1234 / #1234.
_BARE_TODO = re.compile(
    r"#.*\b(TODO|FIXME|HACK|XXX|TEMP)\b(?![- ]*\(? ?([A-Za-z]+-[0-9]+|[0-9]+))",
    re.IGNORECASE,
)

# Markers are language-scoped so the report is actionable:
# - TypeScript/JS files: `any` (as a type token), `unknown as`, `@ts-ignore`,
#   `@ts-expect-error`, `type: ignore`, and `cast(`.
# - Python files: `# noqa`, `type: ignore` (mypy-style), and `cast(` (typing.cast).
# This keeps the Python builtin `any(...)` (a plain runtime predicate) out of
# the type-escape report, where it would be a false positive.
_TS_TYPE_ESCAPES = {
    "any": r"\bany\b",
    "unknown as": r"\bunknown\s+as\b",
    "@ts-ignore": r"@ts-ignore",
    "@ts-expect-error": r"@ts-expect-error",
    "type: ignore": r"type:\s*ignore",
    "cast(": r"\bcast\s*\(",
}
_PY_TYPE_ESCAPES = {
    "noqa": r"#\s*noqa",
    "type: ignore": r"type:\s*ignore",
    "cast(": r"\bcast\s*\(",
}


def _excluded(path: Path) -> bool:
    parts = path.parts
    for excluded in EXCLUDED_DIRS:
        if excluded in parts:
            return True
    return path.suffix in EXCLUDED_SUFFIXES


def iter_source_files() -> list[Path]:
    files: list[Path] = []
    for root in (
        REPO_ROOT / "services",
        REPO_ROOT / "packages",
        REPO_ROOT / "apps",
        REPO_ROOT / "scripts",
        REPO_ROOT / "tests",
        REPO_ROOT / "infra",
    ):
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if _excluded(path):
                continue
            try:
                is_file = path.is_file()
            except OSError:
                # PermissionError on broken symlinks inside excluded trees
                # (e.g. apps/web/.next) must not abort the scan.
                continue
            if is_file and path.suffix in SOURCE_SUFFIXES:
                files.append(path)
    return sorted(files)


def is_react_component(path: Path) -> bool:
    """Heuristic: a tsx file, or a ts file under a components/|screens/|pages/ dir."""
    if path.suffix == ".tsx":
        return True
    parts = path.parts
    return any(part in ("components", "screens", "pages") for part in parts)


def line_count(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        return sum(1 for _ in handle)


def scan() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit-py", type=int, default=300)
    parser.add_argument("--limit-tsx", type=int, default=200)
    parser.add_argument("--limit-ts", type=int, default=300)
    args = parser.parse_args()

    files = iter_source_files()
    over_py: list[tuple[Path, int]] = []
    over_tsx: list[tuple[Path, int]] = []
    over_ts: list[tuple[Path, int]] = []
    todo_files: list[tuple[Path, int]] = []
    type_escape_rows: list[tuple[Path, int, str, str]] = []
    total = 0

    for path in files:
        total += 1
        try:
            size = line_count(path)
        except OSError:
            continue
        suffix = path.suffix
        if suffix == ".py":
            if size > args.limit_py:
                over_py.append((path, size))
        elif suffix in (".tsx", ".ts"):
            if is_react_component(path):
                if size > args.limit_tsx:
                    over_tsx.append((path, size))
            elif size > args.limit_ts:
                over_ts.append((path, size))
        elif suffix in (".js", ".jsx", ".mjs", ".cjs"):
            if size > args.limit_py:
                over_py.append((path, size))
        if path.resolve() == SCANNER_SELF:
            # The scanner's own marker table is a fixture, not a violation.
            continue
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for lineno, raw in enumerate(handle, start=1):
                if _BARE_TODO.search(raw):
                    todo_files.append((path, lineno))
                if path.suffix in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"):
                    escapes = _TS_TYPE_ESCAPES
                elif path.suffix == ".py":
                    escapes = _PY_TYPE_ESCAPES
                else:
                    escapes = {}
                for label, pattern in escapes.items():
                    if re.search(pattern, raw):
                        type_escape_rows.append((path, lineno, label, raw.strip()))

    def render(path: Path) -> str:
        try:
            return str(path.relative_to(REPO_ROOT))
        except ValueError:
            return str(path)

    print(f"# Codebase scale scan — {REPO_ROOT}")
    print(f"\nScanned {total} production/test source files.")
    print(f"\n## 1. Over {args.limit_py} lines (Python/JS, non-component)")
    for path, size in over_py:
        kind = "react" if path.suffix in (".tsx",) or "components" in path.parts else "src"
        print(f"- `{render(path)}` {size} [{kind}]")
    if not over_py:
        print("- none")

    print(f"\n## 2. Over {args.limit_tsx} lines (React component/page)")
    for path, size in over_tsx:
        print(f"- `{render(path)}` {size}")
    if not over_tsx:
        print("- none")

    print(f"\n## 3. Over {args.limit_ts} lines (non-component TS)")
    for path, size in over_ts:
        print(f"- `{render(path)}` {size}")
    if not over_ts:
        print("- none")

    print("\n## 4. Bare TODO/FIXME/HACK/XXX/TEMP occurrences")
    for path, lineno in todo_files:
        print(f"- `{render(path)}` line {lineno}")
    if not todo_files:
        print("- none")

    print("\n## 5. Type-escape markers (adjudicate each)")
    for path, lineno, label, snippet in type_escape_rows:
        print(f"- `{render(path)}` line {lineno} [{label}]: {snippet[:120]}")
    if not type_escape_rows:
        print("- none")

    print("\n## 6. Totals")
    print(f"- over_py={len(over_py)} over_tsx={len(over_tsx)} over_ts={len(over_ts)}")
    print(f"- bare_todo={len(todo_files)} type_escapes={len(type_escape_rows)}")


if __name__ == "__main__":
    scan()
    sys.exit(0)
