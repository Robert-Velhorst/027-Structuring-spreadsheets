import pytest

from sheet_shaper_api.engine import EngineError, Table, apply_pipeline, difference, quality


def request(*operations, has_header=True):
    return {"hasHeader": has_header, "operations": [{"type": operation, "options": {}} for operation in operations]}


def test_pipeline_preserves_header_and_improves_quality():
    source = Table([["Name", "City"], [" Ada  ", " New   York "], [" Ada  ", " New   York "]])
    result = apply_pipeline(source, request("smart_trim", "remove_duplicates"))
    assert result.rows == [["Name", "City"], ["Ada", "New York"]]
    assert quality(result)["score"] > quality(source)["score"]
    assert difference(source, result)["changedCells"] >= 3


def test_shape_change_fails_closed_when_formulas_exist():
    source = Table([["Name", "Total"], ["Ada", "=SUM(A1:A1)"]], frozenset({(1, 1)}))
    with pytest.raises(EngineError, match="formulas") as error:
        apply_pipeline(source, request("remove_duplicates"))
    assert error.value.code == "FORMULA_SHAPE_CHANGE"


def test_sort_keeps_empty_values_last_in_both_directions():
    source = Table([["Name"], ["b"], [""], ["a"]])
    ascending = apply_pipeline(source, {"hasHeader": True, "operations": [{"type": "sort_rows", "options": {"column": 0, "direction": "asc"}}]})
    descending = apply_pipeline(source, {"hasHeader": True, "operations": [{"type": "sort_rows", "options": {"column": 0, "direction": "desc"}}]})
    assert ascending.rows == [["Name"], ["a"], ["b"], [""]]
    assert descending.rows == [["Name"], ["b"], ["a"], [""]]


def test_split_handles_missing_target_cells_without_crashing():
    source = Table([["A"], ["x"]])
    result = apply_pipeline(source, {"hasHeader": True, "operations": [{"type": "split_text", "options": {"column": 4, "delimiter": ","}}]})
    assert result.height == 2
