// GitHub REST API adapter for iOS/Capacitor mode.
// Replaces the localhost:4000 Express backend when running as a native app.
// All task data is read from and written to github.com/tatharoy/TasksAndSchedule
// (or whatever repo the user configures on first launch).

const CFG_KEY = "gh_cfg";

export function getGithubConfig() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGithubConfig(cfg) {
  if (!cfg) {
    localStorage.removeItem(CFG_KEY);
  } else {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }
}

export function isGithubConfigured() {
  const c = getGithubConfig();
  return !!(c && c.token && c.repoOwner && c.repoName);
}

// --- base64 helpers (TextEncoder handles full unicode) ---

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// --- low-level GitHub Contents API ---

async function ghGet(cfg, filePath) {
  const url = `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${filePath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(err.message || `GitHub GET ${filePath} failed: ${res.status}`),
      { status: res.status }
    );
  }
  const data = await res.json();
  const content = JSON.parse(fromBase64(data.content));
  return { content, sha: data.sha };
}

async function ghPut(cfg, filePath, content, sha, message) {
  const url = `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${filePath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(JSON.stringify(content, null, 2)),
      sha,
      branch: cfg.branch || "main",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(err.message || `GitHub PUT ${filePath} failed: ${res.status}`),
      { status: res.status }
    );
  }
  return res.json();
}

// --- mutation helpers with conflict retry ---
// On a 409 (stale SHA) the transform is re-applied to the freshly fetched data,
// which correctly merges concurrent edits because all transforms are ID-based.

async function mutateTasks(transformFn, commitMsg, retries = 1) {
  const cfg = getGithubConfig();
  const { content: tasks, sha } = await ghGet(cfg, "tasks.json");
  const newTasks = transformFn(Array.isArray(tasks) ? tasks : []);
  try {
    await ghPut(cfg, "tasks.json", newTasks, sha, commitMsg);
    return newTasks;
  } catch (err) {
    if (err.status === 409 && retries > 0) {
      return mutateTasks(transformFn, commitMsg, retries - 1);
    }
    throw err;
  }
}

async function mutateMetadata(transformFn, commitMsg, retries = 1) {
  const cfg = getGithubConfig();
  const { content: meta, sha } = await ghGet(cfg, "metadata.json");
  const newMeta = transformFn(meta);
  try {
    await ghPut(cfg, "metadata.json", newMeta, sha, commitMsg);
    return newMeta;
  } catch (err) {
    if (err.status === 409 && retries > 0) {
      return mutateMetadata(transformFn, commitMsg, retries - 1);
    }
    throw err;
  }
}

// --- public API (mirrors the shape of frontend/src/api.js) ---

export const githubApi = {
  list() {
    const cfg = getGithubConfig();
    return ghGet(cfg, "tasks.json").then(({ content }) =>
      Array.isArray(content) ? content : []
    );
  },

  create({ title, notes, tagId, dueDate, recurrence, isFollowUp }) {
    const newTask = {
      id: crypto.randomUUID(),
      title,
      notes: notes ?? "",
      tagId: tagId ?? null,
      dueDate: dueDate ?? null,
      recurrence: recurrence ?? null,
      lastCompletedDate: null,
      completedSlots: null,
      isFollowUp: !!isFollowUp,
      followUpComments: [],
      completionComment: null,
      urgent: null,
      important: null,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return mutateTasks(
      (tasks) => [...tasks, newTask],
      `Add task: ${title}`
    ).then(() => newTask);
  },

  update(id, patch) {
    return mutateTasks(
      (tasks) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      `Update task`
    ).then((tasks) => tasks.find((t) => t.id === id));
  },

  remove(id) {
    return mutateTasks(
      (tasks) => tasks.filter((t) => t.id !== id),
      `Delete task`
    ).then(() => null);
  },

  addFollowUpComment(id, comment) {
    const entry = { text: comment, createdAt: new Date().toISOString() };
    return mutateTasks(
      (tasks) =>
        tasks.map((t) =>
          t.id === id
            ? { ...t, followUpComments: [...(t.followUpComments || []), entry] }
            : t
        ),
      `Add follow-up comment`
    ).then((tasks) => tasks.find((t) => t.id === id));
  },

  getMetadata() {
    const cfg = getGithubConfig();
    return ghGet(cfg, "metadata.json")
      .then(({ content }) => content)
      .catch(() => ({ title: "Eisenhower Matrix", tags: [] }));
  },

  updateTitle(title) {
    return mutateMetadata((meta) => ({ ...meta, title }), `Update title`);
  },

  createTag({ name, color }) {
    const tag = { id: crypto.randomUUID(), name, color };
    return mutateMetadata(
      (meta) => ({ ...meta, tags: [...(meta.tags || []), tag] }),
      `Add tag: ${name}`
    ).then(() => tag);
  },

  getConfig() {
    const cfg = getGithubConfig();
    const owner = cfg?.repoOwner || "tatharoy";
    const repo = cfg?.repoName || "TasksAndSchedule";
    return Promise.resolve({
      useExternalSync: false,
      externalFolder: null,
      effectiveDbFile: `github:${owner}/${repo}/tasks.json`,
      effectiveMetadataFile: `github:${owner}/${repo}/metadata.json`,
      overriddenByEnv: false,
      reminderSound: localStorage.getItem("ios_sound") || "none",
      reminderIntervalMinutes: +(localStorage.getItem("ios_interval") || 30),
      source: "github",
    });
  },

  updateConfig(patch) {
    if (patch.reminderSound !== undefined) {
      localStorage.setItem("ios_sound", patch.reminderSound);
    }
    if (patch.reminderIntervalMinutes !== undefined) {
      localStorage.setItem("ios_interval", String(patch.reminderIntervalMinutes));
    }
    return this.getConfig();
  },
};
