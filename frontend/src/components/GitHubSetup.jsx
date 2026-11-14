import { useState } from "react";
import { githubApi, saveGithubConfig } from "../githubApi.js";

export default function GitHubSetup({ onComplete }) {
  const [token, setToken] = useState("");
  const [repoOwner, setRepoOwner] = useState("tatharoy");
  const [repoName, setRepoName] = useState("TasksAndSchedule");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function connect() {
    if (!token.trim()) {
      setError("Personal Access Token is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const cfg = {
      token: token.trim(),
      repoOwner: repoOwner.trim() || "tatharoy",
      repoName: repoName.trim() || "TasksAndSchedule",
      branch: branch.trim() || "main",
    };
    saveGithubConfig(cfg);
    try {
      await githubApi.list();
      onComplete();
    } catch (err) {
      saveGithubConfig(null);
      setError(
        err.status === 401
          ? "Token rejected (401). Make sure it has the `repo` scope."
          : err.status === 404
          ? `Repo not found: ${cfg.repoOwner}/${cfg.repoName}`
          : err.message || "Could not connect to GitHub."
      );
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>Connect to GitHub Sync</h2>
        <p style={styles.subtitle}>
          Your tasks will sync to{" "}
          <strong>
            github.com/{repoOwner}/{repoName}
          </strong>
        </p>

        <label style={styles.label}>
          Personal Access Token
          <input
            type="password"
            style={styles.input}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <span style={styles.hint}>
            Create one at github.com/settings/tokens with <code>repo</code> scope
          </span>
        </label>

        <label style={styles.label}>
          Repo owner
          <input
            type="text"
            style={styles.input}
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        <label style={styles.label}>
          Repo name
          <input
            type="text"
            style={styles.input}
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        <label style={styles.label}>
          Branch
          <input
            type="text"
            style={styles.input}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="button"
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          onClick={connect}
          disabled={loading}
        >
          {loading ? "Connecting…" : "Connect & Sync"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f0",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "32px 28px",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 22,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  subtitle: {
    margin: "0 0 24px",
    fontSize: 14,
    color: "#555",
    lineHeight: 1.5,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
  },
  input: {
    padding: "9px 12px",
    borderRadius: 7,
    border: "1.5px solid #d0d0d0",
    fontSize: 15,
    outline: "none",
    color: "#1a1a1a",
    background: "#fafafa",
  },
  hint: {
    fontSize: 11,
    color: "#777",
    fontWeight: 400,
  },
  error: {
    marginBottom: 14,
    padding: "10px 14px",
    borderRadius: 7,
    background: "#fff0f0",
    border: "1px solid #f5c6c6",
    color: "#c0392b",
    fontSize: 13,
  },
  button: {
    display: "block",
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#2c2c2c",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
};
