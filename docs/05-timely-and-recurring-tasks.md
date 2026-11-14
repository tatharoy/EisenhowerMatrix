# Timely Tasks & Recurring Tasks

This feature area had the most iteration of anything in the project --
three separate rounds, each expanding the model.

## Round 1: due dates and basic recurrence

**The ask:** "timely tasks" that turn yellow on their due day and red once
overdue, and automatically become urgent+important on the due day. Separately,
"scheduled tasks" that repeat daily, weekly, or monthly.

**Key decisions:**
- Due status (`dueToday`/`overdue`/`null`) is **always derived from the
  current date at render time**, never stored -- consistent with the
  project's broader "derive, don't persist computed state" philosophy
  (see `03-core-data-model-and-quadrants.md`).
- On the due day (or once overdue), a task is **force-displayed in Do**
  regardless of its actual stored quadrant, via a second derivation layer
  (`effectiveQuadrantKey`) that sits on top of (not instead of) the normal
  quadrant derivation. This was flagged explicitly as an intentional
  side effect: dragging a due/overdue task to another quadrant will appear
  to "snap back" to Do, because the escalation re-applies on the next
  render. Not a bug.
- Recurring tasks don't use the permanent `completed` flag at all --
  checking one off sets `lastCompletedDate` to today, and "is it done for
  this cycle" is a live comparison against today's date, computed on every
  render. This is why recurring tasks never move to the Completed section:
  completion, for them, isn't a permanent state.
- A task can have a due date **or** a repeat schedule, never both --
  enforced in the UI (a single timing dropdown) and in the API
  (rejects a request setting both).

## Round 2: richer recurrence (multi-day, biweekly)

**The ask:** recurrence that repeats on multiple days of the week, plus a
biweekly option.

**Key decisions:**
- `recurrence.dayOfWeek` (a single number) became `recurrence.daysOfWeek`
  (an array) -- a genuine breaking shape change, handled via a
  `normalizeRecurrence()` shim that treats an old single `dayOfWeek` as a
  one-item array on read, rather than rewriting stored files. See
  `11-backward-compatibility.md` for the standing rule this exemplifies.
- Biweekly needed a **reference point** -- "every other week" is
  meaningless without an anchor. Decided to auto-set `anchorDate` to the
  task's creation date, with zero additional UI, rather than asking the
  person to pick a starting week explicitly.
- The UI changed from a single weekday dropdown to a row of toggle-able
  weekday buttons, to support multi-select naturally.

## Round 3: multiple times a day

**The ask:** tasks that repeat several times in a single day at specific
clock times (e.g. 8am/2pm/8pm), and stay in the Inbox rather than being
treated as "due."

**This was flagged up front as a materially bigger feature than the first
two rounds**, for reasons worth preserving:
1. The app had no concept of time-of-day anywhere -- every due/recurrence
   computation worked in whole calendar days.
2. A key open question was whether each time slot needs independent
   completion tracking, or whether one daily checkbox is enough. The
   person's answer: **single-time-a-day tasks keep the existing one-
   checkbox-per-day behavior; truly multiple-times-a-day tasks need each
   time tracked separately.**
3. "Stays in Inbox" needed an explicit carve-out from the Round 1
   escalation rule (force-into-Do on due status) -- without it, a
   multi-time task would have fought with the rest of the due-date system.

**Resulting design:**
- `recurrence.times: string[]` ("HH:MM"), only meaningful for `frequency:
  "daily"`. **Exactly one time** still behaves like an ordinary daily task
  underneath (one checkbox, normal due/overdue escalation) *in addition to*
  getting a precise-time alert -- **2 or more times** is what fully
  switches on the new behavior (per-time checklist, full exemption from
  due/overdue and from Do-escalation).
- A new `completedSlots: { date, times[] }` field tracks which of *today's*
  times are checked off, reset implicitly whenever the stored date no
  longer matches today -- the same "derive the reset from today's date,
  don't run a migration job" pattern as `lastCompletedDate`.
- A known, accepted quirk: because exactly-one-time tasks still go through
  the old escalation path *and* get the new precise-time alert, they can
  occasionally play the reminder sound twice in quick succession if both
  happen to fire around the same moment. Documented rather than engineered
  away, since the fix (always exempting even single-time tasks) would have
  changed established due/overdue behavior that wasn't broken.
