// @vitest-environment node
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createBridge } from '../../preload/bridge'
import { openWorkspace } from './workspace'
import { closeWorkspace } from './workspace'
import { deleteNote, getNote, listNotes, saveNote, createNote } from './notes'
import { openWorkspaceDatabase } from '../workspace/database'

describe('real note CRUD through the preload bridge path', () => {
  let root = ''

  afterEach(async () => {
    closeWorkspace()
    if (root) await rm(root, { recursive: true, force: true })
    root = ''
  })

  it('rebuilds the note index from files after the database is deleted', async () => {
    root = await mkdtemp(join(tmpdir(), 'noodle-reconcile-'))
    process.env.NOODLE_DEV_SEED = '1'
    await openWorkspace(root)
    const before = await listNotes()
    const beforeFiles = (await readdir(join(root, 'notes'))).sort()
    closeWorkspace()
    await rm(join(root, '.noodle', 'noodle.db'), { force: true })
    await openWorkspace(root)
    const after = await listNotes()
    const afterFiles = (await readdir(join(root, 'notes'))).sort()
    expect(after.map((note) => note.title)).toEqual(before.map((note) => note.title))
    expect(afterFiles).toEqual(beforeFiles)
  })

  it('creates, reads, updates, lists, and deletes a note with disk and DB evidence', async () => {
    root = await mkdtemp(join(tmpdir(), 'noodle-crud-'))
    process.env.NOODLE_DEV_SEED = '0'
    await openWorkspace(root)
    const bridge = createBridge(async (channel, payload) => {
      if (channel.endsWith(':create')) return createNote(payload)
      if (channel.endsWith(':get')) return getNote(payload)
      if (channel.endsWith(':save')) return saveNote(payload)
      if (channel.endsWith(':list')) return listNotes()
      if (channel.endsWith(':delete')) return deleteNote(payload)
      throw new Error(`Unexpected channel ${channel}`)
    })

    const created = await bridge.noodleAPI.notes.create('manual')
    const dbAfterCreate = await openWorkspaceDatabase(root)
    expect(dbAfterCreate.prepare('SELECT id, rel_path FROM notes').get()).toMatchObject({
      id: created.id
    })
    dbAfterCreate.close()
    const notePath = join(root, 'notes', `${created.id}.json`)
    await expect(readFile(notePath, 'utf8')).resolves.toContain(created.id)

    await expect(bridge.noodleAPI.notes.get(created.id)).resolves.toMatchObject({ id: created.id })
    const updated = await bridge.noodleAPI.notes.save({
      ...created,
      title: 'Updated title',
      content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
    })
    expect(updated.title).toBe('Updated title')
    await expect(readFile(notePath, 'utf8')).resolves.toContain('Updated title')

    await expect(bridge.noodleAPI.notes.list()).resolves.toEqual([
      expect.objectContaining({ id: created.id })
    ])
    await bridge.noodleAPI.notes.delete(created.id)
    await expect(readFile(notePath, 'utf8')).rejects.toThrow()
    const dbAfterDelete = await openWorkspaceDatabase(root)
    expect(
      dbAfterDelete.prepare('SELECT id FROM notes WHERE id = ?').get(created.id)
    ).toBeUndefined()
    dbAfterDelete.close()
  })
})
