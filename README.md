# Dataset Viewer

Drop a `.csv` or `.xlsx` file into `data/` and it appears in the web app automatically — no restart or refresh needed.

For each dataset you get:

- **Overview** — rows, columns, missing cells, duplicate rows, memory, and a table of every column (type, non-null, missing %, unique, sample values).
- **Columns** — per-column statistics (mean, std, quartiles, min/max…) with a histogram for numbers, a timeline for dates, and top-value bars for categories/text.
- **Data** — paginated rows with search across all columns and click-to-sort headers.

Excel workbooks with several sheets get a sheet selector. CSV delimiter (`,` `;` tab `|`) and encoding (UTF-8 / Latin-1) are detected automatically.

## Stack

- `backend/` — FastAPI + pandas. Watches `data/` with `watchfiles` and pushes changes to the browser over Server-Sent Events.
- `frontend/` — Next.js (React, TypeScript, Tailwind) + Recharts.

## Run

```powershell
.\dev.ps1
```

Then open http://localhost:3000. The script creates the Python venv and installs npm packages on first run.

Or run each part separately:

```powershell
# backend
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# frontend (another terminal)
cd frontend
npm run dev
```

If the backend runs somewhere other than `http://localhost:8000`, set `NEXT_PUBLIC_API_URL` for the frontend.

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
