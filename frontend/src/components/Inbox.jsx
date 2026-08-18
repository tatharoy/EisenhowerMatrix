import TaskCard from "./TaskCard.jsx";

export default function Inbox({ tasks, dragOver, onDragOver, onDragLeave, onDrop, onDragStart, onToggle, onDelete, onToggleFollowUp, onEdit, now }) {
  return (
    <section
      className={`inbox ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="section-header">
        <span>Inbox</span>
        <span className="count">{tasks.length}</span>
      </div>
      <div className="inbox-list">
        {tasks.length === 0 && (
          <p className="empty">Add a task, then drag it into a quadrant below.</p>
        )}
        {tasks.map((task) => (
          <div className="inbox-card-wrap" key={task.id}>
            <TaskCard
              task={task}
              now={now}
              onDragStart={() => onDragStart(task.id)}
              onToggle={(comment) => onToggle(task, comment)}
              onDelete={() => onDelete(task.id)}
              onToggleFollowUp={() => onToggleFollowUp(task)}
              onEdit={(title, notes) => onEdit(task, title, notes)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
