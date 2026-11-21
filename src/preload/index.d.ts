import type { VerificationReport, RendererStatus } from './index'

declare global {
  interface Window {
    api: {
      runChecks: () => Promise<VerificationReport>
      reportRendererStatus: (status: RendererStatus) => void
    }
  }
}
