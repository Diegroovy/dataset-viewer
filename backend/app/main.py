"""FastAPI app serving dataset listings, profiles, rows and live change events."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from watchfiles import Change, awatch

from . import loader
from .profile import profile, to_json

app = FastAPI(title="Dataset Viewer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _load(name: str, sheet: str | None) -> pd.DataFrame:
    try:
        return loader.load(name, sheet)
    except FileNotFoundError:
        raise HTTPException(404, f"Dataset not found: {name}")
    except Exception as exc:  # unreadable/corrupt/half-written file
        raise HTTPException(422, f"Could not read {name}: {exc}")


@app.get("/api/datasets")
def datasets():
    return loader.list_datasets()


@app.get("/api/datasets/{name}/sheets")
def sheets(name: str):
    try:
        return loader.sheet_names(name)
    except FileNotFoundError:
        raise HTTPException(404, f"Dataset not found: {name}")
    except Exception as exc:
        raise HTTPException(422, f"Could not read {name}: {exc}")


@app.get("/api/datasets/{name}/profile")
def dataset_profile(name: str, sheet: str | None = None):
    df = _load(name, sheet)
    return {"name": name, "sheet": sheet, **profile(df)}


@app.get("/api/datasets/{name}/rows")
def rows(
    name: str,
    sheet: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    search: str = "",
    sort: str | None = None,
    desc: bool = False,
):
    df = _load(name, sheet)
    if search:
        needle = search.lower()
        mask = pd.Series(False, index=df.index)
        for col in df.columns:
            mask |= df[col].astype(str).str.lower().str.contains(needle, regex=False, na=False)
        df = df[mask]
    if sort and sort in df.columns:
        try:
            df = df.sort_values(sort, ascending=not desc, na_position="last", kind="stable")
        except TypeError:  # mixed types in an object column
            df = df.sort_values(sort, ascending=not desc, na_position="last", kind="stable", key=lambda s: s.astype(str))
    page = df.iloc[offset : offset + limit]
    return {
        "total": len(df),
        "offset": offset,
        "columns": list(df.columns),
        "index": [to_json(i) for i in page.index],
        "rows": [[to_json(v) for v in row] for row in page.itertuples(index=False, name=None)],
    }


@app.get("/api/events")
async def events(request: Request):
    """Server-Sent Events: notifies clients whenever a file in data/ changes."""

    async def stream():
        yield "retry: 2000\n\n"
        stop = asyncio.Event()

        async def watch_disconnect():
            while not await request.is_disconnected():
                await asyncio.sleep(1)
            stop.set()

        watcher = asyncio.create_task(watch_disconnect())
        try:
            async for changes in awatch(loader.DATA_DIR, stop_event=stop, debounce=800):
                files = sorted(
                    {
                        Path(path).name
                        for change, path in changes
                        if Path(path).suffix.lower() in loader.SUPPORTED and not Path(path).name.startswith("~$")
                    }
                )
                if files:
                    kinds = {Change(c).name for c, _ in changes}
                    yield f"data: {json.dumps({'type': 'changed', 'files': files, 'changes': sorted(kinds)})}\n\n"
        finally:
            watcher.cancel()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
