import { describe, expect, it, vi } from 'vitest'
import { noodleAPI, type Note } from '@/lib/noodle-api'

const note: Note = {
  id: 'note-1',
  title: 'Test note',
  category: 'Study',
  pillar: 'manual',
  content: '<p>Test</p>',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('noodleAPI adapter', () => {
  it('forwards notes.list', async () => {
    const list = vi.fn(async () => [note])
    window.noodleAPI = { ...window.noodleAPI!, notes: { ...window.noodleAPI!.notes, list } }
    await expect(noodleAPI.notes.list()).resolves.toEqual([note])
    expect(list).toHaveBeenCalledWith()
  })

  it('forwards notes.get', async () => {
    const get = vi.fn(async () => note)
    window.noodleAPI = { ...window.noodleAPI!, notes: { ...window.noodleAPI!.notes, get } }
    await expect(noodleAPI.notes.get('note-1')).resolves.toEqual(note)
    expect(get).toHaveBeenCalledWith('note-1')
  })

  it('forwards notes.save', async () => {
    const save = vi.fn(async () => note)
    window.noodleAPI = { ...window.noodleAPI!, notes: { ...window.noodleAPI!.notes, save } }
    await expect(noodleAPI.notes.save(note)).resolves.toEqual(note)
    expect(save).toHaveBeenCalledWith(note)
  })

  it('forwards notes.create with an explicit pillar', async () => {
    const create = vi.fn(async () => note)
    window.noodleAPI = { ...window.noodleAPI!, notes: { ...window.noodleAPI!.notes, create } }
    await noodleAPI.notes.create('sources')
    expect(create).toHaveBeenCalledWith('sources')
  })

  it("defaults notes.create to 'manual'", async () => {
    const create = vi.fn(async () => note)
    window.noodleAPI = { ...window.noodleAPI!, notes: { ...window.noodleAPI!.notes, create } }
    await noodleAPI.notes.create()
    expect(create).toHaveBeenCalledWith('manual')
  })

  it('imports assets through bytes and returns a preview URL', async () => {
    const importBytes = vi.fn(async () => ({ relativePath: './assets/photo.png' }))
    window.noodleAPI = { ...window.noodleAPI!, assets: { importBytes } }
    const file = new File(['abc'], 'photo.png', { type: 'image/png' })
    file.arrayBuffer = vi.fn(async () => new TextEncoder().encode('abc').buffer)
    const createObjectURL = vi.fn(() => 'blob:test')
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    await expect(noodleAPI.assets.import(file)).resolves.toEqual({
      relativePath: './assets/photo.png',
      previewUrl: 'blob:test'
    })
    expect(importBytes).toHaveBeenCalledWith({
      name: 'photo.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([97, 98, 99])
    })
  })

  it('throws when the desktop bridge is missing', async () => {
    const bridge = window.noodleAPI
    Object.defineProperty(window, 'noodleAPI', {
      configurable: true,
      writable: true,
      value: undefined
    })
    expect(() => noodleAPI.notes.list()).toThrow(
      'Desktop bridge unavailable: window.noodleAPI is not defined. Noodle runs only inside the desktop app.'
    )
    Object.defineProperty(window, 'noodleAPI', {
      configurable: true,
      writable: true,
      value: bridge
    })
  })
})
