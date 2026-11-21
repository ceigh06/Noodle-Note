import type { KeySetupResult } from '../../shared/contracts'
import { validateKeyInput } from './validate'

export const isSecureStorageAvailable = async (): Promise<boolean> => false

export const testAndSaveKey = async (input: unknown): Promise<KeySetupResult> => {
  validateKeyInput(input)
  throw new Error(
    'Secure saving requires the desktop app with an available OS key store. No key was sent or saved.'
  )
}
