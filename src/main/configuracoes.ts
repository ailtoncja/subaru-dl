import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Configuracoes, OpcoesDownload, Segredos, SegredosVisiveis } from '@shared/tipos'
import { gravarJson, lerJson, pastaDados } from './armazenamento'

export function opcoesPadrao(): OpcoesDownload {
  return {
    modo: 'video',
    qualidade: 'melhor',
    formatoId: null,
    codecVideo: 'auto',
    codecAudio: 'auto',
    ate30fps: false,
    container: 'mp4',
    formatoAudio: 'mp3',
    bitrateAudio: 0,
    idiomaAudio: null,
    manterOriginal: false,
    trecho: null,
    capitulos: [],
    separarCapitulos: false,
    cortePreciso: false,
    liveDoInicio: true,
    legendas: { ativas: false, automaticas: false, idiomas: ['pt', 'pt-BR'], todas: false, formato: 'srt', embutir: true },
    embutirMetadados: true,
    embutirCapa: true,
    salvarMiniatura: false,
    posProcesso: 'nenhum',
    posProcessoModo: 'remux',
    posProcessoArgs: '',
    itensPlaylist: '',
    limitePlaylist: 0,
    ordemInvertida: false,
    pasta: null,
    subpasta: 'nenhuma',
    subpastaPersonalizada: '%(uploader)s'
  }
}

function configuracoesPadrao(): Configuracoes {
  return {
    padrao: opcoesPadrao(),
    pastaVideo: join(app.getPath('videos'), 'Subaru DL'),
    pastaAudio: join(app.getPath('music'), 'Subaru DL'),
    nome: 'titulo',
    nomePersonalizado: '%(title)s [%(id)s]',
    camposNoNome: [],
    numerarPlaylist: true,
    nomesSeguros: false,
    simultaneos: 2,
    tentativasAuto: 3,
    intervaloTentativa: 10,
    salvarFila: true,
    usarAria2: false,
    argsAria2: '-x 16 -s 16 -k 1M',
    monitorarClipboard: true,
    preferirVideoEmPlaylist: true,
    acaoDuplicado: 'perguntar',
    atalhosAtivos: false,
    atalhoAdicionar: 'CommandOrControl+Shift+A',
    atalhoBaixarFila: 'CommandOrControl+Shift+D',
    atalhoAdicionarEBaixar: 'CommandOrControl+Shift+S',
    filtros: { tamanhoMin: '', tamanhoMax: '', dataModo: 'desligado', data: '', matchFilters: '', breakMatchFilters: '' },
    cookies: { origem: 'nenhum', navegador: 'firefox', perfil: '', arquivo: '', ignorarSites: [] },
    sitesLogin: [],
    proxy: { ativo: false, tipo: 'http', host: '', porta: '', usuario: '' },
    impersonar: '',
    extractorArgs: '',
    argsExtras: '',
    playerJsReal: false,
    bandeja: true,
    minimizarAoFechar: true,
    iniciarComWindows: false,
    iniciarMinimizado: true,
    atualizarFerramentas: true,
    canalYtdlp: 'stable',
    atualizarApp: true,
    pastaGaleria: join(app.getPath('pictures'), 'Subaru DL'),
    galeriaSimultaneos: 2,
    galeriaPularBaixados: true,
    galeriaIntervalo: '',
    galeriaOrganizar: 'padrao',
    galeriaFormatoPasta: '{category}/{user}',
    galeriaPausa: 0,
    setupConcluido: false
  }
}

/** Junta o que está salvo com os padrões, para que campos novos de versões futuras apareçam.
 *  Listas são substituídas inteiras, não mescladas. */
function mesclar<T>(padrao: T, salvo: unknown): T {
  if (Array.isArray(padrao) || typeof padrao !== 'object' || padrao === null) {
    return (salvo === undefined ? padrao : salvo) as T
  }
  const resultado = { ...padrao } as Record<string, unknown>
  if (salvo && typeof salvo === 'object' && !Array.isArray(salvo)) {
    for (const [chave, valor] of Object.entries(salvo)) {
      resultado[chave] = chave in resultado ? mesclar(resultado[chave], valor) : valor
    }
  }
  return resultado as T
}

let atual: Configuracoes | null = null
const ouvintes: Array<(c: Configuracoes) => void> = []

export function configuracoes(): Configuracoes {
  if (!atual) {
    const salvo = lerJson<Record<string, unknown>>('configuracoes.json', {})
    // Quem já usava o programa antes do assistente existir não precisa vê-lo
    if (Object.keys(salvo).length && !('setupConcluido' in salvo)) salvo.setupConcluido = true
    atual = mesclar(configuracoesPadrao(), salvo)
  }
  return atual
}

export function aoMudarConfiguracoes(cb: (c: Configuracoes) => void): void {
  ouvintes.push(cb)
}

// ---------- O que a interface pode mudar ----------

/** O cookies.txt que o próprio programa gera (o conteúdo fica cifrado; veja cookies.ts). */
export const arquivoCookiesDoPrograma = () => join(app.getPath('userData'), 'cookies-navegador.txt')

/** Opções que rodam programas, carregam código ou trocam executáveis: não entram pelos argumentos extras. */
const PROIBIDOS_YTDLP =
  /^(--exec(-before-download)?|--plugin-dirs|--no-plugin-dirs|--config-locations?|--ignore-config|-U|--update|--update-to|--netrc-cmd|--downloader|--external-downloader|--ffmpeg-location|--use-postprocessor|--batch-file|-a|--load-info-json|--print-to-file|--cookies-from-browser|--cookies|--alias)(=|$)/
/** No aria2: ganchos que rodam programas ao terminar e arquivos de configuração. */
const PROIBIDOS_ARIA2 = /^(--on-[\w-]+|--conf-path|--input-file|-i|--save-session|--rpc[\w-]*|--enable-rpc)(=|$)/

/** Divide uma linha de argumentos respeitando aspas (o mesmo que o motor faz ao montar o comando). */
function tokens(texto: string): string[] {
  return [...texto.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
}

function conferirArgs(texto: string, proibidos: RegExp, onde: string): void {
  const achado = tokens(texto).find((t) => proibidos.test(t))
  if (achado) throw new Error(`"${achado.split('=')[0]}" não é permitido em ${onde}: essa opção roda programas ou troca arquivos do motor.`)
}

/** Modelos de nome e pasta ficam dentro da pasta de destino: nada de caminho absoluto nem "..". */
export function conferirModelo(texto: string, onde: string): void {
  const t = texto.trim()
  if (/^([a-z]:|[\\/])/i.test(t) || t.split(/[\\/]/).some((p) => p.trim() === '..')) {
    throw new Error(`${onde} precisa ficar dentro da pasta de destino (sem "C:\\", "\\\\" nem "..").`)
  }
}

/** Pastas e arquivos que o usuário escolheu na janela do Windows (Escolher…) nesta sessão. */
const escolhidos = new Set<string>()
export function registrarEscolhido(caminho: string): void {
  escolhidos.add(caminho)
}

/**
 * Um caminho que a interface pede para usar: só vale se o usuário escolheu na janela do Windows,
 * se já estava nas configurações ou se é um dos padrões. A interface não inventa caminhos.
 */
export function caminhoPermitido(caminho: string | null | undefined, extras: string[] = []): boolean {
  if (caminho == null) return true
  const c = configuracoes()
  const p = configuracoesPadrao()
  const conhecidos = [c.pastaVideo, c.pastaAudio, c.pastaGaleria, c.padrao.pasta, c.cookies.arquivo, p.pastaVideo, p.pastaAudio, p.pastaGaleria, ...extras]
  return escolhidos.has(caminho) || conhecidos.includes(caminho)
}

function conferirCaminho(caminho: string | null | undefined, extras: string[] = []): void {
  if (!caminhoPermitido(caminho, extras)) throw new Error('Escolha a pasta ou o arquivo pelo botão "Escolher…".')
}

/**
 * Confere o que chega da interface antes de gravar: só as chaves que existem, com o mesmo tipo do padrão,
 * e sem opções que rodem programas. Protege o motor mesmo se a interface for enganada.
 */
function validar(parcial: Partial<Configuracoes>): Partial<Configuracoes> {
  const padrao = configuracoesPadrao() as unknown as Record<string, unknown>
  const limpo: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(parcial ?? {})) {
    if (!(chave in padrao)) continue
    const esperado = padrao[chave]
    const mesmoTipo = Array.isArray(esperado) ? Array.isArray(valor) : typeof valor === typeof esperado && (valor === null) === (esperado === null)
    if (!mesmoTipo) throw new Error(`Valor inválido para ${chave}.`)
    limpo[chave] = valor
  }
  const p = limpo as Partial<Configuracoes>
  if (p.canalYtdlp !== undefined && !['stable', 'nightly'].includes(p.canalYtdlp)) throw new Error('Canal do yt-dlp inválido.')
  if (p.argsExtras !== undefined) conferirArgs(p.argsExtras, PROIBIDOS_YTDLP, 'Argumentos extras')
  if (p.argsAria2 !== undefined) conferirArgs(p.argsAria2, PROIBIDOS_ARIA2, 'Argumentos do aria2')
  if (p.nomePersonalizado !== undefined) conferirModelo(p.nomePersonalizado, 'O nome personalizado')
  if (p.padrao?.subpastaPersonalizada !== undefined) conferirModelo(p.padrao.subpastaPersonalizada, 'A subpasta personalizada')
  if (p.galeriaFormatoPasta !== undefined) conferirModelo(p.galeriaFormatoPasta, 'O formato das pastas da galeria')
  for (const chave of ['pastaVideo', 'pastaAudio', 'pastaGaleria'] as const) if (p[chave] !== undefined) conferirCaminho(p[chave])
  if (p.padrao) conferirCaminho(p.padrao.pasta)
  if (p.cookies) conferirCaminho(p.cookies.arquivo || null, [arquivoCookiesDoPrograma()])
  return p
}

export function salvarConfiguracoes(parcialBruto: Partial<Configuracoes>): Configuracoes {
  const parcial = validar(parcialBruto)
  atual = mesclar(configuracoes(), parcial)
  gravarJson('configuracoes.json', atual)
  for (const cb of ouvintes) cb(atual)
  return atual
}

export function restaurarPadroes(): Configuracoes {
  // Restaurar os padrões não traz o assistente de volta (ele continua em Ajustes → Sistema)
  atual = { ...configuracoesPadrao(), setupConcluido: true }
  gravarJson('configuracoes.json', atual)
  for (const cb of ouvintes) cb(atual)
  return atual
}

// ---------- Segredos (cofre do Windows via safeStorage/DPAPI) ----------

const SEGREDOS_VAZIOS: Segredos = { usuario: '', senha: '', senhaVideo: '', token: '', cabecalhos: '', senhaProxy: '' }
const arquivoSegredos = () => join(pastaDados(), 'segredos.bin')

export function obterSegredos(): Segredos {
  const arquivo = arquivoSegredos()
  if (!existsSync(arquivo) || !safeStorage.isEncryptionAvailable()) return { ...SEGREDOS_VAZIOS }
  try {
    return { ...SEGREDOS_VAZIOS, ...JSON.parse(safeStorage.decryptString(readFileSync(arquivo))) }
  } catch {
    return { ...SEGREDOS_VAZIOS }
  }
}

/** A interface só vê o usuário e quais campos estão preenchidos (veja SegredosVisiveis). */
export function segredosVisiveis(): SegredosVisiveis {
  const s = obterSegredos()
  return {
    usuario: s.usuario,
    preenchidos: { senha: !!s.senha, senhaVideo: !!s.senhaVideo, token: !!s.token, cabecalhos: !!s.cabecalhos, senhaProxy: !!s.senhaProxy }
  }
}

/** Troca só os campos que vieram; o resto continua como estava. */
export function salvarSegredos(parcial: Partial<Segredos>): void {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre do Windows não está disponível.')
  const novos = { ...obterSegredos() }
  for (const chave of Object.keys(SEGREDOS_VAZIOS) as Array<keyof Segredos>) {
    const valor = parcial?.[chave]
    if (typeof valor === 'string') novos[chave] = valor
  }
  writeFileSync(arquivoSegredos(), safeStorage.encryptString(JSON.stringify(novos)))
}
