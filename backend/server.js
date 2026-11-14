const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { FileRepository } = require("./repository");
const { MetadataStore } = require("./metadataStore");
const { ConfigStore } = require("./configStore");
const { createGitSyncScheduler, isGitRepo } = require("./gitSync");
const { runArchive } = require("./archiver");

const app = express();
const PORT = process.env.PORT || 4000;

// config.json and the local data folder normally live relative to this repo
// (config.json at the project root, data/ under backend/) -- that's exactly
// right for the standalone start.bat/start.sh flow, but wrong for a packaged
// Electron app, where the install directory is expected to be read-only (and
// on macOS, writing into the .app bundle breaks code signing). The Electron
// wrapper sets APP_DATA_DIR to its OS-standard, writable per-user data
// folder (e.g. %APPDATA%/TathasSchedule or ~/Library/Application
// Support/TathasSchedule) before requiring this file; when unset, everything
// behaves exactly as before.
const CONFIG_FILE = process.env.APP_DATA_DIR
  ? path.join(process.env.APP_DATA_DIR, "config.json")
  : path.join(__dirname, "..", "config.json");
const configStore = new ConfigStore(CONFIG_FILE);

const LOCAL_DATA_DIR = process.env.APP_DATA_DIR
  ? path.join(process.env.APP_DATA_DIR, "data")
  : path.join(__dirname, "data");
const DEFAULT_DB_FILE = path.join(LOCAL_DATA_DIR, "tasks.json");
const DEFAULT_METADATA_FILE = path.join(LOCAL_DATA_DIR, "metadata.json");

// Where should tasks.json / metadata.json actually live? Precedence:
//   1. DB_FILE / METADATA_FILE env vars (explicit, always wins)
//   2. config.json's externalFolder, if useExternalSync is on (the "external
//      flag" -- e.g. a OneDrive/SharePoint/Google Drive synced folder)
//   3. the local backend/data folder (default)
function resolveStoragePath(envVar, filename, defaultPath) {
  if (process.env[envVar]) return process.env[envVar];
  const cfg = configStore.get();
  if (cfg.useExternalSync && cfg.externalFolder) {
    return path.join(cfg.externalFolder, filename);
  }
  return defaultPath;
}

const DB_FILE = resolveStoragePath("DB_FILE", "tasks.json", DEFAULT_DB_FILE);
const METADATA_FILE = resolveStoragePath("METADATA_FILE", "metadata.json", DEFAULT_METADATA_FILE);

// If we're about to start reading from somewhere other than the local
// default, and that location doesn't have data yet but the local folder
// does, copy it over once. This means turning on external sync for the
// first time carries your existing tasks with it instead of silently
// starting empty. If the external location already has data (e.g. this is
// a second machine catching up to an already-synced copy), we leave it
// alone rather than overwriting it with this machine's local copy.
function migrateIfNeeded(resolvedPath, defaultPath, label) {
  if (resolvedPath === defaultPath) return;
  if (fs.existsSync(resolvedPath)) return;
  if (!fs.existsSync(defaultPath)) return;
  try {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.copyFileSync(defaultPath, resolvedPath);
    console.log(`Migrated existing ${label} to: ${resolvedPath}`);
  } catch (err) {
    console.log(`Could not migrate ${label} to ${resolvedPath}: ${err.message}`);
  }
}
migrateIfNeeded(DB_FILE, DEFAULT_DB_FILE, "tasks.json");
migrateIfNeeded(METADATA_FILE, DEFAULT_METADATA_FILE, "metadata.json");

const repo = new FileRepository(DB_FILE);
const metadata = new MetadataStore(METADATA_FILE);

// Record our own PID in a fixed local location (never the external sync
// folder) so stop.bat/stop.sh -- which look in that fixed spot -- can always
// find and stop this exact process, regardless of where task data lives.
if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
const PID_FILE = path.join(LOCAL_DATA_DIR, ".server.pid");
try {
  fs.writeFileSync(PID_FILE, String(process.pid));
} catch {
  // Non-fatal -- stop script just won't be able to find this PID.
}
function cleanupPidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}
process.on("exit", cleanupPidFile);
process.on("SIGINT", () => process.exit());
process.on("SIGTERM", () => process.exit());

// Git sync: only active when useExternalSync + syncMethod "git" are both
// set. getFolder() re-reads config live so a mid-session settings change is
// picked up without restarting (the folder/method itself still needs a
// restart to affect DB_FILE/METADATA_FILE, but the git-push behavior on top
// of wherever we're already writing can react immediately).
const gitScheduler = createGitSyncScheduler(() => {
  const cfg = configStore.get();
  if (cfg.useExternalSync && cfg.syncMethod === "git" && cfg.externalFolder) {
    return cfg.externalFolder;
  }
  return null;
});
function maybeSyncGit() {
  gitScheduler.schedule();
}

// Archiving: completed one-off tasks older than configStore's
// archiveAfterDays move out of tasks.json into archive_tasks.json, right
// next to it -- so it follows the same local/external-sync/git location
// tasks.json already resolves to, with no separate setting of its own.
// Config-file-only (no Settings UI, no API) -- edit config.json directly to
// change the threshold or set it to 0 to disable.
const ARCHIVE_FILE = path.join(path.dirname(DB_FILE), "archive_tasks.json");

function runArchiveCheck() {
  const cfg = configStore.get();
  const archived = runArchive(DB_FILE, ARCHIVE_FILE, cfg.archiveAfterDays);
  if (archived > 0) {
    console.log(`Archived ${archived} completed task(s) older than ${cfg.archiveAfterDays} days.`);
    maybeSyncGit();
  }
}
runArchiveCheck();
setInterval(runArchiveCheck, 24 * 60 * 60 * 1000);

app.use(cors());
app.use(express.json());

function validFlag(v) {
  return v === true || v === false || v === null;
}

function validTagId(tagId) {
  if (tagId === null) return true;
  return metadata.listTags().some((t) => t.id === tagId);
}

function validDateStr(v) {
  return v === null || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

function validDaysOfWeek(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}

function validTimeStr(v) {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function validTimesArray(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(validTimeStr);
}

function validRecurrence(v) {
  if (v === null) return true;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  const { frequency, dayOfWeek, daysOfWeek, dayOfMonth, anchorDate, times } = v;
  if (!["daily", "weekly", "biweekly", "monthly"].includes(frequency)) return false;
  if (frequency === "weekly") {
    // Accept either the new array form, or the legacy single-day form (kept
    // valid so old clients / stored data don't suddenly start failing).
    if (daysOfWeek !== undefined) return validDaysOfWeek(daysOfWeek);
    return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6;
  }
  if (frequency === "biweekly") {
    return validDaysOfWeek(daysOfWeek) && validDateStr(anchorDate) && anchorDate !== null;
  }
  if (frequency === "monthly") {
    return Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31;
  }
  // daily: "times" is optional -- absent/null means the existing once-a-day
  // behavior; a non-empty array of "HH:MM" strings means multiple-times-a-day
  if (frequency === "daily" && times !== undefined && times !== null) {
    return validTimesArray(times);
  }
  return true;
}

function validCompletedSlots(v) {
  if (v === null) return true;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  if (!validDateStr(v.date) || v.date === null) return false;
  return Array.isArray(v.times) && v.times.every(validTimeStr);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

app.get("/api/tasks", (req, res) => {
  res.json(repo.list());
});

app.post("/api/tasks", (req, res) => {
  const {
    title,
    notes = "",
    tagId = null,
    dueDate = null,
    recurrence = null,
    isFollowUp = false,
  } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!validTagId(tagId)) {
    return res.status(400).json({ error: "unknown tagId" });
  }
  if (!validDateStr(dueDate)) {
    return res.status(400).json({ error: "dueDate must be null or YYYY-MM-DD" });
  }
  if (!validRecurrence(recurrence)) {
    return res.status(400).json({ error: "invalid recurrence" });
  }
  if (typeof isFollowUp !== "boolean") {
    return res.status(400).json({ error: "isFollowUp must be a boolean" });
  }
  if (dueDate && recurrence) {
    return res
      .status(400)
      .json({ error: "a task can have a due date or a repeat schedule, not both" });
  }
  res.status(201).json(repo.create({ title, notes, tagId, dueDate, recurrence, isFollowUp }));
  maybeSyncGit();
});

app.patch("/api/tasks/:id", (req, res) => {
  const {
    urgent,
    important,
    completed,
    title,
    notes,
    tagId,
    dueDate,
    recurrence,
    lastCompletedDate,
    completedSlots,
    isFollowUp,
    completionComment,
  } = req.body || {};

  if (urgent !== undefined && !validFlag(urgent)) {
    return res.status(400).json({ error: "urgent must be true, false, or null" });
  }
  if (important !== undefined && !validFlag(important)) {
    return res.status(400).json({ error: "important must be true, false, or null" });
  }
  if (tagId !== undefined && !validTagId(tagId)) {
    return res.status(400).json({ error: "unknown tagId" });
  }
  if (dueDate !== undefined && !validDateStr(dueDate)) {
    return res.status(400).json({ error: "dueDate must be null or YYYY-MM-DD" });
  }
  if (recurrence !== undefined && !validRecurrence(recurrence)) {
    return res.status(400).json({ error: "invalid recurrence" });
  }
  if (lastCompletedDate !== undefined && !validDateStr(lastCompletedDate)) {
    return res.status(400).json({ error: "lastCompletedDate must be null or YYYY-MM-DD" });
  }
  if (completedSlots !== undefined && !validCompletedSlots(completedSlots)) {
    return res.status(400).json({ error: "invalid completedSlots" });
  }
  if (isFollowUp !== undefined && typeof isFollowUp !== "boolean") {
    return res.status(400).json({ error: "isFollowUp must be a boolean" });
  }
  if (
    completionComment !== undefined &&
    completionComment !== null &&
    typeof completionComment !== "string"
  ) {
    return res.status(400).json({ error: "completionComment must be a string or null" });
  }
  if (dueDate && recurrence) {
    return res
      .status(400)
      .json({ error: "a task can have a due date or a repeat schedule, not both" });
  }

  const updated = repo.update(req.params.id, {
    urgent,
    important,
    completed,
    title,
    notes,
    tagId,
    dueDate,
    recurrence,
    lastCompletedDate,
    completedSlots,
    isFollowUp,
    completionComment,
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
  maybeSyncGit();
});

app.delete("/api/tasks/:id", (req, res) => {
  const ok = repo.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "not found" });
  res.status(204).end();
  maybeSyncGit();
});

// Appends one dated follow-up entry -- independent of completion status.
// Unlike the completion comment used to be, this is NOT skippable: an empty
// comment wouldn't mean anything here, since the whole point of this
// endpoint is to log something.
app.post("/api/tasks/:id/followup-comments", (req, res) => {
  const { comment } = req.body || {};
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "comment is required" });
  }
  const updated = repo.appendFollowUpComment(req.params.id, comment.trim());
  if (!updated) return res.status(404).json({ error: "not found" });
  res.status(201).json(updated);
  maybeSyncGit();
});

// ---------------------------------------------------------------------------
// Metadata (app title + tag list)
// ---------------------------------------------------------------------------

app.get("/api/metadata", (req, res) => {
  res.json(metadata.get());
});

app.patch("/api/metadata", (req, res) => {
  const { title } = req.body || {};
  if (title === undefined) {
    return res.status(400).json({ error: "title is required" });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title must be a non-empty string" });
  }
  res.json(metadata.updateTitle(title.trim()));
  maybeSyncGit();
});

app.post("/api/metadata/tags", (req, res) => {
  const { name, color } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "tag name is required" });
  }
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "color must be a hex value like #3b6fa8" });
  }
  res.status(201).json(metadata.addTag({ name: name.trim(), color }));
  maybeSyncGit();
});

// ---------------------------------------------------------------------------
// Config (the external-sync-folder flag)
// ---------------------------------------------------------------------------
// Changing this takes effect on the next restart -- the running process
// already opened its files at DB_FILE/METADATA_FILE above, so we surface the
// currently-*active* paths alongside the saved setting, rather than pretend
// this hot-swaps.

app.get("/api/config", (req, res) => {
  const cfg = configStore.get();
  res.json({
    ...cfg,
    effectiveDbFile: DB_FILE,
    effectiveMetadataFile: METADATA_FILE,
    overriddenByEnv: !!(process.env.DB_FILE || process.env.METADATA_FILE),
    gitRepoDetected: cfg.externalFolder ? isGitRepo(cfg.externalFolder) : false,
    lastGitSync: gitScheduler.getLastResult(),
  });
});

app.patch("/api/config", (req, res) => {
  const {
    useExternalSync,
    externalFolder,
    syncMethod,
    reminderSound,
    reminderIntervalMinutes,
  } = req.body || {};
  if (useExternalSync !== undefined && typeof useExternalSync !== "boolean") {
    return res.status(400).json({ error: "useExternalSync must be a boolean" });
  }
  if (externalFolder !== undefined && externalFolder !== null && typeof externalFolder !== "string") {
    return res.status(400).json({ error: "externalFolder must be a string or null" });
  }
  if (syncMethod !== undefined && !["folder", "git"].includes(syncMethod)) {
    return res.status(400).json({ error: 'syncMethod must be "folder" or "git"' });
  }
  if (reminderSound !== undefined && !["none", "bell", "alert"].includes(reminderSound)) {
    return res.status(400).json({ error: 'reminderSound must be "none", "bell", or "alert"' });
  }
  if (
    reminderIntervalMinutes !== undefined &&
    (!Number.isInteger(reminderIntervalMinutes) || reminderIntervalMinutes < 1)
  ) {
    return res.status(400).json({ error: "reminderIntervalMinutes must be a positive integer" });
  }
  const next = { ...configStore.get(), ...req.body };
  if (next.useExternalSync && (!next.externalFolder || !next.externalFolder.trim())) {
    return res
      .status(400)
      .json({ error: "externalFolder is required when useExternalSync is true" });
  }
  const before = configStore.get();
  const updated = configStore.update({
    useExternalSync,
    externalFolder,
    syncMethod,
    reminderSound,
    reminderIntervalMinutes,
  });
  // Only the storage-location fields actually need a restart to take effect
  // (DB_FILE/METADATA_FILE are resolved once at startup) -- the reminder
  // sound is read live on every /api/config fetch, no restart needed.
  // Compare actual before/after values rather than just whether the field
  // was present in the request -- the Settings panel always sends its full
  // form state together, so presence alone would wrongly flag every save
  // (even a sound-only change) as needing a restart.
  const storageFieldsChanged =
    before.useExternalSync !== updated.useExternalSync ||
    before.externalFolder !== updated.externalFolder ||
    before.syncMethod !== updated.syncMethod;
  res.json({
    ...updated,
    effectiveDbFile: DB_FILE,
    effectiveMetadataFile: METADATA_FILE,
    overriddenByEnv: !!(process.env.DB_FILE || process.env.METADATA_FILE),
    gitRepoDetected: updated.externalFolder ? isGitRepo(updated.externalFolder) : false,
    lastGitSync: gitScheduler.getLastResult(),
    restartRequired: storageFieldsChanged,
  });
});

// ---------------------------------------------------------------------------
// Serve the built frontend (created by `npm run build` in /frontend).
// This lets the whole app run as a single process on a single port --
// no separate Vite dev server needed for everyday / auto-start use.
// ---------------------------------------------------------------------------

const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback: any non-API GET serves index.html. Using a regex (rather
  // than a bare "*") avoids path-to-regexp version quirks across Express
  // versions, and the negative lookahead keeps /api/* 404s honest instead
  // of masking them with the HTML page.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  console.log(
    "No frontend build found at frontend/dist -- run `npm run build` in " +
      "/frontend, or use `npm run dev` there for local development."
  );
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Tatha's Schedule running at ${url}`);
  console.log(`Tasks file: ${DB_FILE}`);
  console.log(`Metadata file: ${METADATA_FILE}`);

  if (process.env.OPEN_BROWSER !== "false") {
    const cmd =
      process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, (err) => {
      if (err) console.log(`Could not auto-open browser -- open it manually: ${url}`);
    });
  }
});
