"""Root test configuration.

Point the app at the isolated pli_test database BEFORE any app import, run
Alembic migrations once per session, and wipe all tables between tests so
every test starts from a clean, migration-verified schema.
"""

import os
import sys

ROOT = os.path.abspath(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
for p in (
    os.path.join(ROOT, "services", "api"),
    os.path.join(ROOT, "services", "ai-gateway"),
    os.path.join(ROOT, "services", "worker"),
    os.path.join(ROOT, "packages", "rules"),
):
    if p not in sys.path:
        sys.path.insert(0, p)

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://pli:pli_dev_password@localhost:55432/pli_test",
)
os.environ["DATABASE_URL"] = TEST_DB_URL

import asyncio  # noqa: E402
from urllib.parse import urlparse  # noqa: E402

import pytest  # noqa: E402


def _ensure_test_db() -> None:
    from sqlalchemy import create_engine, text

    parsed = urlparse(TEST_DB_URL.replace("+asyncpg", "+psycopg"))
    admin = create_engine(
        f"postgresql+psycopg://{parsed.username}:{parsed.password}"
        f"@{parsed.hostname}:{parsed.port}/postgres",
        isolation_level="AUTOCOMMIT",
    )
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'pli_test'")
        ).scalar()
        if not exists:
            conn.execute(text("CREATE DATABASE pli_test"))
    admin.dispose()


def _run_migrations() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(os.path.join(ROOT, "services", "api", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(ROOT, "services", "api", "migrations"))
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    _ensure_test_db()
    _run_migrations()
    yield


WIPE_TABLES = [
    "capability_registry", "household_expense_splits", "experiment_assignments",
    "agent_action_logs", "insurance_policy_records", "service_requests",
    "welfare_observations", "welfare_profiles", "behavior_intervention_plans",
    "professional_links", "merge_requests", "transfer_requests",
    "automation_rules", "device_events", "pet_devices", "feature_flags",
    "incidents", "analytics_counters", "content_versions", "milestones",
    "expenses", "diet_profiles", "social_reports", "social_interactions",
    "pet_friends", "social_profiles", "training_sessions", "training_goals",
    "pet_preferences", "care_reminders", "recovery_plans", "health_records",
    "daily_summaries", "diary_entries", "baselines", "pet_identifiers",
    "notifications", "share_tokens", "deletion_requests", "care_cards",
    "care_handoffs", "medication_doses", "medication_plans", "outcomes",
    "vet_briefs", "triage_assessments", "observations",
    "clinical_intake_steps", "health_events", "behavior_events",
    "care_tasks", "consents", "emergency_profiles", "grants",
    "relationships", "invitations", "artifacts", "life_events", "pets",
    "household_members", "households", "ai_inference_logs", "audit_entries",
    "users",
]


@pytest.fixture(autouse=True)
def _wipe_between_tests():
    from app.core.db import get_session_factory
    from sqlalchemy import text

    yield
    factory = get_session_factory()

    async def wipe():
        async with factory() as db:
            for t in WIPE_TABLES:
                await db.execute(text(f'DELETE FROM "{t}"'))
            await db.commit()

    asyncio.run(wipe())


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
async def seeded():
    from app.seed import seed

    return await seed()
