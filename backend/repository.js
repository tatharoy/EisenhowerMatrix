const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// TaskRepository interface (informal):
//   list()            -> Task[]
//   create({title, notes}) -> Task
//   update(id, patch) -> Task | null
//   remove(id)        -> boolean
//
// FileRepository below persists to a single JSON file. Point DB_FILE at a
// OneDrive/SharePoint-synced folder to satisfy "file or SharePoint" storage
// with zero code changes. To add a true SharePoint List backend later,
// implement the same four methods against Microsoft Graph and swap it in
// server.js -- the REST layer stays identical.
// ---------------------------------------------------------------------------

class FileRepository {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this._ensure();
  }

  _ensure() {
    const dir = path.dirname(this.dbFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.dbFile)) {
      fs.writeFileSync(this.dbFile, JSON.stringify({ tasks: [] }, null, 2));
    }
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.dbFile, "utf-8"));
    } catch {
      return { tasks: [] };
    }
  }

  // Last-write-wins. Fine for a single-user local tool.
  _write(db) {
    fs.writeFileSync(this.dbFile, JSON.stringify(db, null, 2));
  }

  list() {
    return this._read().tasks;
  }

  create({ title, notes = "", tagId = null, dueDate = null, recurrence = null, isFollowUp = false }) {
    const db = this._read();
    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      notes,
      tagId: tagId || null, // optional, references a tag id in metadata.json
      dueDate: dueDate || null, // "YYYY-MM-DD", one-off deadline (mutually exclusive with recurrence)
      recurrence: recurrence || null, // { frequency, dayOfWeek?, dayOfMonth? } (mutually exclusive with dueDate)
      lastCompletedDate: null, // "YYYY-MM-DD" -- last cycle a recurring task was checked off
      isFollowUp: !!isFollowUp, // flags this task as needing a completion comment
      completionComment: null, // set (optionally) when marking a follow-up task done
      urgent: null, // null = unplaced (inbox)
      important: null, // null = unplaced (inbox)
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    db.tasks.push(task);
    this._write(db);
    return task;
  }

  update(id, patch) {
    const db = this._read();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return null;

    if (patch.title !== undefined) task.title = patch.title;
    if (patch.notes !== undefined) task.notes = patch.notes;
    if (patch.tagId !== undefined) task.tagId = patch.tagId;
    if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
    if (patch.recurrence !== undefined) task.recurrence = patch.recurrence;
    if (patch.lastCompletedDate !== undefined) task.lastCompletedDate = patch.lastCompletedDate;
    if (patch.isFollowUp !== undefined) task.isFollowUp = !!patch.isFollowUp;
    if (patch.completionComment !== undefined) task.completionComment = patch.completionComment;
    if (patch.urgent !== undefined) task.urgent = patch.urgent;
    if (patch.important !== undefined) task.important = patch.important;
    if (patch.completed !== undefined) {
      task.completed = !!patch.completed;
      task.completedAt = patch.completed ? new Date().toISOString() : null;
    }

    this._write(db);
    return task;
  }

  remove(id) {
    const db = this._read();
    const before = db.tasks.length;
    db.tasks = db.tasks.filter((t) => t.id !== id);
    if (db.tasks.length === before) return false;
    this._write(db);
    return true;
  }
}

module.exports = { FileRepository };
