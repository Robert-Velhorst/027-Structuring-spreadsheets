from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any


MAX_OPERATIONS = 8
OPERATION_RISK = {
    "smart_trim": "LOW",
    "remove_duplicates": "MEDIUM",
    "uppercase": "LOW",
    "lowercase": "LOW",
    "title_case": "LOW",
    "sentence_case": "LOW",
    "remove_empty_rows": "MEDIUM",
    "remove_empty_columns": "MEDIUM",
    "split_text": "HIGH",
    "sort_rows": "MEDIUM",
}
SHAPE_CHANGING = {"remove_duplicates", "remove_empty_rows", "remove_empty_columns", "split_text", "sort_rows"}


class EngineError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Table:
    rows: list[list[Any]]
    formulas: frozenset[tuple[int, int]] = frozenset()

    @property
    def height(self) -> int:
        return len(self.rows)

    @property
    def width(self) -> int:
        return max((len(row) for row in self.rows), default=0)

    def rectangular(self) -> "Table":
        width = self.width
        return Table([row + [""] * (width - len(row)) for row in self.rows], self.formulas)


def normalize_request(request: dict[str, Any]) -> dict[str, Any]:
    operations = request.get("operations") or []
    if not isinstance(operations, list) or not operations:
        raise EngineError("INVALID_OPERATION", "Choose at least one operation.")
    if len(operations) > MAX_OPERATIONS:
        raise EngineError("TOO_MANY_OPERATIONS", f"A batch can contain at most {MAX_OPERATIONS} operations.")
    normalized = []
    for item in operations:
        if not isinstance(item, dict) or item.get("type") not in OPERATION_RISK:
            raise EngineError("INVALID_OPERATION", f"Unsupported operation: {item.get('type') if isinstance(item, dict) else 'unknown'}")
        op_type = item["type"]
        options = item.get("options") if isinstance(item.get("options"), dict) else {}
        clean: dict[str, Any] = {}
        columns = options.get("columns", [])
        if isinstance(columns, list):
            clean["columns"] = sorted({value for value in columns if isinstance(value, int) and value >= 0})
        if op_type in {"split_text", "sort_rows"}:
            clean["column"] = max(0, int(options.get("column", 0)))
        if op_type == "split_text":
            delimiter = str(options.get("delimiter", ","))
            if not delimiter or len(delimiter) > 20:
                raise EngineError("INVALID_DELIMITER", "The delimiter must contain 1 to 20 characters.")
            clean.update(delimiter=delimiter, keepOriginal=options.get("keepOriginal") is True, maxParts=min(max(int(options.get("maxParts", 20)), 2), 50))
        if op_type == "sort_rows":
            clean["direction"] = "desc" if options.get("direction") == "desc" else "asc"
        normalized.append({"type": op_type, "options": clean})
    return {"hasHeader": request.get("hasHeader") is not False, "range": str(request.get("range") or "").upper(), "operations": normalized}


def _empty(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _cell_key(value: Any, formula: bool) -> str:
    if formula:
        return "f:" + str(value)
    return "v:" + json.dumps(value, default=str, sort_keys=True, ensure_ascii=False)


def _row_key(row: list[Any], formula_positions: frozenset[tuple[int, int]], row_index: int) -> str:
    return "\u001f".join(_cell_key(value, (row_index, column) in formula_positions) for column, value in enumerate(row))


def apply_pipeline(table: Table, request: dict[str, Any]) -> Table:
    normalized = normalize_request(request)
    if table.formulas and any(item["type"] in SHAPE_CHANGING for item in normalized["operations"]):
        raise EngineError("FORMULA_SHAPE_CHANGE", "Shape-changing operations are blocked when the target contains formulas.")
    result = table.rectangular()
    for operation in normalized["operations"]:
        result = apply_operation(result, operation, normalized["hasHeader"])
    return result.rectangular()


def apply_operation(table: Table, operation: dict[str, Any], has_header: bool) -> Table:
    rows = [list(row) for row in table.rows]
    formulas = set(table.formulas)
    op_type, options = operation["type"], operation["options"]
    targets = options.get("columns") or list(range(table.width))
    start = 1 if has_header else 0
    if op_type in {"smart_trim", "uppercase", "lowercase", "title_case", "sentence_case"}:
        for r, row in enumerate(rows):
            if r < start:
                continue
            for c in targets:
                if c >= len(row) or (r, c) in formulas or not isinstance(row[c], str):
                    continue
                value = row[c]
                if op_type == "smart_trim": value = re.sub(r"\s+", " ", value.strip())
                elif op_type == "uppercase": value = value.upper()
                elif op_type == "lowercase": value = value.lower()
                elif op_type == "title_case": value = value.title()
                elif op_type == "sentence_case": value = value[:1].upper() + value[1:].lower() if value else value
                row[c] = value
    elif op_type == "remove_duplicates":
        output, seen = rows[:start], set()
        for r, row in enumerate(rows[start:], start):
            key = _row_key(row, table.formulas, r)
            if key not in seen:
                output.append(row); seen.add(key)
        rows = output
    elif op_type == "remove_empty_rows":
        rows = rows[:start] + [row for row in rows[start:] if any(not _empty(value) for value in row)]
    elif op_type == "remove_empty_columns":
        keep = [c for c in range(table.width) if any(not _empty(rows[r][c]) for r in range(start, len(rows)))]
        rows = [[row[c] for c in keep] for row in rows]
    elif op_type == "split_text":
        column, delimiter = options["column"], options["delimiter"]
        max_parts = options["maxParts"]
        split_rows, widest = [], 1
        for r, row in enumerate(rows):
            value = row[column] if column < len(row) else ""
            parts = [str(value)] if r < start else str(value or "").split(delimiter, max_parts - 1)
            widest = max(widest, len(parts)); split_rows.append((row, parts))
        output = []
        for row, parts in split_rows:
            parts += [""] * (widest - len(parts))
            output.append(row[:column] + ([row[column]] if options["keepOriginal"] else []) + parts + row[column + 1:])
        rows = output
    elif op_type == "sort_rows":
        column = options["column"]
        def key(row: list[Any]) -> tuple[int, str]:
            value = row[column] if column < len(row) else ""
            return (1 if _empty(value) else 0, str(value).casefold())
        populated = [row for row in rows[start:] if not _empty(row[column] if column < len(row) else "")]
        empty_rows = [row for row in rows[start:] if _empty(row[column] if column < len(row) else "")]
        rows = rows[:start] + sorted(populated, key=key, reverse=options["direction"] == "desc") + empty_rows
    return Table(rows, frozenset(formulas if op_type not in SHAPE_CHANGING else set()))


def quality(table: Table, has_header: bool = True) -> dict[str, Any]:
    rectangular = table.rectangular(); start = 1 if has_header else 0; body = rectangular.rows[start:]
    total = len(body) * rectangular.width; empty = whitespace = duplicates = 0; seen: set[str] = set(); types = [set() for _ in range(rectangular.width)]
    for r, row in enumerate(body, start):
        key = _row_key(row, rectangular.formulas, r)
        if key in seen: duplicates += 1
        seen.add(key)
        for c, value in enumerate(row):
            if _empty(value): empty += 1; continue
            if isinstance(value, str) and (r, c) not in rectangular.formulas and value.strip() != value: whitespace += 1
            types[c].add("formula" if (r, c) in rectangular.formulas else type(value).__name__)
    mixed = sum(1 for values in types if len(values) > 1)
    penalty = min(55, round(empty / total * 35) if total else 0) + min(20, whitespace) + min(15, duplicates * 3) + min(10, mixed * 2)
    return {"score": max(0, 100 - penalty), "confidence": "HIGH" if total >= 100 else "MEDIUM" if total >= 20 else "LOW", "totalCells": total, "emptyCells": empty, "whitespaceIssues": whitespace, "duplicateRows": duplicates, "mixedTypeColumns": mixed}


def digest(table: Table) -> str:
    rectangular = table.rectangular()
    canonical = [[_cell_key(value, (r, c) in rectangular.formulas) for c, value in enumerate(row)] for r, row in enumerate(rectangular.rows)]
    return hashlib.sha256(json.dumps(canonical, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def difference(before: Table, after: Table, limit: int = 20) -> dict[str, Any]:
    a, b = before.rectangular(), after.rectangular(); height = max(a.height, b.height); width = max(a.width, b.width); changed = 0; examples = []
    for r in range(height):
        for c in range(width):
            old = a.rows[r][c] if r < a.height and c < a.width else ""; new = b.rows[r][c] if r < b.height and c < b.width else ""
            if _cell_key(old, (r, c) in a.formulas) != _cell_key(new, (r, c) in b.formulas):
                changed += 1
                if len(examples) < limit: examples.append({"row": r + 1, "column": c + 1, "before": str(old)[:80], "after": str(new)[:80]})
    risks = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}; risk = "LOW"
    return {"changedCells": changed, "examples": examples, "beforeRows": a.height, "beforeColumns": a.width, "afterRows": b.height, "afterColumns": b.width, "risk": risk, "backupRequired": True}
