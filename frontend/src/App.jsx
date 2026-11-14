import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import {
  effectiveQuadrantKey,
  flagsForQuadrant,
  toDateStr,
  dueStatus,
} from "./quadrants.js";
import { playReminder } from "./sound.js";
import NewTaskForm from "./components/NewTaskForm.jsx";
import Inbox from "./components/Inbox.jsx";
import Matrix from "./components/Matrix.jsx";
import Completed from "./components/Completed.jsx";
import TitleBar from "./components/TitleBar.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("Tatha's Schedule");
  const [tags, setTags] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [config, setConfig] = useState({
    useExternalSync: false,
    externalFolder: null,
    effectiveDbFile: "",
    effectiveMetadataFile: "",
    overriddenByEnv: false,
    reminderSound: "none",
    reminderIntervalMinutes: 30,
  });

  useEffect(() => {
    Promise.all([api.list(), api.getMetadata(), api.getConfig()])
      .then(([taskList, meta, cfg]) => {
        setTasks(taskList);
        setTitle(meta.title);
        setTags(meta.tags);
        setConfig(cfg);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not reach the backend. Is it running on port 4000?");
        setLoading(false);
      });
  }, []);

  // Refresh "now" periodically so due-today/overdue status and recurring
  // resets stay correct if the app is left open across midnight, without
  // needing a page reload.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Reminder sound: plays every reminderIntervalMinutes while at least one
  // task is currently due today or overdue (dueStatus already accounts for
  // recurring tasks' per-cycle "done for now" state, so this naturally
  // covers both one-off and recurring tasks the same way the UI's own
  // escalation-into-Do logic does). Gated by lastAlertAtRef so it doesn't
  // fire on every 60s "now" tick -- only once the interval has elapsed.
  const lastAlertAtRef = useRef(0);
  useEffect(() => {
    if (!config.reminderSound || config.reminderSound === "none") return;
    const anyDue = tasks.some(
      (t) => (t.recurrence || !t.completed) && dueStatus(t, now) !== null
    );
    if (!anyDue) return;
    const intervalMs = (config.reminderIntervalMinutes || 30) * 60 * 1000;
    if (Date.now() - lastAlertAtRef.current >= intervalMs) {
      playReminder(config.reminderSound);
      lastAlertAtRef.current = Date.now();
    }
  }, [now, tasks, config.reminderSound, config.reminderIntervalMinutes]);

  // Specific-time alerts: any daily task with recurrence.times fires once
  // per listed time per day, the moment the clock hits that minute --
  // separate from the interval-based nag above, since these need to fire at
  // an exact moment rather than repeat while something's generically "due".
  // "Already alerted" is tracked in memory only (not persisted) -- fine
  // since this only matters while the tab is open anyway.
  const alertedSlotsRef = useRef(new Set());
  useEffect(() => {
    if (!config.reminderSound || config.reminderSound === "none") return;
    const nowStr = toDateStr(now);
    const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    tasks.forEach((task) => {
      const times = task.recurrence?.times;
      if (!times || times.length === 0) return;
      times.forEach((t) => {
        if (t !== nowHM) return;
        const key = `${task.id}|${nowStr}|${t}`;
        if (alertedSlotsRef.current.has(key)) return;
        alertedSlotsRef.current.add(key);
        const alreadyDone = task.completedSlots?.date === nowStr && task.completedSlots.times.includes(t);
        if (!alreadyDone) playReminder(config.reminderSound);
      });
    });
  }, [now, tasks, config.reminderSound]);

  async function addTask({ title, notes, tagId, dueDate, recurrence, isFollowUp }) {
    try {
      const created = await api.create({ title, notes, tagId, dueDate, recurrence, isFollowUp });
      setTasks((t) => [...t, created]);
    } catch {
      setError("Failed to create task.");
    }
  }

  async function moveTask(id, quadKey) {
    const { important, urgent } = flagsForQuadrant(quadKey);
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, important, urgent } : t)));
    try {
      await api.update(id, { important, urgent });
    } catch {
      setError("Failed to move task.");
    }
  }

  // Recurring tasks track completion per-cycle (lastCompletedDate) instead
  // of the permanent completed flag, so they never leave the matrix for
  // good -- they just reset once the date no longer matches today.
  async function toggleComplete(task) {
    if (task.recurrence) {
      const todayStr = toDateStr(now);
      const lastCompletedDate = task.lastCompletedDate === todayStr ? null : todayStr;
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, lastCompletedDate } : t)));
      try {
        await api.update(task.id, { lastCompletedDate });
      } catch {
        setError("Failed to update task.");
      }
      return;
    }

    const completed = !task.completed;
    const completedAt = completed ? new Date().toISOString() : null;
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, completed, completedAt } : t))
    );
    try {
      await api.update(task.id, { completed });
    } catch {
      setError("Failed to update task.");
    }
  }

  async function toggleFollowUp(task) {
    const isFollowUp = !task.isFollowUp;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, isFollowUp } : t)));
    try {
      await api.update(task.id, { isFollowUp });
    } catch {
      setError("Failed to update task.");
    }
  }

  // Toggles one specific time slot for a multiple-times-a-day task.
  // completedSlots resets naturally once the date no longer matches today --
  // same "derive, don't force-migrate" pattern as lastCompletedDate.
  async function toggleTimeSlot(task, time) {
    const todayStr = toDateStr(now);
    const current = task.completedSlots?.date === todayStr ? task.completedSlots.times : [];
    const times = current.includes(time) ? current.filter((t) => t !== time) : [...current, time];
    const completedSlots = { date: todayStr, times };
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, completedSlots } : t)));
    try {
      await api.update(task.id, { completedSlots });
    } catch {
      setError("Failed to update task.");
    }
  }

  // Logs a dated entry -- independent of completion, available any time
  // while the task is still active. The server appends atomically and
  // returns the updated task, so we sync local state from its response
  // rather than guessing the new array shape ourselves.
  async function addFollowUpComment(task, comment) {
    try {
      const updated = await api.addFollowUpComment(task.id, comment);
      setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      setError("Failed to add follow-up update.");
    }
  }

  // Only ever called for tasks TaskCard considers editable (not completed) --
  // enforced client-side there, not by the backend. Covers title, notes,
  // tag, due date, and recurrence all together, since due date/recurrence
  // are mutually exclusive and need to change as a pair.
  async function editTask(task, title, notes, tagId, dueDate, recurrence) {
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, title, notes, tagId, dueDate, recurrence } : t))
    );
    try {
      await api.update(task.id, { title, notes, tagId, dueDate, recurrence });
    } catch {
      setError("Failed to update task.");
    }
  }

  async function deleteTask(id) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    try {
      await api.remove(id);
    } catch {
      setError("Failed to delete task.");
    }
  }

  async function renameApp(newTitle) {
    const previous = title;
    setTitle(newTitle);
    try {
      await api.updateTitle(newTitle);
    } catch {
      setTitle(previous);
      setError("Failed to save the title.");
    }
  }

  async function addTag({ name, color }) {
    try {
      const tag = await api.createTag({ name, color });
      setTags((ts) => [...ts, tag]);
      return tag;
    } catch {
      setError("Failed to create tag.");
      return null;
    }
  }

  async function saveConfig(patch) {
    try {
      const updated = await api.updateConfig(patch);
      setConfig(updated);
      return updated;
    } catch {
      setError("Failed to save storage settings.");
      return null;
    }
  }

  function handleDrop(quadKey) {
    if (dragId) moveTask(dragId, quadKey);
    setDragId(null);
    setDragOverKey(null);
  }

  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));
  const enriched = tasks.map((t) => ({ ...t, tag: t.tagId ? tagsById[t.tagId] || null : null }));

  // Recurring tasks never move to the permanent Completed list -- they
  // recur forever, so "completed" only applies to one-off tasks here.
  const active = enriched.filter((t) => t.recurrence || !t.completed);
  const completed = enriched
    .filter((t) => !t.recurrence && t.completed)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const inbox = active.filter((t) => effectiveQuadrantKey(t, now) === "inbox");
  const tasksByQuadrant = {
    do: active.filter((t) => effectiveQuadrantKey(t, now) === "do"),
    schedule: active.filter((t) => effectiveQuadrantKey(t, now) === "schedule"),
    delegate: active.filter((t) => effectiveQuadrantKey(t, now) === "delegate"),
    eliminate: active.filter((t) => effectiveQuadrantKey(t, now) === "eliminate"),
  };

  return (
    <div className="app">
      <header>
        <div className="header-row">
          <TitleBar title={title} onChange={renameApp} />
          <SettingsPanel config={config} onSave={saveConfig} />
        </div>
        <p className="tagline">Prioritize tasks by urgency and importance.</p>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <div className="banner-info">Loading…</div>}

      <NewTaskForm onAdd={addTask} tags={tags} onAddTag={addTag} />

      <Inbox
        tasks={inbox}
        now={now}
        tags={tags}
        onAddTag={addTag}
        dragOver={dragOverKey === "inbox"}
        onDragOver={() => setDragOverKey("inbox")}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={() => handleDrop("inbox")}
        onDragStart={setDragId}
        onToggle={toggleComplete}
        onToggleTimeSlot={toggleTimeSlot}
        onDelete={deleteTask}
        onToggleFollowUp={toggleFollowUp}
        onAddFollowUpComment={addFollowUpComment}
        onEdit={editTask}
      />

      <Matrix
        tasksByQuadrant={tasksByQuadrant}
        now={now}
        tags={tags}
        onAddTag={addTag}
        dragOverKey={dragOverKey}
        onDragOver={setDragOverKey}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={handleDrop}
        onDragStart={setDragId}
        onToggle={toggleComplete}
        onToggleTimeSlot={toggleTimeSlot}
        onDelete={deleteTask}
        onToggleFollowUp={toggleFollowUp}
        onAddFollowUpComment={addFollowUpComment}
        onEdit={editTask}
      />

      <Completed tasks={completed} onToggle={toggleComplete} onDelete={deleteTask} />
    </div>
  );
}
