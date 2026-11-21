# Noodle Desktop - Engineering Guidelines & Architecture

## Architecture Decisions

- "/" is the desktop workspace setup screen; the notes workspace lives at "/workspace" (src/routes/workspace.tsx). The setup's "Select Workspace Folder" modal stores the chosen path in the ui store and navigates to /workspace.
- BYOK keys stay in ephemeral component state and are handed only to an optional trusted Electron preload bridge; without OS encryption the wizard refuses transmission and persistence, because the browser cannot provide safeStorage. The desktop host must reject Linux basic_text storage, allowlist provider endpoints, redact errors, and implement atomic encrypted saving after validation before exposing this bridge.
- Study recommendations live under /workspace/study using the workspace shell; browser recommendations use explicitly labeled local lexical cosine over existing notes, never fabricated semantic scores. Cloud synthesis requires an optional trusted desktop RAG bridge and writes only AI outputs; absent that bridge, no material is transmitted.
- The Synthesizer lives under /workspace/synthesizer; it hands bounded selected excerpts and an explicit output format to the trusted desktop RAG bridge, then saves one new AI-only note after validating the result. The workspace reloads notes on navigation so newly generated documents are visible immediately.

## Desktop Specific Rules

- **Main Process Isolation:** Database and direct filesystem access reside strictly in the main process.
- **IPC Preload Bridge:** The renderer communicates with main via typed IPC channels exposed through a secure preload script.
- **No Server Functions:** TanStack Start / SSR server functions are completely removed; this is a pure client-side SPA inside Electron with hash history.
- **Workspace-Relative Images:** All image paths embedded within notes are strictly workspace-relative.
- **AI Pillar Isolation:** All AI-generated outputs (study guides, synthesizer exports) are automatically saved into the "ai" pillar namespace.
- **Preload Integrity:** The preload script remains bundled and strictly sandboxed.
- **Security Invariants:** Mandatory security configuration maintained across all windows:
  - `sandbox: true`
  - `contextIsolation: true`
  - `nodeIntegration: false`
- **Local-First Storage & Offline:** All assets and fonts are bundled locally; remote network calls are blocked by CSP.
