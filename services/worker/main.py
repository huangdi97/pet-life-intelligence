"""PLI standalone worker process.

Jobs (durable state in PostgreSQL, PLI-010/011/037/060):
- expire grants past expires_at (grant.expired event + notification)
- end care handoffs past end_at (grant revoked + care.handoff_ended)
- mark missed medication doses (medication.missed + notification)

Run:  .venv/Scripts/python.exe services/worker/main.py --loop 60
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "api"))


async def loop_forever(interval_seconds: int) -> None:
    from app.worker_jobs import run_once

    while True:
        try:
            result = await run_once()
            if any(result.values()):
                print(f"[worker] {datetime.now(timezone.utc).isoformat()} {result}")
        except Exception as exc:  # noqa: BLE001
            print(f"[worker] error: {type(exc).__name__}: {exc}")
        await asyncio.sleep(interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop", type=int, default=60,
                        help="poll interval seconds; 0 = run once and exit")
    args = parser.parse_args()
    from app.worker_jobs import run_once

    if args.loop <= 0:
        print(asyncio.run(run_once()))
    else:
        asyncio.run(loop_forever(args.loop))


if __name__ == "__main__":
    main()
