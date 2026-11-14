import TaskCard from "./TaskCard.jsx";

export default function Quadrant({ quadrant, tasks, dragOver, onDragOver, onDragLeave, onDrop, onDragStart, onToggle, onToggleTimeSlot, onDelete, onToggleFollowUp, onAddFollowUpComment, onEdit, tags, onAddTag, now }) {
  const importantRow = quadrant.important;

  return (
    <div
      className={`quadrant ${importantRow ? "row-important" : "row-not-important"} ${
        dragOver ? "drag-over" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="quadrant-header">
        <span className="quadrant-title">{quadrant.label}</span>
        <span className="quadrant-subtitle">{quadrant.subtitle}</span>
        <span className="count">{tasks.length}</span>
      </div>
      <div className="quadrant-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            notesMode="hover"
            now={now}
            tags={tags}
            onAddTag={onAddTag}
            onDragStart={() => onDragStart(task.id)}
            onToggle={() => onToggle(task)}
            onToggleTimeSlot={(time) => onToggleTimeSlot(task, time)}
            onDelete={() => onDelete(task.id)}
            onToggleFollowUp={() => onToggleFollowUp(task)}
            onAddFollowUpComment={(comment) => onAddFollowUpComment(task, comment)}
            onEdit={(title, notes, tagId, dueDate, recurrence) =>
              onEdit(task, title, notes, tagId, dueDate, recurrence)
            }
          />
        ))}
      </div>
    </div>
  );
}
