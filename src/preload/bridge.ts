import type {
  KeySetupResult,
  NoodleAPI,
  NoodleSecureKeys,
  Note,
  Pillar,
  Provider
} from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/contracts'

type Invoke = (channel: string, payload?: unknown) => Promise<unknown>

export const createBridge = (
  invoke: Invoke
): {
  noodleAPI: NoodleAPI
  noodleSecureKeys: NoodleSecureKeys
} => ({
  noodleAPI: {
    notes: {
      list: () => invoke(IPC_CHANNELS.notes.list) as Promise<Note[]>,
      get: (id: string) => invoke(IPC_CHANNELS.notes.get, id) as Promise<Note | null>,
      save: (note: Note) => invoke(IPC_CHANNELS.notes.save, note) as Promise<Note>,
      create: (pillar?: Pillar) => invoke(IPC_CHANNELS.notes.create, pillar) as Promise<Note>
    },
    assets: {
      importBytes: (input: { name: string; mimeType: string; bytes: Uint8Array }) =>
        invoke(IPC_CHANNELS.assets.importBytes, input) as Promise<{ relativePath: string }>
    }
  },
  noodleSecureKeys: {
    isSecureStorageAvailable: () =>
      invoke(IPC_CHANNELS.secureKeys.isSecureStorageAvailable) as Promise<boolean>,
    testAndSaveKey: async (input: { provider: Provider; key: string }) => {
      try {
        return (await invoke(IPC_CHANNELS.secureKeys.testAndSaveKey, input)) as KeySetupResult
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const prefix = "Error invoking remote method 'noodle:secureKeys:testAndSaveKey': Error: "
        if (message.startsWith(prefix))
          throw new Error(message.slice(prefix.length), { cause: error })
        throw error
      }
    }
  }
})
