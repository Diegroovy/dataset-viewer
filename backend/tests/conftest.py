import pytest

from app import loader


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Point the app at an empty temporary data/ folder (never the real one)."""
    monkeypatch.setattr(loader, "DATA_DIR", tmp_path.resolve())
    monkeypatch.setattr(loader, "_cache", {})
    return tmp_path.resolve()
