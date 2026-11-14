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
installer (`Tatha's Schedule Setup 1.1.0.exe`). It's **unsigned**, so
Windows SmartScreen will show an "unknown publisher" warning on first run
-- click "More info" -> "Run anyway". Signing needs a paid code-signing
certificate; not set up here since this is for personal use.

### Voice input in the desktop app

Electron explicitly grants microphone access now (`main.js` sets a
permission handler for it) -- without that, the mic button would silently
fail to even prompt, regardless of anything in the page's own code.

That said, there's a second, deeper issue this fix can't guarantee away:
the Web Speech API's actual speech-to-text recognition runs through a
Google backend that official Chrome/Edge builds reach using signed,
proprietary API keys -- Electron's bundled Chromium doesn't include those
keys. This is a documented Electron limitation, not something fixable
from application code. **If voice input still doesn't work in the desktop
app after this fix, that's very likely why**, and the real fix at that
point is swapping the browser's built-in speech recognition for a cloud
speech-to-text service (e.g. Azure Speech) called from the backend instead
-- a bigger, separate change from anything here. The standalone
`start.bat`/`start.sh` version (running in your actual Chrome/Edge, not
Electron) doesn't have this problem at all, since it's using a real
browser's speech backend the whole time.

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
    archiver.js               Moves old completed tasks into archive_tasks.json
    data/                 tasks.json, metadata.json, .server.pid
  frontend/
    dist/               Built static app (created by `npm run build`)
    src/
      App.jsx
      api.js
      icons.jsx          Inline SVG icons (mic, grip, x, pencil, stop, flag, repeat, settings)
      quadrants.js        Derives quadrant from (urgent, important) booleans
      useSpeech.js        Web Speech API hook
      sound.js            Synthesized Bell/Urgent alert tones (Web Audio API)
      components/
        NewTaskForm.jsx
        TagPicker.jsx      Select a tag or add a new color-coded one
        TimingPicker.jsx   Set a due date or a repeat schedule (mutually exclusive)
        FollowUpCommentForm.jsx  Inline form to log a dated follow-up entry
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
  recurrence:        object | null,   // { frequency: "daily"|"weekly"|"biweekly"|"monthly",
                                       //   daysOfWeek?: number[], anchorDate?, dayOfMonth?,
                                       //   times?: string[] -- "HH:MM"[], daily only, 2+ means
                                       //   "multiple times a day" (see below) }
  lastCompletedDate: string | null,   // "YYYY-MM-DD" -- last cycle a recurring task was checked off
  completedSlots:    object | null,   // { date: "YYYY-MM-DD", times: string[] } -- which of
                                       //   today's specific times are done (multi-time tasks only)
  isFollowUp:        boolean,         // editable any time, like everything else pre-completion
  followUpComments:  [{ comment, at }],  // dated log, appended via a dedicated endpoint
  completionComment: string | null,   // legacy field from before followUpComments existed
  urgent:    boolean | null,   // null = not yet placed (sits in Inbox)
  important: boolean | null,   // null = not yet placed (sits in Inbox)
  completed: boolean,          // only meaningful for non-recurring tasks
  createdAt, completedAt
}
```

Tasks older than 90 days (completed one-off tasks only) move out to
`archive_tasks.json` automatically -- see "Archiving old completed tasks"
below.

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

## Editing a task

Any task that's still incomplete gets a small pencil icon on its card.
Clicking it turns the card into an inline form covering **title, notes,
tag, and due date/repeat schedule together** -- Save/Cancel, with an empty
title rejected via an inline error rather than silently saved.

"Editable" now just means **not completed** -- recurring tasks are
included, since their repeat schedule is editable too (pick a different
day, switch weekly to biweekly, whatever). Once a one-off task is checked
off it becomes a historical record and the pencil disappears; recurring
tasks keep their pencil regardless of whether today's cycle is checked off,
since being "done for today" isn't the same as being permanently done.

This is enforced entirely in the frontend (`TaskCard.jsx`) -- the backend
accepts a patch to any of these fields on any task regardless of state, so
there's no server-side blocking through the API directly. Fine for a
personal single-user tool; flag it if you want that tightened up.

## Follow-up tasks

Check "Follow-up" in the new-task form (or toggle the flag icon on any
existing card, any time) to mark a task as one that needs ongoing updates
before it's truly done. It's a flag, not a tag or a separate section -- a
follow-up task still gets prioritized and dragged into a quadrant like any
other task, and can also carry a tag, a due date, or a repeat schedule
alongside it.

**Logging an update never completes the task.** A follow-up card gets a
small message-bubble icon, separate from the checkbox -- click it any time
while the task is still active to open an inline form (same mic-button
pattern as elsewhere: voice fills the field, you still review before
submitting) and log a dated note. Nothing else changes -- the task stays
exactly where it is, checkbox still unchecked. Log as many of these as you
need over the task's life.

**The checkbox means exactly what it means everywhere else in the app: check
it, and the task completes.** There's no comment prompt in the way anymore
-- you decide when the whole thing's actually done and check it off
yourself, same gesture as any other task. All the dated updates you logged
along the way show up together once it lands in Completed, in
chronological order; while still active, the card shows just the latest
one with a "N earlier updates" link to expand the rest.

Old tasks from before this feature (which had a single `completionComment`
rather than a dated list) still display correctly -- they're treated as one
legacy entry.

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

Instead of a due date, a task can repeat: **Daily**, **Weekly** (pick one or
more days), **Biweekly** (pick one or more days, every other week), or
**Monthly** (pick a day-of-month, 1-31 -- clamped to the last real day for
short months, so "31" still fires in February, April, etc.).

Weekly and biweekly both use a multi-select of weekday buttons rather than
a single dropdown, so "every Monday and Thursday" is one task, not two.
Biweekly needs a reference point to know which weeks count -- it's set
automatically to the task's creation date ("starting this week, every 2
weeks") with no extra UI to configure.

Recurring tasks behave differently from normal ones:

- They **never move to the permanent Completed list** -- since they need to
  come back next cycle, checking one off only marks it done *for today*
  (tracked via `lastCompletedDate`, not the regular `completed` flag).
  Once the date no longer matches, it automatically shows as pending again
  -- no cron job or background reset needed, since "is it done for this
  cycle" is always computed live against today's date.
- On their due day (if not already done today), they get the same "Due
  today" yellow treatment and forced-into-Do behavior as a timely task.
- A small repeat icon and a label like "Repeats weekly on Monday, Thursday"
  / "Repeats every other Friday" / "Repeats daily" always shows on the card
  so it's clear it's a recurring commitment, not a one-off.
- Their repeat schedule (along with title, notes, tag, and due date) is
  editable any time via the pencil icon -- see "Editing a task" above.

A task can have a due date **or** a repeat schedule, never both -- the
timing dropdown enforces this in both the new-task form and the edit form,
and the API rejects a request that sets both.

Tasks created before biweekly/multi-day existed still work unchanged --
their old single `dayOfWeek` number is treated as a one-item list
automatically, without needing to resave anything.

### Multiple times a day

For a daily task, check "Set specific times" and add two or more clock
times (e.g. 8:00 AM, 2:00 PM, 8:00 PM) instead of picking a frequency day.
These behave differently from every other recurring task:

- **They stay wherever they're filed -- by default, Inbox -- and never get
  forced into Do.** They're deliberately exempt from the due-today/overdue
  escalation that applies to everything else, since "is it due" doesn't
  mean much for something checked several times a day.
- **Each time gets its own checkbox**, not one checkbox for the whole task.
  A small checklist row (e.g. "☐ 8:00 AM ☑ 2:00 PM ☐ 8:00 PM") replaces the
  usual single checkbox, tracked in a new `completedSlots` field that
  resets automatically at midnight -- same "derive from today's date, don't
  force-migrate" approach as everything else here.
- **The reminder sound (see below) fires at each specific time**, not on
  the interval-based "still due" nag -- once per listed time per day, the
  moment the clock reaches that minute, independent of whether the
  reminder sound's general due-based repeat is even turned on.

One minor quirk worth knowing: a daily task with **exactly one** specific
time still behaves like an ordinary daily task underneath (single
checkbox, normal due/overdue escalation) *in addition to* getting the
precise-time alert -- multi-checkbox mode only kicks in at two or more
times. In practice this means a single-specific-time task can occasionally
play its reminder sound twice in quick succession, if the precise-time
alert and the general due-based reminder both happen to fire around the
same moment. Harmless, just slightly redundant -- add a second time if you
want to sidestep it entirely.

## Reminder sound

The gear icon's Settings panel has a "Reminder sound" control: pick **Bell**
or **Urgent alert** (or leave it **Off**, the default), with a Test button
to preview before committing. Both sounds are synthesized live with the
Web Audio API -- no audio files bundled, nothing to license.

While the setting is on, the app checks every minute (piggybacking on the
same tick that keeps due-today/overdue status fresh) whether any task --
one-off or recurring -- currently shows **Due today** or **Overdue**. If
so, it plays the chosen sound, then waits `reminderIntervalMinutes` (30 by
default) before it can fire again -- a real repeating reminder rather than
a single ping, since it'll keep nudging you until you either complete the
task or its due window passes.

Separately, any daily task with specific times set (see "Multiple times a
day" above) fires its own alert at each listed time, the moment the clock
reaches that minute -- a different mechanism from the interval-based nag,
since these need to fire at exact moments rather than repeat while
something's generically overdue. Both mechanisms use whatever sound is
currently selected; "which sound" is one Settings choice, not per-task.

A few things worth knowing:

- **Unlike most settings here, this one deliberately got a UI control**
  instead of being config.json-only, since it's something you'd want to
  toggle or preview interactively, not something you set once and forget
  (compare to the archive threshold above).
- Changing it never asks for a restart -- it's read fresh on every
  `/api/config` fetch, unlike the storage-location settings.
- **Browsers block audio until the page has seen a user gesture** (a click,
  a keypress) at least once. If a reminder tries to fire before you've
  interacted with the tab at all in that session, it silently skips --
  every reminder after your first click plays normally.
- This only fires while the tab is open. There's no OS-level notification
  yet (via the browser's Notification API) that would alert you if the tab
  isn't focused or visible -- say the word if you want that added.
- `reminderIntervalMinutes` lives in `config.json` if you want a cadence
  other than 30 minutes; there's no UI slider for it currently.

## Archiving old completed tasks

Completed one-off tasks older than 90 days move automatically out of
`tasks.json` and into `archive_tasks.json`, right next to it -- so it
follows wherever your data already lives (local folder, external sync
folder, or git repo) with no separate configuration. This runs once at
startup and then every 24 hours while the app stays running, so it doesn't
depend on restarting often.

- Recurring tasks are never touched -- they never set the permanent
  `completed` flag, so they can't match the archive condition.
- This is a **pure backup dump**, not something the app reads back -- once
  archived, a task is gone from the UI and the API, and stays that way. If
  you need to see it again, it's sitting in that JSON file for reference or
  manual restoration; there's no in-app archive browser.
- The 90-day threshold lives in `config.json`'s `archiveAfterDays` field --
  edit that number directly, or set it to `0` to disable archiving
  entirely. No Settings-panel toggle for this one; it's config-file-only by
  design.

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
| PATCH | `/api/tasks/:id` | `{ urgent?, important?, completed?, title?, notes?, tagId?, dueDate?, recurrence?, lastCompletedDate?, completedSlots?, isFollowUp?, completionComment? }` | move / complete / edit |
| POST | `/api/tasks/:id/followup-comments` | `{ comment }` | append a dated follow-up entry (comment required, not skippable) |
| DELETE | `/api/tasks/:id` | -- | delete |
| GET | `/api/metadata` | -- | get `{ title, tags }` |
| PATCH | `/api/metadata` | `{ title }` | rename the app |
| POST | `/api/metadata/tags` | `{ name, color }` | add a new tag (`color` must be `#rrggbb`) |
| GET | `/api/config` | -- | get sync settings, reminder settings, active paths, git status |
| PATCH | `/api/config` | `{ useExternalSync?, externalFolder?, syncMethod?, reminderSound?, reminderIntervalMinutes? }` | change settings (`syncMethod`: `"folder"` \| `"git"`, `reminderSound`: `"none"` \| `"bell"` \| `"alert"`; only storage-location changes need a restart) |

## Notes

The file store is last-write-wins and single-user -- fine for a personal tool
on one machine. Concurrency, auth, and multi-user support would need to be
added before turning this into something a team edits simultaneously.
