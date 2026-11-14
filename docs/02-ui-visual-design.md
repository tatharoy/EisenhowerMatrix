# UI & Visual Design

## The ask

"I want it simple. Not too many color schemes." Before any code was
written, the person asked to see prototypes first and iterate on look and
feel -- a pattern that repeated for every major visual addition afterward
(sounds were even previewed live via synthesized audio before being wired
into the real app).

## The prototype review

Two directions were mocked up and shown side by side:
1. **Neutral** -- near-monochrome: one dark accent color, gray hairlines,
   a dark/light top border stripe on each quadrant to distinguish
   "important" from "not important" rows.
2. **Soft-tint** -- the four quadrant colors from the person's own
   reference image (a standard Eisenhower matrix diagram), but desaturated
   down to a calm, muted version of each.

**Decision: Neutral.** Confirmed explicitly, along with three follow-up
choices in the same round:
- **Drag handle** (a visible grip icon) rather than "drag anywhere on the
  card" -- an explicit, discoverable affordance.
- **Inbox as a horizontal strip above the matrix**, not a sidebar.
- **Light/dark: auto-adapt to system theme** (not a manual toggle, not
  light-only).

## Why this mattered for everything built afterward

The neutral palette became a real constraint, actively enforced in later
reviews -- when color was introduced for tags (multiple hues, since tags
are arbitrary user categories) and for due-status badges (yellow/red,
functional signal rather than decoration), each was deliberately kept
*muted*, consistent with the original "not too many color schemes" ask,
rather than reaching for saturated colors by default. The same restraint
shaped the "Reminder sound" feature much later: candidate sounds were
synthesized tones (Web Audio oscillators), not a grab bag of loud effects,
in the same spirit as the muted color story.

## Technical implementation note

All colors are CSS custom properties on `:root`, redefined under
`@media (prefers-color-scheme: dark)`, rather than a JS-driven theme
toggle -- this is what makes the "auto-adapt" behavior work for free,
including inside the Electron-packaged app (same CSS, same OS-level
preference, no extra code).
