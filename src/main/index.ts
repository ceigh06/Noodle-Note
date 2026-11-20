import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { runAllChecks } from './checks'

function createWindow(isVerifyOnly: boolean): BrowserWindow {
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
      nodeIntegration: false
    }
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[Preload Error] ${preloadPath}:`, error)
    if (isVerifyOnly) {
      app.exit(1)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Renderer Gone]:', details)
    if (isVerifyOnly) {
      app.exit(1)
    }
  })

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
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('run-checks', async () => {
    return await runAllChecks(app.isPackaged)
  })

  const isVerifyOnly = process.argv.includes('--verify')

  ipcMain.on('renderer-check-result', (_event, result) => {
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

  if (isVerifyOnly) {
    console.log(
      '[Native Proof] Starting Electron window to exercise Renderer -> Preload -> Main...'
    )
    setTimeout(() => {
      console.error('[Native Proof] Verification timed out after 15s waiting for renderer.')
      app.exit(1)
    }, 15000)
  }

  createWindow(isVerifyOnly)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(false)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
