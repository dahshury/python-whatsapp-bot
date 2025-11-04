"""Database backup services backed by the aws_s3 extension."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import cast
from urllib.parse import urlparse

from sqlalchemy import Engine, Integer, String, text
from sqlalchemy.engine import CursorResult


def _normalize_database_url(raw_url: str) -> str:
    replacements = (
        ("postgresql+psycopg://", "postgresql://"),
        ("postgresql+asyncpg://", "postgresql://"),
        ("postgresql+psycopgbinary://", "postgresql://"),
    )

    normalized = raw_url
    for needle, replacement in replacements:
        if normalized.startswith(needle):
            normalized = normalized.replace(needle, replacement, 1)
            break
    return normalized


@dataclass(frozen=True)
class S3BackupConfig:
    """Immutable configuration for database backups."""

    database_url: str
    bucket: str
    prefix: str
    region: str | None
    access_key: str | None
    secret_key: str | None
    session_token: str | None
    sse_algorithm: str | None
    kms_key_id: str | None
    endpoint_url: str | None
    pg_dump_options: str | None
    compression: str = "gzip"

    def build_object_key(self, timestamp: datetime) -> str:
        database_name = self.database_name
        sanitized_prefix = self.prefix.strip("/") if self.prefix else ""
        suffix = ".sql.gz" if self.compression and self.compression.lower() == "gzip" else ".sql"
        stamp = timestamp.strftime("%Y-%m-%d_%H-%M-%S")
        parts = [part for part in (sanitized_prefix, f"pgdump_{database_name}_{stamp}{suffix}") if part]
        return "/".join(parts)

    @property
    def normalized_database_url(self) -> str:
        return _normalize_database_url(self.database_url)

    @property
    def database_name(self) -> str:
        parsed = urlparse(self.normalized_database_url)
        name = parsed.path.lstrip("/") or "postgres"
        return name.replace("-", "_")


@dataclass(frozen=True)
class DatabaseBackupResult:
    object_key: str
    bytes_uploaded: int
    compression: str
    started_at: datetime
    completed_at: datetime


class S3DatabaseBackupService:
    """Coordinates database backups via the aws_s3 extension."""

    def __init__(self, engine: Engine, logger: logging.Logger | None = None) -> None:
        self._engine = engine
        self._logger = logger or logging.getLogger(__name__)

    def perform_backup(self, config: S3BackupConfig) -> DatabaseBackupResult:
        started_at = datetime.now(timezone.utc)
        object_key = config.build_object_key(started_at)

        params = {
            "database_url": config.normalized_database_url,
            "bucket": config.bucket,
            "object_key": object_key,
            "region": config.region,
            "access_key": config.access_key,
            "secret_key": config.secret_key,
            "session_token": config.session_token,
            "sse_algorithm": config.sse_algorithm,
            "kms_key_id": config.kms_key_id,
            "endpoint_url": config.endpoint_url,
            "pg_dump_options": config.pg_dump_options,
            "compression": config.compression,
        }

        self._logger.info(
            "Starting S3 backup via aws_s3.pg_dump_to_s3",
            extra={
                "bucket": config.bucket,
                "object_key": object_key,
                "region": config.region,
            },
        )

        statement = text(
            "SELECT * FROM aws_s3.pg_dump_to_s3("
            " :database_url, :bucket, :object_key, :region, :access_key, :secret_key, :session_token,"
            " :sse_algorithm, :kms_key_id, :endpoint_url, :pg_dump_options, :compression)"
        ).columns(
            bytes_uploaded=Integer,
            compression_used=String,
            object_key=String,
        )

        with self._engine.connect() as connection:
            result = cast(
                CursorResult[tuple[int, str | None, str]],
                connection.execute(statement, params),
            )
            raw_row = result.fetchone()

        if raw_row is None:
            raise RuntimeError("aws_s3.pg_dump_to_s3 did not return any rows")

        bytes_uploaded, compression_raw, stored_key = cast(
            tuple[int, str | None, str], tuple(raw_row)
        )
        compression_used = compression_raw or "none"

        completed_at = datetime.now(timezone.utc)

        self._logger.info(
            "Database backup uploaded to S3",
            extra={
                "bucket": config.bucket,
                "object_key": stored_key,
                "bytes_uploaded": bytes_uploaded,
                "compression": compression_used,
            },
        )

        return DatabaseBackupResult(
            object_key=stored_key,
            bytes_uploaded=bytes_uploaded,
            compression=compression_used,
            started_at=started_at,
            completed_at=completed_at,
        )


def build_config_from_environment(env: dict[str, str] | None = None) -> S3BackupConfig | None:
    data = env or os.environ

    bucket = data.get("S3_BUCKET")
    if not bucket:
        return None

    database_url = data.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set to use S3 backups")

    prefix = data.get("S3_PREFIX", "backups/happybot_pg_backups")
    region = data.get("AWS_REGION") or data.get("AWS_DEFAULT_REGION")

    return S3BackupConfig(
        database_url=database_url,
        bucket=bucket,
        prefix=prefix,
        region=region,
        access_key=data.get("AWS_ACCESS_KEY_ID"),
        secret_key=data.get("AWS_SECRET_ACCESS_KEY"),
        session_token=data.get("AWS_SESSION_TOKEN"),
        sse_algorithm=data.get("S3_SSE"),
        kms_key_id=data.get("S3_SSE_KMS_KEY_ID"),
        endpoint_url=data.get("S3_ENDPOINT_URL"),
        pg_dump_options=data.get("PG_DUMP_OPTIONS"),
        compression=data.get("PG_DUMP_COMPRESSION", "gzip"),
    )

