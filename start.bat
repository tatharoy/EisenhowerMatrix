@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo Install it from https://nodejs.org ^(the LTS version^), then run this again.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo Installing backend dependencies, this only happens once...
  call npm install --prefix backend
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies, this only happens once...
  call npm install --prefix frontend
)

echo Building the app...
call npm run build --prefix frontend

echo Starting Tatha's Schedule...
node backend\server.js
