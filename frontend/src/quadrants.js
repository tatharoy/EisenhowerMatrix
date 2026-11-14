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

// Same "YYYY-MM-DD" -> local-midnight Date parsing as formatDateStr, but
// returning the Date itself rather than a formatted string (needed for the
// biweekly week-parity math below).
function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Sunday-anchored start of the week containing `date`.
function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function weeksBetween(a, b) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((startOfWeek(b) - startOfWeek(a)) / msPerWeek);
}

// Back-compat shim: older tasks stored a single `dayOfWeek` number. Newer
// tasks (and the new "biweekly" frequency) store `daysOfWeek`, an array, to
// support multiple selected weekdays. This normalizes on the fly at read
// time rather than force-migrating stored files -- an old task keeps working
// correctly even if it's never re-saved.
export function normalizeRecurrence(recurrence) {
  if (!recurrence) return null;
  if (recurrence.daysOfWeek) return recurrence;
  if (recurrence.dayOfWeek !== undefined && recurrence.dayOfWeek !== null) {
    return { ...recurrence, daysOfWeek: [recurrence.dayOfWeek] };
  }
  return recurrence;
}

// A "multiple times a day" task: daily recurrence with 2+ specific clock
// times. These are tracked and displayed completely differently from every
// other task type -- see isSlotDoneToday / effectiveQuadrantKey below.
export function isMultiTimeTask(task) {
  const r = task.recurrence;
  return !!(r && r.frequency === "daily" && r.times && r.times.length > 1);
}

export function isSlotDoneToday(task, time, now) {
  const slots = task.completedSlots;
  if (!slots || slots.date !== toDateStr(now)) return false;
  return slots.times.includes(time);
}

// "08:00" -> "8:00 AM", using the browser's own locale formatting so it
// matches whatever time format the person's system already uses.
export function formatTimeStr(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function isRecurrenceDueToday(recurrenceRaw, now) {
  const recurrence = normalizeRecurrence(recurrenceRaw);
  if (!recurrence) return false;
  if (recurrence.frequency === "daily") return true;
  if (recurrence.frequency === "weekly") {
    return (recurrence.daysOfWeek || []).includes(now.getDay());
  }
  if (recurrence.frequency === "biweekly") {
    if (!(recurrence.daysOfWeek || []).includes(now.getDay())) return false;
    if (!recurrence.anchorDate) return true; // no anchor stored -- fail open rather than never fire
    const weeks = weeksBetween(parseDateStr(recurrence.anchorDate), now);
    return ((weeks % 2) + 2) % 2 === 0; // safe modulo, in case weeks is ever negative
  }
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
  // Multiple-times-a-day tasks have their own per-time checklist UI and
  // alerting -- they're deliberately exempt from the due/overdue badge and
  // the forced-into-Do escalation below, so they stay wherever placed
  // (Inbox, by default, since nothing ever drags them out).
  if (isMultiTimeTask(task)) return null;
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

export function recurrenceLabel(recurrenceRaw) {
  const recurrence = normalizeRecurrence(recurrenceRaw);
  if (!recurrence) return "";
  if (recurrence.frequency === "daily") {
    if (recurrence.times && recurrence.times.length > 1) {
      const times = recurrence.times.slice().sort().map(formatTimeStr).join(", ");
      return `Repeats daily at ${times}`;
    }
    return "Repeats daily";
  }
  if (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") {
    const dayNums = (recurrence.daysOfWeek || []).slice().sort((a, b) => a - b);
    const days = dayNums.map((d) => WEEKDAY_NAMES[d]).join(", ");
    const isBiweekly = recurrence.frequency === "biweekly";
    if (dayNums.length === 1) {
      return isBiweekly ? `Repeats every other ${days}` : `Repeats every ${days}`;
    }
    return isBiweekly ? `Repeats every other week on ${days}` : `Repeats weekly on ${days}`;
  }
  if (recurrence.frequency === "monthly") {
    return `Repeats monthly on day ${recurrence.dayOfMonth}`;
  }
  return "";
}

// Back-compat shim, same idea as normalizeRecurrence: older tasks stored a
// single `completionComment` string. Newer tasks log a dated history in
// `followUpComments` instead. This lets display code just call one function
// regardless of which shape a given task happens to have.
export function getFollowUpComments(task) {
  if (task.followUpComments && task.followUpComments.length) return task.followUpComments;
  if (task.completionComment) {
    return [{ comment: task.completionComment, at: task.completedAt || task.createdAt }];
  }
  return [];
}
