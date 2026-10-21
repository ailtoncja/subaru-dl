import { app } from 'electron'
import { execFile, spawn, type SpawnOptions } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { EstadoFerramenta, NomeFerramenta } from '@shared/tipos'
import { pastaDados } from './armazenamento'
import { configuracoes } from './configuracoes'
import { logar } from './logs'

/** Onde o instalador coloca as ferramentas (somente leitura em Arquivos de Programas). */
function pastaEmbutida(): string {
  return app.isPackaged ? join(process.resourcesPath, 'bin') : join(app.getAppPath(), 'resources', 'bin')
}

/** Cópia de trabalho em %APPDATA%, onde as ferramentas podem se atualizar sozinhas. */
export function pastaBin(): string {
  return pastaDados('bin')
}

export function exe(nome: string): string {
  return join(pastaBin(), nome)
}

const ARQUIVOS: Record<NomeFerramenta, string[]> = {
  'yt-dlp': ['yt-dlp.exe'],
  deno: ['deno.exe'],
  ffmpeg: ['ffmpeg.exe', 'ffprobe.exe'],
  'gallery-dl': ['gallery-dl.exe'],
  aria2: ['aria2c.exe']
}

const DESCRICOES: Record<NomeFerramenta, string> = {
  'yt-dlp': 'Motor de download',
  deno: 'JavaScript do YouTube',
  ffmpeg: 'Juntar, converter e cortar',
  'gallery-dl': 'Galeria de imagens',
  aria2: 'Acelerador de download'
}

/** Copia para %APPDATA% as ferramentas que ainda não estão lá. */
export function prepararFerramentas(forcar = false): void {
  const origem = pastaEmbutida()
  if (!existsSync(origem)) {
    logar('aviso', `Pasta de ferramentas embutidas não encontrada: ${origem}`)
    return
  }
  for (const arquivo of Object.values(ARQUIVOS).flat()) {
    const destino = exe(arquivo)
    if ((forcar || !existsSync(destino)) && existsSync(join(origem, arquivo))) {
      copyFileSync(join(origem, arquivo), destino)
    }
  }
}

/** Ambiente dos processos filhos: ferramentas no PATH (o yt-dlp acha Deno, ffmpeg e aria2 sozinho) e saída em UTF-8. */
export function ambiente(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${pastaBin()};${process.env.PATH ?? ''}`,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
    NO_COLOR: '1'
  }
}

export function executar(arquivo: string, args: string[], opcoes: SpawnOptions = {}) {
  return spawn(exe(arquivo), args, { env: ambiente(), windowsHide: true, ...opcoes })
}

/** Roda e devolve a saída inteira. */
export function executarAteFim(arquivo: string, args: string[], timeoutMs = 120_000): Promise<{ stdout: string; stderr: string; codigo: number }> {
  return new Promise((resolve) => {
    execFile(
      exe(arquivo),
      args,
      { env: ambiente(), windowsHide: true, maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs, encoding: 'utf8' },
      (erro, stdout, stderr) => {
        const codigo = erro ? (typeof erro.code === 'number' ? erro.code : 1) : 0
        resolve({ stdout, stderr, codigo })
      }
    )
  })
}

// ---------- Estado e versões ----------

const estado = new Map<NomeFerramenta, EstadoFerramenta>()
let aoMudar: ((e: EstadoFerramenta[]) => void) | null = null

export function aoMudarFerramentas(cb: (e: EstadoFerramenta[]) => void): void {
  aoMudar = cb
}

function emitir() {
  aoMudar?.(listaFerramentas())
}

export function listaFerramentas(): EstadoFerramenta[] {
  return (Object.keys(ARQUIVOS) as NomeFerramenta[]).map(
    (nome) => estado.get(nome) ?? { nome, descricao: DESCRICOES[nome], versao: null, atualizando: false, mensagem: null }
  )
}

function atualizarEstado(nome: NomeFerramenta, mudanca: Partial<EstadoFerramenta>) {
  const anterior = listaFerramentas().find((f) => f.nome === nome)!
  estado.set(nome, { ...anterior, ...mudanca })
  emitir()
}

async function lerVersao(nome: NomeFerramenta): Promise<string | null> {
  const arquivo = ARQUIVOS[nome][0]
  if (!existsSync(exe(arquivo))) return null
  const args = nome === 'ffmpeg' ? ['-version'] : ['--version']
  const { stdout, codigo } = await executarAteFim(arquivo, args, 20_000)
  if (codigo !== 0 && !stdout) return null
  const linha = stdout.split(/\r?\n/)[0]?.trim() ?? ''
  switch (nome) {
    case 'deno':
      return linha.match(/deno ([\d.]+)/)?.[1] ?? linha
    case 'ffmpeg':
      return linha.match(/ffmpeg version (\S+)/)?.[1]?.replace(/-g[0-9a-f]+-/, ' ') ?? linha
    case 'aria2':
      return linha.match(/aria2 version ([\d.]+)/)?.[1] ?? linha
    default:
      return linha
  }
}

export async function verificarVersoes(): Promise<EstadoFerramenta[]> {
  await Promise.all(
    (Object.keys(ARQUIVOS) as NomeFerramenta[]).map(async (nome) => {
      atualizarEstado(nome, { versao: await lerVersao(nome) })
    })
  )
  return listaFerramentas()
}

// ---------- Atualizações ----------

/** O aria2 não publica versões desde a 1.37.0 (2023) nem a soma dos arquivos: ela fica fixada aqui. */
const ARIA2 = {
  url: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip',
  sha256: '67d015301eef0b612191212d564c5bb0a14b5b9c4796b76454276a4d28d9b288'
}

/** Baixa e confere a soma SHA-256 enquanto grava; se não bater, apaga e recusa. */
async function baixarArquivo(url: string, destino: string, sha256: string) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'subaru-dl' } })
  if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status} ao baixar ${url}`)
  const hash = createHash('sha256')
  const contar = new Transform({
    transform(pedaco, _cod, pronto) {
      hash.update(pedaco)
      pronto(null, pedaco)
    }
  })
  await pipeline(Readable.fromWeb(resp.body as never), contar, createWriteStream(destino))
  const obtido = hash.digest('hex')
  if (obtido !== sha256.toLowerCase()) {
    rmSync(destino, { force: true })
    throw new Error(`O arquivo baixado não confere com a soma publicada (${url}). Nada foi trocado.`)
  }
}

/** Um arquivo da versão do GitHub com a soma SHA-256 que o próprio GitHub calculou ao publicar. */
async function assetDoGithub(repo: string, versao: string, padrao: RegExp): Promise<{ url: string; sha256: string }> {
  const caminho = versao === 'latest' ? 'releases/latest' : `releases/tags/${versao}`
  const resp = await fetch(`https://api.github.com/repos/${repo}/${caminho}`, {
    headers: { 'User-Agent': 'subaru-dl', Accept: 'application/vnd.github+json' }
  })
  if (!resp.ok) throw new Error(`GitHub respondeu ${resp.status}`)
  const release = (await resp.json()) as { assets: { name: string; browser_download_url: string; digest?: string | null }[] }
  const asset = release.assets.find((a) => padrao.test(a.name))
  if (!asset) throw new Error(`Arquivo não encontrado na última versão de ${repo}`)
  const sha256 = asset.digest?.match(/^sha256:([0-9a-f]{64})$/i)?.[1]
  if (!sha256) throw new Error(`A versão de ${repo} não tem soma para conferir; a atualização foi cancelada.`)
  if (!asset.browser_download_url.startsWith(`https://github.com/${repo}/releases/download/`)) throw new Error('Endereço de download inesperado.')
  return { url: asset.browser_download_url, sha256 }
}

function acharArquivo(dir: string, nome: string): string | null {
  for (const item of readdirSync(dir)) {
    const caminho = join(dir, item)
    if (statSync(caminho).isDirectory()) {
      const achado = acharArquivo(caminho, nome)
      if (achado) return achado
    } else if (item.toLowerCase() === nome) return caminho
  }
  return null
}

async function instalarDeZip({ url, sha256 }: { url: string; sha256: string }, arquivos: string[]) {
  const temp = pastaDados('temp', `zip-${Date.now()}`)
  try {
    const zip = join(temp, 'pacote.zip')
    await baixarArquivo(url, zip, sha256)
    const extraido = join(temp, 'x')
    mkdirSync(extraido)
    const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    await new Promise<void>((resolve, reject) =>
      execFile(tar, ['-xf', zip, '-C', extraido], { windowsHide: true }, (e) => (e ? reject(e) : resolve()))
    )
    for (const nome of arquivos) {
      const origem = acharArquivo(extraido, nome)
      if (!origem) throw new Error(`${nome} não veio no pacote`)
      substituir(origem, exe(nome))
    }
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

/** Troca o executável mesmo que ele esteja aberto (o Windows deixa renomear um .exe em uso). */
function substituir(origem: string, destino: string) {
  if (existsSync(destino)) {
    const antigo = destino + '.old'
    rmSync(antigo, { force: true })
    renameSync(destino, antigo)
  }
  renameSync(origem, destino)
}

async function atualizarPorDownload(nome: NomeFerramenta) {
  switch (nome) {
    case 'ffmpeg':
      return instalarDeZip(await assetDoGithub('yt-dlp/FFmpeg-Builds', 'latest', /^ffmpeg-master-latest-win64-gpl\.zip$/), ARQUIVOS.ffmpeg)
    case 'aria2':
      return instalarDeZip(ARIA2, ARQUIVOS.aria2)
    case 'gallery-dl': {
      const temp = join(pastaDados('temp'), 'gallery-dl.exe')
      const { url, sha256 } = await assetDoGithub('gdl-org/builds', 'latest', /^gallery-dl_windows\.exe$/)
      await baixarArquivo(url, temp, sha256)
      return substituir(temp, exe('gallery-dl.exe'))
    }
    default:
      throw new Error(`Sem atualização por download para ${nome}`)
  }
}

export async function atualizarFerramenta(nome: NomeFerramenta): Promise<void> {
  const antes = listaFerramentas().find((f) => f.nome === nome)?.versao
  atualizarEstado(nome, { atualizando: true, mensagem: 'Atualizando…' })
  logar('info', `Atualizando ${nome}…`)
  try {
    if (nome === 'yt-dlp') {
      const canal = configuracoes().canalYtdlp
      const r = await executarAteFim('yt-dlp.exe', ['--update-to', canal], 300_000)
      logar(r.codigo === 0 ? 'info' : 'erro', (r.stdout + r.stderr).trim())
      if (r.codigo !== 0) throw new Error(r.stderr.trim().split('\n').pop() || 'falha ao atualizar')
    } else if (nome === 'deno') {
      const r = await executarAteFim('deno.exe', ['upgrade'], 300_000)
      logar(r.codigo === 0 ? 'info' : 'erro', (r.stdout + r.stderr).trim())
      if (r.codigo !== 0) throw new Error(r.stderr.trim().split('\n').pop() || 'falha ao atualizar')
    } else {
      await atualizarPorDownload(nome)
    }
    const depois = await lerVersao(nome)
    const mensagem = depois && depois !== antes ? `Atualizado para ${depois}` : 'Já está na versão mais recente'
    atualizarEstado(nome, { versao: depois, atualizando: false, mensagem })
    logar('info', `${nome}: ${mensagem}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    atualizarEstado(nome, { atualizando: false, mensagem: `Erro: ${msg}` })
    logar('erro', `Falha ao atualizar ${nome}: ${msg}`)
  }
}

/** Ao abrir o app: atualiza em segundo plano o que mais quebra (yt-dlp e Deno). */
export async function atualizacaoAutomatica(): Promise<void> {
  if (!configuracoes().atualizarFerramentas) return
  await atualizarFerramenta('yt-dlp')
  await atualizarFerramenta('deno')
}

export async function alvosImpersonar(): Promise<string[]> {
  const { stdout } = await executarAteFim('yt-dlp.exe', ['--list-impersonate-targets'], 60_000)
  // Linhas como "Chrome-133      Macos-15     curl_cffi": oferece a família ("chrome") e a versão exata.
  const familias = new Set<string>()
  const exatos: string[] = []
  for (const linha of stdout.split(/\r?\n/)) {
    const m = linha.match(/^([A-Za-z]+)(-[\d.]+)?\s+\S+\s+curl_cffi/)
    if (!m || linha.includes('unavailable')) continue
    familias.add(m[1].toLowerCase())
    if (m[2]) exatos.push(m[1].toLowerCase() + m[2])
  }
  return [...familias, ...exatos]
}
