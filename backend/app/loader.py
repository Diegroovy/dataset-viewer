"""Discover and read dataset files from the data/ folder."""

from __future__ import annotations

import csv
import io
from pathlib import Path

import pandas as pd

DATA_DIR = (Path(__file__).resolve().parents[2] / "data").resolve()
SUPPORTED = {".csv", ".xlsx"}

# (path, mtime_ns, sheet) -> DataFrame, least recently used first.
# Entries for deleted or modified files are dropped, and at most MAX_CACHED are kept.
MAX_CACHED = 8
_cache: dict[tuple[str, int, str | None], pd.DataFrame] = {}


def _prune_cache() -> None:
    for key in list(_cache):
        path = Path(key[0])
        if not path.exists() or path.stat().st_mtime_ns != key[1]:
            del _cache[key]
    while len(_cache) > MAX_CACHED:
        del _cache[next(iter(_cache))]


def is_dataset(path: Path) -> bool:
    return (
        path.is_file()
        and path.suffix.lower() in SUPPORTED
        and not path.name.startswith(("~$", "."))
    )


def list_datasets() -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    files = [p for p in DATA_DIR.iterdir() if is_dataset(p)]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return [
        {
            "name": p.name,
            "ext": p.suffix.lower().lstrip("."),
            "size": p.stat().st_size,
            "modified": p.stat().st_mtime,
        }
        for p in files
    ]


def resolve(name: str) -> Path:
    path = (DATA_DIR / name).resolve()
    if path.parent != DATA_DIR or not is_dataset(path):
        raise FileNotFoundError(name)
    return path


def sheet_names(name: str) -> list[str]:
    path = resolve(name)
    if path.suffix.lower() != ".xlsx":
        return []
    with pd.ExcelFile(path, engine="openpyxl") as xl:
        return [str(s) for s in xl.sheet_names]


def _read_csv(path: Path) -> pd.DataFrame:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    try:
        sep = csv.Sniffer().sniff(text[:20000], delimiters=",;\t|").delimiter
    except csv.Error:
        sep = ","
    return pd.read_csv(io.StringIO(text), sep=sep)


def _parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Convert text columns that look like dates into datetimes."""
    for col in df.columns:
        s = df[col]
        if not (pd.api.types.is_object_dtype(s) or pd.api.types.is_string_dtype(s)):
            continue
        sample = s.dropna().astype(str).head(200)
        if sample.empty or not sample.str.contains(r"\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}").all():
            continue
        parsed = pd.to_datetime(s, errors="coerce", format="mixed")
        if parsed.notna().sum() >= 0.9 * s.notna().sum():
            df[col] = parsed
    return df


def load(name: str, sheet: str | None = None) -> pd.DataFrame:
    path = resolve(name)
    is_excel = path.suffix.lower() == ".xlsx"
    if is_excel and not sheet:
        sheets = sheet_names(name)
        sheet = sheets[0] if sheets else None
    key = (str(path), path.stat().st_mtime_ns, sheet if is_excel else None)
    if key in _cache:
        _cache[key] = _cache.pop(key)  # mark as most recently used
        return _cache[key]

    if is_excel:
        df = pd.read_excel(path, sheet_name=sheet, engine="openpyxl")
    else:
        df = _read_csv(path)
    df.columns = [str(c) for c in df.columns]
    df = _parse_dates(df)

    _cache[key] = df
    _prune_cache()
    return df
