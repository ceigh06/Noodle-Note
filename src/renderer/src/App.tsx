import { useState, useEffect, useRef, useCallback } from 'react'

type VerificationCheck = { name: string; status: 'PASS' | 'FAIL'; details: string }
type VerificationReport = {
  mode: 'dev' | 'packaged'
  timestamp: string
  versions: {
    electron: string
    node: string
    betterSqlite3: string
    sqliteVec: string
    onnxruntimeNode: string
  }
  checks: VerificationCheck[]
  allPassed: boolean
}

export default function App(): React.JSX.Element {
  const [report, setReport] = useState<VerificationReport | null>(null)
  const [running, setRunning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [fps, setFps] = useState<number>(0)
  const [counter, setCounter] = useState<number>(0)

  const frameCount = useRef<number>(0)
  const lastTime = useRef<number>(0)

  useEffect(() => {
    lastTime.current = performance.now()
    let animId: number
    const loop = (now: number): void => {
      frameCount.current++
      setCounter((c) => (c + 1) % 1000000)

      if (now - lastTime.current >= 500) {
        const measuredFps = Math.round((frameCount.current * 1000) / (now - lastTime.current))
        setFps(measuredFps)
        frameCount.current = 0
        lastTime.current = now
      }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  const executeChecks = useCallback((): void => {
    if (new URLSearchParams(window.location.search).has('verify')) {
      console.info('[Verify Stage] proof component executing checks')
    }
    setRunning(true)
    setError(null)

    if (!window.api || !window.api.runChecks) {
      const errMsg =
        'window.api.runChecks is not available (preload issue or context isolation issue)'
      setError(errMsg)
      setRunning(false)
      window.api?.reportRendererStatus?.({ success: false, error: errMsg })
      return
    }

    const rendererCheck = async (
      name: string,
      check: () => Promise<string> | string
    ): Promise<{ name: string; status: 'PASS' | 'FAIL'; details: string }> => {
      try {
        return { name, status: 'PASS', details: await check() }
      } catch (error) {
        return {
          name,
          status: 'FAIL',
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }

    const runRendererChecks = async (): Promise<VerificationReport['checks']> => {
      const checks: VerificationReport['checks'] = []
      checks.push(
        await rendererCheck('bridge', async () => {
          if (
            typeof window.noodleAPI?.notes?.list !== 'function' ||
            typeof window.noodleAPI.notes.get !== 'function' ||
            typeof window.noodleAPI.notes.save !== 'function' ||
            typeof window.noodleAPI.notes.create !== 'function' ||
            typeof window.noodleAPI.assets?.importBytes !== 'function' ||
            typeof window.noodleSecureKeys?.isSecureStorageAvailable !== 'function' ||
            typeof window.noodleSecureKeys.testAndSaveKey !== 'function'
          )
            throw new Error('Bridge methods are not functions')
          const notes = await window.noodleAPI.notes.list()
          if (notes.length !== 11) throw new Error(`Expected 11 notes, received ${notes.length}`)
          const first = await window.noodleAPI.notes.get(notes[0].id)
          if (!first || first.id !== notes[0].id)
            throw new Error('notes.get returned the wrong note')
          return `notes.list returned ${notes.length} notes; notes.get matched ${first.id}`
        })
      )
      checks.push(
        await rendererCheck('isolation', () => {
          const values = {
            require: typeof (globalThis as { require?: unknown }).require,
            process: typeof (globalThis as { process?: unknown }).process,
            electron: typeof (window as Window & { electron?: unknown }).electron
          }
          if (
            values.require !== 'undefined' ||
            values.process !== 'undefined' ||
            values.electron !== 'undefined'
          )
            throw new Error(`Isolation values: ${JSON.stringify(values)}`)
          return `require=${values.require}, process=${values.process}, window.electron=${values.electron}`
        })
      )
      checks.push(
        await rendererCheck('ipc-surface', () => {
          const apiKeys = Object.keys(window.noodleAPI ?? {})
          const noteKeys = Object.keys(window.noodleAPI?.notes ?? {})
          const assetKeys = Object.keys(window.noodleAPI?.assets ?? {})
          const secureKeys = Object.keys(window.noodleSecureKeys ?? {})
          const forbidden = ['ipcRenderer', 'invoke', 'send', 'electron']
          const invalid =
            JSON.stringify(apiKeys) !== JSON.stringify(['notes', 'assets']) ||
            JSON.stringify(noteKeys) !== JSON.stringify(['list', 'get', 'save', 'create']) ||
            JSON.stringify(assetKeys) !== JSON.stringify(['importBytes']) ||
            JSON.stringify(secureKeys) !==
              JSON.stringify(['isSecureStorageAvailable', 'testAndSaveKey']) ||
            window.noodleStudy !== undefined ||
            forbidden.some((key) => Object.prototype.hasOwnProperty.call(window, key))
          if (invalid)
            throw new Error(
              `api=${JSON.stringify(apiKeys)}, notes=${JSON.stringify(noteKeys)}, assets=${JSON.stringify(assetKeys)}, secure=${JSON.stringify(secureKeys)}, noodleStudy=${typeof window.noodleStudy}, window.api=${typeof window.api}`
            )
          return `window.api=${typeof window.api}`
        })
      )
      checks.push(
        await rendererCheck('byok-no-store', async () => {
          if (await window.noodleSecureKeys!.isSecureStorageAvailable())
            throw new Error('Secure storage unexpectedly available')
          try {
            await window.noodleSecureKeys!.testAndSaveKey({
              provider: 'openai',
              key: 'TEST-KEY-12345'
            })
            throw new Error('Secure key save unexpectedly resolved')
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            const expected =
              'Secure saving requires the desktop app with an available OS key store. No key was sent or saved.'
            if (!message.includes(expected))
              throw new Error(`Unexpected secure key error: ${message}`, { cause: error })
            return 'Secure storage unavailable and key save rejected without exposing the key'
          }
        })
      )
      checks.push(
        await rendererCheck('bytes-roundtrip', async () => {
          const encoded =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
          const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
          const result = await window.noodleAPI!.assets.importBytes({
            name: 'proof.png',
            mimeType: 'image/png',
            bytes
          })
          if (result.relativePath !== './assets/proof.png') throw new Error('Unexpected asset path')
          await expectRejected(() =>
            window.noodleAPI!.assets.importBytes({ name: '../x.png', mimeType: 'image/png', bytes })
          )
          await expectRejected(() =>
            window.noodleAPI!.assets.importBytes({
              name: 'proof.png',
              mimeType: 'image/png',
              bytes: [1, 2, 3] as unknown as Uint8Array
            })
          )
          return 'Uint8Array round-tripped and invalid asset inputs were rejected'
        })
      )
      return checks
    }

    const expectRejected = async (call: () => Promise<unknown>): Promise<void> => {
      try {
        await call()
      } catch {
        return
      }
      throw new Error('Expected bridge call to reject')
    }

    window.api
      .runChecks()
      .then(async (res) => {
        const rendererChecks = await runRendererChecks()
        const report = {
          ...res,
          checks: [...res.checks, ...rendererChecks],
          allPassed: res.allPassed && rendererChecks.every((check) => check.status === 'PASS')
        }
        setReport(report)
        window.api.reportRendererStatus({ success: true, report })
      })
      .catch((e: unknown) => {
        const errMsg = e instanceof Error ? e.message : String(e)
        setError(errMsg)
        window.api.reportRendererStatus({ success: false, error: errMsg })
      })
      .finally(() => {
        setRunning(false)
      })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      executeChecks()
    }, 0)
    return () => clearTimeout(timer)
  }, [executeChecks])

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'monospace',
        color: '#eaeaea',
        background: '#121214',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}
    >
      <h2 style={{ margin: '0 0 16px 0', color: '#58a6ff' }}>
        Phase 1 Native Modules &amp; Concurrency Proof
      </h2>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '12px 16px',
          background: '#1e1e24',
          borderRadius: '6px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '3px solid #3b82f6',
            borderTopColor: 'transparent',
            animation: 'spin 0.6s linear infinite'
          }}
        />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div>
          <div>
            UI Responsiveness: <strong>LIVE</strong> (60fps animation active)
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            Frame Counter: <span style={{ color: '#60a5fa' }}>{counter}</span> | Current FPS:{' '}
            <span style={{ color: '#34d399' }}>{fps}</span>
          </div>
        </div>
        <button
          onClick={executeChecks}
          disabled={running}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: running ? '#4b5563' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: running ? 'not-allowed' : 'pointer'
          }}
        >
          {running ? 'Running checks...' : 'Re-run Checks'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            background: '#7f1d1d',
            color: '#fca5a5',
            borderRadius: '6px',
            marginBottom: '16px'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {report && (
        <div>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#9ca3af' }}>
            Mode: <strong style={{ color: '#fff' }}>{report.mode}</strong> | Timestamp:{' '}
            {report.timestamp} | Status:{' '}
            <strong style={{ color: report.allPassed ? '#34d399' : '#f87171' }}>
              {report.allPassed ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'}
            </strong>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              background: '#1a1a20',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <thead>
              <tr style={{ background: '#272730', borderBottom: '1px solid #374151' }}>
                <th style={{ padding: '10px 14px' }}>Check</th>
                <th style={{ padding: '10px 14px', width: '90px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {report.checks.map((c) => (
                <tr key={c.name} style={{ borderBottom: '1px solid #2a2a35' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: c.status === 'PASS' ? '#065f46' : '#991b1b',
                        color: c.status === 'PASS' ? '#6ee7b7' : '#fca5a5'
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: '#d1d5db' }}>
                    {c.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: '#1a1a20',
              borderRadius: '6px'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#9ca3af' }}>
              Pinned Versions:
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#d1d5db',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px'
              }}
            >
              <div>Electron: {report.versions.electron}</div>
              <div>Node: {report.versions.node}</div>
              <div>better-sqlite3: {report.versions.betterSqlite3}</div>
              <div>sqlite-vec: {report.versions.sqliteVec}</div>
              <div>onnxruntime-node: {report.versions.onnxruntimeNode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
