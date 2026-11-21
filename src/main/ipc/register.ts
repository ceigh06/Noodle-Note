import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/contracts'
import { importBytes } from './assets'
import { createNote, getNote, listNotes, saveNote } from './notes'
import { isSecureStorageAvailable, testAndSaveKey } from './secureKeys'
import { assertTrustedSender } from './trusted'

export const registerNoodleIpc = (): void => {
  ipcMain.handle(IPC_CHANNELS.notes.list, (event) => {
    assertTrustedSender(event)
    return listNotes()
  })
  ipcMain.handle(IPC_CHANNELS.notes.get, (event, id) => {
    assertTrustedSender(event)
    return getNote(id)
  })
  ipcMain.handle(IPC_CHANNELS.notes.save, (event, note) => {
    assertTrustedSender(event)
    return saveNote(note)
  })
  ipcMain.handle(IPC_CHANNELS.notes.create, (event, pillar) => {
    assertTrustedSender(event)
    return createNote(pillar)
  })
  ipcMain.handle(IPC_CHANNELS.assets.importBytes, (event, input) => {
    assertTrustedSender(event)
    return importBytes(input)
  })
  ipcMain.handle(IPC_CHANNELS.secureKeys.isSecureStorageAvailable, (event) => {
    assertTrustedSender(event)
    return isSecureStorageAvailable()
  })
  ipcMain.handle(IPC_CHANNELS.secureKeys.testAndSaveKey, (event, input) => {
    assertTrustedSender(event)
    return testAndSaveKey(input)
  })
}
