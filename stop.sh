#!/usr/bin/env bash
# Stops this app's specific process (recorded PID), without touching any
# other node process that might be running on the machine.
cd "$(dirname "$0")"
PIDFILE="backend/data/.server.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "Tatha's Schedule does not appear to be running (no pid file found)."
  exit 0
fi

PID=$(cat "$PIDFILE")
if kill "$PID" 2>/dev/null; then
  echo "Stopped Tatha's Schedule (pid $PID)."
else
  echo "Could not stop process $PID -- it may have already exited."
fi
rm -f "$PIDFILE"
