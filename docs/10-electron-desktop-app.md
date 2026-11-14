# The Electron Desktop App

## The ask, and the correction along the way

Originally asked as "convert this to an app for Windows, and later Windows
and iOS." This surfaced a real constraint worth preserving: **iOS cannot
run a persistent background server process** the way this app's
architecture assumes, which would have forced either a hosted backend or a
full native rewrite. The person then clarified they'd actually meant
**macOS**, not iOS -- which changes the answer completely, since Electron
targets Windows and macOS from the same codebase with no architecture
change at all.

## Design decisions, confirmed up front before building

- **Window + tray, both** (not tray-only, not window-only) -- later
  revisited, see "The close/quit bug" below.
- **Unsigned build accepted** for now, rather than paying for a code-
  signing certificate -- meaning Windows SmartScreen and macOS Gatekeeper
  both show warnings on first run, which was treated as an acceptable
  trade-off for personal use.
- **Windows first, macOS second** -- and explicitly, **macOS was never
  actually built or tested**, since Apple's notarization tooling only runs
  on a real Mac. The `mac` target in `electron/package.json` exists but is
  unverified; this was stated plainly rather than implied to work.

## What's genuinely shared vs. what's new

The existing `backend/server.js` runs **in-process** inside Electron's
main process (Electron's main process is itself a Node environment) --
no rewrite, no child process, no IPC. The React frontend talks to it over
the same `fetch('/api/...')` calls it always has, unaware it's inside
Electron at all. The only new code is the wrapper itself
(`electron/main.js`): window/tray management, login-item registration,
and (later) a mic-permission handler.

**One structural change the packaging forced:** `config.json` and the data
folder can no longer default to a path relative to the installed app
(that directory is expected to be read-only once packaged, especially on
macOS, where writing into the `.app` bundle breaks code signing). `main.js`
sets an `APP_DATA_DIR` environment variable to Electron's OS-standard
per-user folder before requiring `server.js`; `server.js` only changes
behavior when that variable is actually set, so the standalone
`start.bat`/`start.sh` flow is completely unaffected.

## Verification given the limits of a sandboxed build environment

The Windows installer was built from a Linux sandbox, which required
installing Wine (`wine64` + 32-bit support, needed even for *unsigned*
builds, since electron-builder uses it to embed the icon/version info into
the `.exe`). Since the actual `.exe` can't run natively on Linux, "did it
work" was verified a different way: launching the real Electron app (the
Linux build, via a virtual display) and using Chrome DevTools Protocol to
confirm the real window loaded, took a real screenshot, and the embedded
server answered real API requests. Separately, the *packaged* Windows
resources were verified by grepping the actual bundled files for feature-
specific strings, to confirm a rebuild genuinely included everything built
since the last installer (not just that the build succeeded).

## The mic bug

Reported directly: "the windows app has a bug where the microphone is not
working." Two distinct, independently plausible causes were identified
and explained before any fix was attempted:
1. **Definitely fixable:** Electron blocks microphone access by default
   unless a session explicitly grants it -- this was simply missing, and
   was added (`session.setPermissionRequestHandler`).
2. **Possibly not fixable from this app's code at all:** the Web Speech
   API's actual recognition backend needs signed Google API keys that only
   official Chrome/Edge builds have; Electron's bundled Chromium likely
   lacks them. A documented, widely-reported Electron limitation.

The permission fix was confirmed working (no `not-allowed` error, in both
Electron and a side-by-side plain-Chromium comparison under the same
sandbox constraints). The deeper question was explicitly left open,
since it needs a real Windows machine with a real microphone to resolve
-- the honest answer given was "fix (1) is real and done; if the mic still
doesn't work, (2) is very likely why, and the real fix at that point is a
cloud STT service instead of the browser API, which is separate, bigger
work, not started."

A related, smaller fix: speech-recognition errors previously only showed
in a hover tooltip (easy to never notice). Changed to a visible inline
error message, specifically so the next bug report would include the
actual error text rather than "it doesn't work."

## The close/quit bug

Reported directly: "when pressing the close window it just closes the
window but does not close/kill the process... when i open it again there
are two processes created."

The root cause: the X button had been wired to **hide** the window rather
than quit (to support the earlier "minimize to tray" requirement), leaving
the whole process -- including the embedded Express server -- running
invisibly forever. **Decision: simplified to standard Windows behavior --
the X button now fully quits the app**, reversing part of the earlier
"window + tray, both" decision once it became a real source of confusion
in practice. The tray icon still exists while the app is running (quick
reopen, or Quit from there), and login-item auto-start is unaffected.
Verified by sending a `window.close()` signal via CDP and confirming all
~10 Electron processes (main/renderer/GPU/utility) actually terminated to
zero, not just the visible window disappearing.

## The rename (Tatha's Schedule -> Eisenhower Matrix)

Requested in the same message as the close/quit bug report. The
non-obvious risk: Windows derives the app's per-user data folder name from
`productName`, so a naive rename would make the app look like it had lost
all existing data, without actually deleting anything -- it would just be
looking in a new, empty folder. **Decision: add a one-time migration** in
`main.js` that copies data from the old `%APPDATA%\Tatha's Schedule\`
folder to the new one, but only if the new location doesn't have data yet
and the old one does -- the same copy-if-empty, never-overwrite pattern
used for external-sync migration (`08-external-sync-and-storage.md`).
`appId` was deliberately **not** changed, specifically so Windows would
still recognize a newly-installed version as an upgrade of the same app
(matching appId) rather than a second, separate install alongside the old
one. Verified end-to-end: a fake old-style folder with a custom title, a
task, and a non-default setting was created, the renamed app was launched,
and all three were confirmed to carry over correctly via a direct API
check -- not just "the migration function ran without erroring."

## What was explicitly declined

Full auto-update (`electron-updater` + a GitHub Releases feed) was offered
and turned down ("that's enough for now") in favor of the simpler fact,
confirmed directly: electron-builder's NSIS installer already supports
running a newer installer directly over an existing install as an upgrade,
with no manual uninstall needed, since it detects the existing install via
matching `appId`.
