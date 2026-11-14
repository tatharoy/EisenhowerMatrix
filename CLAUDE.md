# Eisenhower Matrix (a.k.a. "Tatha's Schedule" in some older files/builds)

A personal Eisenhower-matrix task scheduler. Node/Express backend + React
frontend, runnable three ways: standalone (`start.bat`/`start.sh`), or as a
packaged Windows/macOS desktop app via Electron (`electron/`).

**Read `README.md` first** -- it documents every feature (tags, due dates,
recurrence incl. biweekly/multi-day/multiple-times-a-day, multi-entry
follow-ups, archiving, external sync + git sync, reminder sounds, editing),
the full data model, and the API. This file is deliberately *not* a
duplicate of that -- it's what the README doesn't say.

**For *why* something ended up the way it did** -- the requirements as
actually phrased, the options weighed, and what was explicitly declined --
see `docs/00-INDEX.md` and the files it links to. Worth reading before
changing anything in: the recurrence/due-date escalation system, the
follow-up checkbox semantics, or any task/config schema field (there's a
standing backward-compatibility rule -- see `docs/11-backward-compatibility.md`
-- that every new field needs a safe fallback for records that predate
it, verified by constructing genuinely old-shaped data and running the
real app against it, not just by reasoning about the code).

## Quick commands

```bash
# Standalone, fastest iteration loop
cd backend && npm install && npm start        # :4000
cd frontend && npm install && npm run dev      # :5173, proxies /api to :4000

# Full single-process build (what start.bat/start.sh do)
cd frontend && npm run build
cd backend && node server.js                   # serves both UI + API on :4000

# Electron desktop app
cd electron && npm install
npm start                                       # dev mode
npm run dist:win                                # -> electron/dist/*.exe (needs Wine if built on Linux)
npm run dist:mac                                # must be run ON a real Mac, unverified from Linux
```

## Architecture notes that matter

- **Storage is just two JSON files** (`tasks.json`, `metadata.json`), resolved
  through a precedence chain: `DB_FILE`/`METADATA_FILE` env vars > `config.json`'s
  `externalFolder` (if `useExternalSync` is on) > local `backend/data/`.
  `config.json` itself is **never** inside the synced folder -- it's the
  thing that decides where the synced folder *is*, so it has to stay local
  (or in Electron's userData folder).
- **Nothing is ever force-migrated.** Every new field added to the Task
  shape has a safe fallback for tasks that predate it (normalize-on-read,
  not rewrite-on-disk). This was verified concretely at one point by
  constructing a tasks.json with only the *original* fields (pre-dating
  every feature) and confirming the app loads it with zero errors. If you
  add new task fields, keep this property -- it matters because real
  user data lives in an external folder and gets read by whatever version
  of the app is currently installed.
- **Quadrant placement is always derived, never stored** -- `urgent`/
  `important` booleans decide the quadrant; due-today/overdue tasks get
  *force-displayed* in Do regardless of their stored quadrant (see
  `effectiveQuadrantKey` in `frontend/src/quadrants.js`). Multi-time-a-day
  tasks are the one deliberate exception -- they're fully exempt from this
  and always stay wherever filed (Inbox by default).

## Electron specifics / open threads

- **App rename in progress/just-shipped**: productName changed from
  "Tatha's Schedule" to "Eisenhower Matrix". `appId` was deliberately kept
  as `com.tathas.schedule` so Windows still treats new installers as an
  upgrade of the same app, not a separate one. `main.js` has a
  `migrateOldUserData()` function that copies data from the old
  `%APPDATA%\Tatha's Schedule\` folder to the new one on first launch --
  tested and confirmed working (migrated a fake old folder with a custom
  title, a task, and a non-default setting; all three carried over
  correctly). If you ever rename again, keep this pattern.
- **Close/quit behavior was just fixed**: the X button used to hide the
  window while leaving the whole process (incl. the Express server)
  running forever in the background -- the user reported this manifesting
  as "two processes" after reopening. Changed so the X button now fully
  quits (`window-all-closed` -> `app.quit()`), verified by sending
  `window.close()` via CDP and confirming all ~10 Electron processes
  (main/renderer/GPU/utility) actually terminate to zero. **This fix has
  not yet been confirmed on a real Windows machine** -- only in a Linux +
  Xvfb + dev-mode-Electron test. If the user reports it's still happening
  after installing the latest build, look here first.
- **Microphone/voice input status is unresolved.** Two distinct possible
  causes: (1) Electron blocks mic access by default unless a
  `session.setPermissionRequestHandler` grants it -- this was missing and
  has been added and confirmed to work (no `not-allowed` error). (2) The
  Web Speech API's actual recognition backend requires signed Google API
  keys that only official Chrome/Edge builds have -- Electron's bundled
  Chromium likely lacks them. This is a well-documented Electron
  limitation, **not fixable from this app's code** if it's actually what's
  happening. Could not be conclusively tested from the sandbox (no real
  mic, restricted network). **Status: waiting on the user to test the
  latest build and report back whatever error text now shows** (errors
  used to only appear in a hover tooltip -- just made them show inline, as
  visible red text, specifically so the next report would be diagnosable).
  If it's still broken, the real fix is swapping the browser's built-in
  speech recognition for a cloud STT service (Azure Speech, etc.) called
  from the backend -- a genuinely bigger, separate piece of work requiring
  an API key/account, not yet started.
- **No auto-update wired up.** User explicitly said "that's enough for
  now" when offered `electron-updater` + GitHub Releases. Current flow is:
  rebuild `electron-builder --win`, hand over the new installer, user runs
  it directly (NSIS detects the existing install via matching `appId` and
  upgrades in place -- no manual uninstall needed, confirmed this is how
  electron-builder's NSIS target already behaves by default).
- **Building Windows installers from Linux needs Wine**: `wine64` +
  `wine32:i386` (for `rcedit`, which embeds the icon/version info into the
  .exe) -- electron-builder silently needs this even for unsigned builds.
  Commands that worked:
  ```bash
  sudo dpkg --add-architecture i386 && sudo apt-get update
  sudo apt-get install --no-install-recommends wine64 wine32:i386
  sudo ln -sf /usr/lib/wine/wine64 /usr/local/bin/wine
  ```
- **macOS build is configured but never actually produced or tested** --
  `electron/package.json`'s `mac` target exists, but `npm run dist:mac`
  needs to be run on a real Mac (Apple's notarization tooling is Mac-only).
  Unsigned is fine for now per the user's explicit choice; expect a
  Gatekeeper warning there (right-click -> Open bypasses it).

## One known minor quirk, not a bug

A daily task with **exactly one** specific time (`recurrence.times.length
=== 1`) still goes through the old due/overdue escalation path *in
addition to* the new precise-time alert, so it can occasionally play its
reminder sound twice in a row if both happen to fire around the same
moment. Only 2+ times fully switches to the exempt, checklist-based
behavior. Documented in the README; mentioned here too since it's easy to
"fix" by accident in a way that breaks the (deliberate) due-escalation
behavior for single-time tasks.

## Delivery note from the previous session

Everything above was built and tested through Anthropic's web chat
interface, which runs code in an ephemeral sandbox -- it reset
unexpectedly at least twice during development, losing in-progress work
each time. If you're continuing this project via Claude Code instead (with
real, persistent file access), that specific problem doesn't apply to you
-- but it's worth committing to git early and often regardless, simply as
good practice, especially before any large multi-file refactor.
