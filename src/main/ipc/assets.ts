import { validateAssetInput } from './validate'

export const importBytes = async (input: unknown): Promise<{ relativePath: string }> => {
  const validInput = validateAssetInput(input)
  return new Promise((resolve) =>
    setTimeout(() => resolve({ relativePath: `./assets/${validInput.name}` }), 80)
  )
}
