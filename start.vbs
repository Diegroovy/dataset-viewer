' Starts Dataset Viewer in the background (no window) and opens it in the browser.
' If it is already running, it just opens the browser.

Const PORT = "8765"
Dim shell, fso, root, url, python, cmd, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:" & PORT
python = root & "\backend\.venv\Scripts\python.exe"

Function IsRunning()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP")
    http.setTimeouts 1000, 1000, 1000, 1000
    http.Open "GET", url & "/api/datasets", False
    http.Send
    IsRunning = (Err.Number = 0 And http.Status = 200)
End Function

If Not IsRunning() Then
    ' First run (or after a fresh clone): build everything, in a visible window.
    If Not fso.FileExists(python) Or Not fso.FileExists(root & "\frontend\out\index.html") Then
        shell.Run "powershell.exe -ExecutionPolicy Bypass -File """ & root & "\build.ps1""", 1, True
    End If

    If Not fso.FolderExists(root & "\logs") Then fso.CreateFolder(root & "\logs")
    cmd = "cmd /c """"" & python & """ -m uvicorn app.main:app --host 127.0.0.1 --port " & PORT & _
          " --app-dir """ & root & "\backend"" > """ & root & "\logs\app.log"" 2>&1"""
    shell.Run cmd, 0, False

    For i = 1 To 60
        If IsRunning() Then Exit For
        WScript.Sleep 500
    Next
    If Not IsRunning() Then
        MsgBox "Dataset Viewer did not start. See logs\app.log for details.", vbExclamation, "Dataset Viewer"
        WScript.Quit 1
    End If
End If

shell.Run url
