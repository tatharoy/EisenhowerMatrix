const fs = require("fs");

// ---------------------------------------------------------------------------
// Stores the "where should tasks.json / metadata.json actually live" setting.
// Deliberately kept OUTSIDE backend/data -- this file is a *setting*, not
// data, so it survives independently of the data folder and isn't wiped if
// someone clears their tasks.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  useExternalSync: false,
  externalFolder: null, // e.g. a OneDrive/SharePoint/Google Drive synced folder
  syncMethod: "folder", // "folder" (just a synced folder) | "git" (also auto commit+push)
  archiveAfterDays: 90, // completed one-off tasks older than this move to archive_tasks.json.
  // 0 or null disables archiving entirely. config.json-only (no Settings UI,
  // no PATCH /api/config support) -- edit the file directly to change this.
  reminderSound: "none", // "none" | "bell" | "alert" -- plays while any task is
  // due today or overdue. Unlike archiveAfterDays, this one has a Settings
  // panel control since it's something you'd want to toggle/preview live.
  reminderIntervalMinutes: 30, // how often the reminder repeats while still due
};

class ConfigStore {
  constructor(file) {
    this.file = file;
    this._ensure();
  }

  _ensure() {
    if (!fs.existsSync(this.file)) {
      this._write(DEFAULT_CONFIG);
    }
  }

  _read() {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(this.file, "utf-8")) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  _write(data) {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  get() {
    return this._read();
  }

  update(patch) {
    const data = this._read();
    if (patch.useExternalSync !== undefined) data.useExternalSync = !!patch.useExternalSync;
    if (patch.externalFolder !== undefined) data.externalFolder = patch.externalFolder;
    if (patch.syncMethod !== undefined) data.syncMethod = patch.syncMethod;
    if (patch.reminderSound !== undefined) data.reminderSound = patch.reminderSound;
    if (patch.reminderIntervalMinutes !== undefined)
      data.reminderIntervalMinutes = patch.reminderIntervalMinutes;
    this._write(data);
    return data;
  }
}

module.exports = { ConfigStore, DEFAULT_CONFIG };
