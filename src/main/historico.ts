// Histórico do que já foi baixado: alimenta Downloads → Concluídos e a detecção de duplicados (item 8).
import { existsSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import type { Duplicado, EntradaHistorico, ItemFila, MidiaBaixada } from '@shared/tipos'
import { gravadorAdiado, lerJson } from './armazenamento'

let entradas: EntradaHistorico[] | null = null
const gravador = gravadorAdiado('historico.json', 500)
let aoMudar: ((h: EntradaHistorico[]) => void) | null = null

/** Formatos antigos (biblioteca da v0.2 e histórico da v0.1) viram entradas novas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function converterAntigo(e: any): EntradaHistorico[] {
  const arquivos: string[] = e.arquivos ?? (e.arquivo ? [e.arquivo] : [])
  return arquivos.map((arquivo, n) => ({
    id: `${e.id ?? 'h' + Date.now().toString(36)}${n ? `-${n}` : ''}`,
    idMidia: e.idMidia ?? '',
    site: e.site ?? '',
    url: e.url ?? '',
    titulo: e.titulo ?? basename(arquivo),
    canal: e.canal ?? null,
    duracao: e.duracao ?? null,
    miniatura: e.miniatura ?? null,
    modo: e.modo ?? (/\.(mp3|m4a|opus|aac|ogg|wav|flac)$/i.test(arquivo) ? 'audio' : 'video'),
    formato: e.formato ?? extname(arquivo).slice(1),
    qualidade: e.qualidade ?? null,
    arquivo,
    tamanho: e.tamanho ?? tamanhoDe(arquivo),
    baixadoEm: e.baixadoEm ?? Date.now()
  }))
}

function todas(): EntradaHistorico[] {
  if (entradas) return entradas
  const salvo = lerJson<unknown[]>('historico.json', [])
  const biblioteca = lerJson<{ itens?: unknown[] } | null>('biblioteca.json', null)
  const brutas = salvo.length ? salvo : (biblioteca?.itens ?? [])
  entradas = brutas.flatMap((e) => ((e as EntradaHistorico).arquivo ? [e as EntradaHistorico] : converterAntigo(e)))
  return entradas
}

function tamanhoDe(arquivo: string): number {
  try {
    return statSync(arquivo).size
  } catch {
    return 0
  }
}

function mudou() {
  gravador.agendar(todas())
  aoMudar?.(listarHistorico())
}

export function aoMudarHistorico(cb: (h: EntradaHistorico[]) => void): void {
  aoMudar = cb
}

export function salvarHistoricoAgora(): void {
  gravador.descarregar()
}

/** Mais recentes primeiro, com a informação de arquivo existente. */
export function listarHistorico(): EntradaHistorico[] {
  return [...todas()].reverse().map((e) => ({ ...e, arquivoExiste: existsSync(e.arquivo) }))
}

// ---------- Duplicados ----------

const ID_YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i

/** Mesma mídia → mesma chave, mesmo com links diferentes (youtu.be, &t=, utm…). */
export function chaveDoLink(url: string): string {
  const yt = url.match(ID_YOUTUBE)
  if (yt) return `youtube:${yt[1]}`
  try {
    const u = new URL(url)
    for (const p of [...u.searchParams.keys()]) if (/^(utm_|si$|feature$|t$)/.test(p)) u.searchParams.delete(p)
    u.hash = ''
    return u.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

function chaveDaEntrada(e: Pick<EntradaHistorico, 'site' | 'idMidia' | 'url'>): string {
  return e.site.toLowerCase() === 'youtube' && e.idMidia ? `youtube:${e.idMidia}` : chaveDoLink(e.url)
}

export function procurarDuplicados(urls: string[]): Map<string, Duplicado> {
  const porChave = new Map<string, EntradaHistorico>()
  for (const e of todas()) porChave.set(chaveDaEntrada(e), e)
  const achados = new Map<string, Duplicado>()
  for (const url of urls) {
    const e = porChave.get(chaveDoLink(url))
    if (e) achados.set(url, { url, titulo: e.titulo, baixadoEm: e.baixadoEm, arquivoExiste: existsSync(e.arquivo) })
  }
  return achados
}

// ---------- Registrar ----------

function qualidadeDe(m: MidiaBaixada, item: ItemFila): string | null {
  if (item.opcoes.modo === 'audio') {
    if (item.opcoes.bitrateAudio && !item.opcoes.manterOriginal) return `${item.opcoes.bitrateAudio}k`
    return m.abr ? `${Math.round(m.abr)}k` : null
  }
  if (!m.altura) return null
  return `${m.altura}p${m.fps && m.fps > 30 ? Math.round(m.fps) : ''}`
}

export function registrarDownload(item: ItemFila): void {
  const lista = todas()
  for (const m of item.midias) {
    const nova: EntradaHistorico = {
      id: `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      idMidia: m.idMidia,
      site: m.site,
      url: m.url || item.url,
      titulo: m.titulo,
      canal: m.canal,
      duracao: m.duracao,
      miniatura: m.miniatura,
      modo: item.opcoes.modo,
      formato: extname(m.arquivo).slice(1) || m.ext,
      qualidade: qualidadeDe(m, item),
      arquivo: m.arquivo,
      tamanho: tamanhoDe(m.arquivo),
      baixadoEm: Date.now()
    }
    // A mesma mídia baixada de novo no mesmo formato substitui a entrada antiga
    const i = lista.findIndex((e) => chaveDaEntrada(e) === chaveDaEntrada(nova) && e.formato === nova.formato)
    if (i >= 0) lista.splice(i, 1)
    lista.push(nova)
  }
  mudou()
}

export function removerDoHistorico(ids: string[]): void {
  entradas = todas().filter((e) => !ids.includes(e.id))
  mudou()
}

export function limparHistorico(): void {
  entradas = []
  mudou()
}
