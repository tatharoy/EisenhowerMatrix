import Quadrant from "./Quadrant.jsx";
import { QUADRANTS } from "../quadrants.js";

export default function Matrix({ tasksByQuadrant, dragOverKey, onDragOver, onDragLeave, onDrop, onDragStart, onToggle, onToggleTimeSlot, onDelete, onToggleFollowUp, onAddFollowUpComment, onEdit, tags, onAddTag, now }) {
  const [doQ, scheduleQ, delegateQ, eliminateQ] = QUADRANTS;

  return (
    <div className="matrix-wrap">
      <div className="axis-top">
        <div className="axis-spacer" />
        <div className="axis-label">Urgent</div>
        <div className="axis-label">Not urgent</div>
      </div>

      <div className="matrix">
        <div className="axis-side">
          <span>Important</span>
        </div>
        <Quadrant
          quadrant={doQ}
          tasks={tasksByQuadrant[doQ.key]}
          dragOver={dragOverKey === doQ.key}
          onDragOver={() => onDragOver(doQ.key)}
          onDragLeave={onDragLeave}
          onDrop={() => onDrop(doQ.key)}
          onDragStart={onDragStart}
          onToggle={onToggle}
          onToggleTimeSlot={onToggleTimeSlot}
          onDelete={onDelete}
          onToggleFollowUp={onToggleFollowUp}
          onAddFollowUpComment={onAddFollowUpComment}
          onEdit={onEdit}
          tags={tags}
          onAddTag={onAddTag}
          now={now}
        />
        <Quadrant
          quadrant={scheduleQ}
          tasks={tasksByQuadrant[scheduleQ.key]}
          dragOver={dragOverKey === scheduleQ.key}
          onDragOver={() => onDragOver(scheduleQ.key)}
          onDragLeave={onDragLeave}
          onDrop={() => onDrop(scheduleQ.key)}
          onDragStart={onDragStart}
          onToggle={onToggle}
          onToggleTimeSlot={onToggleTimeSlot}
          onDelete={onDelete}
          onToggleFollowUp={onToggleFollowUp}
          onAddFollowUpComment={onAddFollowUpComment}
          onEdit={onEdit}
          tags={tags}
          onAddTag={onAddTag}
          now={now}
        />

        <div className="axis-side">
          <span>Not important</span>
        </div>
        <Quadrant
          quadrant={delegateQ}
          tasks={tasksByQuadrant[delegateQ.key]}
          dragOver={dragOverKey === delegateQ.key}
          onDragOver={() => onDragOver(delegateQ.key)}
          onDragLeave={onDragLeave}
          onDrop={() => onDrop(delegateQ.key)}
          onDragStart={onDragStart}
          onToggle={onToggle}
          onToggleTimeSlot={onToggleTimeSlot}
          onDelete={onDelete}
          onToggleFollowUp={onToggleFollowUp}
          onAddFollowUpComment={onAddFollowUpComment}
          onEdit={onEdit}
          tags={tags}
          onAddTag={onAddTag}
          now={now}
        />
        <Quadrant
          quadrant={eliminateQ}
          tasks={tasksByQuadrant[eliminateQ.key]}
          dragOver={dragOverKey === eliminateQ.key}
          onDragOver={() => onDragOver(eliminateQ.key)}
          onDragLeave={onDragLeave}
          onDrop={() => onDrop(eliminateQ.key)}
          onDragStart={onDragStart}
          onToggle={onToggle}
          onToggleTimeSlot={onToggleTimeSlot}
          onDelete={onDelete}
          onToggleFollowUp={onToggleFollowUp}
          onAddFollowUpComment={onAddFollowUpComment}
          onEdit={onEdit}
          tags={tags}
          onAddTag={onAddTag}
          now={now}
        />
      </div>
    </div>
  );
}
