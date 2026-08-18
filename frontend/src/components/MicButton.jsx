import { useEffect } from "react";
import { useSpeech } from "../useSpeech.js";
import { MicIcon, StopIcon } from "../icons.jsx";

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
    <button
      type="button"
      className={`mic-btn ${listening ? "listening" : ""}`}
      onClick={listening ? stop : start}
      aria-label={listening ? "Stop voice input" : "Add task by voice"}
      title={
        error ? `Voice error: ${error}` : listening ? "Listening… click to stop" : "Add by voice"
      }
    >
      {listening ? <StopIcon /> : <MicIcon />}
    </button>
  );
}
