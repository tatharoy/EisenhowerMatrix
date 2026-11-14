# Project Decision & Design Docs

This folder is the design history of this app -- not *what* it does (that's
`README.md`) and not a short orientation for picking the project back up
(that's `CLAUDE.md`), but *why* it ended up the way it did: the requirements
as they were actually phrased, the options weighed, what was decided, and
what was deliberately left out or deferred.

It was reconstructed from a long iterative conversation with Claude
(claude.ai), synthesized rather than transcribed verbatim -- each file
captures the substance of the discussion, not the exact wording.

## Reading order (roughly chronological)

1. [`01-architecture-and-stack.md`](01-architecture-and-stack.md) -- why
   React + Node, file-based storage, the repository pattern
2. [`02-ui-visual-design.md`](02-ui-visual-design.md) -- the neutral-vs-tinted
   prototype review, drag handle, inbox layout
3. [`03-core-data-model-and-quadrants.md`](03-core-data-model-and-quadrants.md)
   -- two booleans vs. a single quadrant field, and why
4. [`04-tags-voice-and-editing.md`](04-tags-voice-and-editing.md) -- tags,
   Web Speech API, and the evolving rules for what's editable when
5. [`05-timely-and-recurring-tasks.md`](05-timely-and-recurring-tasks.md) --
   due dates, recurrence, and its expansion to biweekly / multi-day /
   multiple-times-a-day
6. [`06-follow-up-tasks.md`](06-follow-up-tasks.md) -- the two-iteration
   redesign from a single completion comment to multi-entry follow-ups
7. [`07-standalone-packaging.md`](07-standalone-packaging.md) -- start.bat/
   start.sh, the single-process design, PID-based stop scripts
8. [`08-external-sync-and-storage.md`](08-external-sync-and-storage.md) --
   config.json, external folders, git sync, the SharePoint/Drive/GitHub
   question
9. [`09-archiving-and-reminders.md`](09-archiving-and-reminders.md) -- the
   90-day archive and the reminder-sound feature
10. [`10-electron-desktop-app.md`](10-electron-desktop-app.md) -- the
    Windows/macOS app, its bugs, and the rename
11. [`11-backward-compatibility.md`](11-backward-compatibility.md) -- the
    standing rule behind every schema change, and how it was verified

See also: [`CHANGELOG.md`](CHANGELOG.md) for a flat, dated list of what
shipped in each round, independent of the thematic grouping above.
