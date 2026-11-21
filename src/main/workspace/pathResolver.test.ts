import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertWritable, normalizeStoredRelativePath, resolve } from './pathResolver'

describe('workspace path resolver', () => {
  let workspaceRoot: string
  let outsideRoot: string

  afterEach(async () => {
    await Promise.all(
      [workspaceRoot, outsideRoot]
        .filter((path): path is string => Boolean(path))
        .map((path) => rm(path, { recursive: true, force: true }))
    )
    workspaceRoot = ''
    outsideRoot = ''
  })

  const setupWorkspace = async (): Promise<void> => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'noodle-workspace-'))
    outsideRoot = await mkdtemp(join(tmpdir(), 'noodle-outside-'))
    await Promise.all(
      ['sources', 'notes', 'ai-generated', 'assets'].map((pillar) =>
        mkdir(join(workspaceRoot, pillar), { recursive: true })
      )
    )
  }

  it('resolves allowed pillar paths and normalizes separators', async () => {
    await setupWorkspace()
    await mkdir(join(workspaceRoot, 'notes', 'course'), { recursive: true })

    await expect(resolve(workspaceRoot, 'notes', 'course\\week-1.json')).resolves.toBe(
      join(workspaceRoot, 'notes', 'course', 'week-1.json')
    )
    expect(normalizeStoredRelativePath('course\\week-1.json')).toBe('course/week-1.json')
  })

  it.each([
    ['parent traversal', '../outside.txt'],
    ['nested parent traversal', 'course/../../outside.txt'],
    ['POSIX absolute path', '/tmp/outside.txt'],
    ['Windows drive path', 'C:\\outside.txt'],
    ['Windows UNC path', '\\\\server\\share\\outside.txt'],
    ['null byte', 'safe/\0outside.txt']
  ])('rejects %s', async (_name, relPath) => {
    await setupWorkspace()
    await expect(resolve(workspaceRoot, 'notes', relPath)).rejects.toThrow()
  })

  it('rejects a symlink escape outside the workspace root', async () => {
    await setupWorkspace()
    await mkdir(join(outsideRoot, 'nested'), { recursive: true })
    await writeFile(join(outsideRoot, 'nested', 'secret.txt'), 'secret')
    await symlink(outsideRoot, join(workspaceRoot, 'notes', 'linked-outside'), 'junction')

    await expect(
      resolve(workspaceRoot, 'notes', 'linked-outside/nested/secret.txt')
    ).rejects.toThrow('Path escapes workspace root')
  })

  it.each([
    ['notes', 'user'],
    ['assets', 'user'],
    ['ai-generated', 'ai']
  ] as const)('allows %s writes by %s', (pillar, actor) => {
    expect(() => assertWritable(pillar, actor)).not.toThrow()
  })

  it.each([
    ['sources', 'user'],
    ['sources', 'ai'],
    ['notes', 'ai'],
    ['assets', 'ai'],
    ['ai-generated', 'user']
  ] as const)('rejects %s writes by %s', (pillar, actor) => {
    expect(() => assertWritable(pillar, actor)).toThrow()
  })
})
