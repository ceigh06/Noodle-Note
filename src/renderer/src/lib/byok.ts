export const providers = {
  openai: {
    name: 'OpenAI',
    dashboard: 'https://platform.openai.com/api-keys',
    placeholder: 'Enter your OpenAI API key'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    dashboard: 'https://console.anthropic.com/settings/keys',
    placeholder: 'Enter your Anthropic API key'
  },
  gemini: {
    name: 'Google Gemini',
    dashboard: 'https://aistudio.google.com/app/apikey',
    placeholder: 'Enter your Gemini API key'
  }
} as const

export type Provider = keyof typeof providers
export type KeySetupResult = { success: boolean; message?: string }

// Implemented only by a trusted Electron preload. Never persist keys in browser storage.
export interface SecureKeyBridge {
  isSecureStorageAvailable: () => Promise<boolean>
  testAndSaveKey: (input: { provider: Provider; key: string }) => Promise<KeySetupResult>
}

declare global {
  interface Window {
    noodleSecureKeys?: SecureKeyBridge
  }
}

export async function testAndSaveKey(
  provider: Provider,
  key: string,
  bridge?: SecureKeyBridge
): Promise<KeySetupResult> {
  if (!key.trim()) throw new Error('Enter an API key first.')
  if (!bridge || !(await bridge.isSecureStorageAvailable())) {
    throw new Error(
      'Secure saving requires the desktop app with an available OS key store. No key was sent or saved.'
    )
  }
  return bridge.testAndSaveKey({ provider, key: key.trim() })
}
