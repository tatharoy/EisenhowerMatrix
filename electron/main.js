const { app, BrowserWindow, Tray, Menu, nativeImage, session } = require("electron");
const path = require("path");
const fs = require("fs");

// Renaming the app (productName) changes where Electron's userData folder
// points -- %APPDATA%\Eisenhower Matrix\ instead of the old %APPDATA%\
// Tatha's Schedule\. Nothing is ever deleted by that rename, but without
// this, anyone with existing data would open the renamed app and see it
// looking empty, since it'd be looking in a folder it never wrote to.
// One-time, one-directional: copies over only if the new location doesn't
// have data yet and the old one does.
function migrateOldUserData() {
  const newDir = app.getPath("userData");
  const oldDir = path.join(app.getPath("appData"), "Tatha's Schedule");
  if (oldDir === newDir) return;
  const hasData = (dir) =>
    fs.existsSync(path.join(dir, "config.json")) || fs.existsSync(path.join(dir, "data"));
  if (hasData(newDir) || !hasData(oldDir)) return;
  try {
    fs.mkdirSync(newDir, { recursive: true });
    fs.cpSync(oldDir, newDir, { recursive: true });
    console.log(`Migrated existing data from "${oldDir}" to "${newDir}" after the app rename.`);
  } catch (err) {
    console.log(`Could not migrate old data folder (${oldDir}): ${err.message}`);
  }
}
migrateOldUserData();

// Route data to Electron's OS-standard, writable per-user folder (NOT the
// installed app directory, which is expected to be read-only once packaged
// -- especially true on macOS, where writing into the .app bundle breaks
// code signing). backend/server.js reads this via APP_DATA_DIR; when unset
// (e.g. running `node backend/server.js` directly), it falls back to the
// original repo-relative paths -- this only changes behavior here, inside
// the Electron wrapper.
process.env.APP_DATA_DIR = app.getPath("userData");

// Electron opens its own window below -- suppress server.js's own
// "launch a system browser" behavior.
process.env.OPEN_BROWSER = "false";

const PORT = process.env.PORT || 4000;
const SERVER_URL = `http://localhost:${PORT}`;

// Only one copy of this app (and one Express server on PORT) at a time.
// Without this, clicking a second desktop shortcut while the app is
// already running would try to bind the same port twice and fail.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;

  function backendEntryPath() {
    // Packaged app: backend/ was copied to resources/backend via
    // electron-builder's extraResources. Dev mode: it's the real sibling
    // folder in this repo checkout.
    return app.isPackaged
      ? path.join(process.resourcesPath, "backend", "server.js")
      : path.join(__dirname, "..", "backend", "server.js");
  }

  function startServer() {
    // Same OS process as Electron's main process -- this just runs the
    // existing Express app in place. No child process, no IPC needed; the
    // React frontend keeps talking to it over plain http://localhost fetch
    // calls exactly as it does outside Electron.
    require(backendEntryPath());
  }

  // The server needs a brief moment to start listening. Rather than change
  // server.js's control flow to signal readiness, just retry the load --
  // simple and standard for Electron-wraps-a-local-server apps.
  function loadWithRetry(win, url, attempt = 0) {
    win.loadURL(url).catch(() => {
      if (attempt < 40) {
        setTimeout(() => loadWithRetry(win, url, attempt + 1), 250);
      }
    });
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      icon: path.join(__dirname, "assets", "icon-256.png"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    loadWithRetry(mainWindow, SERVER_URL);

    mainWindow.once("ready-to-show", () => mainWindow.show());

    // The X button now closes the window normally, same as any other
    // Windows app -- previously this hid the window instead and kept the
    // process alive indefinitely, which is the likely cause of the
    // duplicate-process confusion: closing never actually ended anything,
    // so state could accumulate across repeated open/close cycles. The
    // native minimize button (unaffected by this handler) still gets it
    // out of the way without closing anything, if that's what you want
    // instead. window-all-closed below quits the whole app once this
    // closes, so there's no lingering background process to speak of.
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  function showOrCreateWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  }

  function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray-icon.png"));
    tray = new Tray(icon);
    tray.setToolTip("Eisenhower Matrix");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open Eisenhower Matrix",
          click: showOrCreateWindow,
        },
        { type: "separator" },
        {
          label: "Quit",
          click: () => app.quit(),
        },
      ])
    );
    tray.on("click", showOrCreateWindow);
  }

  app.on("second-instance", showOrCreateWindow);

  app.whenReady().then(() => {
    // Electron blocks microphone/camera access by default unless a session
    // explicitly grants it -- without this, the mic button's voice input
    // silently fails to even prompt, regardless of anything in the page's
    // own JS. This only covers the *permission* layer; whether the actual
    // speech-to-text recognition works at all inside Electron's bundled
    // Chromium (which lacks the signed API keys real Chrome/Edge builds
    // have for that backend) is a separate, harder constraint -- see the
    // README's "Voice input" section for the honest caveat on that.
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(permission === "media");
    });

    startServer();
    createWindow();
    createTray();

    // Cross-platform "launch at login" -- replaces the start-hidden.vbs /
    // Startup-folder approach (Windows) and the launchd plist instructions
    // (macOS) used by the standalone, non-Electron version.
    app.setLoginItemSettings({ openAtLogin: true });

    app.on("activate", showOrCreateWindow);
  });

  // Closing the window now quits the whole app (see the "closed" handler
  // in createWindow) -- this just makes that explicit and consistent
  // across platforms, rather than following macOS's usual "stay running
  // with no windows open" convention, to keep the mental model simple:
  // window closed means the app is done, full stop.
  app.on("window-all-closed", () => {
    app.quit();
  });
}
