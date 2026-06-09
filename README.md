# Silvia AI

A premium, multi-model **Gemini chat studio** — smart model routing, streaming
responses, vision/document analysis, and inline image generation, wrapped in a
glass-morphism UI with dark/light themes.

This is the production build of the approved design prototype, recreated
pixel-perfectly in **React + TypeScript + Vite**. The original single-file
mockup is preserved at [`Silvia AI.html`](./Silvia%20AI.html) and the design
handoff bundle (brief + chat transcript) lives in [`silvia-ai/`](./silvia-ai).

## Features

- **Smart routing** — each message is auto-routed to the right model:
  image requests → **Nano Banana 2** (`gemini-3.1-flash-image`),
  attachments → **Gemini 3.1 Pro**, plain chat → **Gemini 3.5 Flash**.
  Pin a specific model anytime from the selector.
- **Streaming responses** with a live caret, animated typing dots, and a
  send → stop button to abort mid-stream.
- **Attachments** — drag-and-drop, click, or paste. Images, PDFs, text, code,
  and spreadsheets. Generated images render inline with a save button.
- **Markdown + syntax-highlighted code** with per-block copy buttons.
- **Persistent history** (localStorage) — new chat, delete, clear all.
- **Responsive** — collapsible desktop sidebar, mobile drawer with backdrop.
- **Dark mode by default** with a light toggle.


## Native iOS app

A complete SwiftUI iOS 17+ app is included in [`SilviaAI-iOS/`](./SilviaAI-iOS). Open [`SilviaAI-iOS/SilviaAI.xcodeproj`](./SilviaAI-iOS/SilviaAI.xcodeproj) in Xcode, add your Gemini API key to `SilviaAI/Resources/Config.plist`, and run on an iPhone simulator or real iPhone. See [`SilviaAI-iOS/README.md`](./SilviaAI-iOS/README.md) for step-by-step Xcode instructions.

## Quick start

```bash
# 1. install dependencies
npm install

# 2. add your Gemini API key
cp .env.example .env
#    then edit .env and set VITE_GEMINI_API_KEY=...   (https://aistudio.google.com/apikey)

# 3. run the dev server
npm run dev

# 4. production build + preview
npm run build
npm run preview
```

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
src/
├── main.tsx                # entry — mounts <App>, imports global styles + hljs theme
├── App.tsx                 # state, send/stream flow, routing, persistence, layout
├── types.ts                # shared domain types
├── config/models.ts        # model catalog (ids, labels, descriptions)
├── lib/
│   ├── gemini.ts           # Gemini API client (stream + image), error mapping
│   ├── markdown.ts         # marked + DOMPurify render + code-block enhancement
│   ├── routing.ts          # auto model-routing heuristic
│   ├── files.ts            # File → Attachment (base64) reader
│   ├── storage.ts          # localStorage (chats / theme / model)
│   └── utils.ts            # uid, byte formatting, breakpoint helper
├── hooks/useTheme.ts       # theme state synced to <html data-theme>
├── components/             # Sidebar, TopBar, ModelSelector, ChatView, Composer, …
└── styles/global.css       # design tokens + component styles (ported verbatim)
```

## Configuration

Model ids are defined in [`src/config/models.ts`](./src/config/models.ts). They
match the design brief exactly; if a model isn't enabled on your key, swap its
`api` string there.

## Deploying to Vercel

1. **Push this branch** (or merge to main) and import the repo in the Vercel dashboard.
2. Vercel auto-detects Vite; the build command is `npm run build` and the output directory is `dist`.
3. In **Project → Settings → Environment Variables**, add:
   - `VITE_GEMINI_API_KEY` = your key from [Google AI Studio](https://aistudio.google.com/apikey)
   - Tick **Production** (and **Preview** if you want it in preview deploys)
4. Redeploy. Vite inlines `VITE_*` vars at build time, so the key is baked into the client bundle and never accidentally committed to source control.

> **⚠ Security note:** Baking the key into the client bundle is fine for personal/internal use.
> For a public deployment, proxy the Gemini calls through a Vercel Edge Function or API route
> so the key stays server-side. Add rate limiting and auth at that layer to prevent abuse.

## Standalone file

`standalone.html` is the original self-contained prototype from the design handoff. It requires
no build step — open it in a browser and paste your key into `const GEMINI_API_KEY` at the
top of the script. It is preserved for reference; the React app in `src/` is the production
deliverable.

## Credits

Designed in Claude Design; implemented from the exported handoff bundle.
