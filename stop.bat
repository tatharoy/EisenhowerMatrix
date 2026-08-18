@echo off
setlocal
set PIDFILE=%~dp0backend\data\.server.pid

if not exist "%PIDFILE%" (
  echo Tatha's Schedule does not appear to be running ^(no pid file found^).
  goto :end
)

set /p PID=<"%PIDFILE%"
taskkill /PID %PID% /F >nul 2>nul
if errorlevel 1 (
  echo Could not stop process %PID% -- it may have already exited.
) else (
  echo Stopped Tatha's Schedule ^(pid %PID%^).
)
del "%PIDFILE%" >nul 2>nul

:end
pause
