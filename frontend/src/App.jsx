import { useEffect, useState } from "react";
import { api } from "./api.js";
import {
  effectiveQuadrantKey,
  flagsForQuadrant,
  toDateStr,
} from "./quadrants.js";
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
  //
  // comment is only meaningful when *completing* (not un-completing) a
  // follow-up task -- it's optional (skippable) but strongly encouraged by
  // the UI, via the inline CompletionPrompt in TaskCard.
  async function toggleComplete(task, comment = null) {
    if (task.recurrence) {
      const todayStr = toDateStr(now);
      const isDoneToday = task.lastCompletedDate === todayStr;
      const lastCompletedDate = isDoneToday ? null : todayStr;
      const patch = { lastCompletedDate };
      if (!isDoneToday) patch.completionComment = comment;
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
      try {
        await api.update(task.id, patch);
      } catch {
        setError("Failed to update task.");
      }
      return;
    }

    const completed = !task.completed;
    const completedAt = completed ? new Date().toISOString() : null;
    const patch = { completed, completedAt };
    if (completed) patch.completionComment = comment;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    try {
      await api.update(task.id, {
        completed,
        completionComment: completed ? comment : undefined,
      });
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

  // Only ever called for tasks TaskCard considers editable (not completed,
  // not recurring) -- enforced client-side there, not by the backend.
  async function editTask(task, title, notes) {
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, title, notes } : t)));
    try {
      await api.update(task.id, { title, notes });
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
      return true;
    } catch {
      setError("Failed to save storage settings.");
      return false;
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
        dragOver={dragOverKey === "inbox"}
        onDragOver={() => setDragOverKey("inbox")}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={() => handleDrop("inbox")}
        onDragStart={setDragId}
        onToggle={toggleComplete}
        onDelete={deleteTask}
        onToggleFollowUp={toggleFollowUp}
        onEdit={editTask}
      />

      <Matrix
        tasksByQuadrant={tasksByQuadrant}
        now={now}
        dragOverKey={dragOverKey}
        onDragOver={setDragOverKey}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={handleDrop}
        onDragStart={setDragId}
        onToggle={toggleComplete}
        onDelete={deleteTask}
        onToggleFollowUp={toggleFollowUp}
        onEdit={editTask}
      />

      <Completed tasks={completed} onToggle={toggleComplete} onDelete={deleteTask} />
    </div>
  );
}
