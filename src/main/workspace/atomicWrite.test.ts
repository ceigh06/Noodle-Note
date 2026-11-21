import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { atomicWrite } from './atomicWrite'

describe('atomic write queue', () => {
  it('serializes concurrent writes to the same path without mixed contents', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'noodle-write-'))
    await mkdir(join(workspaceRoot, 'notes'))
    const first = 'first-content-'.repeat(1000)
    const second = 'second-content-'.repeat(1000)
    try {
      await Promise.all([
        atomicWrite(workspaceRoot, 'notes', 'note.json', first),
        atomicWrite(workspaceRoot, 'notes', 'note.json', second)
      ])
      const result = await readFile(join(workspaceRoot, 'notes', 'note.json'), 'utf8')
      expect([first, second]).toContain(result)
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })

  it('leaves the original intact when a crash occurs before rename', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'noodle-write-'))
    await mkdir(join(workspaceRoot, 'notes'))
    const target = join(workspaceRoot, 'notes', 'note.json')
    await writeFile(target, 'original')
    try {
      await expect(
        atomicWrite(workspaceRoot, 'notes', 'note.json', 'replacement', 'user', {
          beforeRename: () => {
            throw new Error('simulated crash')
          }
        })
      ).rejects.toThrow('simulated crash')
      await expect(readFile(target, 'utf8')).resolves.toBe('original')
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })
})
