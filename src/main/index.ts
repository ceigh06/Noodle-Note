import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { runAllChecks } from './checks'

const productionContentSecurityPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'"

const isVerifyOnly = process.argv.includes('--verify')
let verificationTimeout: NodeJS.Timeout | undefined

if (isVerifyOnly) {
  app.commandLine.appendSwitch('verify-main-process', '1')
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    show: !isVerifyOnly,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: isVerifyOnly ? ['--noodle-verify'] : []
    }
  })

  if (isVerifyOnly) {
    console.log('[Verify Stage] window created')
    mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
      console.error(`[Preload Error] ${preloadPath}:`, error)
      app.exit(1)
    })

    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('[Renderer Gone]:', details)
      app.exit(1)
    })
  }

  if (isVerifyOnly) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, source) => {
      const levelStr = ['verbose', 'info', 'warning', 'error'][level] || `level-${level}`
      console.error(`[Renderer Console] [${levelStr}] ${message}\n    at ${source}:${line}`)
    })

    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        console.error(`[Load Failure] ${validatedURL}: ${errorDescription} (code ${errorCode})`)
      }
    )
  }

  mainWindow.on('ready-to-show', () => {
    if (!isVerifyOnly) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL'] + (isVerifyOnly ? '?verify=true' : '')
    if (isVerifyOnly) console.log(`[Verify Stage] loading URL: ${url}`)
    mainWindow.loadURL(url)
  } else {
    const filePath = join(__dirname, '../renderer/index.html')
    if (isVerifyOnly) console.log(`[Verify Stage] loading file: ${filePath}`)
    mainWindow.loadFile(filePath, { query: isVerifyOnly ? { verify: 'true' } : undefined })
  }

  if (isVerifyOnly) {
    mainWindow.webContents.on('did-start-loading', () =>
      console.log('[Verify Stage] did-start-loading')
    )
    mainWindow.webContents.on('did-finish-load', () =>
      console.log('[Verify Stage] did-finish-load')
    )
    mainWindow.webContents.on('did-navigate', (_event, url) =>
      console.log(`[Verify Stage] did-navigate: ${url}`)
    )
  }

  return mainWindow
}

app.whenReady().then(async () => {
  if (isVerifyOnly) console.log('[Verify Stage] app ready')
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  if (!is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [productionContentSecurityPolicy]
        }
      })
    })
  }

  ipcMain.handle('run-checks', async () => {
    if (isVerifyOnly) console.log('[Verify Stage] run-checks IPC received in main')
    return await runAllChecks(app.isPackaged)
  })

  ipcMain.on('renderer-check-result', (_event, result) => {
    if (isVerifyOnly) {
      console.log('[Verify Stage] renderer-check-result received')
      if (verificationTimeout) clearTimeout(verificationTimeout)
    }
    console.log('[Native Proof] Received result from Renderer -> Preload bridge:')
    if (result.success && result.report?.allPassed) {
      console.log('[Native Proof] Verification PASSED through real renderer button path.')
      if (isVerifyOnly) {
        app.exit(0)
      }
    } else {
      console.error(
        '[Native Proof] Verification FAILED through renderer path:',
        result.error || 'Checks failed'
      )
      if (isVerifyOnly) {
        app.exit(1)
      }
    }
  })

  createWindow()

  if (isVerifyOnly) {
    console.log(
      '[Native Proof] Starting Electron window to exercise Renderer -> Preload -> Main...'
    )
    verificationTimeout = setTimeout(() => {
      console.error('[Native Proof] Verification timed out after 60s waiting for renderer.')
      app.exit(1)
    }, 60000)
    setTimeout(() => clearTimeout(verificationTimeout), 60000)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
