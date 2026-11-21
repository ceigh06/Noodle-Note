import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { closeWorkspaceDatabase, openWorkspaceDatabase } from '../workspace/database'
import { clearNotesWorkspace, configureNotesWorkspace, reconcileNoteFiles } from './notes'

let activeDatabase: Awaited<ReturnType<typeof openWorkspaceDatabase>> | null = null

export const openWorkspace = async (path: unknown): Promise<void> => {
  if (typeof path !== 'string' || path.length === 0 || path.includes('\0'))
    throw new Error('Invalid workspace path')
  if (activeDatabase) closeWorkspaceDatabase(activeDatabase)
  await Promise.all(
    ['sources', 'notes', 'ai-generated', 'assets'].map((pillar) =>
      mkdir(join(path, pillar), { recursive: true })
    )
  )
  activeDatabase = await openWorkspaceDatabase(path)
  configureNotesWorkspace(path, activeDatabase)
  await reconcileNoteFiles()
}

export const closeWorkspace = (): void => {
  clearNotesWorkspace()
  closeWorkspaceDatabase(activeDatabase)
  activeDatabase = null
}
