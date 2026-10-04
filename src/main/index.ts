import { app, BrowserWindow, clipboard, dialog, ipcMain, protocol, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ApiSubaru } from '@shared/api'
import { EVENTOS } from '@shared/api'
import { ESQUEMA_MINIATURA } from '@shared/miniatura'
import * as cfg from './configuracoes'
import * as galeria from './galeria'
import * as ferramentas from './ferramentas'
import * as fila from './fila'
import * as historico from './historico'
import * as logs from './logs'
import { limparCacheAntigo, servirMiniatura } from './miniaturas'
import * as sistema from './sistema'
import { buscarInfo } from './ytdlp'

let janela: BrowserWindow | null = null
let saindo = false

// Em desenvolvimento, dados separados: dá para testar com o programa instalado aberto,
// sem mexer na fila, histórico e configurações de quem usa
if (!app.isPackaged) app.setPath('userData', join(app.getPath('appData'), 'Subaru DL (dev)'))

// Miniaturas das imagens baixadas (a interface não pode abrir arquivos do disco direto)
protocol.registerSchemesAsPrivileged([{ scheme: ESQUEMA_MINIATURA, privileges: { standard: true, secure: true, supportFetchAPI: true } }])

// Uma instância só: abrir de novo traz a janela existente para frente
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => sistema.mostrarJanela(janela))
}

function enviar(canal: string, ...args: unknown[]) {
  if (janela && !janela.isDestroyed()) janela.webContents.send(canal, ...args)
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Subaru DL',
    icon: sistema.iconeApp(),
    backgroundColor: '#0d121b',
    // Sem a moldura do Windows: a barra de título é desenhada pela interface
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  janela.on('maximize', () => enviar(EVENTOS.aoMaximizar, true))
  janela.on('unmaximize', () => enviar(EVENTOS.aoMaximizar, false))

  janela.on('ready-to-show', () => {
    if (!sistema.iniciouMinimizado() || !sistema.temBandeja()) janela?.show()
  })

  // Fechar a janela só esconde, se a bandeja estiver ativa (item 83)
  janela.on('close', (e) => {
    if (!saindo && cfg.configuracoes().minimizarAoFechar && sistema.temBandeja()) {
      e.preventDefault()
      janela?.hide()
    }
  })

  // Links externos abrem no navegador, nunca dentro do app
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  janela.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file:')) e.preventDefault()
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void janela.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------- IPC: cada método da ApiSubaru vira um handler ----------

type Handlers = { [K in keyof ApiSubaru as K extends `ao${string}` ? never : K]: ApiSubaru[K] }

const handlers: Handlers = {
  lerLink: async (url) => {
    const info = await buscarInfo(url, cfg.configuracoes(), cfg.obterSegredos(), null)
    return { info, duplicado: historico.procurarDuplicados([url]).get(url) ?? null }
  },
  adicionar: async (urls, opcoes, iniciar) => fila.adicionar(urls, opcoes, iniciar),
  adicionarMesmoAssim: async (urls, opcoes, iniciar) => {
    fila.adicionar(urls, opcoes, iniciar, true)
  },
  adicionarComInfo: async (url, info, opcoes, iniciar) => fila.adicionarComInfo(url, info, opcoes, iniciar),
  adicionarLote: async (lote, iniciar, ignorar) => fila.adicionarLote(lote, iniciar, ignorar),
  remover: async (ids) => fila.remover(ids),
  iniciarFila: async () => fila.iniciarFila(),
  pausarTodos: async () => fila.pausarTodos(),
  pausar: async (id) => fila.pausar(id),
  retomar: async (id) => fila.retomar(id),
  tentarDeNovo: async (id) => fila.tentarDeNovo(id),
  baixarAgora: async (id) => fila.baixarAgora(id),
  atualizarOpcoes: async (id, opcoes) => fila.atualizarOpcoes(id, opcoes),
  mover: async (id, direcao) => fila.mover(id, direcao),
  dividirPlaylist: async (id) => fila.dividirPlaylist(id),
  obterFila: async () => fila.fila(),

  obterHistorico: async () => historico.listarHistorico(),
  removerDoHistorico: async (ids) => historico.removerDoHistorico(ids),
  limparHistorico: async () => historico.limparHistorico(),

  obterGaleria: async () => galeria.listarGaleria(),
  adicionarGaleria: async (urls, pasta, organizar, intervalo, formato) => galeria.adicionarGaleria(urls, pasta, organizar, intervalo, formato),
  listarArquivosGaleria: async (url, inicio, quantidade) => galeria.listarArquivosGaleria(url, inicio, quantidade),
  pausarGaleria: async (id) => galeria.pausarGaleria(id),
  retomarGaleria: async (id) => galeria.retomarGaleria(id),
  removerGaleria: async (ids) => galeria.removerGaleria(ids),
  limparGaleriaConcluidos: async () => galeria.limparGaleriaConcluidos(),

  abrirPasta: async (caminho) => {
    mkdirSync(caminho, { recursive: true })
    const erro = await shell.openPath(caminho)
    if (erro) logs.logar('erro', `Não foi possível abrir ${caminho}: ${erro}`)
  },
  abrirArquivo: async (caminho) => {
    const erro = await shell.openPath(caminho)
    if (erro) logs.logar('erro', `Não foi possível abrir ${caminho}: ${erro}`)
  },
  mostrarNaPasta: async (caminho) => {
    if (existsSync(caminho) && !statSync(caminho).isDirectory()) shell.showItemInFolder(caminho)
    else void shell.openPath(existsSync(caminho) ? caminho : dirname(caminho))
  },
  escolherPasta: async (atual) => {
    const r = await dialog.showOpenDialog(janela!, { defaultPath: atual, properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  },
  escolherArquivo: async (filtros) => {
    const r = await dialog.showOpenDialog(janela!, { properties: ['openFile'], filters: filtros })
    return r.canceled ? null : r.filePaths[0]
  },
  lerArquivoLinks: async () => {
    const r = await dialog.showOpenDialog(janela!, {
      properties: ['openFile'],
      filters: [{ name: 'Lista de links', extensions: ['txt', 'csv', 'list'] }]
    })
    if (r.canceled) return []
    return readFileSync(r.filePaths[0], 'utf8').split(/\r?\n/)
  },
  abrirLink: async (url) => {
    if (/^https?:/.test(url)) await shell.openExternal(url)
  },
  copiar: async (texto) => clipboard.writeText(texto),
  lerClipboard: async () => clipboard.readText(),

  janelaMinimizar: async () => janela?.minimize(),
  janelaMaximizar: async () => {
    if (janela?.isMaximized()) janela.unmaximize()
    else janela?.maximize()
  },
  janelaFechar: async () => janela?.close(),

  obterConfiguracoes: async () => cfg.configuracoes(),
  salvarConfiguracoes: async (parcial) => cfg.salvarConfiguracoes(parcial),
  restaurarPadroes: async () => cfg.restaurarPadroes(),
  obterSegredos: async () => cfg.obterSegredos(),
  salvarSegredos: async (s) => cfg.salvarSegredos(s),
  perfisNavegador: async (navegador) => perfisDoNavegador(navegador),

  ferramentas: async () => ferramentas.verificarVersoes(),
  atualizarFerramenta: async (nome) => ferramentas.atualizarFerramenta(nome),
  alvosImpersonar: async () => ferramentas.alvosImpersonar(),

  obterLogs: async () => logs.todosLogs(),
  limparLogs: async () => logs.limparLogs(),
  exportarLogs: async () => {
    const r = await dialog.showSaveDialog(janela!, {
      defaultPath: `subaru-dl-logs-${new Date().toISOString().slice(0, 10)}.txt`,
      filters: [{ name: 'Texto', extensions: ['txt'] }]
    })
    if (r.canceled || !r.filePath) return null
    writeFileSync(r.filePath, logs.logsComoTexto(), 'utf8')
    return r.filePath
  },

  versaoApp: async () => app.getVersion(),
  verificarAtualizacaoApp: async () => verificarAtualizacaoApp()
}

function registrarIpc() {
  for (const [canal, fn] of Object.entries(handlers)) {
    ipcMain.handle(canal, (_e, ...args: unknown[]) => (fn as (...a: unknown[]) => unknown)(...args))
  }
}

/** Perfis do navegador para os cookies (item 58). */
function perfisDoNavegador(navegador: string): string[] {
  const appData = process.env.APPDATA ?? ''
  const local = process.env.LOCALAPPDATA ?? ''
  if (navegador === 'firefox') {
    const ini = join(appData, 'Mozilla', 'Firefox', 'profiles.ini')
    if (!existsSync(ini)) return []
    return [...readFileSync(ini, 'utf8').matchAll(/^Path=(.+)$/gm)].map((m) => m[1].trim().split('/').pop()!)
  }
  const pastas: Record<string, string> = {
    chrome: join(local, 'Google', 'Chrome', 'User Data'),
    edge: join(local, 'Microsoft', 'Edge', 'User Data'),
    brave: join(local, 'BraveSoftware', 'Brave-Browser', 'User Data'),
    vivaldi: join(local, 'Vivaldi', 'User Data'),
    chromium: join(local, 'Chromium', 'User Data'),
    opera: join(appData, 'Opera Software', 'Opera Stable')
  }
  const estado = join(pastas[navegador] ?? '', 'Local State')
  if (!existsSync(estado)) return []
  try {
    const dados = JSON.parse(readFileSync(estado, 'utf8'))
    return Object.keys(dados?.profile?.info_cache ?? {})
  } catch {
    return []
  }
}

// ---------- Atualização do app (item 86) ----------

async function verificarAtualizacaoApp(): Promise<{ disponivel: boolean; versao?: string; mensagem: string }> {
  if (!app.isPackaged) return { disponivel: false, mensagem: 'A atualização automática só funciona no programa instalado.' }
  if (!existsSync(join(process.resourcesPath, 'app-update.yml'))) {
    return { disponivel: false, mensagem: 'Ainda não há um repositório configurado para publicar as atualizações.' }
  }
  try {
    const r = await autoUpdater.checkForUpdates()
    const versao = r?.updateInfo.version
    if (versao && versao !== app.getVersion()) {
      return { disponivel: true, versao, mensagem: `Versão ${versao} disponível. Ela será instalada ao fechar o programa.` }
    }
    return { disponivel: false, mensagem: 'Você já está na versão mais recente.' }
  } catch (e) {
    return { disponivel: false, mensagem: `Não foi possível verificar: ${e instanceof Error ? e.message : e}` }
  }
}

// ---------- Ações vindas da bandeja, atalhos e área de transferência ----------

function adicionarDoMain(urls: string[], iniciar: boolean) {
  const { duplicados } = fila.adicionar(urls, undefined, iniciar)
  if (duplicados.length) {
    sistema.mostrarJanela(janela)
    enviar(EVENTOS.aoDuplicados, duplicados.map((d) => d.url), duplicados, iniciar)
  }
}

const acoesBandeja = { iniciarFila: () => fila.iniciarFila(), pausarTodos: () => fila.pausarTodos() }

function aplicarConfiguracoesDeSistema() {
  const c = cfg.configuracoes()
  sistema.atualizarBandeja(() => janela, acoesBandeja)
  void sistema.monitorarClipboard((url) => enviar(EVENTOS.aoLinkCopiado, url))
  sistema.registrarAtalhos({
    adicionar: async () => {
      const url = await sistema.linkNoClipboard()
      if (url) adicionarDoMain([url], false)
    },
    baixarFila: () => fila.iniciarFila(),
    adicionarEBaixar: async () => {
      const url = await sistema.linkNoClipboard()
      if (url) adicionarDoMain([url], true)
    }
  })
  sistema.aplicarInicioAutomatico(c)
}

app.whenReady().then(() => {
  // Miniaturas reduzidas e em cache; do disco, só imagens saem por aqui
  protocol.handle(ESQUEMA_MINIATURA, servirMiniatura)
  limparCacheAntigo()

  app.setAppUserModelId('local.subaru.dl')
  ferramentas.prepararFerramentas()

  logs.aoLogar((e) => enviar(EVENTOS.aoNovoLog, e))
  fila.aoMudarFila((f) => enviar(EVENTOS.aoMudarFila, f))
  ferramentas.aoMudarFerramentas((f) => enviar(EVENTOS.aoMudarFerramentas, f))
  historico.aoMudarHistorico((h) => enviar(EVENTOS.aoMudarHistorico, h))
  galeria.aoMudarGaleria((g) => enviar(EVENTOS.aoMudarGaleria, g))
  cfg.aoMudarConfiguracoes(() => aplicarConfiguracoesDeSistema())

  registrarIpc()
  fila.carregarFila()
  galeria.carregarGaleria()
  criarJanela()
  aplicarConfiguracoesDeSistema()

  // Ferramentas e app se atualizam em segundo plano depois que a janela abriu
  setTimeout(() => {
    void ferramentas.verificarVersoes().then(() => ferramentas.atualizacaoAutomatica())
    if (cfg.configuracoes().atualizarApp && app.isPackaged) {
      // Baixa em silêncio e instala ao fechar o programa (sem notificações)
      autoUpdater.autoDownload = true
      autoUpdater.checkForUpdates().catch(() => {})
    }
  }, 3000)
})

app.on('before-quit', () => {
  saindo = true
  fila.encerrarTudo()
  galeria.encerrarGaleria()
  historico.salvarHistoricoAgora()
})

app.on('window-all-closed', () => {
  if (!sistema.temBandeja()) app.quit()
})
