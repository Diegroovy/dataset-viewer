# Builds the app for one-click use (start.vbs).
# Run it again after changing frontend code; backend changes only need a restart.
# Usage: .\build.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv (Join-Path $root "backend\.venv")
}
Write-Host "Checking Python packages..."
& $venvPython -m pip install -q -r (Join-Path $root "backend\requirements.txt")

if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    npm --prefix (Join-Path $root "frontend") install
}

Write-Host "Building frontend..."
npm --prefix (Join-Path $root "frontend") run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Write-Host ""
Write-Host "Done. Start the app with start.vbs (or the desktop shortcut)."
Write-Host "If it is already running, restart it (stop.vbs, then start.vbs) to load backend changes."
