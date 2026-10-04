"""Compute summary statistics, data-quality info and chart data for a DataFrame."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

TOP_N = 10
BINS = 20


def to_json(value: Any) -> Any:
    """Convert numpy/pandas scalars into JSON-safe Python values."""
    if value is None or value is pd.NaT:
        return None
    if isinstance(value, (pd.Timestamp, np.datetime64)):
        ts = pd.Timestamp(value)
        return None if pd.isna(ts) else ts.isoformat()
    if isinstance(value, pd.Timedelta):
        return str(value)
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def column_kind(s: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(s):
        return "boolean"
    if pd.api.types.is_numeric_dtype(s):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(s):
        return "datetime"
    non_null = s.dropna()
    if non_null.empty:
        return "categorical"
    unique = non_null.nunique()
    if unique <= 50 or unique / len(non_null) < 0.5:
        return "categorical"
    return "text"


def _top_values(s: pd.Series) -> list[dict]:
    counts = s.dropna().astype(str).value_counts()
    top = [{"value": str(k), "count": int(v)} for k, v in counts.head(TOP_N).items()]
    rest = int(counts.iloc[TOP_N:].sum())
    if rest:
        top.append({"value": f"Other ({len(counts) - TOP_N})", "count": rest, "other": True})
    return top


def _numeric(s: pd.Series) -> dict:
    values = s.dropna().astype(float)
    values = values[np.isfinite(values)]
    if values.empty:
        return {"stats": {}, "histogram": []}
    q = values.quantile([0.25, 0.5, 0.75])
    stats = {
        "mean": values.mean(),
        "std": values.std(),
        "min": values.min(),
        "p25": q[0.25],
        "median": q[0.5],
        "p75": q[0.75],
        "max": values.max(),
        "sum": values.sum(),
        "zeros": int((values == 0).sum()),
        "negatives": int((values < 0).sum()),
    }
    unique = values.nunique()
    if unique <= BINS:
        # Few distinct values: one bar per value reads better than bins.
        counts = values.value_counts().sort_index()
        histogram = [{"label": _fmt(v), "start": v, "end": v, "count": int(c)} for v, c in counts.items()]
    else:
        counts, edges = np.histogram(values, bins=BINS)
        histogram = [
            {"label": _fmt(edges[i]), "start": edges[i], "end": edges[i + 1], "count": int(counts[i])}
            for i in range(len(counts))
        ]
    return {
        "stats": {k: to_json(v) for k, v in stats.items()},
        "histogram": [{k: to_json(v) for k, v in b.items()} for b in histogram],
    }


def _fmt(x: float) -> str:
    x = float(x)
    if x.is_integer() and abs(x) < 1e15:
        return str(int(x))
    return f"{x:.4g}"


def _datetime(s: pd.Series) -> dict:
    values = s.dropna()
    if values.empty:
        return {"stats": {}, "timeline": []}
    if values.dt.tz is not None:
        values = values.dt.tz_localize(None)
    span = values.max() - values.min()
    if span <= pd.Timedelta(days=3):
        freq, fmt = "h", "%Y-%m-%d %H:00"
    elif span <= pd.Timedelta(days=120):
        freq, fmt = "D", "%Y-%m-%d"
    elif span <= pd.Timedelta(days=365 * 6):
        freq, fmt = "M", "%Y-%m"
    else:
        freq, fmt = "Y", "%Y"
    counts = values.dt.to_period(freq).value_counts().sort_index()
    timeline = [{"label": p.start_time.strftime(fmt), "count": int(c)} for p, c in counts.items()]
    return {
        "stats": {"min": to_json(values.min()), "max": to_json(values.max()), "range_days": span.days},
        "timeline": timeline,
    }


def profile_column(s: pd.Series) -> dict:
    n = len(s)
    missing = int(s.isna().sum())
    kind = column_kind(s)
    try:
        unique = int(s.nunique(dropna=True))
    except TypeError:
        unique = int(s.astype(str).nunique(dropna=True))
    info: dict[str, Any] = {
        "name": s.name,
        "dtype": str(s.dtype),
        "kind": kind,
        "count": n - missing,
        "missing": missing,
        "missing_pct": (missing / n * 100) if n else 0.0,
        "unique": unique,
        "unique_pct": (unique / (n - missing) * 100) if n - missing else 0.0,
        "samples": [to_json(v) for v in s.dropna().unique()[:5]],
    }
    if kind == "numeric":
        info.update(_numeric(s))
    elif kind == "datetime":
        info.update(_datetime(s))
    else:
        info["top_values"] = _top_values(s)
        if kind == "text":
            lengths = s.dropna().astype(str).str.len()
            info["stats"] = {
                "min_length": int(lengths.min()),
                "mean_length": float(lengths.mean()),
                "max_length": int(lengths.max()),
            }
    return info


def profile(df: pd.DataFrame) -> dict:
    rows, cols = df.shape
    cells = rows * cols
    missing = int(df.isna().sum().sum())
    try:
        duplicates = int(df.duplicated().sum())
    except TypeError:
        duplicates = int(df.astype(str).duplicated().sum())
    columns = [profile_column(df[c]) for c in df.columns]
    kinds: dict[str, int] = {}
    for c in columns:
        kinds[c["kind"]] = kinds.get(c["kind"], 0) + 1
    return {
        "rows": rows,
        "columns": cols,
        "cells": cells,
        "missing_cells": missing,
        "missing_pct": (missing / cells * 100) if cells else 0.0,
        "duplicate_rows": duplicates,
        "memory_bytes": int(df.memory_usage(deep=True).sum()),
        "kinds": kinds,
        "column_profiles": columns,
    }
