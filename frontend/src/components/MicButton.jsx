import { useEffect } from "react";
import { useSpeech } from "../useSpeech.js";
import { MicIcon, StopIcon } from "../icons.jsx";

function describeSpeechError(code) {
  switch (code) {
    case "not-allowed":
    case "permission-denied":
      return "Microphone access was blocked -- check your permissions.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Couldn't reach the speech recognition service (network issue).";
    case "service-not-allowed":
      return "Speech recognition isn't available in this app.";
    case "no-speech":
      return "Didn't hear anything -- try again.";
    default:
      return `Voice input error: ${code}`;
  }
}

// Mic button for the new-task form. On stop, hands the transcript up via
// onTranscript so the parent can drop it into the title field.
export default function MicButton({ onTranscript }) {
  const { supported, listening, transcript, error, start, stop } = useSpeech();

  useEffect(() => {
    if (!listening && transcript) {
      onTranscript(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        className={`mic-btn ${listening ? "listening" : ""}`}
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop voice input" : "Add task by voice"}
        title={listening ? "Listening… click to stop" : "Add by voice"}
      >
        {listening ? <StopIcon /> : <MicIcon />}
      </button>
      {/* Shown inline, not just as a hover tooltip -- a hidden error nobody
          can see is as good as no error message at all. */}
      {error && <span className="mic-error">{describeSpeechError(error)}</span>}
    </>
  );
}
