import { dirname, isAbsolute, join, relative, resolve as resolvePath, win32 } from 'node:path'
import { realpath } from 'node:fs/promises'

export type WorkspacePillar = 'sources' | 'notes' | 'ai-generated' | 'assets'
export type WorkspaceActor = 'user' | 'ai'

const pillarDirectories: Record<WorkspacePillar, string> = {
  sources: 'sources',
  notes: 'notes',
  'ai-generated': 'ai-generated',
  assets: 'assets'
}

const isWithin = (root: string, candidate: string): boolean => {
  const distance = relative(root, candidate)
  return (
    distance === '' ||
    (distance !== '..' &&
      !distance.startsWith(`..${candidate.includes('\\') ? '\\' : '/'}`) &&
      !isAbsolute(distance))
  )
}

const normalizeRelativePath = (relPath: string): string => {
  if (relPath.length === 0) throw new Error('Relative path must not be empty')
  if (relPath.includes('\0')) throw new Error('Relative path must not contain null bytes')
  if (isAbsolute(relPath) || win32.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath))
    throw new Error('Absolute paths are not allowed')

  const segments = relPath.replaceAll('\\', '/').split('/')
  if (segments.some((segment) => segment === '..')) throw new Error('Path traversal is not allowed')
  if (segments.some((segment) => segment.length === 0 || segment === '.'))
    throw new Error('Relative path contains invalid segments')

  return segments.join('/')
}

export const normalizeStoredRelativePath = (relPath: string): string =>
  normalizeRelativePath(relPath)

export const resolve = async (
  workspaceRoot: string,
  pillar: WorkspacePillar,
  relPath: string
): Promise<string> => {
  if (!Object.hasOwn(pillarDirectories, pillar)) throw new Error('Invalid workspace pillar')
  if (workspaceRoot.includes('\0')) throw new Error('Workspace root must not contain null bytes')

  const normalizedPath = normalizeRelativePath(relPath)
  const rootRealPath = await realpath(workspaceRoot)
  const pillarPath = join(rootRealPath, pillarDirectories[pillar])
  const candidatePath = resolvePath(pillarPath, normalizedPath)
  const parentRealPath = await realpath(dirname(candidatePath))

  if (!isWithin(rootRealPath, parentRealPath)) throw new Error('Path escapes workspace root')
  if (!isWithin(pillarPath, candidatePath)) throw new Error('Path escapes workspace pillar')

  return candidatePath
}

export const assertWritable = (pillar: WorkspacePillar, actor: WorkspaceActor): void => {
  if (!Object.hasOwn(pillarDirectories, pillar)) throw new Error('Invalid workspace pillar')
  if (pillar === 'sources') throw new Error('Sources are immutable')
  if (actor === 'ai' && pillar !== 'ai-generated')
    throw new Error('AI may write only to ai-generated')
  if (actor === 'user' && pillar !== 'notes' && pillar !== 'assets')
    throw new Error('User may write only to notes and assets')
  if (actor !== 'user' && actor !== 'ai') throw new Error('Invalid workspace actor')
}
