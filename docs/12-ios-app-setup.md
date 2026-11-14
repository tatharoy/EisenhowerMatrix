# iOS App — Setup & Deployment Guide

The iOS app wraps the same React frontend as the Windows desktop app using
[Capacitor](https://capacitorjs.com). It reads and writes `tasks.json` and
`metadata.json` directly to your GitHub repo
(`github.com/tatharoy/TasksAndSchedule`) via the GitHub REST API, so changes
on your phone sync automatically with the Windows app (which pulls/pushes the
same repo via git).

---

## How sync works

```
iPhone app  ──── GitHub API ────▶  tatharoy/TasksAndSchedule
                                        tasks.json
                                        metadata.json
Windows app ──── git pull/push ──▶  (same repo, C:\Tatha\code\TasksAndSchedule)
```

Every task create / edit / delete from the iOS app commits directly to the
repo. The Windows app picks up those commits the next time it does a `git pull`
(the backend's git-sync timer does this automatically).

Conflicts are handled automatically: if both devices write at the same moment,
the iOS app detects the stale SHA (GitHub returns 409), re-fetches the latest
state, re-applies your change on top, and retries.

---

## Prerequisites (all Mac steps)

You need a Mac to build and sign the iOS app. The source code lives in this
Windows repo; you just open the Xcode project on the Mac.

| Requirement | How to get it |
|---|---|
| **Xcode 15+** | Mac App Store (free) |
| **CocoaPods** | `sudo gem install cocoapods` in Terminal |
| **Node.js 18+** | nodejs.org or `brew install node` |
| **Apple Developer account** | developer.apple.com (you already have one) |

---

## Step-by-step: build and install on iPhone

### 1. Get the code onto your Mac

Option A — clone the repo on your Mac:
```bash
git clone https://github.com/tatharoy/EisenhowerMatrix.git
cd EisenhowerMatrix/frontend
npm install
npm run build
npx cap sync ios
```

Option B — zip `frontend/ios/` on Windows and AirDrop it to your Mac.  
(If using Option B, skip to step 3.)

### 2. Build the web assets on Mac (Option A only)

```bash
cd frontend
npm install
npm run build      # builds into frontend/dist/
npx cap sync ios   # copies dist/ into ios/App/App/public/
```

### 3. Install CocoaPods dependencies

```bash
cd frontend/ios/App
pod install
```

This downloads the Capacitor native iOS libraries. It takes a minute the first
time. You must do this before opening Xcode.

### 4. Open in Xcode

Open the **workspace** file (not the .xcodeproj):

```bash
open frontend/ios/App/App.xcworkspace
```

Or in Finder: navigate to `frontend/ios/App/` and double-click
`App.xcworkspace`.

### 5. Connect your iPhone

Plug your iPhone into the Mac with a cable (or use wireless pairing if already
set up). It should appear in the Xcode device selector at the top.

### 6. Set your signing team

1. In Xcode's left panel, click **App** (the top item in the project navigator)
2. Select the **App** target → **Signing & Capabilities** tab
3. Under **Signing**, set **Team** to your Apple Developer team
4. The **Bundle Identifier** is already `com.tathas.schedule` — leave it

### 7. Build and install

Click the **▶ Run** button (or press **Cmd+R**). Xcode compiles the app and
installs it directly on your iPhone.

If you see a build error about a signing identity: go to **Xcode → Settings →
Accounts** and add your Apple ID.

### 8. Trust the developer certificate on iPhone

The first time you run a sideloaded app:

1. On your iPhone: **Settings → General → VPN & Device Management**
2. Under **Developer App**, tap your Apple ID email
3. Tap **Trust "your Apple ID"** → **Trust**

Now open the app — it will work normally.

---

## First launch: GitHub token setup

The app opens a setup screen on first launch. You'll need a GitHub Personal
Access Token (PAT):

1. On your Mac or PC, go to **github.com/settings/tokens**
2. Click **Generate new token (classic)**
3. Give it any name (e.g. "Eisenhower iOS")
4. Under **Select scopes**, check **`repo`** (full repository access)
5. Click **Generate token** and copy it — you only see it once

Back in the app:

| Field | Value |
|---|---|
| Personal Access Token | paste your token |
| Repo owner | `tatharoy` |
| Repo name | `TasksAndSchedule` |
| Branch | `main` |

Tap **Connect & Sync**. The app will verify the token by fetching your
`tasks.json` and then load your tasks.

---

## Keeping the app updated

When you update the source code (new features, bug fixes):

```bash
# On Mac, in the EisenhowerMatrix folder:
git pull
cd frontend
npm run build
npx cap sync ios
```

Then re-open `App.xcworkspace` in Xcode and run again (Cmd+R). The existing
app on your iPhone will be replaced in place — no uninstall needed.

---

## Distributing via TestFlight (optional)

If you want to install without a cable or share with others:

1. In Xcode: **Product → Archive**
2. In the Organizer window: **Distribute App → App Store Connect → Upload**
3. In App Store Connect (appstoreconnect.apple.com): add the build to TestFlight
4. Invite yourself as a tester — you'll get an email to install via the
   TestFlight app

This requires a paid Apple Developer account ($99/year), which you already
have.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Untrusted Developer" on iPhone | Settings → General → VPN & Device Management → trust your Apple ID |
| Xcode signing error | Xcode → Settings → Accounts → add your Apple ID |
| App opens to blank white screen | Make sure you ran `npm run build` and `npx cap sync ios` before opening Xcode |
| GitHub 401 Unauthorized | Token expired or missing `repo` scope — regenerate at github.com/settings/tokens |
| GitHub 404 on tasks.json | Repo name or owner is wrong, or the file doesn't exist in the repo yet — check the Windows app has synced at least once |
| GitHub 409 on save (conflict) | App retries automatically; if it persists, close and reopen the app to reload the latest state |
| pod install fails | Make sure CocoaPods is installed: `sudo gem install cocoapods` |
| `npx cap sync` warning about CocoaPods | Expected on Windows — the warning is harmless, pod install only needs to run on Mac |
