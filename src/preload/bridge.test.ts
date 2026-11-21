// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS, type Note } from '../shared/contracts'
import { createBridge } from './bridge'

describe('preload bridge', () => {
  it('exposes only the expected methods and forwards each call', async () => {
    const invoke = vi.fn(async (channel: string, payload?: unknown) => {
      void payload
      const result = {
        [IPC_CHANNELS.notes.list]: ['list-result'],
        [IPC_CHANNELS.notes.get]: null,
        [IPC_CHANNELS.notes.save]: { id: 'saved' },
        [IPC_CHANNELS.notes.create]: { id: 'created' },
        [IPC_CHANNELS.assets.importBytes]: { relativePath: './assets/x.png' },
        [IPC_CHANNELS.secureKeys.isSecureStorageAvailable]: true,
        [IPC_CHANNELS.secureKeys.testAndSaveKey]: { success: true }
      }[channel]
      return result
    })
    const bridge = createBridge(invoke)
    const note = { id: 'n1' } as Note
    const asset = { name: 'x.png', mimeType: 'image/png', bytes: new Uint8Array([1]) }
    const key = { provider: 'openai' as const, key: 'secret' }

    await expect(bridge.noodleAPI.notes.list()).resolves.toEqual(['list-result'])
    await expect(bridge.noodleAPI.notes.get('n1')).resolves.toBeNull()
    await expect(bridge.noodleAPI.notes.save(note)).resolves.toEqual({ id: 'saved' })
    await expect(bridge.noodleAPI.notes.create('manual')).resolves.toEqual({ id: 'created' })
    await expect(bridge.noodleAPI.assets.importBytes(asset)).resolves.toEqual({
      relativePath: './assets/x.png'
    })
    await expect(bridge.noodleSecureKeys.isSecureStorageAvailable()).resolves.toBe(true)
    await expect(bridge.noodleSecureKeys.testAndSaveKey(key)).resolves.toEqual({ success: true })

    expect(invoke.mock.calls).toEqual([
      [IPC_CHANNELS.notes.list],
      [IPC_CHANNELS.notes.get, 'n1'],
      [IPC_CHANNELS.notes.save, note],
      [IPC_CHANNELS.notes.create, 'manual'],
      [IPC_CHANNELS.assets.importBytes, asset],
      [IPC_CHANNELS.secureKeys.isSecureStorageAvailable],
      [IPC_CHANNELS.secureKeys.testAndSaveKey, key]
    ])
  })

  it('has exactly the expected keys and no generic invocation methods', () => {
    const bridge = createBridge(async () => undefined)

    expect(Object.keys(bridge)).toEqual(['noodleAPI', 'noodleSecureKeys'])
    expect(Object.keys(bridge.noodleAPI)).toEqual(['notes', 'assets'])
    expect(Object.keys(bridge.noodleAPI.notes)).toEqual(['list', 'get', 'save', 'create'])
    expect(Object.keys(bridge.noodleAPI.assets)).toEqual(['importBytes'])
    expect(Object.keys(bridge.noodleSecureKeys)).toEqual([
      'isSecureStorageAvailable',
      'testAndSaveKey'
    ])
    expect(bridge).not.toHaveProperty('invoke')
    expect(bridge).not.toHaveProperty('send')
    expect(bridge).not.toHaveProperty('ipcRenderer')
    expect(bridge.noodleAPI).not.toHaveProperty('invoke')
    expect(bridge.noodleAPI).not.toHaveProperty('send')
    expect(bridge.noodleAPI).not.toHaveProperty('ipcRenderer')
    expect(bridge.noodleSecureKeys).not.toHaveProperty('invoke')
    expect(bridge.noodleSecureKeys).not.toHaveProperty('send')
    expect(bridge.noodleSecureKeys).not.toHaveProperty('ipcRenderer')
  })
})
