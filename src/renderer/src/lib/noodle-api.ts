// Mock of the Electron preload bridge (window.noodleAPI). Async + latency to mimic IPC.
export type Pillar = 'sources' | 'manual' | 'ai'
export type Category = 'Videos' | 'Wishlist' | 'Assignment' | 'Projects' | 'Work' | 'Study'

export interface Note {
  id: string
  title: string
  category: Category
  pillar: Pillar
  content: string // HTML
  updatedAt: string // ISO
}

const lorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla.'

const seed: Note[] = (
  [
    ['Cell Respiration Overview', 'Study', 'manual'],
    ['Thesis Proposal Draft', 'Work', 'manual'],
    ['Calculus Problem Set 4', 'Assignment', 'manual'],
    ['Robotics Capstone Plan', 'Projects', 'manual'],
    ['MIT 6.006 Lecture Clips', 'Videos', 'sources'],
    ['Organic Chem Slides — Week 3', 'Study', 'sources'],
    ['Research Paper: Attention Is All You Need', 'Work', 'sources'],
    ['Lab Equipment to Buy', 'Wishlist', 'manual'],
    ['Study Guide: Thermodynamics', 'Study', 'ai'],
    ['Gap Analysis: Linear Algebra', 'Assignment', 'ai'],
    ['Auto Summary: History Readings', 'Work', 'ai']
  ] as [string, string, string][]
).map(([title, category, pillar], i) => ({
  id: `n${i + 1}`,
  title,
  category: category as Category,
  pillar: pillar as Pillar,
  content: `<h1>${title}</h1><p>${lorem}</p><ul><li>Key idea one</li><li>Key idea two</li></ul><p>${lorem}</p>`,
  updatedAt: new Date(2021, 0, 7 - i, 21, 38 - i).toISOString()
}))

let db = [...seed]
const ipc = <T>(v: T): Promise<T> =>
  new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120))

export const noodleAPI = {
  notes: {
    list: (): Promise<Note[]> => ipc(db),
    get: (id: string): Promise<Note | null> => ipc(db.find((n) => n.id === id) ?? null),
    save: (note: Note): Promise<Note> => {
      const updated = { ...note, updatedAt: new Date().toISOString() }
      db = db.some((n) => n.id === note.id)
        ? db.map((n) => (n.id === note.id ? updated : n))
        : [updated, ...db]
      return ipc(updated)
    },
    create: (pillar: Pillar = 'manual'): Promise<Note> => {
      const note: Note = {
        id: `n${Date.now()}`,
        title: 'Untitled note',
        category: 'Study',
        pillar,
        content: '<h1>Untitled note</h1><p></p>',
        updatedAt: new Date().toISOString()
      }
      db = [note, ...db]
      return ipc(note)
    }
  },
  assets: {
    // In Electron this would copy the file into the vault's ./assets folder.
    import: (file: File): Promise<{ relativePath: string; previewUrl: string }> =>
      new Promise<{ relativePath: string; previewUrl: string }>((r) =>
        setTimeout(
          () => r({ relativePath: `./assets/${file.name}`, previewUrl: URL.createObjectURL(file) }),
          80
        )
      )
  }
}

declare global {
  interface Window {
    noodleAPI?: typeof noodleAPI
  }
}
if (typeof window !== 'undefined') window.noodleAPI = noodleAPI

export const formatStamp = (iso: string): string => {
  const d = new Date(iso)
  const t = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' ', '')
  const day = d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase()
  return `${t} • ${day}`
}

export const categoryStyles: Record<Category, { bg: string; text: string; border: string }> = {
  Work: { bg: 'bg-cat-work', text: 'text-cat-work', border: 'border-cat-work/40' },
  Study: { bg: 'bg-cat-study', text: 'text-cat-study', border: 'border-cat-study/40' },
  Assignment: {
    bg: 'bg-cat-assignment',
    text: 'text-cat-assignment',
    border: 'border-cat-assignment/40'
  },
  Projects: { bg: 'bg-cat-projects', text: 'text-cat-projects', border: 'border-cat-projects/40' },
  Videos: { bg: 'bg-cat-videos', text: 'text-cat-videos', border: 'border-cat-videos/40' },
  Wishlist: { bg: 'bg-cat-wishlist', text: 'text-cat-wishlist', border: 'border-cat-wishlist/40' }
}
export const categories = Object.keys(categoryStyles) as Category[]
