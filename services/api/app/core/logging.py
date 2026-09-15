"""Structured logging.

Production (json_logs_enabled=True) uses structlog JSON formatter so logs can
be aggregated. Dev keeps readable console output. Never logs bodies/tokens/
full medical content (handled at call sites; access log already excludes them).
"""

import logging
import sys

import structlog

from app.core.config import Settings


def configure_logging(settings: Settings) -> None:
    level = getattr(logging, (settings.log_level or "INFO").upper(), logging.INFO)

    if settings.json_logs_enabled:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(level),
            cache_logger_on_first_use=True,
        )
        root = logging.getLogger()
        root.setLevel(level)
    else:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S"),
                structlog.dev.ConsoleRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(level),
            cache_logger_on_first_use=True,
        )
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        root = logging.getLogger()
        root.handlers.clear()
        root.addHandler(handler)
        root.setLevel(level)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
