"""Manual trigger for the S3 database backup pipeline."""

from __future__ import annotations

import logging
import os
import sys
import traceback
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

from app.db import DATABASE_URL, engine
from app.services.backup import S3BackupConfig, S3DatabaseBackupService, build_config_from_environment


@dataclass
class StepLogger:
    """Friendly step-by-step reporter for CLI usage."""

    theme: str = "cyan"
    _step: int = 0

    def _timestamp(self) -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def heading(self, message: str) -> None:
        self._step += 1
        print(f"\n[{self._timestamp()}] ▶ Step {self._step}: {message}")

    def detail(self, message: str) -> None:
        print(f"    • {message}")

    def success(self, message: str) -> None:
        print(f"\n[{self._timestamp()}] ✅ {message}\n")

    def failure(self, message: str) -> None:
        print(f"\n[{self._timestamp()}] ❌ {message}\n")


def _summarize_config(config: S3BackupConfig) -> Iterable[str]:
    yield f"Bucket: {config.bucket}"
    yield f"Prefix: {config.prefix or '<root>'}"
    yield f"Region: {config.region or 'default via AWS SDK'}"
    yield f"Compression: {config.compression}"
    if config.pg_dump_options:
        yield f"pg_dump options: {config.pg_dump_options}"
    if config.endpoint_url:
        yield f"Custom endpoint: {config.endpoint_url}"


def main() -> int:
    logger = StepLogger()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    logger.heading("Loading environment variables")
    env = dict(os.environ)
    if "DATABASE_URL" not in env:
        env["DATABASE_URL"] = DATABASE_URL
        logger.detail("DATABASE_URL not set in environment — using value from app.db")

    logger.heading("Building S3 backup configuration")
    try:
        config = build_config_from_environment(env)
    except Exception as exc:  # noqa: BLE001
        logger.failure(f"Failed to build backup configuration: {exc}")
        print(traceback.format_exc())
        return 2

    if config is None:
        logger.failure(
            "S3 bucket configuration is missing. Set S3_BUCKET (and optional S3_PREFIX / AWS_REGION) before running."
        )
        return 3

    for line in _summarize_config(config):
        logger.detail(line)

    logger.heading("Triggering aws_s3.pg_dump_to_s3")
    service = S3DatabaseBackupService(engine, logging.getLogger("app.manual_backup"))

    try:
        result = service.perform_backup(config)
    except Exception as exc:  # noqa: BLE001
        logger.failure(f"Database backup failed: {exc}")
        print(traceback.format_exc())
        return 4
    finally:
        engine.dispose()

    duration = result.completed_at - result.started_at
    logger.success("Database backup completed successfully")
    logger.detail(f"Object key: {result.object_key}")
    logger.detail(f"Bytes uploaded: {result.bytes_uploaded:,}")
    logger.detail(f"Compression: {result.compression}")
    logger.detail(f"Duration: {duration}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

