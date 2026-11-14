# Follow-Up Tasks

This feature was built twice -- the second version is a genuine redesign,
not a refinement, and the reasoning behind the change is worth preserving
in full since it reversed a prior decision.

## Version 1: single completion comment

**The ask:** flag a task as needing a follow-up; when checking it off,
optionally capture a comment about what happened.

**Design:** a `isFollowUp` boolean flag (separate from tags -- tags are
freely-creatable labels, follow-up is a behavioral flag that changes what
happens at completion). Checking the box on a follow-up task paused
completion and opened an inline prompt ("Add a comment before
completing... optional, but recommended") with the same mic-button pattern
used elsewhere. Submitting completed the task and stored the single
comment in `completionComment`.

## Version 2: multi-entry follow-ups (the redesign)

**The ask:** "follow up tasks should support multiple followups, so should
not move to completed once checked... each time i add comments it will
keep appending the followup comments with dates. i will move manually to
completed when entire work is done after multiple followups."

This directly contradicted Version 1's design: the checkbox could no
longer *be* the thing that captures a comment and completes the task,
since completion now needed to happen separately, after possibly many
follow-up entries.

**Two options were weighed explicitly:**
- **Option A:** repurpose the checkbox -- checking it logs a follow-up
  entry and un-checks itself (since the task isn't done), with a *new*,
  separate button to actually mark it complete.
- **Option B, chosen:** leave the checkbox alone -- it keeps meaning
  exactly what it means for every other task (check it, it's done, full
  stop). A new, independent "+ Add follow-up" button, available any time
  while the task is active, logs a dated entry without touching completion
  state at all.

**Why B won:** follow-up can be combined with recurrence (e.g. a weekly
check-in that's also a follow-up task). Under Option A, the checkbox would
have had to mean three different things depending on task type (complete /
done-for-today / log-a-comment) -- a direct collision with the recurring-
task completion model in `05-timely-and-recurring-tasks.md`. Option B
needed no special-casing for that combination at all: "add a follow-up" is
fully orthogonal to whatever the checkbox already means for that task.

**Resulting data model:** `completionComment` (a single string) was
replaced by `followUpComments: [{ comment, at }]`, appended to via a
**dedicated endpoint** (`POST /api/tasks/:id/followup-comments`) rather
than the generic task PATCH -- an atomic server-side append, specifically
to avoid a "read the array, add one, send the whole thing back" race
if ever used from two places at once. Logging a follow-up is **not**
skippable (unlike the old completion comment) -- an empty entry wouldn't
mean anything, since the entire point of the button is to log something.

**Display:** the most recent entry shows inline, with a "N earlier
updates" expand/collapse for the rest while the task is still active; once
it's actually completed, the full dated history shows in the Completed
section. Old tasks with only the legacy single `completionComment` are
shown as a one-item list via a normalization shim -- same philosophy as
`11-backward-compatibility.md`.
