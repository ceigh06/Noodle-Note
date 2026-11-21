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

export interface NoodleAPI {
  notes: {
    list: () => Promise<Note[]>
    get: (id: string) => Promise<Note | null>
    save: (note: Note) => Promise<Note>
    create: (pillar?: Pillar) => Promise<Note>
  }
  assets: {
    importBytes: (input: {
      name: string
      mimeType: string
      bytes: Uint8Array
    }) => Promise<{ relativePath: string }>
  }
}

export interface NoodleSecureKeys {
  isSecureStorageAvailable: () => Promise<boolean>
  testAndSaveKey: (input: { provider: Provider; key: string }) => Promise<KeySetupResult>
}

// Contract-only; arrives with v0.3.
export interface NoodleStudy {
  synthesize: (input: {
    task: string
    outputFormat?: 'Study Guide' | 'Summary Cheat-Sheet' | 'Flashcard Set' | 'Practice Exam'
    materials: Pick<Note, 'id' | 'title' | 'content' | 'pillar'>[]
  }) => Promise<{ title: string; content: string }>
}

export const IPC_CHANNELS = {
  notes: {
    list: 'noodle:notes:list',
    get: 'noodle:notes:get',
    save: 'noodle:notes:save',
    create: 'noodle:notes:create'
  },
  assets: {
    importBytes: 'noodle:assets:importBytes'
  },
  secureKeys: {
    isSecureStorageAvailable: 'noodle:secureKeys:isSecureStorageAvailable',
    testAndSaveKey: 'noodle:secureKeys:testAndSaveKey'
  }
} as const

declare global {
  interface Window {
    noodleAPI?: NoodleAPI
    noodleSecureKeys?: NoodleSecureKeys
    noodleStudy?: NoodleStudy
  }
}

export {}
