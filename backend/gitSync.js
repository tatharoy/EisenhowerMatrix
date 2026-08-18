const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Runs `git add -A && git commit -m "..." && git push` in a target folder,
// a few seconds after the last change settles (debounced), so a burst of
// task edits becomes one commit instead of dozens.
//
// This is intentionally dumb: it assumes the folder is ALREADY a git
// repository with a remote configured and push access already working
// (SSH key or a credential helper) -- exactly the "precursor you set up
// yourself" model used for the plain synced-folder option. The app never
// handles credentials and never runs `git init`, `git remote add`, or
// anything else that could surprise you.
// ---------------------------------------------------------------------------

function run(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: (stdout || "").trim(), stderr: (stderr || "").trim(), err });
    });
  });
}

function isGitRepo(folder) {
  try {
    return fs.existsSync(path.join(folder, ".git"));
  } catch {
    return false;
  }
}

function createGitSyncScheduler(getFolder, { debounceMs = 4000 } = {}) {
  let timer = null;
  let lastResult = { at: null, ok: null, message: null };

  async function doSync() {
    const folder = getFolder();
    if (!folder) return;

    if (!isGitRepo(folder)) {
      lastResult = {
        at: new Date().toISOString(),
        ok: false,
        message: `${folder} doesn't look like a git repository yet (no .git folder). Run "git init" and add a remote there first.`,
      };
      console.log(`git sync skipped: ${lastResult.message}`);
      return;
    }

    await run("git add -A", folder);
    const commit = await run(
      'git commit -m "Update Tatha\'s Schedule data"',
      folder
    );
    // "nothing to commit" isn't a real failure -- just means no changes since
    // the last sync (e.g. only a read happened, or two edits landed in the
    // same debounce window).
    const nothingToCommit =
      !commit.ok && /nothing to commit/i.test(commit.stdout + commit.stderr);

    if (!commit.ok && !nothingToCommit) {
      lastResult = {
        at: new Date().toISOString(),
        ok: false,
        message: `git commit failed: ${commit.stderr || commit.stdout}`,
      };
      console.log(lastResult.message);
      return;
    }

    const push = await run("git push", folder);
    if (!push.ok) {
      lastResult = {
        at: new Date().toISOString(),
        ok: false,
        message: `git push failed: ${push.stderr || push.stdout}`,
      };
      console.log(lastResult.message);
      return;
    }

    lastResult = {
      at: new Date().toISOString(),
      ok: true,
      message: nothingToCommit ? "up to date (no changes to push)" : "synced",
    };
    console.log(`git sync: ${lastResult.message}`);
  }

  return {
    // Call after any write. Resets the debounce timer -- a burst of edits
    // collapses into one sync a few seconds after the last one.
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(doSync, debounceMs);
    },
    // Surfaced in GET /api/config so the Settings panel can show whether the
    // last sync attempt actually worked -- important since this runs silently
    // in the background, especially when launched hidden at startup.
    getLastResult() {
      return lastResult;
    },
  };
}

module.exports = { createGitSyncScheduler, isGitRepo };
