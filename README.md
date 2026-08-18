# Tatha's Schedule (Eisenhower Matrix)

A personal task scheduler: create tasks, tag them (Client / Deloitte /
Personal, or your own), give them a due date or a repeat schedule, drag them
into the four Eisenhower quadrants (or add them by voice), and check them off
into a Completed section with the date they were finished.

Runs as a **single process on one port** -- Express serves both the API and
the built React app, so there's one command to start everything.

- **Frontend:** React (Vite), built to static files
- **Backend:** Node / Express -- serves the API and the built frontend
- **Database:** two file-based JSON stores (`tasks.json`, `metadata.json`),
  either pointable at a OneDrive/SharePoint-synced folder
- **Voice input:** browser Web Speech API (Chrome / Edge); all icons are
  inline SVG (no external font CDN, so it works on locked-down networks)

## Quick start

**Windows:** double-click `start.bat`.
**macOS/Linux:** run `./start.sh` (or `bash start.sh`).

The first time, it installs dependencies -- this takes a minute or two and
only happens once. Every run (including the first) rebuilds the frontend
fresh from source before starting, which takes a couple of seconds -- this
guarantees you're never looking at a stale build after the app is updated.
Your browser opens automatically to the app once it's ready.

To stop it: **Windows** double-click `stop.bat`; **macOS/Linux** run
`./stop.sh`. Both look up the exact process this app started (via a small
`.server.pid` file next to your data) and stop only that -- they won't touch
any other Node process you might have running.

If you'd rather drive it through npm directly:
```bash
npm run setup   # once: installs backend + frontend deps, builds the frontend
npm start       # every time: starts the single-process app
```

## Run it automatically when your computer starts

### Windows -- Startup folder (simplest, no admin rights needed)

1. Press `Win + R`, type `shell:startup`, press Enter. This opens your
   personal Startup folder.
2. Right-click inside that folder -> **New -> Shortcut**.
3. Browse to `start-hidden.vbs` inside this project folder, and finish the
   wizard.
4. That's it. From now on, at every login the app starts silently in the
   background (no console window) and your browser opens to it.

`start-hidden.vbs` just runs `start.bat` with its window hidden, so you don't
get a black terminal window flashing on screen at every boot.

### Windows -- Task Scheduler (alternative, a bit more control)

Open PowerShell or Command Prompt in this folder and run (adjust the path if
you moved the folder):

```powershell
schtasks /create /tn "TathasSchedule" /tr "wscript.exe \"%cd%\start-hidden.vbs\"" /sc onlogon /rl limited
```

To remove it later:
```powershell
schtasks /delete /tn "TathasSchedule" /f
```

### macOS -- login item

**System Settings -> General -> Login Items -> click "+"** and add `start.sh`
(or wrap it in a `.command` file first: copy `start.sh` to `start.command`
and `chmod +x start.command`, since macOS Login Items expect a
double-clickable file).

### Linux -- systemd user service (or `crontab -e` with `@reboot /path/to/start.sh` as a simpler alternative)

```ini
# ~/.config/systemd/user/tathas-schedule.service
[Unit]
Description=Tatha's Schedule

[Service]
WorkingDirectory=/path/to/eisenhower
ExecStart=/path/to/eisenhower/start.sh
Environment=OPEN_BROWSER=false

[Install]
WantedBy=default.target
```
Then: `systemctl --user enable --now tathas-schedule`. (Setting
`OPEN_BROWSER=false` here since a background service has no browser session
to open into -- just open `http://localhost:4000` yourself once you're at
your desktop.)

## Desktop app (Windows / macOS)

There's also a real installer, in `electron/` -- a proper `.exe`/`.app`
instead of the `start.bat`/`start.sh` + browser-tab approach above. It runs
the exact same backend and frontend code (no logic rewrite), wrapped so it:

- Needs **no Node.js installed** on the machine that runs it -- the
  installer bundles its own copy of everything
- Opens as a real window with its own icon, and can minimize to a system
  tray (Windows) / menu bar (macOS) icon instead of closing -- the server
  keeps running in the background either way; the window is just hidden
- Registers for **launch at login natively** (`app.setLoginItemSettings`),
  replacing the `start-hidden.vbs`/Startup-folder trick and the `launchd`
  plist instructions above entirely
- Stores its data in the OS's standard per-user app-data folder (Windows
  `%APPDATA%\Tatha's Schedule\`, macOS `~/Library/Application
  Support/Tatha's Schedule/`) instead of inside the install directory --
  this also means `config.json` now survives reinstalling/updating the app
  automatically, without the manual copy-out-and-back-in step needed with
  the zip-based version

### Building it

```bash
cd frontend && npm install && npm run build   # build the frontend once
cd ../backend && npm install                   # backend deps
cd ../electron && npm install                  # electron + electron-builder

npm run start      # run it locally first, to make sure it works
npm run dist:win    # -> electron/dist/Tatha's Schedule Setup <version>.exe
npm run dist:mac    # -> electron/dist/*.dmg (must be run ON a Mac -- see below)
```

### Windows

Built and verified here -- `npm run dist:win` produces a real NSIS
installer (`Tatha's Schedule Setup 1.0.0.exe`). It's **unsigned**, so
Windows SmartScreen will show an "unknown publisher" warning on first run
-- click "More info" -> "Run anyway". Signing needs a paid code-signing
certificate; not set up here since this is for personal use.

If you ever build this yourself on Linux (rather than Windows) like I did,
electron-builder needs Wine to embed the icon/version info into the `.exe`:
```bash
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install --no-install-recommends wine64 wine32:i386
sudo ln -sf /usr/lib/wine/wine64 /usr/local/bin/wine
```
Building directly on Windows doesn't need any of this.

### macOS -- not yet verified

The `mac` build target is configured (`electron/package.json`), but I
can't actually produce or test a `.dmg` from this Linux environment --
Apple's notarization tooling and proper `.icns`/code-signing steps are
Mac-only. Building it requires running `npm run dist:mac` **on an actual
Mac** with Node installed. Since we're going unsigned for now, expect a
Gatekeeper block on first launch ("app is damaged" or "unidentified
developer") -- right-click the `.app` -> Open, or allow it via System
Settings -> Privacy & Security, to bypass it. A paid Apple Developer
account ($99/yr) removes this warning if you later want to hand the app to
someone else.

### What's not carried over from the standalone version

`stop.bat`/`stop.sh` and the Startup-folder/Task Scheduler/launchd
instructions above are specific to the `start.bat`/`start.sh` flow --
the desktop app replaces all of that with its own installer, tray Quit
menu item, and native login-item registration. Both versions can coexist
on the same machine, but don't run them at the same time -- they'd both
try to bind port 4000.

## Sending this to someone else

Zip the whole project folder **except** `node_modules`, `frontend/dist`,
`backend/data`, and `config.json` (those are all machine-specific -- native
build tools differ across operating systems, the data folder holds *your*
tasks, and `config.json` may point at a folder on your machine that doesn't
exist on theirs). Send them the zip.

They need [Node.js](https://nodejs.org) installed (LTS version is fine) --
that's the only prerequisite. Then:

- **Windows:** double-click `start.bat`.
- **Mac/Linux:** run `./start.sh` (may need `chmod +x start.sh` first if the
  zip didn't preserve the executable bit).

Their tasks, tags, and title are stored entirely on their own machine (their
own `backend/data/tasks.json` / `metadata.json`, created fresh on first run)
-- nothing is shared between copies of the app.

> **Prefer no Node.js prerequisite at all?** Send the installer from
> "Desktop app" above instead (`Tatha's Schedule Setup 1.0.0.exe` for
> Windows) -- it bundles everything, so the recipient just runs the
> installer with nothing else to set up first.

## Structure

```
eisenhower/
  package.json        Root convenience scripts (setup / build / start)
  config.json          The external-sync-folder flag (created on first run)
  start.bat / start.sh One-command launcher (installs + builds on first run)
  stop.bat  / stop.sh  Stops this app's specific process
  start-hidden.vbs     Windows: launches start.bat with no visible window
  electron/
    main.js              Electron main process: runs server.js in-process, window + tray
    package.json          electron-builder config (Windows verified, macOS config only)
    assets/                 App icons (icon.ico, icon.png, tray-icon.png)
    dist/                    Built installers land here (git-ignored, not in the zip)
  backend/
    server.js          Express app: API routes + serves frontend/dist
    repository.js       FileRepository for tasks.json
    metadataStore.js     MetadataStore for metadata.json (title + tags)
    configStore.js        ConfigStore for config.json (external sync flag)
    gitSync.js              Debounced git add/commit/push for the "git" sync method
    data/                 tasks.json, metadata.json, .server.pid
  frontend/
    dist/               Built static app (created by `npm run build`)
    src/
      App.jsx
      api.js
      icons.jsx          Inline SVG icons (mic, grip, x, pencil, stop, flag, repeat, settings)
      quadrants.js        Derives quadrant from (urgent, important) booleans
      useSpeech.js        Web Speech API hook
      components/
        NewTaskForm.jsx
        TagPicker.jsx      Select a tag or add a new color-coded one
        TimingPicker.jsx   Set a due date or a repeat schedule (mutually exclusive)
        TitleBar.jsx       Click-to-edit app title
        SettingsPanel.jsx  Toggle/configure the external sync folder
        MicButton.jsx
        Inbox.jsx
        Matrix.jsx
        Quadrant.jsx
        TaskCard.jsx
        CompletionPrompt.jsx  Inline comment box (skippable) when completing a follow-up
        Completed.jsx
```

## Data model

**Tasks** (`tasks.json`):

```js
Task {
  id, title, notes,
  tagId:             string | null,   // references a tag id in metadata.json
  dueDate:           string | null,   // "YYYY-MM-DD", one-off deadline
  recurrence:        object | null,   // { frequency: "daily"|"weekly"|"monthly", dayOfWeek?, dayOfMonth? }
  lastCompletedDate: string | null,   // "YYYY-MM-DD" -- last cycle a recurring task was checked off
  isFollowUp:        boolean,         // editable any time, unlike tags/dueDate/recurrence
  completionComment: string | null,   // set (optionally) when completing a follow-up task
  urgent:    boolean | null,   // null = not yet placed (sits in Inbox)
  important: boolean | null,   // null = not yet placed (sits in Inbox)
  completed: boolean,          // only meaningful for non-recurring tasks
  createdAt, completedAt
}
```

`dueDate` and `recurrence` are mutually exclusive -- a task has at most one
of the two.

**Metadata** (`metadata.json`):

```js
{
  title: "Tatha's Schedule",
  tags: [
    { id: "client",   name: "Client",   color: "#3b6fa8" },
    { id: "deloitte", name: "Deloitte", color: "#2f7d4f" },
    { id: "personal", name: "Personal", color: "#a8672f" }
  ]
}
```

The quadrant shown on screen is always *derived* from the two flags
(`frontend/src/quadrants.js`):

| important | urgent | Quadrant |
|---|---|---|
| true | true | Do (fire-fighting) |
| true | false | Schedule (visionary) |
| false | true | Delegate |
| false | false | Eliminate |

## External sync folder (Google Drive / OneDrive / SharePoint / GitHub)

By default your data lives in `backend/data/tasks.json` and
`backend/data/metadata.json`. Click the gear icon in the top-right corner to
point it somewhere else instead. There are two sync methods:

### Method 1: Synced folder (Google Drive, OneDrive, SharePoint)

Any folder watched by a desktop sync client works, since from the app's
point of view it's just a regular local folder -- the sync client handles
the cloud part in the background, entirely outside this app.

- Turning this on for the first time **copies your existing tasks and
  metadata into that folder** rather than starting empty -- but only if the
  folder doesn't already have its own copy (so a second machine catching up
  to an already-synced folder won't overwrite it with this machine's data).
- Changes take effect on the **next restart**, not instantly -- the panel
  tells you this after saving. Restart via `start.bat`/`start.sh` as usual.

### Method 2: Git repository (e.g. GitHub)

GitHub doesn't have a background client that silently uploads file changes
the way Google Drive/OneDrive do -- git requires an explicit commit and
push. So this method makes the app do that part itself: a few seconds after
your last change settles, it runs `git add -A`, `git commit`, and
`git push` in that folder automatically (multiple rapid edits collapse into
one commit rather than spamming your history).

**This assumes a precursor you set up yourself** -- the app never manages
git credentials or repository setup:

- The folder must already be a git repository (`git init` or `git clone`)
  with a remote configured (`git remote add origin ...`).
- `git push` must already work with **no interactive prompt** -- an SSH key
  or a saved credential helper, set up and tested outside this app.
- The Settings panel shows whether the folder looks like a git repo yet
  (checks for a `.git` folder) and the result of the last sync attempt, so
  you have some visibility even though this runs silently in the
  background -- important if you've set the app to launch hidden at startup,
  since there's no console window to watch in that case.
- If a push fails (bad credentials, no network, merge conflict from editing
  the same repo elsewhere), your task is still saved locally right away --
  only the push to GitHub is affected, and it'll retry on the next change.
  This app does not resolve git conflicts for you; if you edit the same repo
  from two places, you may need to resolve that by hand with normal git
  commands.

### Common to both methods

- The setting itself lives in `config.json` at the project root, deliberately
  *outside* `backend/data/` -- it's a setting about where data lives, not
  data itself, and won't get swept up if you ever clear your data folder.
- The `DB_FILE` / `METADATA_FILE` environment variables (if you still use
  them from an earlier setup) take priority over this setting. The panel
  shows a note when that's the case.
- Prefer scripting it instead of clicking through the panel? Setting those
  same env vars before `npm start` does the same thing without touching
  `config.json` at all (note this only affects *where* the files live, not
  the automatic git commit/push behavior, which is config.json-only):
  ```bash
  # macOS / Linux
  DB_FILE="/Users/you/Google Drive/Tatha's Schedule/tasks.json" \
  METADATA_FILE="/Users/you/Google Drive/Tatha's Schedule/metadata.json" \
  npm start

  # Windows PowerShell
  $env:DB_FILE="C:\Users\you\Google Drive\Tatha's Schedule\tasks.json"
  $env:METADATA_FILE="C:\Users\you\Google Drive\Tatha's Schedule\metadata.json"
  npm start
  ```

## Editing a task's title and notes

Any task that's still "live" gets a small pencil icon on its card, next to
the follow-up flag and delete buttons. Clicking it turns the title and
notes into editable fields inline, with Save/Cancel -- an empty title is
rejected with an inline error rather than silently saved.

"Live" means:
- **Not completed** -- once a one-off task is checked off it becomes a
  historical record (consistent with why a follow-up's completion comment
  can't be changed afterward either), so the pencil disappears the moment
  it lands in Completed.
- **Not recurring** -- a recurring task's title/notes are fixed at
  creation, same as its repeat schedule; there's no pencil on these at all,
  checked-off-today or not.

This check happens entirely in the frontend (`TaskCard.jsx`) -- the backend
already accepted a `title`/`notes` patch on any task regardless of its
state, so there's no server-side enforcement blocking it directly through
the API. Fine for a personal single-user tool; flag it if you ever want
that tightened up.

## Follow-up tasks

Check "Follow-up" in the new-task form (or toggle the flag icon on any
existing card, any time -- unlike tags, due dates, and recurrence, this one
is editable after creation) to mark a task as needing a resolution note.
It's a flag, not a tag or a separate section -- a follow-up task still gets
prioritized and dragged into a quadrant like any other task, and can also
carry a tag, a due date, or a repeat schedule alongside it.

The behavior change is at completion time: checking off a follow-up task
doesn't complete it immediately. Instead, an inline prompt opens asking what
happened, with the same mic button pattern used for task titles elsewhere
(voice fills the field for you to review -- it doesn't auto-submit). The
comment is optional -- "Complete" works with it empty -- but the prompt is
there because a resolution note is usually worth the extra few seconds.
Once submitted, the task completes as normal and the comment shows as a
quoted note under the title, both in its quadrant (for recurring follow-ups,
which never leave the matrix) and in the Completed section (for one-off
follow-ups).

Un-checking a task never asks for a comment -- only the transition *into*
completed does.

## Timely tasks (due dates)

Give a task a due date when creating it (the "Due date" option in the
timing dropdown). Nothing changes until the day arrives:

- **On the due day:** the card gets a yellow left-edge stripe and a "Due
  today" label, and the task automatically displays in **Do** -- regardless
  of which quadrant it's actually filed in.
- **After the due day, if still not checked off:** the stripe turns red,
  the label reads "Overdue since <date>", and it stays forced into **Do**.
- **Once checked off:** it moves to Completed as normal, no more escalation.

This escalation is display-only in the sense that it doesn't change the
task's stored quadrant -- but it does mean that if you drag a due/overdue
task to another quadrant, it'll immediately "snap back" to Do on the next
render, since the due/overdue condition still holds. That's intentional
(the task needs attention *now*), not a bug -- it'll stop happening once
you check it off.

## Scheduled / recurring tasks

Instead of a due date, a task can repeat: **Daily**, **Weekly** (pick a
day), or **Monthly** (pick a day-of-month, 1-31 -- clamped to the last real
day for short months, so "31" still fires in February, April, etc.).

Recurring tasks behave differently from normal ones:

- They **never move to the permanent Completed list** -- since they need to
  come back next cycle, checking one off only marks it done *for today*
  (tracked via `lastCompletedDate`, not the regular `completed` flag).
  Once the date no longer matches, it automatically shows as pending again
  -- no cron job or background reset needed, since "is it done for this
  cycle" is always computed live against today's date.
- On their due day (if not already done today), they get the same "Due
  today" yellow treatment and forced-into-Do behavior as a timely task.
- A small repeat icon and a "Repeats every Friday" / "Repeats daily" /
  "Repeats monthly on day 5" label always shows on the card so it's clear
  it's a recurring commitment, not a one-off.

A task can have a due date **or** a repeat schedule, never both -- the
timing dropdown in the new-task form enforces this, and the API rejects a
request that sets both.

> Both fields are set at creation time only in this version -- there's no
> UI yet to add/change a due date or repeat schedule on an existing task.
> Delete and recreate it if you need to change it; say the word if you'd
> like in-place editing added.

## Storage: file today, SharePoint List tomorrow

The two approaches above (env vars and the Settings panel) both just move
where the two JSON files sit -- they're still files, backed by whatever sync
client watches that folder. To move to a true SharePoint List (via
Microsoft Graph) or a real database later, implement the same methods
(`list`/`create`/`update`/`remove` for tasks; `get`/`updateTitle`/`addTag`
for metadata) in a new class and swap it in `backend/server.js` -- the REST
API and the frontend don't change either way.

## Developing further

If you want to keep editing the code with hot reload (rather than the
build-once flow above), run the frontend and backend separately:

```bash
# terminal 1
cd backend && npm start          # http://localhost:4000

# terminal 2
cd frontend && npm run dev       # http://localhost:5173, proxies /api to :4000
```

Rebuild (`npm run build --prefix frontend`) when you're done and want to go
back to the single-process one-command flow.

## API

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| GET | `/api/tasks` | -- | list all tasks |
| POST | `/api/tasks` | `{ title, notes?, tagId?, dueDate?, recurrence?, isFollowUp? }` | create (lands unplaced/inbox) |
| PATCH | `/api/tasks/:id` | `{ urgent?, important?, completed?, title?, notes?, tagId?, dueDate?, recurrence?, lastCompletedDate?, isFollowUp?, completionComment? }` | move / complete / edit |
| DELETE | `/api/tasks/:id` | -- | delete |
| GET | `/api/metadata` | -- | get `{ title, tags }` |
| PATCH | `/api/metadata` | `{ title }` | rename the app |
| POST | `/api/metadata/tags` | `{ name, color }` | add a new tag (`color` must be `#rrggbb`) |
| GET | `/api/config` | -- | get sync settings, active paths, git status |
| PATCH | `/api/config` | `{ useExternalSync?, externalFolder?, syncMethod? }` | change settings (`syncMethod`: `"folder"` \| `"git"`; folder/method changes need a restart) |

## Notes

The file store is last-write-wins and single-user -- fine for a personal tool
on one machine. Concurrency, auth, and multi-user support would need to be
added before turning this into something a team edits simultaneously.
"# EisenhowerMatrix" 
