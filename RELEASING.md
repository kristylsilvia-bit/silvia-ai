# Releasing a new version

Follow these steps to publish a new Silvia AI Windows desktop installer.

## 1 — Bump the version

Update the version number in two places so they stay in sync:

**`package.json`**
```json
{
  "version": "1.0.1"
}
```

**`src-tauri/tauri.conf.json`**
```json
{
  "version": "1.0.1"
}
```

Both files must use the same version string (without the `v` prefix).

## 2 — Commit and tag

```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

Pushing the tag triggers the GitHub Actions workflow (`.github/workflows/release.yml`).

## 3 — Wait for the build

Open the **Actions** tab in the GitHub repository and watch the
**Release** workflow. It will:

1. Check out the code on a `windows-latest` runner
2. Install Node 20 + npm dependencies
3. Set up Rust stable (x86_64-pc-windows-msvc)
4. Compile the Vite frontend (with `VITE_GEMINI_API_KEY` injected)
5. Build the Tauri binary and bundle both `.exe` (NSIS) and `.msi` installers
6. Create a GitHub Release tagged `v1.0.1` and upload both installer files

The build takes roughly 10–15 minutes the first time (Rust caches warm
subsequent runs to ~3–5 minutes).

## 4 — The website auto-updates

The `/download` page at https://silvia-ai-chat.vercel.app/download calls
`https://api.github.com/repos/kristylsilvia-bit/silvia-ai/releases/latest`
on every page load. Once the release is published, the download button
automatically reflects the new version, file size, and date — no code
change or redeploy needed.

---

## Firebase authorized domains (one-time setup)

The Tauri desktop app runs from the origin `tauri://localhost`. Firebase Auth
blocks requests from unknown origins, so sign-in will silently fail without
this step.

1. Open the [Firebase Console](https://console.firebase.google.com/) → your project
2. Go to **Authentication → Settings → Authorized domains**
3. Click **Add domain** and enter `tauri://localhost`
4. Save

Without this, users will see a "Sign in unavailable in desktop mode" banner
and the app runs in localStorage-only guest mode.

---

## Required secrets

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Gemini API key — injected at Vite build time |
| `GITHUB_TOKEN` | Automatically provided by GitHub — no setup needed |

## First-time Tauri setup

If `src-tauri/` does not exist yet, run once locally:

```bash
npm install --save-dev @tauri-apps/cli
npx tauri init
```

In `src-tauri/tauri.conf.json` set both bundler targets:

```json
{
  "bundle": {
    "targets": ["msi", "nsis"]
  }
}
```

Commit the generated `src-tauri/` directory and you're ready to release.
