# External Sync & Storage Location

## The ask, in stages

First: "can I keep tasks.json/metadata.json externally synced with Google
Drive or SharePoint, as a flag, not inside the data folder." Later: "also
add GitHub as an option."

## The core insight that shaped everything here

**This app has no direct integration with Google Drive, SharePoint, or
GitHub at all, and that's deliberate.** The app only ever knows how to
read and write plain files on local disk. "Syncing" is entirely the job of
software the person already has running (Google Drive for Desktop,
OneDrive/SharePoint sync client) watching a folder in the background --
our app just needs to write into a folder one of those happens to be
watching. This was explained to the person directly, including a diagram,
specifically to correct an assumption that the app itself talked to any
cloud API.

## config.json -- a setting, not data

A new `config.json`, deliberately kept **outside** `backend/data/` (where
`tasks.json`/`metadata.json` normally live), holding `useExternalSync`,
`externalFolder`, and `syncMethod`. The reasoning: `config.json` is the
thing that decides *where* the real data lives, so it cannot itself live
inside the folder it might be pointing elsewhere -- it has to stay local
(or, for the Electron app, in the OS's per-user app-data folder) no matter
what. This also means `config.json` should be **excluded** when packaging
the app for someone else, since it may point at a folder that doesn't
exist on their machine.

**Precedence chain, used consistently everywhere a storage path is
resolved:** `DB_FILE`/`METADATA_FILE` env vars (explicit, always wins) >
`config.json`'s `externalFolder` (if `useExternalSync` is on) > local
`backend/data/` (default).

## First-time migration, not a fresh start

Turning the external-sync flag on for the first time **copies existing
local data into the external folder automatically**, rather than starting
empty there -- but only if the external folder doesn't already have its
own data (so a second machine catching up to an already-synced folder
never gets overwritten by the first machine's copy). This exact migration
pattern (copy-if-empty, never overwrite) was reused almost verbatim later
for the Electron app rename (`10-electron-desktop-app.md`).

## GitHub as a third sync method

Google Drive/SharePoint work because a background client is *already*
watching a folder -- there's no equivalent for a git repository; git needs
an explicit commit and push. Rather than true cloud API integration (which
would mean managing credentials, something explicitly ruled out as against
the "the sync itself isn't the app's job" philosophy), **the app runs
`git add`/`commit`/`push` itself**, debounced (a burst of edits becomes one
commit a few seconds after the last change, not one commit per keystroke),
assuming the folder is *already* a git repository with push access already
working (SSH key or credential helper) -- a precursor the person sets up
themselves, exactly matching how the folder-sync method already worked.

## What was explicitly declined

A Settings-panel toggle for the archive threshold (`archiveAfterDays`) --
kept config.json-only, since it's a rarely-touched value, unlike the
sync-method toggle or the reminder-sound choice, both of which got real UI
controls because they're things a person would want to toggle or preview
interactively.
