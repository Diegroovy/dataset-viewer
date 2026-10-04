# Starts the Dataset Viewer: FastAPI backend on :8000 and Next.js frontend on :3000.
# Usage: .\dev.ps1   (Ctrl+C stops both)

$root = $PSScriptRoot
$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv (Join-Path $root "backend\.venv")
    & $venvPython -m pip install -r (Join-Path $root "backend\requirements.txt")
}
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    npm --prefix (Join-Path $root "frontend") install
}

$backend = Start-Process -FilePath $venvPython -NoNewWindow -PassThru `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000", "--app-dir", (Join-Path $root "backend")

try {
    Write-Host "Backend:  http://localhost:8000"
    Write-Host "Frontend: http://localhost:3000"
    npm --prefix (Join-Path $root "frontend") run dev
}
finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
