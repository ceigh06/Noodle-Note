import { createHash, randomUUID } from 'node:crypto'

export const NOTE_SCHEMA_VERSION = 1

export type TipTapDocument = {
  type: 'doc'
  content?: readonly unknown[]
  [key: string]: unknown
}

export interface NoteFile {
  id: string
  schemaVersion: number
  title: string
  createdAt: string
  updatedAt: string
  contentHash: string
  content: TipTapDocument
}

export type NoteFileParseErrorCode = 'invalid-json' | 'invalid-shape' | 'content-hash-mismatch'

export class NoteFileParseError extends Error {
  readonly code: NoteFileParseErrorCode

  constructor(code: NoteFileParseErrorCode, message: string) {
    super(message)
    this.name = 'NoteFileParseError'
    this.code = code
  }
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH_PATTERN = /^[0-9a-f]{64}$/

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key])])
    )
  }
  return value
}

const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value))

export const computeContentHash = (content: TipTapDocument): string =>
  createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex')

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))

const isTipTapDocument = (value: unknown): value is TipTapDocument => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return (value as Record<string, unknown>).type === 'doc'
}

const validateNoteFile = (value: unknown): NoteFile => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new NoteFileParseError('invalid-shape', 'Note file must be a JSON object')
  const note = value as Record<string, unknown>
  if (
    typeof note.id !== 'string' ||
    !UUID_V4_PATTERN.test(note.id) ||
    note.schemaVersion !== NOTE_SCHEMA_VERSION ||
    typeof note.title !== 'string' ||
    !isValidDate(note.createdAt) ||
    !isValidDate(note.updatedAt) ||
    typeof note.contentHash !== 'string' ||
    !HASH_PATTERN.test(note.contentHash) ||
    !isTipTapDocument(note.content)
  )
    throw new NoteFileParseError('invalid-shape', 'Note file has an invalid shape')

  const content = note.content
  if (computeContentHash(content) !== note.contentHash)
    throw new NoteFileParseError(
      'content-hash-mismatch',
      'Note content hash does not match content'
    )

  return {
    id: note.id,
    schemaVersion: note.schemaVersion,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    contentHash: note.contentHash,
    content
  }
}

export const createNoteFile = (input: {
  title: string
  content?: TipTapDocument
  id?: string
  createdAt?: string
  updatedAt?: string
}): NoteFile => {
  const id = input.id ?? randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  const updatedAt = input.updatedAt ?? createdAt
  const content = input.content ?? { type: 'doc', content: [] }
  if (!UUID_V4_PATTERN.test(id)) throw new Error('Note ID must be a UUID v4')
  if (!isValidDate(createdAt) || !isValidDate(updatedAt)) throw new Error('Invalid note timestamp')
  if (!isTipTapDocument(content)) throw new Error('Note content must be a TipTap document')

  return {
    id,
    schemaVersion: NOTE_SCHEMA_VERSION,
    title: input.title,
    createdAt,
    updatedAt,
    contentHash: computeContentHash(content),
    content
  }
}

export const parseNoteFile = (input: string): NoteFile => {
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch (error) {
    throw new NoteFileParseError(
      'invalid-json',
      `Note file contains malformed JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  return validateNoteFile(value)
}
