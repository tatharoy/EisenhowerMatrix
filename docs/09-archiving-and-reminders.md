# Archiving & Reminder Sounds

## Archiving old completed tasks

**The ask:** completed tasks older than 90 days should move to a separate
`archive_tasks.json`, invisible in the UI, kept only as a JSON backup --
explicitly compared to database archiving practice.

**Decisions:**
- Runs at server startup **and** every 24 hours while the server stays
  running, not just at startup -- important because this app is meant to
  run always-on (especially via the Electron app), where restarts might be
  rare.
- Recurring tasks are naturally excluded with no special-casing needed:
  they never set the permanent `completed` flag, so they can never match
  the archive condition at all.
- Deliberately **no read-back API, no UI** -- a pure one-way backup dump,
  matching exactly what was asked ("available in JSON for backup," not "I
  want to browse old tasks in the app").
- Lives in the same location as `tasks.json` (local, external-synced, or
  git-synced folder) automatically, with zero separate configuration --
  and archiving writes count as a change for the git-sync debounce, so an
  archive run gets committed/pushed like any other write.

## Reminder sounds

**The ask, in two parts across two messages:** first, general interest in
alert sounds; then, specifically, "Bell or Urgent alert... as a reminder
for any urgent time-based task."

**The sounds themselves were previewed live before any code was written**
-- five candidate tones (simple beep, soft chime, double ping, bell,
urgent alert), all synthesized on the spot with the Web Audio API
(oscillators with an envelope), so the person could actually click and
listen rather than read a description. This was a direct extension of the
project's established "show a prototype before building" pattern, applied
to audio instead of a screenshot.

**Interpretation of "urgent time-based task":** read as "currently showing
Due Today or Overdue" -- i.e., exactly the tasks the Round-1 due-date
escalation (`05-timely-and-recurring-tasks.md`) already force-displays in
Do. This wasn't the only possible reading (it could have meant only tasks
explicitly in the urgent+important quadrant), but matched the app's
existing notion of urgency most directly.

**Design, confirmed via one clarifying question:**
- Repeats every `reminderIntervalMinutes` (default 30) while anything
  qualifies -- a real repeating reminder, not a one-time ping.
- **Given a real UI control** (a Settings-panel dropdown with a Test
  button), unlike the archive threshold -- explicitly because sound choice
  is something a person wants to toggle/preview interactively, while the
  archive window is a set-once value.
- Separately, multi-time-a-day tasks (`05-timely-and-recurring-tasks.md`)
  get their own **precise-time** alert, firing once per scheduled time per
  day rather than repeating on an interval -- a genuinely different
  trigger mechanism from the due-based nag, reusing the same sound choice.
- A known, honest limitation documented directly: browsers block audio
  until the page has seen at least one user gesture (a click, a keypress)
  -- the very first reminder in a fresh session can silently be skipped
  for that reason; every one after an interaction plays normally.
