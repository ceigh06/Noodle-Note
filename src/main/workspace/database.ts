import Database from 'better-sqlite3'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const LATEST_SCHEMA_VERSION = 1
export const BUSY_TIMEOUT_MS = 5000

export type WorkspaceDatabase = Database.Database
export type Migration = (db: WorkspaceDatabase) => void

export const migrations: readonly Migration[] = [
  (db) => {
    db.exec(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        pillar TEXT NOT NULL,
        rel_path TEXT NOT NULL UNIQUE,
        title TEXT,
        content_hash TEXT,
        schema_version INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `)
  }
]

export const migrate = (db: WorkspaceDatabase): void => {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  if (currentVersion > migrations.length)
    throw new Error(`Database schema version ${currentVersion} is newer than this app supports`)

  for (let index = currentVersion; index < migrations.length; index += 1) {
    const version = index + 1
    const migration = migrations[index]
    if (!migration) throw new Error(`Missing migration ${version}`)
    db.transaction(() => {
      migration(db)
      db.pragma(`user_version = ${version}`)
    })()
  }
}

export const configureDatabase = (db: WorkspaceDatabase): void => {
  db.pragma('journal_mode = WAL')
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)
  db.pragma('foreign_keys = ON')
}

export const openWorkspaceDatabase = async (workspaceRoot: string): Promise<WorkspaceDatabase> => {
  const metadataDirectory = join(workspaceRoot, '.noodle')
  await mkdir(metadataDirectory, { recursive: true })
  const db = new Database(join(metadataDirectory, 'noodle.db'))
  try {
    configureDatabase(db)
    migrate(db)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export const closeWorkspaceDatabase = (db: WorkspaceDatabase | null | undefined): void => {
  if (db?.open) db.close()
}
