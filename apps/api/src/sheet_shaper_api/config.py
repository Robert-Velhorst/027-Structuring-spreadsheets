from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SS_", env_file=".env", extra="ignore")

    data_dir: Path = Field(default_factory=lambda: Path.home() / "AppData" / "Local" / "SheetShaper")
    host: str = "127.0.0.1"
    port: int = 8765
    public_mode: bool = False
    api_token: str = ""
    allowed_origins: str = "http://127.0.0.1:8765,http://localhost:8765"
    max_upload_mb: int = 25
    max_cells: int = 250_000
    max_audit_events: int = 10_000
    preview_ttl_seconds: int = 600
    hai_mutations_enabled: bool = False
    web_dist: Path | None = None
    workers: int = 1

    @field_validator("host")
    @classmethod
    def safe_host(cls, value: str) -> str:
        if value in {"0.0.0.0", "::"}:
            raise ValueError("Sheet Shaper must bind to loopback; use ngrok for public access")
        if value not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("SS_HOST must be a loopback address")
        return value

    @field_validator("max_upload_mb")
    @classmethod
    def bounded_upload(cls, value: int) -> int:
        if value < 1 or value > 100:
            raise ValueError("SS_MAX_UPLOAD_MB must be between 1 and 100")
        return value

    @field_validator("workers")
    @classmethod
    def single_worker(cls, value: int) -> int:
        if value != 1:
            raise ValueError("SS_WORKERS must remain 1 so document write locks stay process-safe")
        return value

    @field_validator("max_audit_events")
    @classmethod
    def bounded_audit_retention(cls, value: int) -> int:
        if value < 1_000 or value > 1_000_000:
            raise ValueError("SS_MAX_AUDIT_EVENTS must be between 1,000 and 1,000,000")
        return value

    @model_validator(mode="after")
    def public_security(self) -> "Settings":
        if self.public_mode and len(self.api_token.encode("utf-8")) < 32:
            raise ValueError("Public mode requires SS_API_TOKEN with at least 32 UTF-8 bytes")
        if self.hai_mutations_enabled and len(self.api_token.encode("utf-8")) < 32:
            raise ValueError("HAI mutations require a strong SS_API_TOKEN")
        return self

    @property
    def origin_list(self) -> list[str]:
        return [item.strip().rstrip("/") for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def database_path(self) -> Path:
        return self.data_dir / "sheet-shaper.sqlite3"

    @property
    def files_dir(self) -> Path:
        return self.data_dir / "files"

    def token_matches(self, candidate: str) -> bool:
        return bool(self.api_token) and secrets.compare_digest(self.api_token, candidate)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
