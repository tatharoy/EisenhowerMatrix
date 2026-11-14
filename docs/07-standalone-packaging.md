# Standalone Packaging (start.bat / start.sh)

## The ask

"What would it take to convert this to an app for Windows... run with one
command, and schedule it to run as soon as i start my computer... I can
also package it to send to others."

## Key architectural change this required

The app had been running as two separate processes (a Vite dev server for
the frontend, proxying `/api` to an Express backend). For a one-command,
always-on personal tool, this was the wrong shape. **Decision: Express
serves the built React app directly** -- `frontend/dist` gets served as
static files by the same Express server that answers the API, so the
whole app is a single process on a single port. The two-terminal dev
workflow (`npm run dev` + `npm start`) was kept as an option for active
development, documented separately from the "everyday use" flow.

## One-command launch

`start.bat`/`start.sh` handle first-run setup automatically (install
dependencies, build the frontend) and always start the server afterward.
**A real bug was found and fixed here mid-project:** the scripts
originally only rebuilt the frontend *if `dist/` didn't already exist* --
meaning after a code update, a person re-running the script in the same
folder would silently keep serving the old build. Fixed by always
rebuilding on every launch (the build itself takes ~2 seconds, so the cost
of doing this unconditionally was negligible against the risk of silently
stale code). This bug was discovered because the person reported a
shipped feature "not working," and the real cause was a stale `dist/`, not
the feature itself.

## Stopping cleanly

`stop.bat`/`stop.sh` kill only this app's specific process, via a
`.server.pid` file written on startup -- deliberately **not** `taskkill
/IM node.exe`, which would kill every Node process on the machine,
including unrelated tools. The PID file's location was later decoupled
from wherever the task data itself lives (see
`08-external-sync-and-storage.md`) specifically so pointing data at an
external folder could never also break the stop script.

## Auto-start at login

Implemented via a Windows Startup-folder shortcut to `start-hidden.vbs` (a
tiny VBScript that launches `start.bat` with its console window hidden,
since a visible terminal flashing at every boot was deemed undesirable).
Task Scheduler was documented as an alternative for more control. This
entire mechanism was later superseded for the Electron app by
`app.setLoginItemSettings()`, a native, OS-integrated equivalent -- see
`10-electron-desktop-app.md`.

## Sending the app to someone else

The zip excludes `node_modules`, `dist`, and personal data (`backend/data`)
-- the recipient's own `start.bat`/`start.sh` rebuilds those fresh. This
same exclusion list became the template for every later packaging round in
the project (the Electron `.exe` builds, each full-feature zip handed over
after that point).
