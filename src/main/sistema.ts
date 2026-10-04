// Integração com o Windows: bandeja, área de transferência, atalhos globais e iniciar com o sistema.
import { app, BrowserWindow, clipboard, globalShortcut, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import type { Configuracoes } from '@shared/tipos'
import { configuracoes } from './configuracoes'
import { logar } from './logs'

let bandeja: Tray | null = null

function caminhoRecurso(nome: string): string {
  return app.isPackaged ? join(process.resourcesPath, nome) : join(app.getAppPath(), 'resources', nome)
}

export function iconeApp(): Electron.NativeImage {
  return nativeImage.createFromPath(caminhoRecurso('icone.png'))
}

// ---------- Bandeja (item 83) ----------

export function atualizarBandeja(janela: () => BrowserWindow | null, acoes: { iniciarFila: () => void; pausarTodos: () => void }): void {
  const c = configuracoes()
  if (!c.bandeja) {
    bandeja?.destroy()
    bandeja = null
    return
  }
  if (!bandeja) {
    bandeja = new Tray(nativeImage.createFromPath(caminhoRecurso('icone-bandeja.png')))
    bandeja.setToolTip('Subaru DL')
    bandeja.on('click', () => mostrarJanela(janela()))
  }
  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir o Subaru DL', click: () => mostrarJanela(janela()) },
      { type: 'separator' },
      { label: 'Baixar a fila', click: acoes.iniciarFila },
      { label: 'Pausar tudo', click: acoes.pausarTodos },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ])
  )
}

export function temBandeja(): boolean {
  return bandeja !== null
}

export function mostrarJanela(janela: BrowserWindow | null): void {
  if (!janela) return
  if (janela.isMinimized()) janela.restore()
  janela.show()
  janela.focus()
}

// ---------- Monitor da área de transferência (item 4) ----------

let timerClipboard: NodeJS.Timeout | null = null
let ultimoTexto = ''

/** Links que o yt-dlp provavelmente não baixa (páginas de busca, login, imagens soltas…). */
const IGNORAR = /\.(png|jpe?g|gif|webp|svg|pdf|zip|exe)(\?|$)|google\.[a-z.]+\/search|accounts\.|login|signin/i

export async function monitorarClipboard(aoAchar: (url: string) => void): Promise<void> {
  if (timerClipboard) clearInterval(timerClipboard)
  timerClipboard = null
  if (!configuracoes().monitorarClipboard) return
  // O que já estava copiado antes de abrir o app não conta
  ultimoTexto = (await clipboard.readText()).trim()
  timerClipboard = setInterval(async () => {
    const texto = (await clipboard.readText()).trim()
    if (texto === ultimoTexto) return
    ultimoTexto = texto
    if (/^https?:\/\/\S+$/i.test(texto) && !IGNORAR.test(texto)) aoAchar(texto)
  }, 800)
}

/** Link que está na área de transferência (para os atalhos). */
export async function linkNoClipboard(): Promise<string | null> {
  const texto = (await clipboard.readText()).trim()
  return /^https?:\/\/\S+$/i.test(texto) ? texto : null
}

// ---------- Atalhos globais (item 5) ----------

export function registrarAtalhos(acoes: { adicionar: () => void; baixarFila: () => void; adicionarEBaixar: () => void }): string[] {
  globalShortcut.unregisterAll()
  const c = configuracoes()
  if (!c.atalhosAtivos) return []
  const falhas: string[] = []
  const pares: Array<[string, () => void]> = [
    [c.atalhoAdicionar, acoes.adicionar],
    [c.atalhoBaixarFila, acoes.baixarFila],
    [c.atalhoAdicionarEBaixar, acoes.adicionarEBaixar]
  ]
  for (const [atalho, acao] of pares) {
    if (!atalho) continue
    try {
      if (!globalShortcut.register(atalho, acao)) falhas.push(atalho)
    } catch {
      falhas.push(atalho)
    }
  }
  if (falhas.length) logar('aviso', `Atalhos em uso por outro programa: ${falhas.join(', ')}`)
  return falhas
}

// ---------- Iniciar com o Windows (item 84) ----------

export function aplicarInicioAutomatico(c: Configuracoes): void {
  if (!app.isPackaged) return // em desenvolvimento registraria o electron.exe
  app.setLoginItemSettings({
    openAtLogin: c.iniciarComWindows,
    args: c.iniciarMinimizado ? ['--minimizado'] : []
  })
}

export function iniciouMinimizado(): boolean {
  return process.argv.includes('--minimizado')
}
