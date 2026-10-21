import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, protocol, session, shell, type IpcMainInvokeEvent } from 'electron'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ApiSubaru } from '@shared/api'
import { EVENTOS } from '@shared/api'
import { ESQUEMA_MINIATURA } from '@shared/miniatura'
import * as atualizador from './atualizador'
import * as cfg from './configuracoes'
import { enviarCookiesAoCelular, procurarCelulares } from './celular'
import {
  acharCookiesBaixado,
  existemCookiesDoPrograma,
  exportarCookies,
  importarCookies,
  lerCookiesDoPrograma,
  navegadorPadrao,
  prepararCookies
} from './cookies'
import * as galeria from './galeria'
import * as ferramentas from './ferramentas'
import * as fila from './fila'
import * as historico from './historico'
import * as logs from './logs'
import { limparCacheAntigo, servirMiniatura } from './miniaturas'
import * as sistema from './sistema'
import { buscarInfo, pastaDoItem } from './ytdlp'
import type { OpcoesDownload } from '@shared/tipos'

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
      contextIsolation: true,
      // Sem ferramentas de desenvolvedor no programa instalado: "cole isto no Ctrl+Shift+I" não funciona
      devTools: !app.isPackaged
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
  // A janela nunca sai da interface do programa (só o recarregamento do modo de desenvolvimento passa)
  const bloquearNavegacao = (e: Electron.Event, url: string) => {
    if (!enderecoDaInterface(url)) e.preventDefault()
  }
  janela.webContents.on('will-navigate', bloquearNavegacao)
  janela.webContents.on('will-redirect', bloquearNavegacao)
  janela.webContents.on('will-attach-webview', (e) => e.preventDefault())

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void janela.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** A interface do programa: o index.html empacotado, ou o servidor do electron-vite em desenvolvimento. */
function enderecoDaInterface(url: string): boolean {
  try {
    const u = new URL(url)
    if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) return u.origin === new URL(process.env.ELECTRON_RENDERER_URL).origin
    return u.protocol === 'file:' && decodeURIComponent(u.pathname).toLowerCase() === decodeURIComponent(pathToFileURL(join(__dirname, '../renderer/index.html')).pathname).toLowerCase()
  } catch {
    return false
  }
}

/** Só a interface do programa, no quadro principal da janela principal, conversa com o motor. */
function remetenteValido(e: IpcMainInvokeEvent): boolean {
  return !!janela && e.sender === janela.webContents && !!e.senderFrame && e.senderFrame === janela.webContents.mainFrame && enderecoDaInterface(e.senderFrame.url)
}

/** Pastas que a interface pode abrir: as de destino (configurações, fila, galeria). */
function pastaConhecida(caminho: string): boolean {
  if (/^[\\/]{2}/.test(caminho)) return false
  const c = cfg.configuracoes()
  const pastas = [c.pastaVideo, c.pastaAudio, c.pastaGaleria, c.padrao.pasta, ...fila.fila().map((i) => pastaDoItem(i, c)), ...galeria.pastasDaGaleria()]
  return pastas.some((p) => p && resolve(p).toLowerCase() === resolve(caminho).toLowerCase())
}

/** Arquivos que a interface pode abrir ou mostrar: os do histórico e os últimos da galeria. */
const arquivoConhecido = (caminho: string) => historico.noHistorico(caminho) || galeria.ehAmostra(caminho)

/** Opções de um download vindas da interface: pasta escolhida pelo usuário e modelos dentro da pasta. */
function conferirOpcoes(opcoes: Partial<OpcoesDownload> | undefined | null): void {
  if (!opcoes) return
  if (!cfg.caminhoPermitido(opcoes.pasta)) throw new Error('Escolha a pasta pelo botão "Escolher…".')
  if (opcoes.subpastaPersonalizada !== undefined) cfg.conferirModelo(opcoes.subpastaPersonalizada, 'A subpasta personalizada')
}

// ---------- IPC: cada método da ApiSubaru vira um handler ----------

type Handlers = { [K in keyof ApiSubaru as K extends `ao${string}` ? never : K]: ApiSubaru[K] }

const handlers: Handlers = {
  lerLink: async (url) => {
    if (!/^https?:\/\/\S+$/i.test(url.trim())) throw new Error('Link inválido.')
    const info = await buscarInfo(url.trim(), cfg.configuracoes(), cfg.obterSegredos(), null)
    return { info, duplicado: historico.procurarDuplicados([url]).get(url) ?? null }
  },
  adicionar: async (urls, opcoes, iniciar) => {
    conferirOpcoes(opcoes)
    return fila.adicionar(urls, opcoes, iniciar)
  },
  adicionarMesmoAssim: async (urls, opcoes, iniciar) => {
    conferirOpcoes(opcoes)
    fila.adicionar(urls, opcoes, iniciar, true)
  },
  adicionarComInfo: async (url, info, opcoes, iniciar) => {
    conferirOpcoes(opcoes)
    if (!/^https?:\/\/\S+$/i.test(url.trim())) throw new Error('Link inválido.')
    fila.adicionarComInfo(url.trim(), info, opcoes, iniciar)
  },
  adicionarLote: async (lote, iniciar, ignorar) => {
    for (const l of lote) conferirOpcoes(l.opcoes)
    return fila.adicionarLote(lote, iniciar, ignorar)
  },
  remover: async (ids) => fila.remover(ids),
  iniciarFila: async () => fila.iniciarFila(),
  pausarTodos: async () => fila.pausarTodos(),
  pausar: async (id) => fila.pausar(id),
  retomar: async (id) => fila.retomar(id),
  tentarDeNovo: async (id) => fila.tentarDeNovo(id),
  baixarAgora: async (id) => fila.baixarAgora(id),
  atualizarOpcoes: async (id, opcoes) => {
    conferirOpcoes(opcoes)
    fila.atualizarOpcoes(id, opcoes)
  },
  mover: async (id, direcao) => fila.mover(id, direcao),
  dividirPlaylist: async (id) => fila.dividirPlaylist(id),
  obterFila: async () => fila.fila(),

  obterHistorico: async () => historico.listarHistorico(),
  removerDoHistorico: async (ids) => historico.removerDoHistorico(ids),
  limparHistorico: async () => historico.limparHistorico(),

  obterGaleria: async () => galeria.listarGaleria(),
  adicionarGaleria: async (urls, pasta, organizar, intervalo, formato) => {
    if (!cfg.caminhoPermitido(pasta)) throw new Error('Escolha a pasta pelo botão "Escolher…".')
    if (formato) cfg.conferirModelo(formato, 'O formato das pastas')
    return galeria.adicionarGaleria(urls, pasta, organizar, intervalo, formato)
  },
  listarArquivosGaleria: async (url, inicio, quantidade) => galeria.listarArquivosGaleria(url, inicio, quantidade),
  pausarGaleria: async (id) => galeria.pausarGaleria(id),
  retomarGaleria: async (id) => galeria.retomarGaleria(id),
  removerGaleria: async (ids) => galeria.removerGaleria(ids),
  limparGaleriaConcluidos: async () => galeria.limparGaleriaConcluidos(),

  // Abrir só pastas de destino e arquivos baixados: a interface não abre (nem executa) qualquer caminho
  abrirPasta: async (caminho) => {
    if (!pastaConhecida(caminho)) return logs.logar('aviso', `Pasta desconhecida não foi aberta: ${caminho}`)
    mkdirSync(caminho, { recursive: true })
    const erro = await shell.openPath(caminho)
    if (erro) logs.logar('erro', `Não foi possível abrir ${caminho}: ${erro}`)
  },
  abrirArquivo: async (caminho) => {
    if (!arquivoConhecido(caminho)) return logs.logar('aviso', `Arquivo desconhecido não foi aberto: ${caminho}`)
    const erro = await shell.openPath(caminho)
    if (erro) logs.logar('erro', `Não foi possível abrir ${caminho}: ${erro}`)
  },
  mostrarNaPasta: async (caminho) => {
    if (!arquivoConhecido(caminho)) return
    if (existsSync(caminho) && statSync(caminho).isFile()) return shell.showItemInFolder(caminho)
    // O arquivo sumiu: abre a pasta dele, se ela ainda for uma pasta
    const pasta = dirname(caminho)
    if (existsSync(pasta) && statSync(pasta).isDirectory()) void shell.openPath(pasta)
  },
  escolherPasta: async (atual) => {
    const r = await dialog.showOpenDialog(janela!, { defaultPath: atual, properties: ['openDirectory', 'createDirectory'] })
    if (r.canceled) return null
    cfg.registrarEscolhido(r.filePaths[0])
    return r.filePaths[0]
  },
  escolherArquivo: async (filtros) => {
    const r = await dialog.showOpenDialog(janela!, { properties: ['openFile'], filters: filtros })
    if (r.canceled) return null
    cfg.registrarEscolhido(r.filePaths[0])
    return r.filePaths[0]
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
  // Senhas, token e cabeçalhos não voltam para a interface: ela vê só o que está preenchido
  obterSegredos: async () => cfg.segredosVisiveis(),
  salvarSegredos: async (s) => cfg.salvarSegredos(s),
  perfisNavegador: async (navegador) => perfisDoNavegador(navegador),
  navegadorPadrao: async () => navegadorPadrao(),
  exportarCookies: async (navegador, perfil, soSites) => exportarCookies(navegador, perfil, soSites),
  importarCookies: async (caminho, soSites) => {
    if (!cfg.caminhoPermitido(caminho)) throw new Error('Escolha o arquivo pelo botão.')
    return importarCookies(caminho, soSites)
  },
  acharCookiesBaixado: async () => {
    const achado = acharCookiesBaixado()
    if (achado) cfg.registrarEscolhido(achado)
    return achado
  },
  procurarCelulares: async () => procurarCelulares(),
  enviarCookiesAoCelular: async (endereco, codigo) => enviarCookiesAoCelular(endereco, codigo),
  salvarCookiesComo: async () => {
    if (!existemCookiesDoPrograma()) return null
    const r = await dialog.showSaveDialog(janela!, { defaultPath: 'cookies.txt', filters: [{ name: 'cookies.txt', extensions: ['txt'] }] })
    if (r.canceled || !r.filePath) return null
    const texto = lerCookiesDoPrograma()
    if (texto == null) return null
    writeFileSync(r.filePath, texto, 'utf8')
    return r.filePath
  },

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
  verificarAtualizacaoApp: async () => atualizador.verificarAgora(),
  estadoAtualizacao: async () => atualizador.estadoAtualizacao(),
  instalarAtualizacao: async () => atualizador.instalarAgora()
}

function registrarIpc() {
  for (const [canal, fn] of Object.entries(handlers)) {
    ipcMain.handle(canal, (e, ...args: unknown[]) => {
      if (!remetenteValido(e)) {
        logs.logar('aviso', `Pedido ao motor recusado (${canal}): não veio da interface do programa.`)
        throw new Error('Pedido recusado.')
      }
      return (fn as (...a: unknown[]) => unknown)(...args)
    })
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

// Sem o menu padrão do Electron (que traz atalhos de desenvolvedor como Ctrl+Shift+I e Ctrl+R)
Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  // Câmera, microfone, localização, notificações do site…: a interface não precisa de nenhuma permissão
  session.defaultSession.setPermissionRequestHandler((_w, _p, responder) => responder(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  // Miniaturas reduzidas e em cache; do disco, só imagens saem por aqui
  protocol.handle(ESQUEMA_MINIATURA, servirMiniatura)
  limparCacheAntigo()
  prepararCookies()

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

  // Ferramentas se atualizam em segundo plano depois que a janela abriu
  setTimeout(() => void ferramentas.verificarVersoes().then(() => ferramentas.atualizacaoAutomatica()), 3000)
  // O programa procura versões novas sozinho, baixa e avisa na barra de título quando estiver pronta
  atualizador.prepararAtualizador(
    () => cfg.configuracoes().atualizarApp,
    (e) => enviar(EVENTOS.aoMudarAtualizacao, e)
  )
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
