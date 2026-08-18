const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// value: { dueDate, recurrence } -- at most one of the two is ever non-null.
export default function TimingPicker({ value, onChange }) {
  const mode = value.recurrence ? "repeat" : value.dueDate ? "due" : "none";

  function setMode(next) {
    if (next === "none") onChange({ dueDate: null, recurrence: null });
    else if (next === "due") onChange({ dueDate: value.dueDate || todayISO(), recurrence: null });
    else if (next === "repeat")
      onChange({ dueDate: null, recurrence: value.recurrence || { frequency: "daily" } });
  }

  return (
    <div className="timing-picker">
      <select
        className="timing-select"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        aria-label="Timing"
      >
        <option value="none">No due date / repeat</option>
        <option value="due">Due date</option>
        <option value="repeat">Repeats</option>
      </select>

      {mode === "due" && (
        <input
          type="date"
          className="timing-date"
          value={value.dueDate || ""}
          onChange={(e) => onChange({ dueDate: e.target.value, recurrence: null })}
        />
      )}

      {mode === "repeat" && (
        <div className="timing-repeat">
          <select
            value={value.recurrence?.frequency || "daily"}
            onChange={(e) => {
              const frequency = e.target.value;
              const recurrence =
                frequency === "weekly"
                  ? { frequency, dayOfWeek: 1 }
                  : frequency === "monthly"
                  ? { frequency, dayOfMonth: 1 }
                  : { frequency };
              onChange({ dueDate: null, recurrence });
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {value.recurrence?.frequency === "weekly" && (
            <select
              value={value.recurrence.dayOfWeek}
              onChange={(e) =>
                onChange({
                  dueDate: null,
                  recurrence: { frequency: "weekly", dayOfWeek: Number(e.target.value) },
                })
              }
            >
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {value.recurrence?.frequency === "monthly" && (
            <input
              type="number"
              min="1"
              max="31"
              className="timing-daynum"
              value={value.recurrence.dayOfMonth}
              onChange={(e) =>
                onChange({
                  dueDate: null,
                  recurrence: {
                    frequency: "monthly",
                    dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                  },
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
