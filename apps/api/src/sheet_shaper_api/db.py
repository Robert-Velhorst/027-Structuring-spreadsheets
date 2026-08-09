from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SCHEMA_VERSION = 1

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        media_type TEXT NOT NULL,
        current_version_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('SOURCE','BACKUP','RESULT','RESTORED')),
        file_path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        rows INTEGER NOT NULL,
        columns INTEGER NOT NULL,
        created_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS previews (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_id TEXT NOT NULL REFERENCES versions(id),
        owner TEXT NOT NULL,
        request_json TEXT NOT NULL,
        input_digest TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        preview_id TEXT REFERENCES previews(id),
        owner TEXT NOT NULL,
        before_version_id TEXT NOT NULL REFERENCES versions(id),
        after_version_id TEXT REFERENCES versions(id),
        backup_version_id TEXT NOT NULL REFERENCES versions(id),
        status TEXT NOT NULL CHECK (status IN ('APPLYING','APPLIED','FAILED','RESTORED')),
        summary_json TEXT NOT NULL,
        validation_json TEXT,
        error_code TEXT,
        idempotency_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(owner, idempotency_key)
    )""",
    """CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        event TEXT NOT NULL,
        document_id TEXT,
        operation_id TEXT,
        outcome TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )""",
    "CREATE INDEX IF NOT EXISTS idx_documents_owner_updated ON documents(owner, updated_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_versions_document_created ON versions(document_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_previews_owner_expiry ON previews(owner, expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_operations_owner_created ON operations(owner, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_operations_document_created ON operations(document_id, created_at DESC)",
]


class Database:
    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as connection:
            for statement in SCHEMA:
                connection.execute(statement)
            connection.execute(
                "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, datetime('now'))",
                (SCHEMA_VERSION,),
            )
            connection.execute("PRAGMA optimize")

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=5, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA busy_timeout = 5000")
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
                connection.execute("COMMIT")
            except Exception:
                connection.execute("ROLLBACK")
                raise
