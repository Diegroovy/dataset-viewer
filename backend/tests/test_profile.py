import json

import numpy as np
import pandas as pd
import pytest

from app.profile import TOP_N, column_kind, profile, profile_column, to_json


def by_name(result: dict) -> dict:
    return {c["name"]: c for c in result["column_profiles"]}


def test_dataset_summary_counts():
    df = pd.DataFrame(
        {
            "num": [1.0, 2.0, None, 2.0],
            "cat": ["a", "b", "c", "b"],
        }
    )
    result = profile(df)

    assert result["rows"] == 4
    assert result["columns"] == 2
    assert result["cells"] == 8
    assert result["missing_cells"] == 1
    assert result["missing_pct"] == pytest.approx(12.5)
    assert result["duplicate_rows"] == 1  # row 3 repeats row 1


@pytest.mark.parametrize(
    "series, kind",
    [
        (pd.Series([1, 2, 3]), "numeric"),
        (pd.Series([1.5, None, 2.5]), "numeric"),
        (pd.Series([True, False, True]), "boolean"),
        (pd.Series(pd.to_datetime(["2025-01-01", "2025-02-01"])), "datetime"),
        (pd.Series(["x", "y", "x"]), "categorical"),
        (pd.Series([f"free text {i}" for i in range(100)]), "text"),
        (pd.Series([None, None], dtype=object), "categorical"),
    ],
)
def test_column_kind(series, kind):
    assert column_kind(series) == kind


def test_numeric_stats_match_pandas():
    rng = np.random.default_rng(0)
    s = pd.Series(rng.normal(50, 10, 500), name="value")
    s[::25] = np.nan

    col = profile_column(s)
    stats = col["stats"]

    assert col["missing"] == s.isna().sum()
    assert stats["mean"] == pytest.approx(s.mean())
    assert stats["std"] == pytest.approx(s.std())
    assert stats["median"] == pytest.approx(s.median())
    assert stats["min"] == pytest.approx(s.min())
    assert stats["max"] == pytest.approx(s.max())
    assert sum(b["count"] for b in col["histogram"]) == s.notna().sum()


def test_histogram_uses_one_bar_per_value_when_few_distinct():
    col = profile_column(pd.Series([1, 1, 2, 3], name="n"))

    assert [(b["label"], b["count"]) for b in col["histogram"]] == [("1", 2), ("2", 1), ("3", 1)]


def test_top_values_groups_the_rest_as_other():
    values = [f"cat{i}" for i in range(15) for _ in range(15 - i)]  # cat0 most frequent
    col = profile_column(pd.Series(values, name="c"))
    top = col["top_values"]

    assert len(top) == TOP_N + 1
    assert top[0] == {"value": "cat0", "count": 15}
    assert top[-1]["other"] is True
    assert sum(t["count"] for t in top) == len(values)


def test_datetime_timeline_covers_all_values():
    s = pd.Series(pd.date_range("2025-01-01", periods=30, freq="D"), name="d")
    col = profile_column(s)

    assert col["stats"]["min"] == "2025-01-01T00:00:00"
    assert col["stats"]["range_days"] == 29
    assert sum(t["count"] for t in col["timeline"]) == 30


def test_empty_columns_do_not_crash():
    df = pd.DataFrame({"all_nan": [np.nan, np.nan], "all_none": pd.Series([None, None], dtype=object)})
    cols = by_name(profile(df))

    assert cols["all_nan"]["count"] == 0
    assert cols["all_nan"]["histogram"] == []
    assert cols["all_none"]["top_values"] == []


def test_output_is_strict_json():
    df = pd.DataFrame(
        {
            "x": [1.0, np.nan, np.inf, -np.inf],
            "when": pd.to_datetime(["2025-01-01", None, "2025-01-03", "2025-01-04"]),
            "s": ["a", None, "b", "c"],
        }
    )
    # allow_nan=False raises if any NaN/Infinity slipped through.
    json.dumps(profile(df), allow_nan=False)


@pytest.mark.parametrize(
    "value, expected",
    [
        (np.int64(3), 3),
        (np.float64(1.5), 1.5),
        (float("nan"), None),
        (float("inf"), None),
        (pd.NaT, None),
        (pd.Timestamp("2025-01-02"), "2025-01-02T00:00:00"),
        (np.bool_(True), True),
    ],
)
def test_to_json(value, expected):
    assert to_json(value) == expected
