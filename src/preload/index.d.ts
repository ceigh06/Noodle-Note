import { ElectronAPI } from '@electron-toolkit/preload'
import type { VerificationReport, RendererStatus } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      runChecks: () => Promise<VerificationReport>
      reportRendererStatus: (status: RendererStatus) => void
    }
  }
}
