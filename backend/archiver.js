const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Moves completed one-off tasks older than `archiveAfterDays` out of the
// active tasks file and into a separate archive file -- a pure backup dump,
// not something the app reads back or exposes through the UI/API. Recurring
// tasks are never touched (they never set `completed: true`, so they can
// never match the archive condition in the first place).
// ---------------------------------------------------------------------------

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Returns the number of tasks archived (0 if none, or if archiving is
// disabled via archiveAfterDays <= 0).
function runArchive(dbFile, archiveFile, archiveAfterDays) {
  if (!archiveAfterDays || archiveAfterDays <= 0) return 0;

  const db = readJson(dbFile, { tasks: [] });
  const cutoff = Date.now() - archiveAfterDays * 24 * 60 * 60 * 1000;

  const keep = [];
  const toArchive = [];
  for (const task of db.tasks) {
    const isOldCompleted =
      task.completed && task.completedAt && new Date(task.completedAt).getTime() < cutoff;
    (isOldCompleted ? toArchive : keep).push(task);
  }

  if (toArchive.length === 0) return 0;

  const archiveDir = path.dirname(archiveFile);
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  const archive = readJson(archiveFile, { tasks: [] });
  archive.tasks.push(...toArchive);
  writeJson(archiveFile, archive);

  db.tasks = keep;
  writeJson(dbFile, db);

  return toArchive.length;
}

module.exports = { runArchive };
