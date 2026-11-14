# Changelog

A flat, roughly chronological record of what shipped in each round, as a
companion to the thematic docs in this folder (which group the same
history by subject rather than by when it happened).

- **v0 -- Initial build.** React + Vite frontend, Express backend, file-
  based storage, the repository pattern. Prototype review (neutral vs.
  soft-tint palette) before any code was written. Create tasks, drag into
  the four quadrants (derived from two booleans, not a stored label),
  check off into Completed. Drag handle, horizontal Inbox strip,
  light/dark auto-adapt.
- **+Tags.** Client/Deloitte/Personal defaults, color-coded, extensible
  via an inline "+ New tag" flow.
- **+Voice input.** Web Speech API (browser-native), with icon-font
  reliability issue found and fixed (replaced with inline SVG everywhere).
- **+Title editing.** Click-to-edit app title, defaulting to "Tatha's
  Schedule" at the time (later renamed -- see below).
- **Packaged as a one-command app.** `start.bat`/`start.sh`, single-
  process Express-serves-everything design, PID-based `stop.bat`/
  `stop.sh`, auto-start-at-login via a hidden VBScript launcher. A stale-
  build bug (scripts skipped rebuilding if `dist/` existed) found and
  fixed.
- **+Timely tasks & recurring tasks (round 1).** Due dates with
  yellow/red escalation into Do; daily/weekly/monthly recurrence with its
  own per-cycle completion tracking.
- **+External sync folder.** `config.json`, the `useExternalSync` flag,
  Google Drive/OneDrive/SharePoint support (any watched folder), with
  first-time migration of existing local data.
- **+GitHub as a sync method.** Debounced `git add`/`commit`/`push`,
  assuming a precursor (an already-configured git repo with working push
  access) rather than managing any credentials.
- **+Editing (round 1): title and notes**, for tasks that are not
  completed and not recurring.
- **+Follow-up tasks (round 1).** A flag + an optional single completion
  comment captured at checkbox time.
- **Electron desktop app, Windows build.** Window + tray, unsigned,
  single-instance lock, in-process Express server, native login-item
  registration. Verified via a virtual display + CDP rather than being
  able to run the real `.exe` from the Linux build environment.
- **Bug found via user report: `.exe` wouldn't download.** Worked around
  by wrapping it in a `.zip` (likely an unsigned-executable download
  block, corporate-network or browser-level).
- **Clarified: NSIS upgrades in place already** -- no manual uninstall
  needed between installer versions; declined full auto-update
  (`electron-updater` + GitHub Releases) as unnecessary for now.
- **+New features, planned together, built in order of increasing
  invasiveness:**
  1. Editing (round 2): extended to tag, due date, and recurrence, with
     the eligibility rule simplified to just "not completed" once
     recurrence itself became editable.
  2. Recurrence (round 2): multi-day weekly selection, biweekly (with an
     auto-set anchor date). `dayOfWeek` -> `daysOfWeek` back-compat shim.
  3. 90-day archiving, config-only threshold, no UI, no read-back API.
  4. Follow-up tasks (round 2, a genuine redesign): multi-entry dated
     log via a dedicated append endpoint; the checkbox reverted to
     meaning exactly what it means everywhere else (complete, full stop);
     a new, independent "add a follow-up" action replaces the old
     checkbox-triggered comment prompt.
- **Verified directly:** an old-style `tasks.json` (missing every field
  above) loads with zero errors and normalizes correctly.
- **+Reminder sounds.** Five candidate tones previewed live (synthesized,
  not audio files) before picking Bell/Urgent alert; interval-based
  nagging for due/overdue tasks, with a Settings-panel control (unlike the
  config-only archive threshold).
- **+Multiple-times-a-day tasks (recurrence round 3).** The most
  architecturally involved single feature: a genuinely new time-of-day
  dimension, per-time-slot completion tracking, full exemption from the
  due/overdue escalation system, and precise-time alert firing layered on
  top of the reminder-sound feature.
- **Electron rebuild with all of the above**, plus two real bugs fixed:
  the mic-permission handler (Electron blocks mic access by default
  unless explicitly granted) and the close/quit behavior (X used to hide
  the window while the whole process, including the server, kept running
  invisibly -- now it fully quits). Renamed "Tatha's Schedule" ->
  "Eisenhower Matrix" with an automatic one-time data migration, keeping
  `appId` unchanged to preserve upgrade continuity.
- **This docs/ folder + CLAUDE.md** written as a handoff, ahead of moving
  the project from this chat into Claude Code for continued work.
