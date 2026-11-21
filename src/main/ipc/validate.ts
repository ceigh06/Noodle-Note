import type { Note, Provider } from '../../shared/contracts'

const providers: Provider[] = ['openai', 'anthropic', 'gemini']
const pillars = ['sources', 'manual', 'ai'] as const
const categories = ['Videos', 'Wishlist', 'Assignment', 'Projects', 'Work', 'Study'] as const
const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
])

const validateCategory = (category: unknown): Note['category'] => {
  if (typeof category !== 'string' || !categories.includes(category as Note['category']))
    throw new Error('Invalid note category')
  return category as Note['category']
}

export const validateNoteId = (id: unknown): string => {
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    id.length > 255 ||
    /[\\/]/.test(id) ||
    id === '.' ||
    id === '..' ||
    /^[a-zA-Z]:/.test(id)
  )
    throw new Error('Invalid note id')
  return id
}

export const validatePillar = (pillar: unknown): Note['pillar'] => {
  if (typeof pillar !== 'string' || !pillars.includes(pillar as Note['pillar']))
    throw new Error('Invalid pillar')
  return pillar as Note['pillar']
}

export const validateNote = (note: unknown): Note => {
  if (!note || typeof note !== 'object' || Array.isArray(note)) throw new Error('Invalid note')
  const value = note as Record<string, unknown>
  const allowedKeys = new Set(['id', 'title', 'category', 'pillar', 'content', 'updatedAt'])
  if (Object.keys(value).some((key) => !allowedKeys.has(key)))
    throw new Error('Invalid note fields')
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 255)
    throw new Error('Invalid note id')
  if (typeof value.title !== 'string' || value.title.length > 255)
    throw new Error('Invalid note title')
  const category = validateCategory(value.category)
  const pillar = validatePillar(value.pillar)
  if (typeof value.content !== 'string' || value.content.length > 1_000_000)
    throw new Error('Invalid note content')
  if (typeof value.updatedAt !== 'string' || value.updatedAt.length > 100)
    throw new Error('Invalid note timestamp')
  if (typeof value.title !== 'string') throw new Error('Invalid note title')
  if (
    typeof value.content !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.id !== 'string'
  )
    throw new Error('Invalid note')
  return {
    id: value.id,
    title: value.title,
    category,
    pillar,
    content: value.content,
    updatedAt: value.updatedAt
  }
}

export const validateAssetInput = (
  input: unknown
): { name: string; mimeType: string; bytes: Uint8Array } => {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid asset input')
  const value = input as Record<string, unknown>
  if (Object.keys(value).some((key) => !['name', 'mimeType', 'bytes'].includes(key)))
    throw new Error('Invalid asset fields')
  if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 255)
    throw new Error('Invalid asset name')
  if (
    /[\\/]|\.\./.test(value.name) ||
    Array.from(value.name).some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
  )
    throw new Error('Invalid asset name')
  if (typeof value.mimeType !== 'string' || !imageMimeTypes.has(value.mimeType))
    throw new Error('Unsupported image type')
  if (!(value.bytes instanceof Uint8Array) || value.bytes.length > 10 * 1024 * 1024)
    throw new Error('Invalid asset bytes')
  return value as { name: string; mimeType: string; bytes: Uint8Array }
}

export const validateKeyInput = (input: unknown): { provider: Provider; key: string } => {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid key input')
  const value = input as Record<string, unknown>
  if (Object.keys(value).some((key) => !['provider', 'key'].includes(key)))
    throw new Error('Invalid key fields')
  if (typeof value.provider !== 'string' || !providers.includes(value.provider as Provider))
    throw new Error('Invalid provider')
  if (typeof value.key !== 'string' || value.key.length === 0 || value.key.length > 500)
    throw new Error('Invalid key')
  return { provider: value.provider as Provider, key: value.key }
}
