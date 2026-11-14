// Alert sounds for the "reminder" feature -- generated live with the Web
// Audio API rather than shipped as audio files, so there's nothing to
// bundle, license, or fail to load.
//
// Browsers block audio from playing until the page has seen at least one
// user gesture (click, keypress, etc). If no gesture has happened yet in
// this tab, playback silently no-ops here rather than throwing -- the next
// scheduled reminder after any interaction elsewhere on the page will play
// normally.

let ctx = null;

function getCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // Still blocked (no user gesture yet) -- fine, just skip this play.
    });
  }
  return ctx;
}

function tone(ac, freq, start, dur, type, peak = 0.18) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(peak, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

export function playBell() {
  const ac = getCtx();
  if (!ac) return;
  try {
    tone(ac, 740, 0, 0.9, "triangle", 0.22);
  } catch {
    // ignore -- e.g. autoplay still blocked
  }
}

export function playAlert() {
  const ac = getCtx();
  if (!ac) return;
  try {
    for (let i = 0; i < 3; i++) {
      tone(ac, 700, i * 0.22, 0.14, "square", 0.12);
      tone(ac, 950, i * 0.22 + 0.11, 0.14, "square", 0.12);
    }
  } catch {
    // ignore
  }
}

// kind: "none" | "bell" | "alert"
export function playReminder(kind) {
  if (kind === "bell") playBell();
  else if (kind === "alert") playAlert();
}
