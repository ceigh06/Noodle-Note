import '@testing-library/jest-dom/vitest'
import type { NoodleAPI, NoodleSecureKeys, Note } from '../../../shared/contracts'

if (typeof window !== 'undefined')
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: () => {}
  })

if (typeof window !== 'undefined')
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {}
    })
  })

if (typeof window !== 'undefined') {
  const notes: Note[] = [
    {
      id: 'test-sources',
      title: 'Source note',
      category: 'Study',
      pillar: 'sources',
      content: '<p>Source</p>',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'test-manual',
      title: 'Manual note',
      category: 'Work',
      pillar: 'manual',
      content: '<p>Manual</p>',
      updatedAt: '2026-01-02T00:00:00.000Z'
    },
    {
      id: 'test-ai',
      title: 'AI note',
      category: 'Assignment',
      pillar: 'ai',
      content: '<p>AI</p>',
      updatedAt: '2026-01-03T00:00:00.000Z'
    }
  ]
  const noodleAPI: NoodleAPI = {
    notes: {
      list: async () => notes,
      get: async (id) => notes.find((note) => note.id === id) ?? null,
      save: async (note) => {
        const saved = { ...note, updatedAt: new Date().toISOString() }
        const index = notes.findIndex((item) => item.id === note.id)
        if (index === -1) notes.unshift(saved)
        else notes[index] = saved
        return saved
      },
      create: async (pillar = 'manual') => {
        const note: Note = {
          id: `test-${Date.now()}`,
          title: 'Untitled note',
          category: 'Study',
          pillar,
          content: '<h1>Untitled note</h1><p></p>',
          updatedAt: new Date().toISOString()
        }
        notes.unshift(note)
        return note
      }
    },
    assets: {
      importBytes: async ({ name }) => ({ relativePath: `./assets/${name}` })
    }
  }
  const noodleSecureKeys: NoodleSecureKeys = {
    isSecureStorageAvailable: async () => false,
    testAndSaveKey: async () => {
      throw new Error(
        'Secure saving requires the desktop app with an available OS key store. No key was sent or saved.'
      )
    }
  }
  Object.defineProperty(window, 'noodleAPI', {
    configurable: true,
    writable: true,
    value: noodleAPI
  })
  Object.defineProperty(window, 'noodleSecureKeys', {
    configurable: true,
    writable: true,
    value: noodleSecureKeys
  })
}
