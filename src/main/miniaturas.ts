// Miniaturas para a interface: imagens do disco ou da internet reduzidas para ~240 px e guardadas em cache.
// Assim a prévia da galeria não precisa decodificar centenas de fotos em tamanho original.
import { nativeImage, net } from 'electron'
import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isIP } from 'node:net'
import { join } from 'node:path'
import { EXTENSOES_IMAGEM } from '@shared/miniatura'
import { pastaDados } from './armazenamento'
import { ehAmostra } from './galeria'

/** Larguras pedidas pela interface: a das linhas e a das prévias maiores. */
const LARGURAS = [240, 480]
/** Uma capa nunca passa disso; acima, é corte (protege a memória do motor). */
const MAXIMO_BYTES = 15 * 1024 * 1024
const TEMPO_MS = 15_000
const SIMULTANEAS = 4
const DIAS_NO_CACHE = 14

const pastaCache = () => pastaDados('cache', 'miniaturas')

// Limita quantas imagens são baixadas/reduzidas ao mesmo tempo
let emAndamento = 0
const esperando: Array<() => void> = []
async function vez<T>(fn: () => Promise<T>): Promise<T> {
  if (emAndamento >= SIMULTANEAS) await new Promise<void>((r) => esperando.push(r))
  emAndamento++
  try {
    return await fn()
  } finally {
    emAndamento--
    esperando.shift()?.()
  }
}

/** Mesma imagem pedida várias vezes ao mesmo tempo: processa uma vez só. */
const pendentes = new Map<string, Promise<Buffer | null>>()

function reduzir(bytes: Buffer, largura: number): Buffer | null {
  // nativeImage só lê PNG e JPEG; outros formatos (WebP, GIF…) voltam como vieram
  const img = nativeImage.createFromBuffer(bytes)
  if (img.isEmpty()) return null
  const { width } = img.getSize()
  return (width > largura ? img.resize({ width: largura, quality: 'good' }) : img).toJPEG(78)
}

async function gerar(chave: string, largura: number, obter: () => Promise<Buffer>): Promise<Buffer | null> {
  const arquivo = join(pastaCache(), `${chave}.jpg`)
  if (existsSync(arquivo)) return readFileSync(arquivo)
  const original = await obter()
  const pequena = reduzir(original, largura)
  if (!pequena) return original
  writeFileSync(arquivo, pequena)
  return pequena
}

function responder(bytes: Buffer | null): Response {
  if (!bytes) return new Response(null, { status: 404 })
  return new Response(new Uint8Array(bytes), { headers: { 'Cache-Control': 'max-age=86400' } })
}

/** Endereços da própria máquina ou da rede local: uma capa vinda de um site nunca é buscada lá. */
function ipInterno(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return ipInterno(v.slice(7))
    return v === '::1' || v === '::' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v)
  }
  return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|22[4-9]\.|2[3-5]\d\.)/.test(ip)
}

async function hostPublico(url: string): Promise<boolean> {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '')
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost')) return false
    const enderecos = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
    return enderecos.length > 0 && enderecos.every((e) => !ipInterno(e.address))
  } catch {
    return false
  }
}

/** Baixa a imagem com limite de tempo e de tamanho, e só se o site disser que é imagem. */
async function baixarImagem(inicial: string, referer: string): Promise<Buffer> {
  // Segue até 3 redirecionamentos, conferindo cada destino (um site não leva o pedido para a rede local)
  let alvo = inicial
  let resp: Response | null = null
  for (let salto = 0; salto <= 3; salto++) {
    if (!/^https?:\/\//i.test(alvo) || !(await hostPublico(alvo))) throw new Error('endereço interno')
    // Alguns sites (ex.: Pixiv) só entregam a imagem para quem diz vir do próprio site
    resp = await net.fetch(alvo, { headers: referer ? { Referer: referer } : {}, signal: AbortSignal.timeout(TEMPO_MS), redirect: 'manual' })
    const proximo = resp.status >= 300 && resp.status < 400 ? resp.headers.get('location') : null
    if (!proximo) break
    alvo = new URL(proximo, alvo).toString()
    resp = null
  }
  if (!resp || !resp.ok || !resp.body) throw new Error(`HTTP ${resp?.status ?? 'redirecionamentos demais'}`)
  if (!/^image\//i.test(resp.headers.get('content-type') ?? '')) throw new Error('não é imagem')
  if (Number(resp.headers.get('content-length') ?? 0) > MAXIMO_BYTES) throw new Error('grande demais')
  const partes: Buffer[] = []
  let total = 0
  const leitor = resp.body.getReader()
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > MAXIMO_BYTES) {
      await leitor.cancel()
      throw new Error('grande demais')
    }
    partes.push(Buffer.from(value))
  }
  return Buffer.concat(partes)
}

/**
 * miniatura://arquivo/?c=<caminho>               → imagem do disco: só as últimas baixadas pela galeria
 * miniatura://remota/?u=<url>&r=<referer>&w=480 → imagem da internet (capas e prévia da galeria)
 */
export async function servirMiniatura(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const largura = LARGURAS.includes(Number(url.searchParams.get('w'))) ? Number(url.searchParams.get('w')) : LARGURAS[0]
  if (url.hostname === 'arquivo') {
    const caminho = url.searchParams.get('c') ?? ''
    if (!EXTENSOES_IMAGEM.test(caminho) || /^[\\/]{2}/.test(caminho) || !ehAmostra(caminho) || !existsSync(caminho)) return responder(null)
    const chave = createHash('sha1').update(`${caminho}|${statSync(caminho).mtimeMs}|${largura}`).digest('hex')
    return responder(await umaVez(chave, largura, () => readFileSync(caminho)))
  }
  if (url.hostname === 'remota') {
    const alvo = url.searchParams.get('u') ?? ''
    if (!/^https?:\/\//i.test(alvo)) return responder(null)
    const referer = url.searchParams.get('r') ?? ''
    const chave = createHash('sha1').update(`${alvo}|${largura}`).digest('hex')
    return responder(await umaVez(chave, largura, () => baixarImagem(alvo, referer)))
  }
  return responder(null)
}

function umaVez(chave: string, largura: number, obter: () => Buffer | Promise<Buffer>): Promise<Buffer | null> {
  let p = pendentes.get(chave)
  if (!p) {
    p = vez(() => gerar(chave, largura, async () => obter()))
      .catch(() => null)
      .finally(() => pendentes.delete(chave))
    pendentes.set(chave, p)
  }
  return p
}

/** Ao abrir o app: apaga miniaturas antigas do cache. */
export function limparCacheAntigo(): void {
  const limite = Date.now() - DIAS_NO_CACHE * 86_400_000
  try {
    for (const nome of readdirSync(pastaCache())) {
      const arquivo = join(pastaCache(), nome)
      if (statSync(arquivo).mtimeMs < limite) rmSync(arquivo, { force: true })
    }
  } catch {
    /* cache vazio ou inacessível: sem problema */
  }
}
