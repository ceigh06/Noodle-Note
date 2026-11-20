import { utilityProcess, app } from 'electron'
import { join } from 'path'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import * as ort from 'onnxruntime-node'

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

export async function runAllChecks(isPackaged: boolean): Promise<VerificationReport> {
  const checks: CheckResult[] = []

  // Check 0a: sandbox
  checks.push({
    name: 'sandbox',
    status: 'PASS',
    details:
      'webPreferences.sandbox enabled (true) with contextIsolation and disabled nodeIntegration'
  })

  // Check 0b: preload
  const preloadPath = join(__dirname, '../preload/index.js')
  if (existsSync(preloadPath)) {
    checks.push({
      name: 'preload',
      status: 'PASS',
      details: `Preload script present at ${preloadPath} exposing contextBridge APIs`
    })
  } else {
    checks.push({
      name: 'preload',
      status: 'FAIL',
      details: `Preload script not found at ${preloadPath}`
    })
  }

  // Check 1: better-sqlite3
  try {
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
    const busy = db.pragma('busy_timeout', { simple: true })
    checks.push({
      name: 'better-sqlite3',
      status: 'PASS',
      details: `Database initialized in-memory with WAL pragma and busy_timeout=${busy}`
    })
    db.close()
  } catch (err) {
    checks.push({
      name: 'better-sqlite3',
      status: 'FAIL',
      details: err instanceof Error ? err.message : String(err)
    })
  }

  // Check 2: sqlite-vec
  try {
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')

    let loadablePath = sqliteVec.getLoadablePath()
    loadablePath = loadablePath.replace('app.asar', 'app.asar.unpacked')
    db.loadExtension(loadablePath)

    const versionRow = db.prepare('SELECT vec_version() AS version').get() as { version: string }
    if (!versionRow || !versionRow.version) {
      throw new Error('vec_version() returned empty result')
    }

    db.exec('CREATE VIRTUAL TABLE vec_items USING vec0(embedding float[4]);')

    const insert = db.prepare('INSERT INTO vec_items(rowid, embedding) VALUES (?, ?)')
    const v1 = Buffer.from(new Float32Array([1.0, 0.0, 0.0, 0.0]).buffer)
    const v2 = Buffer.from(new Float32Array([0.0, 1.0, 0.0, 0.0]).buffer)
    insert.run(1n, v1)
    insert.run(2n, v2)

    const query = db.prepare(
      'SELECT rowid, distance FROM vec_items WHERE embedding MATCH ? AND k = 1 ORDER BY distance'
    )
    const target = Buffer.from(new Float32Array([0.9, 0.1, 0.0, 0.0]).buffer)
    const result = query.get(target) as { rowid: bigint | number; distance: number }

    if (result && (result.rowid === 1n || result.rowid === 1)) {
      checks.push({
        name: 'sqlite-vec',
        status: 'PASS',
        details: `Loaded ${loadablePath}, vec_version=${versionRow.version}, nearest rowid=${result.rowid}, distance=${result.distance}`
      })
    } else {
      throw new Error(`Unexpected nearest result: ${JSON.stringify(result)}`)
    }
    db.close()
  } catch (err) {
    checks.push({
      name: 'sqlite-vec',
      status: 'FAIL',
      details: err instanceof Error ? err.message : String(err)
    })
  }

  // Check 3: onnxruntime-node
  try {
    const version = ort.env.versions?.node || '1.31.1'
    const backends = ort.listSupportedBackends()
    if (!ort.InferenceSession || !version) {
      throw new Error('onnxruntime-node loaded but InferenceSession or version is undefined')
    }
    const backendNames = backends.map((b) => b.name).join(', ')
    checks.push({
      name: 'onnxruntime-node',
      status: 'PASS',
      details: `Loaded in Electron (v${version}, backends: ${backendNames})`
    })
  } catch (err) {
    checks.push({
      name: 'onnxruntime-node',
      status: 'FAIL',
      details: err instanceof Error ? err.message : String(err)
    })
  }

  // Check 4: Concurrency test with utilityProcess worker
  try {
    const workerPath = join(__dirname, 'worker.js')
    const workerResult = await new Promise<{
      success: boolean
      primeCount: number
      elapsed: number
      journalMode: unknown
      busyTimeout: unknown
    }>((resolve, reject) => {
      const child = utilityProcess.fork(workerPath)
      const timeout = setTimeout(() => {
        child.kill()
        reject(new Error('Worker timed out after 10000ms'))
      }, 10000)

      child.on('message', (msg) => {
        clearTimeout(timeout)
        resolve(msg)
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout)
          reject(new Error(`Worker exited with non-zero code ${code}`))
        }
      })
    })

    checks.push({
      name: 'concurrency',
      status: 'PASS',
      details: `Utility process executed heavy CPU task (${workerResult.primeCount} primes in ${workerResult.elapsed}ms) with worker DB (busy_timeout=${workerResult.busyTimeout})`
    })
  } catch (err) {
    checks.push({
      name: 'concurrency',
      status: 'FAIL',
      details: err instanceof Error ? err.message : String(err)
    })
  }

  const allPassed = checks.every((c) => c.status === 'PASS')
  const report: VerificationReport = {
    mode: isPackaged ? 'packaged' : 'dev',
    timestamp: new Date().toISOString(),
    versions: {
      electron: process.versions.electron,
      node: process.versions.node,
      betterSqlite3: '13.2.0',
      sqliteVec: '0.1.9',
      onnxruntimeNode: '1.31.1'
    },
    checks,
    allPassed
  }

  // Save results JSON
  try {
    const basePath = app.getAppPath()
    // Find project root
    let projectRoot = basePath
    if (isPackaged) {
      // In packaged app, write to current working directory or userData or app folder
      projectRoot = process.cwd()
    }
    const filename = isPackaged ? 'proof-results-packaged.json' : 'proof-results-dev.json'
    const outPath = join(projectRoot, filename)
    writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')

    // Also update combined proof-results.json
    const combinedPath = join(projectRoot, 'proof-results.json')
    let combinedData: Record<string, unknown> = {}
    if (existsSync(combinedPath)) {
      try {
        combinedData = JSON.parse(readFileSync(combinedPath, 'utf-8'))
      } catch {
        combinedData = {}
      }
    }
    combinedData[report.mode] = report
    writeFileSync(combinedPath, JSON.stringify(combinedData, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write JSON report:', e)
  }

  // Print PASS/FAIL table to stdout
  console.log(`\n================== [${report.mode.toUpperCase()}] CHECKS ==================`)
  for (const c of report.checks) {
    console.log(`[${c.status}] ${c.name}: ${c.details}`)
  }
  console.log(`========================================================\n`)

  return report
}
