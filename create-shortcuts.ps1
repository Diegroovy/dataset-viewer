# Adds "Dataset Viewer" and "Stop Dataset Viewer" shortcuts to your desktop.
# Usage: .\create-shortcuts.ps1          (add -Startup to also launch it when you log in)

param([switch]$Startup)

$root = $PSScriptRoot
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")

function New-Shortcut($path, $script, $icon) {
    $s = $shell.CreateShortcut($path)
    $s.TargetPath = "$env:WINDIR\System32\wscript.exe"
    $s.Arguments = "`"$(Join-Path $root $script)`""
    $s.WorkingDirectory = $root
    $s.IconLocation = $icon
    $s.Save()
    Write-Host "Created $path"
}

New-Shortcut (Join-Path $desktop "Dataset Viewer.lnk") "start.vbs" "$env:WINDIR\System32\imageres.dll,152"
New-Shortcut (Join-Path $desktop "Stop Dataset Viewer.lnk") "stop.vbs" "$env:WINDIR\System32\imageres.dll,93"

if ($Startup) {
    $startupDir = [Environment]::GetFolderPath("Startup")
    New-Shortcut (Join-Path $startupDir "Dataset Viewer.lnk") "start.vbs" "$env:WINDIR\System32\imageres.dll,152"
}
