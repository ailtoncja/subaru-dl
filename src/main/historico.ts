import { existsSync } from 'node:fs'
import type { Duplicado, EntradaHistorico, ItemFila } from '@shared/tipos'
import { gravadorAdiado, lerJson } from './armazenamento'

let entradas: EntradaHistorico[] | null = null
const gravador = gravadorAdiado('historico.json', 500)

function todas(): EntradaHistorico[] {
  if (!entradas) entradas = lerJson<EntradaHistorico[]>('historico.json', [])
  return entradas
}

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

function chaveDaEntrada(e: EntradaHistorico): string {
  return e.site.toLowerCase() === 'youtube' ? `youtube:${e.idMidia}` : chaveDoLink(e.url)
}

export function procurarDuplicados(urls: string[]): Map<string, Duplicado> {
  const porChave = new Map<string, EntradaHistorico>()
  for (const e of todas()) porChave.set(chaveDaEntrada(e), e)
  const achados = new Map<string, Duplicado>()
  for (const url of urls) {
    const e = porChave.get(chaveDoLink(url))
    if (e) {
      achados.set(url, {
        url,
        titulo: e.titulo,
        baixadoEm: e.baixadoEm,
        arquivoExiste: e.arquivos.some((a) => existsSync(a))
      })
    }
  }
  return achados
}

export function registrarDownload(item: ItemFila): void {
  if (!item.info) return
  const lista = todas()
  const entrada: EntradaHistorico = {
    idMidia: item.info.id,
    site: item.info.site,
    url: item.info.urlPagina || item.url,
    titulo: item.info.titulo,
    arquivos: item.arquivos,
    baixadoEm: Date.now()
  }
  const i = lista.findIndex((e) => chaveDaEntrada(e) === chaveDaEntrada(entrada))
  if (i >= 0) lista.splice(i, 1)
  lista.push(entrada)
  gravador.agendar(lista)
}

export function salvarHistoricoAgora(): void {
  gravador.descarregar()
}
