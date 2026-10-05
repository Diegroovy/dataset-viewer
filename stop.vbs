' Stops the background Dataset Viewer started by start.vbs.

Const PORT = "8765"
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -Command ""Get-NetTCPConnection -LocalPort " & PORT & _
          " -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }""", 0, True
MsgBox "Dataset Viewer stopped.", vbInformation, "Dataset Viewer"
