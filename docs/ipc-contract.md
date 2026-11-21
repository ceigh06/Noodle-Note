# Noodle IPC Contract Audit

Audit date: 2026-11-21

This document records the current mock IPC and preload surface for v0.1a. The implementations remain mocked; this audit does not change the contract.

## Preload and security boundary

- Preload entry point: `src/preload/index.ts`
- Bridge factory: `src/preload/bridge.ts`
- Shared contract and Noodle channel constants: `src/shared/contracts.ts`
- Main registration for Noodle handlers: `src/main/ipc/register.ts`
- Verification-only handlers: `src/main/index.ts`
- Renderer window settings (`src/main/index.ts`): `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`
- Renderer-facing Noodle APIs exposed with `contextBridge`:
  - `window.noodleAPI`: notes and assets
  - `window.noodleSecureKeys`: secure-key capability and setup
  - `window.noodleStudy` is contract-only for v0.3 and is not exposed
  - `window.api`: verification-only proof API

All Noodle calls use `ipcRenderer.invoke` internally through the typed preload bridge. The verification status callback uses `ipcRenderer.send` internally. The renderer receives wrapper methods, not `ipcRenderer`, `invoke`, or `send`.

## IPC channels

### Noodle application channels

| Channel | Direction | Renderer request | Main response | Handler | Preload exposure |
| --- | --- | --- | --- | --- | --- |
| `noodle:notes:list` | invoke/handle | none | `Promise<Note[]>` | `src/main/ipc/register.ts` -> `listNotes` in `src/main/ipc/notes.ts` | `window.noodleAPI.notes.list()` |
| `noodle:notes:get` | invoke/handle | `id: string` (handler receives `unknown` and validates) | `Promise<Note \| null>` | `src/main/ipc/register.ts` -> `getNote` in `src/main/ipc/notes.ts` | `window.noodleAPI.notes.get(id)` |
| `noodle:notes:save` | invoke/handle | `note: Note` (handler receives `unknown` and validates) | `Promise<Note>` | `src/main/ipc/register.ts` -> `saveNote` in `src/main/ipc/notes.ts` | `window.noodleAPI.notes.save(note)` |
| `noodle:notes:create` | invoke/handle | optional `pillar?: Pillar` (handler receives `unknown`; defaults to `manual`) | `Promise<Note>` | `src/main/ipc/register.ts` -> `createNote` in `src/main/ipc/notes.ts` | `window.noodleAPI.notes.create(pillar?)` |
| `noodle:assets:importBytes` | invoke/handle | `{ name: string; mimeType: string; bytes: Uint8Array }` | `Promise<{ relativePath: string }>` | `src/main/ipc/register.ts` -> `importBytes` in `src/main/ipc/assets.ts` | `window.noodleAPI.assets.importBytes(input)` |
| `noodle:secureKeys:isSecureStorageAvailable` | invoke/handle | none | `Promise<boolean>` | `src/main/ipc/register.ts` -> `isSecureStorageAvailable` in `src/main/ipc/secureKeys.ts` | `window.noodleSecureKeys.isSecureStorageAvailable()` |
| `noodle:secureKeys:testAndSaveKey` | invoke/handle | `{ provider: Provider; key: string }` (handler receives `unknown` and validates) | `Promise<KeySetupResult>`; current mock rejects because secure storage is unavailable | `src/main/ipc/register.ts` -> `testAndSaveKey` in `src/main/ipc/secureKeys.ts` | `window.noodleSecureKeys.testAndSaveKey(input)` |

### Verification-only channels

These channels are separate from the Noodle application contract and are used by the native proof screen.

| Channel | Direction | Renderer request | Main response | Handler | Preload exposure |
| --- | --- | --- | --- | --- | --- |
| `run-checks` | invoke/handle | none | `Promise<VerificationReport>`; only accepted with `--verify` | `src/main/index.ts` | `window.api.runChecks()` |
| `renderer-check-result` | send/on | `RendererStatus` | none | `src/main/index.ts` | `window.api.reportRendererStatus(status)` |

Both verification handlers call `assertTrustedSender`. The Noodle handlers registered by `registerNoodleIpc` also validate the sender before dispatching to their mock handler.

## Shared types

Defined in `src/shared/contracts.ts`:

```ts
export type Pillar = 'sources' | 'manual' | 'ai'
export type Category = 'Videos' | 'Wishlist' | 'Assignment' | 'Projects' | 'Work' | 'Study'

export interface Note {
  id: string
  title: string
  category: Category
  pillar: Pillar
  content: string
  updatedAt: string
}

export type Provider = 'openai' | 'anthropic' | 'gemini'
export type KeySetupResult = { success: boolean; message?: string }
```

Runtime validation is in `src/main/ipc/validate.ts`:

- Note IDs: non-empty strings up to 255 characters.
- Note titles: strings up to 255 characters.
- Note content: strings up to 1,000,000 characters.
- Note timestamps: strings up to 100 characters.
- Asset names: non-empty strings up to 255 characters; path separators, `..`, and control characters are rejected.
- Asset MIME types: JPEG, PNG, GIF, WebP, or SVG.
- Asset bytes: `Uint8Array`, maximum 10 MiB.
- Providers: `openai`, `anthropic`, or `gemini`.
- Keys: non-empty strings up to 500 characters.

## Mock data and handler behavior

### Notes

The mock notes are defined in `src/main/mock/seed.ts` and loaded into the in-memory handler store in `src/main/ipc/notes.ts`:

```ts
let db = [...seed]
```

There are 11 seed notes. The seed tuple list is:

1. `Cell Respiration Overview` — `Study` — `manual`
2. `Thesis Proposal Draft` — `Work` — `manual`
3. `Calculus Problem Set 4` — `Assignment` — `manual`
4. `Robotics Capstone Plan` — `Projects` — `manual`
5. `MIT 6.006 Lecture Clips` — `Videos` — `sources`
6. `Organic Chem Slides — Week 3` — `Study` — `sources`
7. `Research Paper: Attention Is All You Need` — `Work` — `sources`
8. `Lab Equipment to Buy` — `Wishlist` — `manual`
9. `Study Guide: Thermodynamics` — `Study` — `ai`
10. `Gap Analysis: Linear Algebra` — `Assignment` — `ai`
11. `Auto Summary: History Readings` — `Work` — `ai`

One trimmed seed note, as generated by the mapper:

```json
{
  "id": "n1",
  "title": "Cell Respiration Overview",
  "category": "Study",
  "pillar": "manual",
  "content": "<h1>Cell Respiration Overview</h1><p>Lorem ipsum...</p><ul><li>Key idea one</li><li>Key idea two</li></ul>",
  "updatedAt": "2021-01-07T21:38:00.000Z"
}
```

The mock list/get/save/create handlers add approximately 120 ms latency and return structured clones. `save` updates `updatedAt`; `create` generates an `n<timestamp>` ID, defaults to the `manual` pillar, and creates HTML content beginning with an H1. The store is process-memory only and is not persisted to disk.

### Assets

`src/main/ipc/assets.ts` validates the payload and currently returns a simulated path without writing bytes:

```ts
{ relativePath: `./assets/${input.name}` }
```

The renderer adapter additionally creates a browser blob preview URL for file imports. No filesystem asset persistence exists yet.

### Secure keys

`src/main/ipc/secureKeys.ts` currently returns `false` from `isSecureStorageAvailable`. After validating the input, `testAndSaveKey` rejects with:

```text
Secure saving requires the desktop app with an available OS key store. No key was sent or saved.
```

No key is persisted by the current mock.

## Simulated workspace picker

The picker is a renderer-only component at `src/renderer/src/components/noodle/FolderPickerModal.tsx`.

- The hard-coded tree starts at `home` and contains `Documents`, `Desktop`, `Downloads`, and `Projects` branches with sample children.
- Favorites are hard-coded for Home, Documents, Desktop, Downloads, and Projects.
- Paths are rendered as `~` plus slash-separated tree segments, for example `~/Documents/University`.
- Clicking selects a node; double-clicking enters a node; `Open` enters a selected directory with children; `Use this folder` calls the parent callback.
- The search input is visual only and has no filtering behavior.
- The picker description explicitly identifies it as a simulated system folder picker.
- `src/renderer/src/routes/index.tsx` receives the selected string, stores it only in the Zustand UI store via `setWorkspacePath`, closes the modal, and navigates to `/workspace`.
- `src/renderer/src/store/ui.ts` initializes `workspacePath` to `''`; there is no IPC channel or persistence for the selected path.
- The setup screen states that there is no disk access yet.

## Packaging and native-module unpacking

Electron Builder configuration is in `electron-builder.yml`.

`asarUnpack` includes:

```yaml
asarUnpack:
  - resources/**
  - '**/node_modules/better-sqlite3/**'
  - '**/node_modules/sqlite-vec*/**'
  - '**/node_modules/onnxruntime-node/**'
```

Thus the explicitly unpacked native/runtime module trees are `better-sqlite3`, `sqlite-vec` (including its matching module directories), and `onnxruntime-node`; `resources/**` is also unpacked. `package.json` sets `npmRebuild: false` in the builder config and runs `electron-rebuild -f -w better-sqlite3` in `postinstall`.

## Contract status and omissions

- No `ipc-contract.ts` file was added because the shared types and channel constants already have a single source in `src/shared/contracts.ts`.
- No workspace folder-selection IPC exists.
- No real filesystem, SQLite, watcher, or persistent asset/note handler exists in the current implementation.
- `NoodleStudy` and its `synthesize` method are declared as a future v0.3 contract only; there is no current channel or preload exposure.
