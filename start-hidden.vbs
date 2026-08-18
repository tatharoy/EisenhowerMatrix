' Launches start.bat silently (no console window), from wherever this
' script itself lives, regardless of the current working directory.
' Used to auto-start the scheduler at login without a black window flashing
' on screen. See README.md "Run at startup" for setup instructions.

Dim fso, scriptDir, shell
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = scriptDir
shell.Run Chr(34) & scriptDir & "\start.bat" & Chr(34), 0, False
