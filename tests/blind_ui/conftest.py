"""blind_ui test config: override the repo-wide autouse DB fixture so visual
contract calibration tests stay hermetic (no Postgres, no vision models)."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BLIND_UI = ROOT / "scripts" / "blind-ui"
if str(BLIND_UI) not in sys.path:
    sys.path.insert(0, str(BLIND_UI))

# Blind-UI tests never touch the database.
@pytest.fixture(scope="session", autouse=True)
def migrated_db() -> None:  # type: ignore[misc]
    yield


@pytest.fixture(scope="session")
def contracts_dir() -> Path:
    return ROOT / "packages" / "visual-contract" / "screens"


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    return Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return ROOT
