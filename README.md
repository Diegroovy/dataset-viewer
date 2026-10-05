# Dataset Viewer

[![CI](https://github.com/Diegroovy/dataset-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/Diegroovy/dataset-viewer/actions/workflows/ci.yml)

Drop a `.csv` or `.xlsx` file into `data/` and it appears in the web app automatically — no restart or refresh needed.

For each dataset you get:

- **Overview** — rows, columns, missing cells, duplicate rows, memory, and a table of every column (type, non-null, missing %, unique, sample values).
- **Columns** — per-column statistics (mean, std, quartiles, min/max…) with a histogram for numbers, a timeline for dates, and top-value bars for categories/text.
- **Data** — paginated rows with search across all columns and click-to-sort headers.

Excel workbooks with several sheets get a sheet selector. CSV delimiter (`,` `;` tab `|`) and encoding (UTF-8 / Latin-1) are detected automatically.

## Stack

- `backend/` — FastAPI + pandas. Watches `data/` with `watchfiles` and pushes changes to the browser over Server-Sent Events. In app mode it also serves the built frontend (`frontend/out`).
- `frontend/` — Next.js (React, TypeScript, Tailwind) + Recharts.

## Run

There are two ways to run it. They use different ports, so both can run at the same time.

### App mode — daily use (http://localhost:8765)

One background process, no windows, no VS Code needed.

```powershell
.\create-shortcuts.ps1      # once: adds "Dataset Viewer" + "Stop Dataset Viewer" to the desktop
                            # (add -Startup to also launch it when you log in)
```

- **Start:** double-click *Dataset Viewer* (or `start.vbs`). It starts the server hidden and opens the browser. If it's already running, it just opens the browser.
- **Stop:** double-click *Stop Dataset Viewer* (or `stop.vbs`).
- **Logs:** `logs/app.log`.
- **After changing code:** run `.\build.ps1` (frontend changes), then stop + start (backend changes).

The first start after a fresh clone runs `build.ps1` automatically.

### Dev mode — while editing code (http://localhost:3000)

Hot reload: save a file and the browser updates instantly.

```powershell
.\dev.ps1
```

The script creates the Python venv and installs npm packages on first run. Or run each part separately:

```powershell
# backend
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# frontend (another terminal)
cd frontend
npm run dev
```

If the backend runs somewhere other than `http://localhost:8000`, set `NEXT_PUBLIC_API_URL` for the frontend.

## Tests and CI

Backend tests (statistics, file reading, API) live in `backend/tests/`:

```powershell
cd backend
.venv\Scripts\python -m pip install -r requirements-dev.txt   # once
.venv\Scripts\python -m pytest
```

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs these tests plus the frontend type check, lint and build on every pull request and every push to `main`.

## Contributing

See [GITHUB_WORKFLOW.md](GITHUB_WORKFLOW.md) for branches, commits and pull requests.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/datasets` | Files in `data/` |
| `GET /api/datasets/{name}/sheets` | Sheet names (xlsx) |
| `GET /api/datasets/{name}/profile?sheet=` | Stats, quality and chart data |
| `GET /api/datasets/{name}/rows?offset=&limit=&search=&sort=&desc=&sheet=` | Paged rows |
| `GET /api/events` | SSE stream of file changes |
