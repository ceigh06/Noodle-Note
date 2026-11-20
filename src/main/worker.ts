import Database from 'better-sqlite3'

// Open DB in worker with WAL and busy_timeout
const db = new Database(':memory:')
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

// Verify WAL and busy_timeout
const journalMode = db.pragma('journal_mode', { simple: true })
const busyTimeout = db.pragma('busy_timeout', { simple: true })

// Heavy CPU task: compute prime numbers
function heavyCpuTask(iterations: number): number {
  let count = 0
  for (let i = 2; i < iterations; i++) {
    let isPrime = true
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) count++
  }
  return count
}

const start = Date.now()
const primeCount = heavyCpuTask(2_000_000)
const elapsed = Date.now() - start

if (process.parentPort) {
  process.parentPort.postMessage({
    success: true,
    primeCount,
    elapsed,
    journalMode,
    busyTimeout
  })
}
