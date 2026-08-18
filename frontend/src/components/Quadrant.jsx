import TaskCard from "./TaskCard.jsx";

export default function Quadrant({ quadrant, tasks, dragOver, onDragOver, onDragLeave, onDrop, onDragStart, onToggle, onDelete, onToggleFollowUp, onEdit, now }) {
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
            onDragStart={() => onDragStart(task.id)}
            onToggle={(comment) => onToggle(task, comment)}
            onDelete={() => onDelete(task.id)}
            onToggleFollowUp={() => onToggleFollowUp(task)}
            onEdit={(title, notes) => onEdit(task, title, notes)}
          />
        ))}
      </div>
    </div>
  );
}
