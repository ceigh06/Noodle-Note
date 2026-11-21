import { readdir, readFile, unlink } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Note } from '../../shared/contracts'
import {
  createNoteFile,
  parseNoteFile,
  type NoteFile,
  type TipTapDocument
} from '../../shared/noteFile'
import { atomicWrite } from '../workspace/atomicWrite'
import { type WorkspaceDatabase } from '../workspace/database'
import { resolve, type WorkspacePillar } from '../workspace/pathResolver'
import { seed } from '../mock/seed'
import { validateNote, validateNoteId, validatePillar } from './validate'

const isDevelopment = (): boolean => process.env.NODE_ENV !== 'production'

let workspaceRoot: string | null = null
let workspaceDatabase: WorkspaceDatabase | null = null
let db = [...seed]
const isMockMode = (): boolean => process.env.NOODLE_MOCK === '1'
const latency = <T>(value: T): Promise<T> =>
  new Promise((resolveValue) => setTimeout(() => resolveValue(structuredClone(value)), 120))

export const configureNotesWorkspace = (root: string, database: WorkspaceDatabase): void => {
  workspaceRoot = root
  workspaceDatabase = database
}

export const clearNotesWorkspace = (): void => {
  workspaceRoot = null
  workspaceDatabase = null
}

const ensureWorkspace = (): { root: string; database: WorkspaceDatabase } => {
  if (!workspaceRoot || !workspaceDatabase) throw new Error('Workspace is not open')
  return { root: workspaceRoot, database: workspaceDatabase }
}

const pillarToDirectory = (pillar: Note['pillar']): WorkspacePillar =>
  pillar === 'sources' ? 'sources' : pillar === 'ai' ? 'ai-generated' : 'notes'

const notePath = (note: NoteFile): string => `${note.id}.json`
const toNote = (file: NoteFile, pillar: Note['pillar']): Note => ({
  id: file.id,
  title: file.title,
  category: 'Study',
  pillar,
  content: JSON.stringify(file.content),
  updatedAt: file.updatedAt
})

const readNoteFile = async (pillar: Note['pillar'], relPath: string): Promise<Note> => {
  const { root } = ensureWorkspace()
  const path = await resolve(root, pillarToDirectory(pillar), relPath)
  const file = parseNoteFile(await readFile(path, 'utf8'))
  return toNote(file, pillar)
}

const insertRow = (note: NoteFile, pillar: Note['pillar'], relPath: string): void => {
  const { database } = ensureWorkspace()
  database
    .prepare(
      `INSERT INTO notes (id, pillar, rel_path, title, content_hash, schema_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      note.id,
      pillar,
      relPath,
      note.title,
      note.contentHash,
      note.schemaVersion,
      Date.parse(note.createdAt),
      Date.parse(note.updatedAt)
    )
}

export const onNoteDeleted = (_id: string): void => {
  void _id
}

const listMock = (): Promise<Note[]> => latency(db)

const noteDirectories: Array<{ directory: WorkspacePillar; pillar: Note['pillar'] }> = [
  { directory: 'notes', pillar: 'manual' },
  { directory: 'ai-generated', pillar: 'ai' }
]

const seedDevWorkspace = async (root: string): Promise<void> => {
  if (
    (!isDevelopment() && process.env.NOODLE_DEV_SEED !== '1') ||
    process.env.NOODLE_DEV_SEED === '0'
  )
    return
  const files = await readdir(join(root, 'notes'), { withFileTypes: true })
  if (files.some((entry) => entry.isFile() && entry.name.endsWith('.json'))) return
  for (const note of seed) {
    const file = createNoteFile({
      id: `00000000-0000-4000-8000-${note.id.slice(1).padStart(12, '0')}`,
      title: note.title,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: note.title }]
          }
        ]
      },
      createdAt: note.updatedAt,
      updatedAt: note.updatedAt
    })
    await atomicWrite(root, 'notes', `${file.id}.json`, JSON.stringify(file), 'user')
  }
}

export const reconcileNoteFiles = async (): Promise<void> => {
  const { database, root } = ensureWorkspace()
  await seedDevWorkspace(root)
  const filesByPath = new Map<string, NoteFile>()
  for (const { directory, pillar } of noteDirectories) {
    const directoryPath = join(root, directory)
    const files = await readdir(directoryPath, { withFileTypes: true })
    for (const entry of files) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const relPath = entry.name
      try {
        filesByPath.set(
          `${pillar}:${relPath}`,
          parseNoteFile(await readFile(await resolve(root, directory, relPath), 'utf8'))
        )
      } catch {
        continue
      }
    }
  }
  const transaction = database.transaction(() => {
    const rows = database.prepare('SELECT id, pillar, rel_path FROM notes').all() as Array<{
      id: string
      pillar: Note['pillar']
      rel_path: string
    }>
    for (const row of rows) {
      if (!filesByPath.has(`${row.pillar}:${row.rel_path}`))
        database.prepare('DELETE FROM notes WHERE id = ?').run(row.id)
    }
    for (const [key, file] of filesByPath) {
      const [pillar, relPath] = key.split(':') as [Note['pillar'], string]
      database
        .prepare(
          `INSERT INTO notes (id, pillar, rel_path, title, content_hash, schema_version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(rel_path) DO UPDATE SET id = excluded.id, pillar = excluded.pillar, title = excluded.title,
             content_hash = excluded.content_hash, schema_version = excluded.schema_version,
             created_at = excluded.created_at, updated_at = excluded.updated_at`
        )
        .run(
          file.id,
          pillar,
          relPath,
          file.title,
          file.contentHash,
          file.schemaVersion,
          Date.parse(file.createdAt),
          Date.parse(file.updatedAt)
        )
    }
  })
  transaction()
}

export const listNotes = async (): Promise<Note[]> => {
  if (isMockMode()) return listMock()
  const { database } = ensureWorkspace()
  const rows = database
    .prepare('SELECT id, pillar, rel_path FROM notes ORDER BY updated_at DESC, id ASC')
    .all() as Array<{ id: string; pillar: Note['pillar']; rel_path: string }>
  const notes = await Promise.all(rows.map((row) => readNoteFile(row.pillar, row.rel_path)))
  return latency(notes)
}

export const getNote = async (id: unknown): Promise<Note | null> => {
  const validId = validateNoteId(id)
  if (isMockMode()) return latency(db.find((note) => note.id === validId) ?? null)
  const { database } = ensureWorkspace()
  const row = database
    .prepare('SELECT id, pillar, rel_path FROM notes WHERE id = ?')
    .get(validId) as { id: string; pillar: Note['pillar']; rel_path: string } | undefined
  return row ? latency(await readNoteFile(row.pillar, row.rel_path)) : null
}

const noteContent = (note: Note): TipTapDocument => {
  try {
    const content = JSON.parse(note.content) as unknown
    if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error()
    if ((content as { type?: unknown }).type !== 'doc') throw new Error()
    return content as TipTapDocument
  } catch {
    throw new Error('Invalid note content')
  }
}

export const saveNote = async (input: unknown): Promise<Note> => {
  const note = validateNote(input)
  if (isMockMode()) {
    const updated = { ...note, updatedAt: new Date().toISOString() }
    db = db.some((item) => item.id === note.id)
      ? db.map((item) => (item.id === note.id ? updated : item))
      : [updated, ...db]
    return latency(updated)
  }
  const { database, root } = ensureWorkspace()
  const existing = database
    .prepare('SELECT pillar, rel_path FROM notes WHERE id = ?')
    .get(note.id) as { pillar: Note['pillar']; rel_path: string } | undefined
  if (!existing) throw new Error('Note not found')
  const updatedAt = new Date().toISOString()
  const file = createNoteFile({
    id: note.id,
    title: note.title,
    content: noteContent(note),
    updatedAt,
    createdAt: new Date(
      (
        database.prepare('SELECT created_at FROM notes WHERE id = ?').get(note.id) as {
          created_at: number
        }
      ).created_at
    ).toISOString()
  })
  await atomicWrite(
    root,
    pillarToDirectory(existing.pillar),
    existing.rel_path,
    JSON.stringify(file),
    'user'
  )
  database
    .prepare(
      'UPDATE notes SET title = ?, content_hash = ?, schema_version = ?, updated_at = ? WHERE id = ?'
    )
    .run(file.title, file.contentHash, file.schemaVersion, Date.parse(file.updatedAt), file.id)
  return latency(toNote(file, existing.pillar))
}

export const createNote = async (pillar: unknown = 'manual'): Promise<Note> => {
  const validPillar = validatePillar(pillar)
  if (isMockMode()) {
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
  const { root } = ensureWorkspace()
  const file = createNoteFile({ title: 'Untitled note' })
  const directory = pillarToDirectory(validPillar)
  const relPath = notePath(file)
  await atomicWrite(root, directory, relPath, JSON.stringify(file), 'user')
  insertRow(file, validPillar, relPath)
  return latency(toNote(file, validPillar))
}

export const deleteNote = async (id: unknown): Promise<void> => {
  const validId = validateNoteId(id)
  if (isMockMode()) {
    db = db.filter((note) => note.id !== validId)
    return latency(undefined)
  }
  const { database, root } = ensureWorkspace()
  const row = database.prepare('SELECT pillar, rel_path FROM notes WHERE id = ?').get(validId) as
    { pillar: Note['pillar']; rel_path: string } | undefined
  if (!row) return
  const path = await resolve(root, pillarToDirectory(row.pillar), basename(row.rel_path))
  await unlink(path)
  database.prepare('DELETE FROM notes WHERE id = ?').run(validId)
  onNoteDeleted(validId)
}

export type NotesHandlers = {
  list: typeof listNotes
  get: typeof getNote
  save: typeof saveNote
  create: typeof createNote
  delete: typeof deleteNote
}

export const notesHandlers: NotesHandlers = {
  list: listNotes,
  get: getNote,
  save: saveNote,
  create: createNote,
  delete: deleteNote
}
