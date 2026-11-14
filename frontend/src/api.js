const TASKS = "/api/tasks";
const METADATA = "/api/metadata";
const CONFIG = "/api/config";

async function toJson(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: () => fetch(TASKS).then(toJson),

  create: ({ title, notes, tagId, dueDate, recurrence, isFollowUp }) =>
    fetch(TASKS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes,
        tagId: tagId ?? null,
        dueDate: dueDate ?? null,
        recurrence: recurrence ?? null,
        isFollowUp: !!isFollowUp,
      }),
    }).then(toJson),

  update: (id, patch) =>
    fetch(`${TASKS}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(toJson),

  remove: (id) => fetch(`${TASKS}/${id}`, { method: "DELETE" }).then(toJson),

  addFollowUpComment: (id, comment) =>
    fetch(`${TASKS}/${id}/followup-comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    }).then(toJson),

  getMetadata: () => fetch(METADATA).then(toJson),

  updateTitle: (title) =>
    fetch(METADATA, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then(toJson),

  createTag: ({ name, color }) =>
    fetch(`${METADATA}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    }).then(toJson),

  getConfig: () => fetch(CONFIG).then(toJson),

  updateConfig: (patch) =>
    fetch(CONFIG, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(toJson),
};
