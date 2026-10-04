import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Configuracoes, OpcoesDownload, Segredos } from '@shared/tipos'
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
    pasta: null
  }
}

function configuracoesPadrao(): Configuracoes {
  return {
    padrao: opcoesPadrao(),
    pastaVideo: join(app.getPath('videos'), 'Subaru DL'),
    pastaAudio: join(app.getPath('music'), 'Subaru DL'),
    subpasta: 'nenhuma',
    subpastaPersonalizada: '%(uploader)s',
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
    guiaVisto: false
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
  if (!atual) atual = mesclar(configuracoesPadrao(), lerJson('configuracoes.json', {}))
  return atual
}

export function aoMudarConfiguracoes(cb: (c: Configuracoes) => void): void {
  ouvintes.push(cb)
}

export function salvarConfiguracoes(parcial: Partial<Configuracoes>): Configuracoes {
  atual = mesclar(configuracoes(), parcial)
  gravarJson('configuracoes.json', atual)
  for (const cb of ouvintes) cb(atual)
  return atual
}

export function restaurarPadroes(): Configuracoes {
  atual = configuracoesPadrao()
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

export function salvarSegredos(segredos: Segredos): void {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre do Windows não está disponível.')
  writeFileSync(arquivoSegredos(), safeStorage.encryptString(JSON.stringify(segredos)))
}
