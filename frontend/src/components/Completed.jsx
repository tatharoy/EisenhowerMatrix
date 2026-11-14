import { formatDate, getFollowUpComments } from "../quadrants.js";
import { XIcon, FlagIcon } from "../icons.jsx";

export default function Completed({ tasks, onToggle, onDelete }) {
  return (
    <section className="completed">
      <div className="section-header">
        <span>Completed</span>
        <span className="count">{tasks.length}</span>
      </div>
      {tasks.length === 0 && <p className="empty">Checked-off tasks land here.</p>}
      <div className="completed-list">
        {tasks.map((task) => {
          const comments = getFollowUpComments(task);
          return (
            <div className="completed-item" key={task.id}>
              <input
                type="checkbox"
                checked
                onChange={() => onToggle(task)}
                aria-label={`Mark "${task.title}" incomplete`}
              />
              <div className="completed-body">
                <div className="completed-title-row">
                  <span className="done-title">{task.title}</span>
                  {task.isFollowUp && (
                    <span className="follow-up-badge">
                      <FlagIcon filled /> Follow-up
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
                  <span className="done-date">{formatDate(task.completedAt)}</span>
                </div>
                {comments.length > 0 && (
                  <div className="followup-comments">
                    {comments.map((c, i) => (
                      <div className="followup-comment-entry" key={i}>
                        <span className="followup-comment-date">{formatDate(c.at)}</span>{" "}
                        &ldquo;{c.comment}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="link-btn" onClick={() => onDelete(task.id)} aria-label="Delete task">
                <XIcon />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
