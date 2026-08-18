#!/usr/bin/env bash
# One-command start for macOS/Linux: installs deps on first run only (slow,
# rarely changes), but always rebuilds the frontend (fast, a couple of
# seconds) so you're never served a stale build after pulling in code
# changes.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on this computer."
  echo "Install it from https://nodejs.org (the LTS version), then run this again."
  exit 1
fi

if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies, this only happens once..."
  npm install --prefix backend
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies, this only happens once..."
  npm install --prefix frontend
fi

echo "Building the app..."
npm run build --prefix frontend

echo "Starting Tatha's Schedule..."
node backend/server.js
