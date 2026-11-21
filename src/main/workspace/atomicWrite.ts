import { mkdtemp, open, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { assertWritable, resolve, type WorkspaceActor, type WorkspacePillar } from './pathResolver'

const writeQueues = new Map<string, Promise<void>>()

export const suppressWatcher = (absPath: string): void => {
  void absPath
}

export type AtomicWriteHooks = {
  beforeRename?: (tempPath: string, targetPath: string) => void | Promise<void>
}

const performAtomicWrite = async (
  targetPath: string,
  data: string | Uint8Array,
  hooks?: AtomicWriteHooks
): Promise<void> => {
  const directory = dirname(targetPath)
  const tempDirectory = await mkdtemp(join(directory, `.noodle-write-${randomUUID()}-`))
  const tempPath = join(tempDirectory, 'payload.tmp')
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(tempPath, 'wx')
    await writeFile(handle, data)
    await handle.sync()
    await handle.close()
    handle = undefined
    await hooks?.beforeRename?.(tempPath, targetPath)
    await rename(tempPath, targetPath)
  } finally {
    if (handle) await handle.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
}

export const atomicWrite = async (
  workspaceRoot: string,
  pillar: WorkspacePillar,
  relPath: string,
  data: string | Uint8Array,
  actor: WorkspaceActor = 'user',
  hooks?: AtomicWriteHooks
): Promise<void> => {
  assertWritable(pillar, actor)
  const targetPath = await resolve(workspaceRoot, pillar, relPath)
  suppressWatcher(targetPath)

  const previous = writeQueues.get(targetPath) ?? Promise.resolve()
  const current = previous.then(() => performAtomicWrite(targetPath, data, hooks))
  writeQueues.set(targetPath, current)
  try {
    await current
  } finally {
    if (writeQueues.get(targetPath) === current) writeQueues.delete(targetPath)
  }
}
