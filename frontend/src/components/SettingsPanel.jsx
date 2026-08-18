import { useEffect, useState } from "react";
import { SettingsIcon } from "../icons.jsx";

export default function SettingsPanel({ config, onSave }) {
  const [open, setOpen] = useState(false);
  const [useExternalSync, setUseExternalSync] = useState(config.useExternalSync);
  const [externalFolder, setExternalFolder] = useState(config.externalFolder || "");
  const [syncMethod, setSyncMethod] = useState(config.syncMethod || "folder");
  const [status, setStatus] = useState(null); // null | "saving" | "saved" | "error"

  // Keep the form in sync if config is reloaded from the server elsewhere.
  useEffect(() => {
    setUseExternalSync(config.useExternalSync);
    setExternalFolder(config.externalFolder || "");
    setSyncMethod(config.syncMethod || "folder");
  }, [config.useExternalSync, config.externalFolder, config.syncMethod]);

  async function save() {
    if (useExternalSync && !externalFolder.trim()) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const ok = await onSave({
      useExternalSync,
      externalFolder: externalFolder.trim() || null,
      syncMethod,
    });
    setStatus(ok ? "saved" : "error");
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
              <span className="settings-status ok">Saved — restart the app to apply.</span>
            )}
            {status === "error" && (
              <span className="settings-status err">
                {useExternalSync && !externalFolder.trim()
                  ? "Enter a folder path first."
                  : "Failed to save."}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
