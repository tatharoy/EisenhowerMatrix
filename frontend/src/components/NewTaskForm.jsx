import { useState } from "react";
import MicButton from "./MicButton.jsx";
import TagPicker from "./TagPicker.jsx";
import TimingPicker from "./TimingPicker.jsx";

export default function NewTaskForm({ onAdd, tags, onAddTag }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagId, setTagId] = useState(null);
  const [timing, setTiming] = useState({ dueDate: null, recurrence: null });
  const [isFollowUp, setIsFollowUp] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      notes: notes.trim(),
      tagId,
      dueDate: timing.dueDate,
      recurrence: timing.recurrence,
      isFollowUp,
    });
    setTitle("");
    setNotes("");
    setTagId(null);
    setTiming({ dueDate: null, recurrence: null });
    setIsFollowUp(false);
  }

  return (
    <form className="new-task" onSubmit={submit}>
      <div className="new-task-row">
        <input
          type="text"
          placeholder="New task title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <MicButton onTranscript={(text) => setTitle((t) => (t ? `${t} ${text}` : text))} />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="new-task-row">
        <TagPicker tags={tags} value={tagId} onChange={setTagId} onAddTag={onAddTag} />
        <TimingPicker value={timing} onChange={setTiming} />
        <label className="followup-checkbox-row">
          <input
            type="checkbox"
            checked={isFollowUp}
            onChange={(e) => setIsFollowUp(e.target.checked)}
          />
          Follow-up
        </label>
        <button type="submit">Add task</button>
      </div>
    </form>
  );
}
