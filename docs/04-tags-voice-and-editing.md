# Tags, Voice Input, and Editing

## Tags

**The ask:** color-coded tags, specifically Client / Deloitte / Personal,
with the ability to add more later.

**Decisions:**
- Tags are a *separate concept from* follow-ups and from quadrant
  placement -- a task can carry a tag, be a follow-up, and sit in any
  quadrant, all independently.
- Three default tags ship with fixed, stable IDs (`client`, `deloitte`,
  `personal`) so they're reliable references even if the display name or
  color is edited later; new tags added through the UI get a generated
  UUID.
- Colors are muted/desaturated, consistent with the neutral visual
  direction (see `02-ui-visual-design.md`), not an arbitrary color wheel.
- New tags are created inline, from within the task-creation tag dropdown
  (a "+ New tag..." option that reveals a name field and a preset-swatch
  color picker), rather than a separate "manage tags" screen -- kept the
  interaction minimal since tag creation is rare relative to tag use.

## Voice input

**The ask:** add a microphone option to fill in a task by speaking instead
of typing.

**The real decision was about *where the speech recognition runs*:**
- **Option A, chosen:** the browser's native Web Speech API
  (`SpeechRecognition`/`webkitSpeechRecognition`) -- zero infrastructure,
  no API key, works immediately in Chrome/Edge (the person's stated
  browsers). Explicitly scoped as Chrome/Edge-only; Firefox and Safari
  don't support it.
- **Option B, deferred:** record audio client-side and POST it to a new
  backend endpoint backed by a cloud STT service (Azure Speech was named
  as the natural fit, given the person's Azure background) -- more
  accurate, works everywhere, but needs an account, a key, and ongoing
  cost. Explicitly designed as a drop-in replacement for `useSpeech.js`
  alone, so the rest of the app wouldn't need to change if this became
  necessary.

**This resurfaced much later** when the Electron-packaged desktop app's mic
button stopped working -- see `10-electron-desktop-app.md`. The decision
not to build Option B up front turned out to matter: Electron's bundled
Chromium lacks the signed API keys that make Option A's cloud backend
reachable from real Chrome/Edge, a limitation that was undiscoverable until
the app was actually packaged and run outside a normal browser.

**Icon reliability:** early on, the mic/grip/delete icons used a
CDN-hosted icon font (Tabler Icons). The person reported the mic icon
rendering as a blank box, which was correctly diagnosed as the icon-font
CDN likely being blocked by a corporate network -- not a logic bug. Fixed
by replacing every icon with inline, hand-written SVG, removing the
external dependency entirely. This became the standing pattern for every
icon added afterward (flag, repeat, settings, pencil, message-bubble, etc.)
-- never reach for an external icon library again in this project.

## Editing tasks -- the eligibility rule evolved in two steps

1. **First version:** editable (title + notes only) if a task was **not
   completed and not recurring**. Recurring tasks were excluded because,
   at the time, their repeat schedule itself wasn't editable, and allowing
   title/notes edits while locking the schedule felt like an arbitrary
   half-measure.
2. **Revised when recurrence became editable too** (prompted by a direct
   question: "should recurrence also become editable, not just due
   date?"): once the repeat schedule could change after creation, there
   was no remaining reason to exclude recurring tasks from editing at all.
   The rule simplified to just **not completed** -- full stop. This is a
   good example of a rule that looked complete until a later, unrelated
   feature request exposed that it wasn't actually justified on its own
   terms.

The edit form reuses the exact same `TagPicker` and `TimingPicker`
components used at creation time, rather than a parallel/simplified edit
widget -- less code, and guarantees editing can never do less than
creation can.

Editing enforcement is **client-side only**, by deliberate choice (asked
and confirmed directly) -- the backend accepts a patch to any field on any
task regardless of its completion state. Acceptable for a personal,
single-user tool; flagged in the README as a thing to revisit if that
changes.
