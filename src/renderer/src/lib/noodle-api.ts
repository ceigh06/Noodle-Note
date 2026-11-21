import type { NoodleAPI } from '../../../shared/contracts'

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

const getBridge = (): NoodleAPI => {
  if (!window.noodleAPI)
    throw new Error(
      'Desktop bridge unavailable: window.noodleAPI is not defined. Noodle runs only inside the desktop app.'
    )
  return window.noodleAPI
}

export const noodleAPI = {
  workspace: {
    open: (path: string): Promise<void> => getBridge().workspace.open(path),
    close: (): Promise<void> => getBridge().workspace.close()
  },
  notes: {
    list: (): Promise<Note[]> => getBridge().notes.list(),
    get: (id: string): Promise<Note | null> => getBridge().notes.get(id),
    save: (note: Note): Promise<Note> => getBridge().notes.save(note),
    create: (pillar: Pillar = 'manual'): Promise<Note> => getBridge().notes.create(pillar),
    delete: (id: string): Promise<void> => getBridge().notes.delete(id)
  },
  assets: {
    import: async (file: File): Promise<{ relativePath: string; previewUrl: string }> => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await getBridge().assets.importBytes({
        name: file.name,
        mimeType: file.type,
        bytes
      })
      return { relativePath: result.relativePath, previewUrl: URL.createObjectURL(file) }
    },
    importBytes: (input: { name: string; mimeType: string; bytes: Uint8Array }) =>
      getBridge().assets.importBytes(input)
  }
} satisfies NoodleAPI & {
  assets: {
    import: (file: File) => Promise<{ relativePath: string; previewUrl: string }>
  }
}

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
