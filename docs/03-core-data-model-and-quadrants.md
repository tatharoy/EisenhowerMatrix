# Core Data Model & Quadrant Derivation

## The question that mattered most, early on

After the first working build, the person pushed back on an early design:
quadrants had been represented as a single stored label (`"do"`, `"schedule"`,
`"delegate"`, `"delete"`). They asked, correctly, whether this matched the
actual Eisenhower model: two independent axes, Urgent x Important, with the
four quadrants being the four *combinations*, not four independent things.

## The two options presented

**Option A -- two booleans** (`urgent: boolean|null`, `important:
boolean|null`), with the quadrant always *derived*, never stored. The
honest representation of the actual model, at the cost of needing a
third state (`null`/`null`) for "not yet placed."

**Option B -- a single quadrant label**, simpler code, same four cells,
but conceptually a flattening of the real two-axis model.

**Decision: Option A.** This single choice is the foundation nearly
everything later depends on:

```
deriveQuadrant(task):
  if urgent == null || important == null  -> "inbox"
  if  important &&  urgent -> "do"
  if  important && !urgent -> "schedule"
  if !important &&  urgent -> "delegate"
  if !important && !urgent -> "eliminate"
```

`frontend/src/quadrants.js`'s `quadrantKey()` is this function, and it is
**never** overridden by writing a different value into `urgent`/
`important` directly -- every later feature that needed a task to *look
like* it was in a different quadrant (timely tasks forced into Do,
multi-time-a-day tasks exempted from that) did so by adding a second,
*separate* derivation layer (`effectiveQuadrantKey`) on top, rather than
mutating the stored booleans. This separation -- "stored intent" vs.
"effective display" -- is what made later escalation features (due-today
forcing a task into Do) possible without ever lying about where the user
actually filed the task.

## The Inbox as a third state, not a fifth quadrant

`null`/`null` (unplaced) was deliberately not folded into one of the four
real quadrants, and not represented as "quadrant: eliminate" or similar --
it needed its own bucket so a freshly created task has somewhere to sit
before the person drags it anywhere. This is also why "due-today tasks get
force-displayed in Do" needed to apply even to *unplaced* tasks (see
`05-timely-and-recurring-tasks.md`) -- something needing attention today
shouldn't hide in limbo just because it was never dragged anywhere.

## Why this decision rippled forward

Every subsequent feature that touched "where does this task show up"
(timely due-date escalation, recurring-task escalation, the deliberate
exemption for multi-time-a-day tasks) was implemented as a layer on top of
`quadrantKey()`/`effectiveQuadrantKey()`, never as a change to how
urgent/important are stored or interpreted. That stability is a direct
consequence of getting this one representational decision right at the
start.
