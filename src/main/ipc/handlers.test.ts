// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { importBytes } from './assets'
import { createNote, getNote, listNotes, saveNote } from './notes'
import { isSecureStorageAvailable, testAndSaveKey } from './secureKeys'
import { assertTrustedSender, trustedRendererURL } from './trusted'
import { seed } from '../mock/seed'

describe('mock IPC handlers', () => {
  it('returns the 11 seed notes', async () => {
    expect(await listNotes()).toHaveLength(11)
    expect(seed).toHaveLength(11)
  })

  it('creates a manual note by default', async () => {
    expect((await createNote()).pillar).toBe('manual')
  })

  it('gets, saves, and creates notes', async () => {
    const note = await getNote('n1')
    if (!note) throw new Error('Expected seeded note')
    expect(note.id).toBe('n1')
    await expect(saveNote(note)).resolves.toMatchObject({ id: 'n1' })
    await expect(createNote('ai')).resolves.toMatchObject({ pillar: 'ai' })
  })

  it('rejects invalid note payloads', async () => {
    await expect(getNote('')).rejects.toThrow()
    await expect(saveNote({})).rejects.toThrow()
    await expect(createNote('invalid')).rejects.toThrow()
  })

  it('imports valid image bytes and rejects invalid assets', async () => {
    await expect(
      importBytes({ name: 'x.png', mimeType: 'image/png', bytes: new Uint8Array(1) })
    ).resolves.toEqual({
      relativePath: './assets/x.png'
    })
    await expect(
      importBytes({ name: '../x.png', mimeType: 'image/png', bytes: new Uint8Array(1) })
    ).rejects.toThrow()
    await expect(
      importBytes({ name: 'x.txt', mimeType: 'text/plain', bytes: new Uint8Array(1) })
    ).rejects.toThrow()
    await expect(
      importBytes({ name: 'x.png', mimeType: 'image/png', bytes: new ArrayBuffer(1) })
    ).rejects.toThrow()
  })

  it('rejects invalid secure key payloads and never exposes the key', async () => {
    expect(await isSecureStorageAvailable()).toBe(false)
    await expect(testAndSaveKey({ provider: 'invalid', key: 'TEST-KEY-12345' })).rejects.toThrow()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    try {
      await expect(testAndSaveKey({ provider: 'openai', key: 'TEST-KEY-12345' })).rejects.toThrow(
        'Secure saving requires the desktop app with an available OS key store. No key was sent or saved.'
      )
      expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('TEST-KEY-12345')
      expect(warnSpy.mock.calls.flat().join(' ')).not.toContain('TEST-KEY-12345')
      expect(logSpy.mock.calls.flat().join(' ')).not.toContain('TEST-KEY-12345')
    } finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
      logSpy.mockRestore()
    }
  })

  it('accepts the trusted dev sender while ignoring query and hash', () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173/')
    expect(() =>
      assertTrustedSender({ senderFrame: { url: 'http://localhost:5173/?verify=true#/workspace' } })
    ).not.toThrow()
    expect(() => assertTrustedSender({ senderFrame: { url: 'http://evil.test/' } })).toThrow(
      'Untrusted IPC sender'
    )
    expect(() => assertTrustedSender({ senderFrame: null })).toThrow('Untrusted IPC sender')
  })

  it('accepts packaged file URLs with encoded spaces and drive-letter case differences', () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', '')
    const trustedURL = trustedRendererURL()
    const senderURL = new URL(trustedURL.href)
    senderURL.pathname = senderURL.pathname.replace(/%20/g, ' ')
    if (process.platform === 'win32')
      senderURL.pathname = senderURL.pathname.replace(
        /^\/([A-Z]):/,
        (_, drive) => `/${drive.toLowerCase()}:`
      )
    senderURL.search = '?verify=true'
    senderURL.hash = '#/workspace'
    expect(() => assertTrustedSender({ senderFrame: { url: senderURL.href } })).not.toThrow()
  })
})
