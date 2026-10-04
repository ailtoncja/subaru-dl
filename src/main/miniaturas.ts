// Miniaturas para a interface: imagens do disco ou da internet reduzidas para ~240 px e guardadas em cache.
// Assim a prévia da galeria não precisa decodificar centenas de fotos em tamanho original.
import { nativeImage, net } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXTENSOES_IMAGEM } from '@shared/miniatura'
import { pastaDados } from './armazenamento'

const LARGURA = 240
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

function reduzir(bytes: Buffer): Buffer | null {
  // nativeImage só lê PNG e JPEG; outros formatos (WebP, GIF…) voltam como vieram
  const img = nativeImage.createFromBuffer(bytes)
  if (img.isEmpty()) return null
  const { width } = img.getSize()
  return (width > LARGURA ? img.resize({ width: LARGURA, quality: 'good' }) : img).toJPEG(78)
}

async function gerar(chave: string, obter: () => Promise<Buffer>): Promise<Buffer | null> {
  const arquivo = join(pastaCache(), `${chave}.jpg`)
  if (existsSync(arquivo)) return readFileSync(arquivo)
  const original = await obter()
  const pequena = reduzir(original)
  if (!pequena) return original
  writeFileSync(arquivo, pequena)
  return pequena
}

function responder(bytes: Buffer | null): Response {
  if (!bytes) return new Response(null, { status: 404 })
  return new Response(new Uint8Array(bytes), { headers: { 'Cache-Control': 'max-age=86400' } })
}

/**
 * miniatura://arquivo/?c=<caminho>          → imagem do disco (só extensões de imagem)
 * miniatura://remota/?u=<url>&r=<referer>   → imagem da internet (para a prévia da galeria)
 */
export async function servirMiniatura(req: Request): Promise<Response> {
  const url = new URL(req.url)
  if (url.hostname === 'arquivo') {
    const caminho = url.searchParams.get('c') ?? ''
    if (!EXTENSOES_IMAGEM.test(caminho) || !existsSync(caminho)) return responder(null)
    const chave = createHash('sha1').update(`${caminho}|${statSync(caminho).mtimeMs}`).digest('hex')
    return responder(await umaVez(chave, () => readFileSync(caminho)))
  }
  if (url.hostname === 'remota') {
    const alvo = url.searchParams.get('u') ?? ''
    if (!/^https?:\/\//i.test(alvo)) return responder(null)
    const referer = url.searchParams.get('r') ?? ''
    const chave = createHash('sha1').update(alvo).digest('hex')
    return responder(
      await umaVez(chave, async () => {
        // Alguns sites (ex.: Pixiv) só entregam a imagem para quem diz vir do próprio site
        const resp = await net.fetch(alvo, { headers: referer ? { Referer: referer } : {} })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return Buffer.from(await resp.arrayBuffer())
      })
    )
  }
  return responder(null)
}

function umaVez(chave: string, obter: () => Buffer | Promise<Buffer>): Promise<Buffer | null> {
  let p = pendentes.get(chave)
  if (!p) {
    p = vez(() => gerar(chave, async () => obter()))
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
