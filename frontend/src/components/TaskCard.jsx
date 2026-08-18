import { useState } from "react";
import { GripIcon, XIcon, RepeatIcon, FlagIcon, PencilIcon } from "../icons.jsx";
import { dueStatus, isDoneForNow, recurrenceLabel, formatDateStr } from "../quadrants.js";
import CompletionPrompt from "./CompletionPrompt.jsx";

// notesMode: "inline" (always visible under the title, used in Inbox) or
// "hover" (revealed as a tooltip on hover, used inside the 4 quadrants).
export default function TaskCard({
  task,
  onDragStart,
  onToggle,
  onDelete,
  onToggleFollowUp,
  onEdit,
  notesMode = "inline",
  now,
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNotes, setDraftNotes] = useState(task.notes || "");
  const [titleError, setTitleError] = useState(false);

  const hasNotes = !!task.notes;
  const status = dueStatus(task, now); // 'dueToday' | 'overdue' | null
  const checked = isDoneForNow(task, now);

  // Editable while it's still "live" -- once a one-off task is completed it
  // becomes a historical record, same reasoning as why completion comments
  // can't be changed afterward. Recurring tasks are excluded entirely (their
  // title/notes are fixed at creation, same as their repeat schedule).
  const editable = !task.recurrence && !task.completed;

  const cardClass = [
    "card",
    status === "dueToday" ? "due-today" : "",
    status === "overdue" ? "overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleCheckboxChange() {
    // Completing (not un-completing) a follow-up task pauses for a comment
    // instead of finishing immediately. Un-checking, and any change on a
    // non-follow-up task, stays instant.
    if (!checked && task.isFollowUp) {
      setConfirming(true);
    } else {
      onToggle();
    }
  }

  function handleCompletePrompt(comment) {
    onToggle(comment);
    setConfirming(false);
  }

  function startEdit() {
    setDraftTitle(task.title);
    setDraftNotes(task.notes || "");
    setTitleError(false);
    setEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    onEdit(trimmed, draftNotes.trim());
    setEditing(false);
  }

  if (confirming) {
    return (
      <div className={cardClass}>
        <span className="grip" aria-hidden="true">
          <GripIcon />
        </span>
        <div className="card-body">
          <div className="card-title-row">
            <span className="card-title">{task.title}</span>
            <span className="follow-up-badge">
              <FlagIcon filled /> Follow-up
            </span>
          </div>
          <CompletionPrompt onComplete={handleCompletePrompt} onCancel={() => setConfirming(false)} />
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className={cardClass}>
        <span className="grip" aria-hidden="true">
          <GripIcon />
        </span>
        <div className="card-body">
          <form className="edit-task-form" onSubmit={saveEdit}>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => {
                setDraftTitle(e.target.value);
                setTitleError(false);
              }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
            />
            {titleError && <div className="edit-task-error">Title can't be empty.</div>}
            <div className="edit-task-actions">
              <button type="submit">Save</button>
              <button type="button" className="ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass} draggable onDragStart={onDragStart}>
      <span className="grip" aria-hidden="true">
        <GripIcon />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleCheckboxChange}
        aria-label={`Mark "${task.title}" complete`}
      />
      <div className="card-body">
        <div className="card-title-row">
          <span className="card-title">{task.title}</span>
          {task.isFollowUp && (
            <span className="follow-up-badge">
              <FlagIcon filled /> Follow-up
            </span>
          )}
          {task.recurrence && (
            <span className="recur-badge" title={recurrenceLabel(task.recurrence)}>
              <RepeatIcon />
            </span>
          )}
          {task.tag && (
            <span
              className="tag-badge"
              style={{
                background: `${task.tag.color}1f`,
                color: task.tag.color,
                borderColor: `${task.tag.color}55`,
              }}
            >
              {task.tag.name}
            </span>
          )}
        </div>

        {status && (
          <div className={`due-label ${status}`}>
            {status === "dueToday"
              ? "Due today"
              : `Overdue${task.dueDate ? ` since ${formatDateStr(task.dueDate)}` : ""}`}
          </div>
        )}
        {task.recurrence && <div className="recur-label">{recurrenceLabel(task.recurrence)}</div>}
        {task.completionComment && (
          <div className="completion-comment">&ldquo;{task.completionComment}&rdquo;</div>
        )}

        {notesMode === "inline" && hasNotes && <div className="card-notes">{task.notes}</div>}
        {notesMode === "hover" && hasNotes && (
          <div className="card-tooltip" role="tooltip">
            {task.notes}
          </div>
        )}
      </div>
      {editable && (
        <button className="link-btn" onClick={startEdit} aria-label="Edit task" title="Edit task">
          <PencilIcon />
        </button>
      )}
      <button
        className={`link-btn flag-toggle ${task.isFollowUp ? "active" : ""}`}
        onClick={onToggleFollowUp}
        aria-label={task.isFollowUp ? "Remove follow-up flag" : "Mark as follow-up"}
        title={task.isFollowUp ? "Remove follow-up flag" : "Mark as follow-up"}
      >
        <FlagIcon filled={task.isFollowUp} />
      </button>
      <button className="link-btn" onClick={onDelete} aria-label="Delete task" title="Delete">
        <XIcon />
      </button>
    </div>
  );
}
