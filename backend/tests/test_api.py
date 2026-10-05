import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(data_dir):
    (data_dir / "sales.csv").write_text(
        "region,units\n"
        "North,5\n"
        "South,2\n"
        "north-east,9\n"
        "West,\n"
        "East,7\n"
    )
    return TestClient(app)


def test_lists_datasets(client):
    res = client.get("/api/datasets")

    assert res.status_code == 200
    assert [d["name"] for d in res.json()] == ["sales.csv"]


def test_profile(client):
    body = client.get("/api/datasets/sales.csv/profile").json()

    assert body["rows"] == 5
    assert body["columns"] == 2
    assert body["missing_cells"] == 1


def test_rows_paging(client):
    body = client.get("/api/datasets/sales.csv/rows", params={"offset": 2, "limit": 2}).json()

    assert body["total"] == 5
    assert body["index"] == [2, 3]
    assert body["rows"] == [["north-east", 9.0], ["West", None]]  # missing -> null


def test_rows_search_is_case_insensitive(client):
    body = client.get("/api/datasets/sales.csv/rows", params={"search": "NORTH"}).json()

    assert body["total"] == 2
    assert [r[0] for r in body["rows"]] == ["North", "north-east"]


def test_rows_sort_desc_puts_missing_last(client):
    body = client.get("/api/datasets/sales.csv/rows", params={"sort": "units", "desc": True}).json()

    assert [r[1] for r in body["rows"]] == [9.0, 7.0, 5.0, 2.0, None]


def test_unknown_dataset_is_404(client):
    assert client.get("/api/datasets/nope.csv/profile").status_code == 404
    assert client.get("/api/datasets/nope.csv/rows").status_code == 404
