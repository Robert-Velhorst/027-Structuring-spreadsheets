from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class OperationSpec(BaseModel):
    type: str
    options: dict[str, Any] = Field(default_factory=dict)


class PreviewRequest(BaseModel):
    range: str = ""
    hasHeader: bool = True
    operations: list[OperationSpec] = Field(min_length=1, max_length=8)


class ApplyRequest(BaseModel):
    previewToken: str = Field(min_length=8, max_length=100)
    acknowledged: bool
    idempotencyKey: str = Field(min_length=8, max_length=100)

    @field_validator("acknowledged")
    @classmethod
    def acknowledged_true(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("The preview acknowledgement is required")
        return value


class WindowQuery(BaseModel):
    row: int = Field(default=1, ge=1)
    column: int = Field(default=1, ge=1)
    rows: int = Field(default=100, ge=1, le=200)
    columns: int = Field(default=30, ge=1, le=50)
