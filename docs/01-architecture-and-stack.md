# Architecture & Tech Stack

## The ask

A personal Eisenhower-matrix task scheduler: create tasks, drag them into
the four quadrants, check them off into a Completed section. Requested as
"React frontend, Node backend."

## Decisions

**React (Vite) + Express**, chosen directly per the request rather than
debated. Vite over Create React App for a faster dev loop; Express because
it's the simplest thing that could serve a small REST API.

**Storage: a single JSON file, not a database**, read/written wholesale on
every operation. This was an explicit simplicity trade-off: no DB server to
install, trivially inspectable/editable by hand, trivially backed up (it's
just a file). The known cost -- last-write-wins, no real concurrency
control, everything loads into memory per request -- was accepted
up front as fine for "one person, one machine" and never revisited, because
it never actually caused a problem at the scale this app runs at.

**A repository pattern from day one** (`FileRepository` class in
`backend/repository.js`, exposing `list/create/update/remove`), specifically
so that "swap file storage for a real SharePoint List via Microsoft Graph,
or a real database" would be a contained change later (implement the same
four methods, swap the import in `server.js`) rather than a rewrite. This
was motivated by the person's own stated background (AWS/Azure, Spring
Boot/JPA) -- they'd recognize the pattern and the reasoning for it. This
abstraction was never actually swapped out over the project's life, but it
shaped `metadataStore.js`, `configStore.js`, and `archiver.js` later, which
all follow the same "small class wrapping a JSON file" shape.

**No ORM, no build step for the backend.** Plain `fs.readFileSync`/
`writeFileSync`, synchronous, no async file I/O. Deliberate -- the
dataset size (one person's tasks) never justified the complexity of async
file handling or a query layer.

## What this enabled later

The repository/store pattern is the reason several much later features
were cheap to add:
- `configStore.js` (external sync settings) and `archiver.js` (the 90-day
  archive) both reused the exact same "small class, JSON file, explicit
  methods" shape without needing to invent a new persistence idiom.
- Swapping storage location (local folder -> external synced folder -> git
  repo) only ever required changing *where* `DB_FILE`/`METADATA_FILE`
  point, never *how* they're read/written -- see
  `08-external-sync-and-storage.md`.
