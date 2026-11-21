import { describe, expect, it, vi } from 'vitest'
import { testAndSaveKey, type SecureKeyBridge } from '@/lib/byok'

describe('secure key setup', () => {
  it('refuses to save or transmit keys without an OS encryption bridge', async () => {
    await expect(testAndSaveKey('openai', 'dummy-test-key')).rejects.toThrow(
      'No key was sent or saved'
    )
  })
  it('refuses insecure storage without calling the provider', async () => {
    const bridge: SecureKeyBridge = {
      isSecureStorageAvailable: async () => false,
      testAndSaveKey: vi.fn()
    }
    await expect(testAndSaveKey('anthropic', 'dummy-test-key', bridge)).rejects.toThrow(
      'OS key store'
    )
    expect(bridge.testAndSaveKey).not.toHaveBeenCalled()
  })
  it('sends the chosen provider only to the secure host', async () => {
    const bridge: SecureKeyBridge = {
      isSecureStorageAvailable: async () => true,
      testAndSaveKey: vi.fn().mockResolvedValue({ success: true })
    }
    await expect(testAndSaveKey('gemini', 'dummy-test-key', bridge)).resolves.toEqual({
      success: true
    })
    expect(bridge.testAndSaveKey).toHaveBeenCalledWith({
      provider: 'gemini',
      key: 'dummy-test-key'
    })
  })
})
