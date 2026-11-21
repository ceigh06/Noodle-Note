import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUSY_TIMEOUT_MS,
  LATEST_SCHEMA_VERSION,
  closeWorkspaceDatabase,
  openWorkspaceDatabase
} from './database'

describe('workspace database', () => {
  it('creates the latest schema and configures required pragmas', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'noodle-db-'))
    const db = await openWorkspaceDatabase(workspaceRoot)
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION)
      expect(db.pragma('journal_mode', { simple: true })).toBe('wal')
      expect(db.pragma('busy_timeout', { simple: true })).toBe(BUSY_TIMEOUT_MS)
      expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()
      ).toEqual([{ name: 'meta' }, { name: 'notes' }])
    } finally {
      closeWorkspaceDatabase(db)
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })

  it('re-running migrations is a no-op', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'noodle-db-'))
    const first = await openWorkspaceDatabase(workspaceRoot)
    first.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('keep', 'value')
    closeWorkspaceDatabase(first)

    const second = await openWorkspaceDatabase(workspaceRoot)
    try {
      expect(second.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION)
      expect(second.prepare('SELECT value FROM meta WHERE key = ?').get('keep')).toEqual({
        value: 'value'
      })
    } finally {
      closeWorkspaceDatabase(second)
      await rm(workspaceRoot, { recursive: true, force: true })
    }
  })
})
