import { useState } from "react";

const PRESET_COLORS = [
  "#3b6fa8", // blue
  "#2f7d4f", // green
  "#a8672f", // amber
  "#a84f6f", // rose
  "#6f4fa8", // purple
  "#2f8d8d", // teal
  "#7a7a72", // gray
  "#b0402f", // red
];

export default function TagPicker({ tags, value, onChange, onAddTag }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  function handleSelect(e) {
    const v = e.target.value;
    if (v === "__add__") {
      setAdding(true);
      return;
    }
    onChange(v || null);
  }

  async function submitNewTag(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const tag = await onAddTag({ name: name.trim(), color });
    setAdding(false);
    setName("");
    setColor(PRESET_COLORS[0]);
    if (tag) onChange(tag.id);
  }

  if (adding) {
    return (
      <form className="tag-add-form" onSubmit={submitNewTag}>
        <input
          type="text"
          placeholder="New tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="swatch-row">
          {PRESET_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${color === c ? "selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Choose color ${c}`}
            />
          ))}
        </div>
        <div className="tag-add-actions">
          <button type="submit">Add tag</button>
          <button type="button" className="ghost" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <select className="tag-select" value={value || ""} onChange={handleSelect} aria-label="Tag">
      <option value="">No tag</option>
      {tags.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
      <option value="__add__">+ New tag…</option>
    </select>
  );
}
