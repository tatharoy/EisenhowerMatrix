import { useState } from "react";
import MicButton from "./MicButton.jsx";

export default function CompletionPrompt({ onComplete, onCancel }) {
  const [comment, setComment] = useState("");

  function submit(e) {
    e.preventDefault();
    onComplete(comment.trim() || null);
  }

  return (
    <form className="completion-prompt" onSubmit={submit}>
      <div className="completion-prompt-label">
        Add a comment before completing (optional, but recommended):
      </div>
      <div className="completion-prompt-row">
        <input
          type="text"
          placeholder="What happened?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          autoFocus
        />
        <MicButton onTranscript={(text) => setComment((c) => (c ? `${c} ${text}` : text))} />
      </div>
      <div className="completion-prompt-actions">
        <button type="submit">Complete</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
