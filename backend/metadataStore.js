const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Stores app-level metadata (the page title and the list of available tags)
// in its own JSON file, separate from tasks.json. Same pattern as
// repository.js: point METADATA_FILE at a OneDrive/SharePoint-synced folder
// to get that persisted there with no code changes.
// ---------------------------------------------------------------------------

const DEFAULT_TITLE = "Eisenhower Matrix";

// Fixed ids for the built-in tags so they're stable references even though
// the human-readable name or color could be edited later. Tags added later
// via the UI get a generated UUID.
const DEFAULT_TAGS = [
  { id: "client", name: "Client", color: "#3b6fa8" },
  { id: "deloitte", name: "Deloitte", color: "#2f7d4f" },
  { id: "personal", name: "Personal", color: "#a8672f" },
];

class MetadataStore {
  constructor(file) {
    this.file = file;
    this._ensure();
  }

  _ensure() {
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.file)) {
      this._write({ title: DEFAULT_TITLE, tags: DEFAULT_TAGS });
    }
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch {
      return { title: DEFAULT_TITLE, tags: DEFAULT_TAGS };
    }
  }

  _write(data) {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  get() {
    return this._read();
  }

  listTags() {
    return this._read().tags;
  }

  updateTitle(title) {
    const data = this._read();
    data.title = title;
    this._write(data);
    return data;
  }

  addTag({ name, color }) {
    const data = this._read();
    const tag = { id: crypto.randomUUID(), name, color };
    data.tags.push(tag);
    this._write(data);
    return tag;
  }
}

module.exports = { MetadataStore, DEFAULT_TITLE, DEFAULT_TAGS };
