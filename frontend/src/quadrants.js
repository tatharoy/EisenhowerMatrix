// Quadrant is always derived from (urgent, important) -- never stored directly.
// null on either flag means the task hasn't been placed yet (lives in inbox).

export const QUADRANTS = [
  { key: "do", label: "Do", subtitle: "Fire-fighting", important: true, urgent: true },
  { key: "schedule", label: "Schedule", subtitle: "Visionary", important: true, urgent: false },
  { key: "delegate", label: "Delegate", subtitle: "Delegation", important: false, urgent: true },
  { key: "eliminate", label: "Eliminate", subtitle: "Elimination", important: false, urgent: false },
];

export function isUnplaced(task) {
  return task.urgent === null || task.important === null;
}

export function quadrantKey(task) {
  if (isUnplaced(task)) return "inbox";
  const q = QUADRANTS.find(
    (q) => q.important === task.important && q.urgent === task.urgent
  );
  return q ? q.key : "inbox";
}

export function flagsForQuadrant(key) {
  const q = QUADRANTS.find((q) => q.key === key);
  return q ? { important: q.important, urgent: q.urgent } : { important: null, urgent: null };
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// For "YYYY-MM-DD" values (dueDate, lastCompletedDate). Parses as local
// midnight rather than UTC midnight, so the displayed day never shifts
// backward for people west of UTC.
export function formatDateStr(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Timely tasks (one-off dueDate) and scheduled/recurring tasks.
// Both are derived at render time from the current date -- nothing about
// "is it due" or "is it overdue" is ever stored, same philosophy as
// quadrant derivation above.
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

// Local YYYY-MM-DD (not UTC) so "today" matches the user's own calendar day.
export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isRecurrenceDueToday(recurrence, now) {
  if (!recurrence) return false;
  if (recurrence.frequency === "daily") return true;
  if (recurrence.frequency === "weekly") return now.getDay() === recurrence.dayOfWeek;
  if (recurrence.frequency === "monthly") {
    // Clamp to the last real day of the month, so "day 31" still fires in
    // months that don't have one (e.g. February).
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const target = Math.min(recurrence.dayOfMonth, lastDay);
    return now.getDate() === target;
  }
  return false;
}

// Has this task's current cycle already been handled? For recurring tasks
// that means "checked off today"; for everything else, the normal completed
// flag.
export function isDoneForNow(task, now) {
  if (task.recurrence) return task.lastCompletedDate === toDateStr(now);
  return task.completed;
}

// 'dueToday' | 'overdue' | null
export function dueStatus(task, now) {
  if (isDoneForNow(task, now)) return null;
  const ts = toDateStr(now);
  if (task.recurrence) {
    return isRecurrenceDueToday(task.recurrence, now) ? "dueToday" : null;
  }
  if (task.dueDate) {
    if (task.dueDate === ts) return "dueToday";
    if (task.dueDate < ts) return "overdue";
  }
  return null;
}

// The quadrant a task actually displays in. Due-today or overdue tasks are
// forced into "do" regardless of their stored urgent/important flags -- this
// is what makes a deadline (or a recurring task's due day) escalate the task
// automatically, even if it was dragged elsewhere earlier.
export function effectiveQuadrantKey(task, now) {
  if (dueStatus(task, now)) return "do";
  return quadrantKey(task);
}

export function recurrenceLabel(recurrence) {
  if (!recurrence) return "";
  if (recurrence.frequency === "daily") return "Repeats daily";
  if (recurrence.frequency === "weekly") {
    return `Repeats every ${WEEKDAY_NAMES[recurrence.dayOfWeek]}`;
  }
  if (recurrence.frequency === "monthly") {
    return `Repeats monthly on day ${recurrence.dayOfMonth}`;
  }
  return "";
}
