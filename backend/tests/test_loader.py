import os

import pandas as pd
import pytest

from app import loader


def test_lists_only_supported_files(data_dir):
    (data_dir / "a.csv").write_text("x\n1\n")
    (data_dir / "b.xlsx").write_bytes(b"")
    (data_dir / "~$b.xlsx").write_bytes(b"")  # Excel lock file
    (data_dir / ".hidden.csv").write_text("x\n1\n")
    (data_dir / "notes.txt").write_text("hi")

    names = {d["name"] for d in loader.list_datasets()}

    assert names == {"a.csv", "b.xlsx"}


def test_reads_semicolon_latin1_csv(data_dir):
    (data_dir / "cities.csv").write_bytes("ciudad;población\nBogotá;7900000\n".encode("latin-1"))

    df = loader.load("cities.csv")

    assert list(df.columns) == ["ciudad", "población"]
    assert df.iloc[0].tolist() == ["Bogotá", 7900000]


def test_strips_utf8_bom(data_dir):
    (data_dir / "bom.csv").write_bytes("﻿id,name\n1,a\n".encode("utf-8"))

    assert list(loader.load("bom.csv").columns) == ["id", "name"]


def test_parses_date_columns_only(data_dir):
    (data_dir / "d.csv").write_text("when,label\n2025-01-01,a\n2025-02-15,b\n")

    df = loader.load("d.csv")

    assert pd.api.types.is_datetime64_any_dtype(df["when"])
    assert not pd.api.types.is_datetime64_any_dtype(df["label"])


def test_excel_sheets(data_dir):
    with pd.ExcelWriter(data_dir / "book.xlsx") as xl:
        pd.DataFrame({"a": [1, 2]}).to_excel(xl, sheet_name="First", index=False)
        pd.DataFrame({"b": [1, 2, 3]}).to_excel(xl, sheet_name="Second", index=False)

    assert loader.sheet_names("book.xlsx") == ["First", "Second"]
    assert list(loader.load("book.xlsx").columns) == ["a"]  # defaults to first sheet
    assert loader.load("book.xlsx", "Second").shape == (3, 1)


@pytest.mark.parametrize("name", ["../secret.csv", "..\\secret.csv", "missing.csv", "notes.txt"])
def test_rejects_paths_outside_data_or_unsupported(data_dir, name):
    (data_dir.parent / "secret.csv").write_text("x\n1\n")
    (data_dir / "notes.txt").write_text("hi")

    with pytest.raises(FileNotFoundError):
        loader.load(name)


def test_reloads_when_file_changes(data_dir):
    path = data_dir / "grow.csv"
    path.write_text("x\n1\n")
    assert len(loader.load("grow.csv")) == 1

    path.write_text("x\n1\n2\n3\n")
    st = path.stat()
    os.utime(path, ns=(st.st_atime_ns, st.st_mtime_ns + 1_000_000_000))  # guarantee a new mtime

    assert len(loader.load("grow.csv")) == 3


def test_cache_forgets_deleted_files(data_dir):
    (data_dir / "gone.csv").write_text("x\n1\n")
    (data_dir / "kept.csv").write_text("x\n1\n")
    loader.load("gone.csv")

    (data_dir / "gone.csv").unlink()
    loader.load("kept.csv")

    cached = {os.path.basename(key[0]) for key in loader._cache}
    assert cached == {"kept.csv"}


def test_cache_is_bounded(data_dir):
    for i in range(loader.MAX_CACHED + 5):
        (data_dir / f"f{i}.csv").write_text("x\n1\n")
        loader.load(f"f{i}.csv")

    assert len(loader._cache) == loader.MAX_CACHED
