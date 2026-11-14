import { useState } from "react";
import { GripIcon, XIcon, RepeatIcon, FlagIcon, PencilIcon, MessageIcon } from "../icons.jsx";
import {
  dueStatus,
  isDoneForNow,
  recurrenceLabel,
  formatDateStr,
  formatDate,
  formatTimeStr,
  getFollowUpComments,
  isMultiTimeTask,
  isSlotDoneToday,
} from "../quadrants.js";
import FollowUpCommentForm from "./FollowUpCommentForm.jsx";
import TagPicker from "./TagPicker.jsx";
import TimingPicker from "./TimingPicker.jsx";

// notesMode: "inline" (always visible under the title, used in Inbox) or
// "hover" (revealed as a tooltip on hover, used inside the 4 quadrants).
export default function TaskCard({
  task,
  onDragStart,
  onToggle,
  onToggleTimeSlot,
  onDelete,
  onToggleFollowUp,
  onAddFollowUpComment,
  onEdit,
  tags,
  onAddTag,
  notesMode = "inline",
  now,
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNotes, setDraftNotes] = useState(task.notes || "");
  const [draftTagId, setDraftTagId] = useState(task.tagId);
  const [draftTiming, setDraftTiming] = useState({
    dueDate: task.dueDate,
    recurrence: task.recurrence,
  });
  const [titleError, setTitleError] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const hasNotes = !!task.notes;
  const status = dueStatus(task, now); // 'dueToday' | 'overdue' | null
  const checked = isDoneForNow(task, now);
  const comments = getFollowUpComments(task);
  // Multiple-times-a-day tasks get a per-time checklist instead of a single
  // checkbox, no due/overdue badge, and never escalate into Do -- see
  // dueStatus/effectiveQuadrantKey in quadrants.js for the exemption.
  const multiTime = isMultiTimeTask(task);

  // Editable while it's still "live" -- once completed it becomes a
  // historical record. Recurring tasks are included, since recurrence
  // itself is editable alongside title/notes/tag/due-date.
  const editable = !task.completed;
  // Logging a follow-up only makes sense while the task is still active --
  // same boundary as editing.
  const canAddFollowUp = task.isFollowUp && !task.completed;

  const cardClass = [
    "card",
    status === "dueToday" ? "due-today" : "",
    status === "overdue" ? "overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function startEdit() {
    setDraftTitle(task.title);
    setDraftNotes(task.notes || "");
    setDraftTagId(task.tagId);
    setDraftTiming({ dueDate: task.dueDate, recurrence: task.recurrence });
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
    onEdit(trimmed, draftNotes.trim(), draftTagId, draftTiming.dueDate, draftTiming.recurrence);
    setEditing(false);
  }

  function submitFollowUp(comment) {
    onAddFollowUpComment(comment);
    setAddingFollowUp(false);
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
            <div className="edit-task-row">
              <TagPicker tags={tags} value={draftTagId} onChange={setDraftTagId} onAddTag={onAddTag} />
              <TimingPicker value={draftTiming} onChange={setDraftTiming} />
            </div>
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

  if (addingFollowUp) {
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
          <FollowUpCommentForm onSubmit={submitFollowUp} onCancel={() => setAddingFollowUp(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass} draggable onDragStart={onDragStart}>
      <span className="grip" aria-hidden="true">
        <GripIcon />
      </span>
      {!multiTime && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Mark "${task.title}" complete`}
        />
      )}
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

        {multiTime && (
          <div className="time-slots-row">
            {task.recurrence.times.map((t) => (
              <label className="time-slot" key={t}>
                <input
                  type="checkbox"
                  checked={isSlotDoneToday(task, t, now)}
                  onChange={() => onToggleTimeSlot(t)}
                />
                {formatTimeStr(t)}
              </label>
            ))}
          </div>
        )}

        {comments.length > 0 && (
          <div className="followup-comments">
            <div className="followup-comment-entry">
              <span className="followup-comment-date">
                {formatDate(comments[comments.length - 1].at)}
              </span>{" "}
              &ldquo;{comments[comments.length - 1].comment}&rdquo;
            </div>
            {comments.length > 1 && (
              <button
                type="button"
                className="followup-comment-toggle"
                onClick={() => setShowAllComments((s) => !s)}
              >
                {showAllComments
                  ? "Hide earlier updates"
                  : `${comments.length - 1} earlier update${comments.length - 1 > 1 ? "s" : ""}`}
              </button>
            )}
            {showAllComments &&
              comments
                .slice(0, -1)
                .reverse()
                .map((c, i) => (
                  <div className="followup-comment-entry" key={i}>
                    <span className="followup-comment-date">{formatDate(c.at)}</span>{" "}
                    &ldquo;{c.comment}&rdquo;
                  </div>
                ))}
          </div>
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
      {canAddFollowUp && (
        <button
          className="link-btn"
          onClick={() => setAddingFollowUp(true)}
          aria-label="Add follow-up update"
          title="Add follow-up update"
        >
          <MessageIcon />
        </button>
      )}
      <button className="link-btn" onClick={onDelete} aria-label="Delete task" title="Delete">
        <XIcon />
      </button>
    </div>
  );
}
