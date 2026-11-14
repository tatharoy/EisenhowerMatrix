# Backward Compatibility

## The standing rule

Stated and re-applied consistently across the whole project, long before
it was ever asked about directly: **every new field added to the task
(or config/metadata) schema must have a safe, sensible fallback for
records that predate it.** Concretely, this took two forms:

1. **Purely additive fields** (e.g. `tagId`, `dueDate`, `isFollowUp`,
   `completedSlots`) -- simply `undefined`/falsy on old records, and every
   place that reads them treats "missing" the same as "unset," with no
   special-casing required.
2. **Fields whose *shape* changed** -- two cases arose, both handled the
   same way: normalize-on-read, never rewrite-on-disk.
   - `recurrence.dayOfWeek` (a single number) -> `recurrence.daysOfWeek`
     (an array): a `normalizeRecurrence()` function treats an old single
     value as a one-item array, applied wherever recurrence is read.
   - `completionComment` (a single string) -> `followUpComments` (a dated
     array): a `getFollowUpComments()` function treats an old single
     comment as a one-item list.

In both shape-change cases, **the old field was never removed from the
schema** -- it stays readable indefinitely, and nothing ever force-
migrates a stored file. A task only ever gets the new shape once it's
actually edited again, incidentally, not as a deliberate step.

## Why this was more than a style preference

The person's data lives in an **external folder** (Google Drive, SharePoint,
or a git repo -- see `08-external-sync-and-storage.md`), meaning the
version of the app that happens to be running at any moment might be
old or new relative to whenever a given task was created. A forced
migration step would risk corrupting or silently losing data if an older
app version ever opened a "migrated" file, or if a migration step itself
had a bug. Normalize-on-read sidesteps the whole problem: the file on disk
never needs to be "correct" for any particular version, only readable.

## How this was actually verified, not just reasoned about

When asked directly, "is my tasks.json backward compatible with all these
changes, since it's in an external folder" -- rather than answering from
memory of the code, a genuinely bare-bones `tasks.json` was constructed by
hand: only the fields that existed in the very first version of the app,
missing every field added since (no `tagId`, `dueDate`, `isFollowUp`,
`followUpComments`, `completedSlots`; a legacy single `dayOfWeek` instead
of `daysOfWeek`). The real server was pointed directly at this file and
booted, and the result was checked three ways: the API responded
correctly, the data rendered with zero JavaScript errors in a real
browser, and the legacy recurring task correctly displayed "Repeats every
Wednesday" (proving the normalization shim actually ran, not just that
nothing crashed). This is the standard this project held itself to for
schema-compatibility claims: construct the actual old-shaped data and run
the real app against it, rather than asserting compatibility from reading
the code.

## The one related gap this surfaced

This exact verification approach also caught, by coincidence, that the
app's **90-day archiving feature ran automatically** the moment it was
pointed at old data containing a task completed long ago -- correctly
archiving it on first load. Worth knowing if "my task just disappeared"
is ever reported after a long period of not running the app: check
`archive_tasks.json` before assuming data loss.
