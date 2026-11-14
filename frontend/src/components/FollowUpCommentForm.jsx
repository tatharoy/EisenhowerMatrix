import { useState } from "react";
import MicButton from "./MicButton.jsx";

// Unlike the old completion comment, this is NOT skippable -- logging a
// follow-up with nothing in it wouldn't mean anything.
export default function FollowUpCommentForm({ onSubmit, onCancel }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState(false);

  function submit(e) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <form className="followup-comment-form" onSubmit={submit}>
      <div className="followup-comment-form-label">Add a follow-up update:</div>
      <div className="followup-comment-form-row">
        <input
          type="text"
          placeholder="What happened?"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setError(false);
          }}
          autoFocus
        />
        <MicButton onTranscript={(text) => setComment((c) => (c ? `${c} ${text}` : text))} />
      </div>
      {error && <div className="edit-task-error">Enter a comment first.</div>}
      <div className="followup-comment-form-actions">
        <button type="submit">Add</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
