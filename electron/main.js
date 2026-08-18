const { app, BrowserWindow, Tray, Menu, nativeImage } = require("electron");
const path = require("path");

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
// already running (hidden in the tray) would try to bind the same port
// twice and fail.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;
  let isQuitting = false;

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

    // Minimize to tray instead of quitting when the window is closed --
    // the server (same process) keeps running in the background either
    // way; this only controls whether the window itself is visible.
    mainWindow.on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }

  function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray-icon.png"));
    tray = new Tray(icon);
    tray.setToolTip("Tatha's Schedule");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open Tatha's Schedule",
          click: () => {
            mainWindow?.show();
            mainWindow?.focus();
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ])
    );
    tray.on("click", () => {
      if (!mainWindow) return;
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  }

  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.whenReady().then(() => {
    startServer();
    createWindow();
    createTray();

    // Cross-platform "launch at login" -- replaces the start-hidden.vbs /
    // Startup-folder approach (Windows) and the launchd plist instructions
    // (macOS) used by the standalone, non-Electron version.
    app.setLoginItemSettings({ openAtLogin: true });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else mainWindow?.show();
    });
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  // The tray keeps the app alive on every platform -- closing the window
  // never quits it, only the tray's Quit item (or Cmd+Q on macOS) does.
  app.on("window-all-closed", () => {
    // Intentionally does nothing.
  });
}
