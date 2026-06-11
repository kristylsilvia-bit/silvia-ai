# Silvia AI

A premium, multi-model **Gemini chat studio** — smart model routing, streaming
responses, vision/document analysis, inline image generation, **cross-device
chat sync**, and a full-screen **Voice Mode** powered by Gemini Live, wrapped
in a glass-morphism UI with dark/light themes.

This is the production build of the approved design prototype, recreated
pixel-perfectly in **React + TypeScript + Vite**. The original single-file
mockup is preserved at [`Silvia AI.html`](./Silvia%20AI.html) and the design
handoff bundle (brief + chat transcript) lives in [`silvia-ai/`](./silvia-ai).

## Features

- **Smart routing** — each message is auto-routed to the right model:
  image requests → **Nano Banana 2** (`gemini-3.1-flash-image`),
  attachments → **Gemini 3.1 Pro**, plain chat → **Gemini 3.5 Flash**.
  Pin a specific model anytime from the selector.
- **Cross-device chat sync** — sign in and your chats, titles, pinned state,
  per-chat models, and settings follow you in real time via **Firebase
  Firestore**. localStorage stays as the offline cache; conflicts resolve by
  `updatedAt` (last write wins). A status chip shows
  *Synced / Syncing / Offline / Sync error*.
- **Voice Mode** — a full-screen, low-latency voice conversation with Silvia AI
  powered by **`gemini-3.1-flash-live-preview`** (16 kHz PCM in, 24 kHz PCM
  out). Live transcripts, barge-in interruption, mute, reconnect, 30 selectable
  voices, and conversations saved straight into chat history with a **Voice**
  badge so you can continue them in text later.
- **Streaming responses** with a live caret, animated typing dots, and a
  send → stop button to abort mid-stream.
- **Attachments** — drag-and-drop, click, or paste. Images, PDFs, text, code,
  and spreadsheets. Generated images render inline with a save button.
- **Markdown + syntax-highlighted code** with per-block copy buttons.
- **Responsive** — collapsible desktop sidebar, native-feeling mobile drawer
  (hamburger button + swipe to close), and a desktop settings window with
  side navigation.
- **Dark mode by default** with a light toggle.

## Native iOS app

A complete SwiftUI iOS 17+ app is included in [`SilviaAI-iOS/`](./SilviaAI-iOS). Open [`SilviaAI-iOS/SilviaAI.xcodeproj`](./SilviaAI-iOS/SilviaAI.xcodeproj) in Xcode, add your Gemini API key to `SilviaAI/Resources/Config.plist`, and run on an iPhone simulator or real iPhone. See [`SilviaAI-iOS/README.md`](./SilviaAI-iOS/README.md) for step-by-step Xcode instructions.

## Quick start

```bash
# 1. install dependencies
npm install

# 2. add your keys
cp .env.example .env
#    then edit .env — at minimum set VITE_GEMINI_API_KEY (https://aistudio.google.com/apikey)
#    add the VITE_FIREBASE_* values to enable sign-in + chat sync

# 3. run the dev server
npm run dev

# 4. production build + preview
npm run build
npm run preview
```

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | client (build-time) | Gemini key for chat/image calls and the local-dev Voice Mode fallback. |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | client (build-time) | Firebase web config (Auth + Firestore). Without these the app runs in guest mode with local-only chats. |
| `GEMINI_API_KEY` | **server only** (Vercel) | Used by [`api/live-token.ts`](./api/live-token.ts) to mint **ephemeral tokens** for browser → Gemini Live connections so the real key never ships to the client. |

Missing-variable behavior is graceful: no Firebase config → guest mode; no
`GEMINI_API_KEY` on the server → Voice Mode falls back to the Vite key in dev
and shows a clear setup error otherwise.

## Chat sync setup (Firebase)

1. Create a Firebase project, enable **Authentication** (Google + Email/Password)
   and **Cloud Firestore**.
2. Put the web-app config values into `.env` (`VITE_FIREBASE_*`).
3. Deploy the security rules in [`firestore.rules`](./firestore.rules):
   `firebase deploy --only firestore:rules` (or paste them into the Firebase
   console). They restrict every user to `users/{uid}/**` — nobody can read or
   write anyone else's chats.

Data layout: `users/{uid}/chats/{chatId}` (one doc per conversation, sanitized —
large attachment payloads stay on-device) and `users/{uid}/meta/settings`
(default model, voice, thinking level, personality, toggles). Deletions sync as
tombstones and are garbage-collected after 30 days. Chats created while signed
out are merged into the account on first sign-in.

## Voice Mode

- Model: **`gemini-3.1-flash-live-preview`**, response modality `AUDIO`,
  voice via `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`,
  reasoning via `thinkingConfig.thinkingLevel` (default `minimal` for lowest
  latency; configurable in **Settings → Advanced**).
- Microphone audio is streamed with `sendRealtimeInput` as 16-bit little-endian
  PCM at 16 kHz; model audio plays back gaplessly at 24 kHz. Automatic VAD
  handles turn-taking, and speaking over Silvia AI interrupts playback
  instantly. Muting sends `audioStreamEnd` so the server can close the turn.
- Input/output transcriptions render in the live transcript panel and are
  persisted as regular chat messages (synced across devices when signed in).
- In production the browser authenticates with a **single-use ephemeral token**
  from `POST /api/live-token` (a Vercel serverless function); set
  `GEMINI_API_KEY` in Vercel for it. In local dev (`npm run dev`) the function
  isn't running, so the client falls back to `VITE_GEMINI_API_KEY`.

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the Vite dev server (HMR).         |
| `npm run build`     | Type-check and build to `dist/`.         |
| `npm run preview`   | Serve the production build locally.      |
| `npm run typecheck` | Run the TypeScript compiler (no emit).   |
| `npm run lint`      | Lint the `src/` tree.                    |

## Project structure

```
api/
└── live-token.ts           # Vercel function: ephemeral tokens for Gemini Live
firestore.rules             # per-user Firestore security rules
src/
├── main.tsx                # entry — mounts <App>, imports global styles + hljs theme
├── App.tsx                 # state, send/stream flow, routing, voice + sync wiring
├── types.ts                # shared domain types (Chat, Message, SyncStatus, …)
├── config/
│   ├── models.ts           # model catalog (ids, labels, descriptions)
│   └── voices.ts           # 30 Gemini Live voices + traits
├── lib/
│   ├── gemini.ts           # Gemini API client (stream + image), error mapping
│   ├── liveVoice.ts        # Gemini Live session (connect/reconnect/transcripts)
│   ├── audio.ts            # mic worklet capture (16k PCM) + 24k playback queue
│   ├── chatSync.ts         # Firestore serialization, merging, listeners
│   ├── firebase.ts         # Firebase app/auth/Firestore bootstrap
│   ├── markdown.ts         # marked + DOMPurify render + code-block enhancement
│   ├── routing.ts          # auto model-routing heuristic
│   ├── files.ts            # File → Attachment (base64) reader
│   ├── storage.ts          # localStorage cache (chats / theme / settings)
│   └── utils.ts            # uid, byte formatting, breakpoint helper
├── hooks/
│   ├── useChatSync.ts      # synced chats + settings state (LWW, status chip)
│   └── useTheme.ts         # theme state synced to <html data-theme>
├── components/             # Sidebar, TopBar, ChatView, Composer, VoiceMode, …
└── styles/global.css       # design tokens + component styles
```

## Configuration

Model ids are defined in [`src/config/models.ts`](./src/config/models.ts). They
match the design brief exactly; if a model isn't enabled on your key, swap its
`api` string there. Voice options live in
[`src/config/voices.ts`](./src/config/voices.ts).

## Deploying to Vercel

1. **Push this branch** (or merge to main) and import the repo in the Vercel dashboard.
2. Vercel auto-detects Vite; the build command is `npm run build` and the output
   directory is `dist`. The [`api/`](./api) folder deploys automatically as
   serverless functions.
3. In **Project → Settings → Environment Variables**, add:
   - `VITE_GEMINI_API_KEY` = your key from [Google AI Studio](https://aistudio.google.com/apikey)
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
     `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
     `VITE_FIREBASE_APP_ID` = your Firebase web config
   - `GEMINI_API_KEY` = server-side key for the Voice Mode token endpoint
     (**not** prefixed with `VITE_`, so it is never bundled into the client)
   - Tick **Production** (and **Preview** if you want it in preview deploys)
4. Add your Vercel domain to Firebase **Authentication → Authorized domains**.
5. Redeploy.

> **⚠ Security note:** `VITE_*` vars are inlined into the client bundle at build
> time. The text/image chat calls currently use the client key — fine for
> personal/internal use; for a fully public deployment, proxy those through an
> API route like the Voice Mode token endpoint. Voice Mode already keeps its
> key server-side via ephemeral tokens, and Firestore access is locked down by
> [`firestore.rules`](./firestore.rules).

## Standalone file

`standalone.html` is the original self-contained prototype from the design handoff. It requires
no build step — open it in a browser and paste your key into `const GEMINI_API_KEY` at the
top of the script. It is preserved for reference; the React app in `src/` is the production
deliverable.

## Credits

Designed in Claude Design; implemented from the exported handoff bundle.
