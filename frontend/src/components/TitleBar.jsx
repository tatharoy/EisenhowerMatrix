import { useState } from "react";
import { PencilIcon } from "../icons.jsx";

export default function TitleBar({ title, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  function startEdit() {
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== title) onChange(trimmed);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        className="title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        autoFocus
      />
    );
  }

  return (
    <h1 className="title-display" onClick={startEdit} title="Click to rename">
      {title}
      <PencilIcon className="title-edit-icon" />
    </h1>
  );
}
