import type { Note } from '../../shared/contracts'
import { seed } from '../mock/seed'
import { validateNote, validateNoteId, validatePillar } from './validate'

let db = [...seed]
const latency = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), 120))

export const listNotes = (): Promise<Note[]> => latency(db)

export const getNote = async (id: unknown): Promise<Note | null> => {
  const validId = validateNoteId(id)
  return latency(db.find((note) => note.id === validId) ?? null)
}

export const saveNote = async (input: unknown): Promise<Note> => {
  const note = validateNote(input)
  const updated = { ...note, updatedAt: new Date().toISOString() }
  db = db.some((item) => item.id === note.id)
    ? db.map((item) => (item.id === note.id ? updated : item))
    : [updated, ...db]
  return latency(updated)
}

export const createNote = async (pillar: unknown = 'manual'): Promise<Note> => {
  const validPillar = validatePillar(pillar)
  const note: Note = {
    id: `n${Date.now()}`,
    title: 'Untitled note',
    category: 'Study',
    pillar: validPillar,
    content: '<h1>Untitled note</h1><p></p>',
    updatedAt: new Date().toISOString()
  }
  db = [note, ...db]
  return latency(note)
}

export type NotesHandlers = {
  list: typeof listNotes
  get: typeof getNote
  save: typeof saveNote
  create: typeof createNote
}

export const notesHandlers: NotesHandlers = {
  list: listNotes,
  get: getNote,
  save: saveNote,
  create: createNote
}
