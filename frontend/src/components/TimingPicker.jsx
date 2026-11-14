const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// value: { dueDate, recurrence } -- at most one of the two is ever non-null.
// recurrence shape: { frequency: "daily"|"weekly"|"biweekly"|"monthly",
//                      daysOfWeek?: number[], anchorDate?: string, dayOfMonth?: number }
export default function TimingPicker({ value, onChange }) {
  const mode = value.recurrence ? "repeat" : value.dueDate ? "due" : "none";

  function setMode(next) {
    if (next === "none") onChange({ dueDate: null, recurrence: null });
    else if (next === "due") onChange({ dueDate: value.dueDate || todayISO(), recurrence: null });
    else if (next === "repeat")
      onChange({
        dueDate: null,
        recurrence: value.recurrence || { frequency: "daily" },
      });
  }

  function setFrequency(frequency) {
    let recurrence;
    if (frequency === "weekly" || frequency === "biweekly") {
      const daysOfWeek =
        value.recurrence?.daysOfWeek && value.recurrence.daysOfWeek.length
          ? value.recurrence.daysOfWeek
          : [1]; // default Monday; preserved across weekly <-> biweekly switches
      recurrence = { frequency, daysOfWeek };
      if (frequency === "biweekly") {
        recurrence.anchorDate = value.recurrence?.anchorDate || todayISO();
      }
    } else if (frequency === "monthly") {
      recurrence = { frequency, dayOfMonth: value.recurrence?.dayOfMonth || 1 };
    } else {
      recurrence = { frequency };
    }
    onChange({ dueDate: null, recurrence });
  }

  function toggleDay(day) {
    const current = value.recurrence.daysOfWeek || [];
    let next;
    if (current.includes(day)) {
      if (current.length === 1) return; // keep at least one day selected
      next = current.filter((d) => d !== day);
    } else {
      next = [...current, day].sort((a, b) => a - b);
    }
    onChange({ dueDate: null, recurrence: { ...value.recurrence, daysOfWeek: next } });
  }

  function toggleSpecificTimes(enabled) {
    if (enabled) {
      onChange({ dueDate: null, recurrence: { frequency: "daily", times: ["09:00"] } });
    } else {
      onChange({ dueDate: null, recurrence: { frequency: "daily" } });
    }
  }

  function updateTime(i, val) {
    const times = value.recurrence.times.slice();
    times[i] = val;
    onChange({ dueDate: null, recurrence: { ...value.recurrence, times } });
  }

  function addTime() {
    const times = [...(value.recurrence.times || []), "12:00"];
    onChange({ dueDate: null, recurrence: { ...value.recurrence, times } });
  }

  function removeTime(i) {
    const times = value.recurrence.times.filter((_, idx) => idx !== i);
    onChange({ dueDate: null, recurrence: { ...value.recurrence, times } });
  }

  const isWeeklyish =
    value.recurrence?.frequency === "weekly" || value.recurrence?.frequency === "biweekly";
  const hasSpecificTimes = !!(value.recurrence?.times && value.recurrence.times.length > 0);

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
          <select value={value.recurrence?.frequency || "daily"} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {value.recurrence?.frequency === "daily" && (
            <>
              <label className="specific-times-toggle">
                <input
                  type="checkbox"
                  checked={hasSpecificTimes}
                  onChange={(e) => toggleSpecificTimes(e.target.checked)}
                />
                Set specific times
              </label>
              {hasSpecificTimes && (
                <div className="times-editor">
                  {value.recurrence.times.map((t, i) => (
                    <div className="time-entry" key={i}>
                      <input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} />
                      {value.recurrence.times.length > 1 && (
                        <button
                          type="button"
                          className="remove-time-btn"
                          onClick={() => removeTime(i)}
                          aria-label="Remove this time"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="add-time-btn" onClick={addTime}>
                    + Add time
                  </button>
                </div>
              )}
            </>
          )}

          {isWeeklyish && (
            <div className="weekday-toggle-row">
              {WEEKDAY_SHORT.map((label, i) => (
                <button
                  type="button"
                  key={i}
                  className={`weekday-toggle ${
                    (value.recurrence.daysOfWeek || []).includes(i) ? "selected" : ""
                  }`}
                  onClick={() => toggleDay(i)}
                >
                  {label}
                </button>
              ))}
            </div>
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
