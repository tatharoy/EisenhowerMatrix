import { useEffect, useState } from "react";
import { SettingsIcon } from "../icons.jsx";
import { playReminder } from "../sound.js";
import { saveGithubConfig } from "../githubApi.js";

export default function SettingsPanel({ config, onSave }) {
  const [open, setOpen] = useState(false);
  const [useExternalSync, setUseExternalSync] = useState(config.useExternalSync);
  const [externalFolder, setExternalFolder] = useState(config.externalFolder || "");
  const [syncMethod, setSyncMethod] = useState(config.syncMethod || "folder");
  const [reminderSound, setReminderSound] = useState(config.reminderSound || "none");
  const [status, setStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [savedRestartRequired, setSavedRestartRequired] = useState(false);

  // Keep the form in sync if config is reloaded from the server elsewhere.
  useEffect(() => {
    setUseExternalSync(config.useExternalSync);
    setExternalFolder(config.externalFolder || "");
    setSyncMethod(config.syncMethod || "folder");
    setReminderSound(config.reminderSound || "none");
  }, [config.useExternalSync, config.externalFolder, config.syncMethod, config.reminderSound]);

  async function save() {
    if (useExternalSync && !externalFolder.trim()) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const result = await onSave({
      useExternalSync,
      externalFolder: externalFolder.trim() || null,
      syncMethod,
      reminderSound,
    });
    if (result) {
      setSavedRestartRequired(!!result.restartRequired);
      setStatus("saved");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="settings-wrap">
      <button
        type="button"
        className="settings-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Storage settings"
        title="Storage settings"
      >
        <SettingsIcon />
      </button>

      {open && (
        <div className="settings-panel">
          {config.source === "github" ? (
            <>
              <div className="settings-title">GitHub Sync</div>
              <div className="settings-note">
                Tasks are syncing with{" "}
                <strong>
                  {config.effectiveDbFile?.replace("github:", "").replace("/tasks.json", "")}
                </strong>
              </div>
              <div className="settings-actions" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    saveGithubConfig(null);
                    window.location.reload();
                  }}
                >
                  Re-configure token / repo
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="settings-title">Where should your data live?</div>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={useExternalSync}
                  onChange={(e) => setUseExternalSync(e.target.checked)}
                />
                Sync with an external folder
              </label>

              {useExternalSync && (
                <>
                  <input
                    type="text"
                    className="settings-folder-input"
                    placeholder="e.g. C:\Users\you\Google Drive\Tatha's Schedule"
                    value={externalFolder}
                    onChange={(e) => setExternalFolder(e.target.value)}
                  />

                  <div className="settings-method-row">
                    <label className="settings-radio-row">
                      <input
                        type="radio"
                        name="syncMethod"
                        checked={syncMethod === "folder"}
                        onChange={() => setSyncMethod("folder")}
                      />
                      Synced folder (Google Drive, OneDrive, SharePoint)
                    </label>
                    <label className="settings-radio-row">
                      <input
                        type="radio"
                        name="syncMethod"
                        checked={syncMethod === "git"}
                        onChange={() => setSyncMethod("git")}
                      />
                      Git repository (e.g. GitHub) — auto commit &amp; push
                    </label>
                  </div>

                  {syncMethod === "folder" && (
                    <div className="settings-note">
                      This just needs to be a folder that a desktop sync client
                      (Google Drive, OneDrive, SharePoint) is already watching —
                      the app only writes plain files there.
                    </div>
                  )}

                  {syncMethod === "git" && (
                    <div className="settings-note">
                      This folder must already be a git repository with push
                      access working with no prompts (SSH key or a credential
                      helper) — the app only runs <code>git add</code>,{" "}
                      <code>commit</code>, and <code>push</code> automatically, a
                      few seconds after your last change. It never touches
                      credentials or creates the repo for you.
                      {config.externalFolder === externalFolder && (
                        <div style={{ marginTop: 6 }}>
                          {config.gitRepoDetected
                            ? "✓ Looks like a git repository."
                            : "⚠ This doesn't look like a git repository yet (no .git folder found)."}
                        </div>
                      )}
                    </div>
                  )}

                  {syncMethod === "git" && config.lastGitSync && config.lastGitSync.at && (
                    <div className="settings-note">
                      Last sync attempt: {config.lastGitSync.ok ? "✓" : "✗"}{" "}
                      {config.lastGitSync.message}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="settings-title" style={{ marginTop: 14 }}>
            Reminder sound
          </div>
          <div className="settings-note">
            Plays every {config.reminderIntervalMinutes || 30} min while any task is due
            today or overdue.
          </div>
          <div className="settings-sound-row">
            <select value={reminderSound} onChange={(e) => setReminderSound(e.target.value)}>
              <option value="none">Off</option>
              <option value="bell">Bell</option>
              <option value="alert">Urgent alert</option>
            </select>
            <button type="button" className="ghost" onClick={() => playReminder(reminderSound)}>
              Test
            </button>
          </div>

          {config.source !== "github" && (
            <>
              <div className="settings-current">
                <div>Currently reading from:</div>
                <div className="settings-path">{config.effectiveDbFile}</div>
                <div className="settings-path">{config.effectiveMetadataFile}</div>
              </div>

              {config.overriddenByEnv && (
                <div className="settings-note">
                  DB_FILE / METADATA_FILE environment variables are set on this
                  machine and take priority over this setting.
                </div>
              )}

              <div className="settings-actions">
                <button type="button" onClick={save}>
                  Save
                </button>
                {status === "saved" && (
                  <span className="settings-status ok">
                    Saved{savedRestartRequired ? " — restart the app to apply." : "."}
                  </span>
                )}
                {status === "error" && (
                  <span className="settings-status err">
                    {useExternalSync && !externalFolder.trim()
                      ? "Enter a folder path first."
                      : "Failed to save."}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
