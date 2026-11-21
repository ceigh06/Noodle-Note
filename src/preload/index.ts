import { contextBridge, ipcRenderer } from 'electron'
import { createBridge } from './bridge'

export interface CheckResult {
  name: string
  status: 'PASS' | 'FAIL'
  details: string
}

export interface VerificationReport {
  mode: 'dev' | 'packaged'
  timestamp: string
  versions: {
    electron: string
    node: string
    betterSqlite3: string
    sqliteVec: string
    onnxruntimeNode: string
  }
  checks: CheckResult[]
  allPassed: boolean
}

export interface RendererStatus {
  success: boolean
  error?: string
  report?: VerificationReport
}

const api = {
  runChecks: (): Promise<VerificationReport> => ipcRenderer.invoke('run-checks'),
  reportRendererStatus: (status: RendererStatus): void => {
    ipcRenderer.send('renderer-check-result', status)
  }
}

const { noodleAPI, noodleSecureKeys } = createBridge((channel, payload) =>
  ipcRenderer.invoke(channel, payload)
)

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('noodleAPI', noodleAPI)
    contextBridge.exposeInMainWorld('noodleSecureKeys', noodleSecureKeys)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore - renderer window typing fallback
  window.noodleAPI = noodleAPI
  // @ts-ignore - renderer window typing fallback
  window.noodleSecureKeys = noodleSecureKeys
  // @ts-ignore - renderer window typing fallback
  window.api = api
}
