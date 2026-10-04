import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { CANAIS_INVOKE, EVENTOS, type ApiSubaru } from '@shared/api'

const api: Record<string, unknown> = {}

for (const canal of CANAIS_INVOKE) {
  api[canal] = (...args: unknown[]) => ipcRenderer.invoke(canal, ...args)
}

for (const [metodo, canal] of Object.entries(EVENTOS)) {
  api[metodo] = (cb: (...args: unknown[]) => void) => {
    const ouvinte = (_: unknown, ...args: unknown[]) => cb(...args)
    ipcRenderer.on(canal, ouvinte)
    return () => ipcRenderer.removeListener(canal, ouvinte)
  }
}

contextBridge.exposeInMainWorld('api', api as unknown as ApiSubaru)

// Caminho real de arquivos arrastados para a janela (o File do navegador não expõe o caminho).
contextBridge.exposeInMainWorld('caminhoDoArquivo', (arquivo: File) => webUtils.getPathForFile(arquivo))
