import { join, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export type SenderEvent = { senderFrame?: { url: string } | null }

export const trustedRendererURL = (): URL => {
  const devURL = process.env['ELECTRON_RENDERER_URL']
  return devURL ? new URL(devURL) : pathToFileURL(join(__dirname, '../renderer/index.html'))
}

const normalizedPath = (url: URL): string => {
  const path = url.protocol === 'file:' ? fileURLToPath(url) : decodeURIComponent(url.pathname)
  const normalized = normalize(path)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

export const assertTrustedSender = (event: SenderEvent): void => {
  if (!event.senderFrame) throw new Error('Untrusted IPC sender')
  const senderURL = new URL(event.senderFrame.url)
  const trustedURL = trustedRendererURL()
  const trusted =
    senderURL.protocol === trustedURL.protocol &&
    (senderURL.protocol === 'file:'
      ? normalizedPath(senderURL) === normalizedPath(trustedURL)
      : senderURL.origin === trustedURL.origin && senderURL.pathname === trustedURL.pathname)
  if (!trusted) throw new Error('Untrusted IPC sender')
}
