// Biblioteca: tudo o que já foi baixado (categoria L). Também serve para detectar duplicados (item 8).
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, renameSync, statSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { shell } from 'electron'
import type { Biblioteca, Colecao, Duplicado, ItemBiblioteca, ItemFila, MidiaBaixada } from '@shared/tipos'
import { gravadorAdiado, lerJson } from './armazenamento'
import { configuracoes } from './configuracoes'
import { ambiente, exe } from './ferramentas'
import { logar } from './logs'

let dados: Biblioteca | null = null
const gravador = gravadorAdiado('biblioteca.json', 500)
let aoMudar: ((b: Biblioteca) => void) | null = null

/** Versão antiga (fase 1) guardava só um histórico simples. */
interface EntradaHistoricoAntiga {
  idMidia: string
  site: string
  url: string
  titulo: string
  arquivos: string[]
  baixadoEm: number
}

function novoId(prefixo: string): string {
  return `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function biblioteca(): Biblioteca {
  if (dados) return dados
  dados = lerJson<Biblioteca | null>('biblioteca.json', null)
  if (!dados) {
    const antigo = lerJson<EntradaHistoricoAntiga[]>('historico.json', [])
    dados = {
      colecoes: [],
      itens: antigo.map((e) => ({
        id: novoId('b'),
        idMidia: e.idMidia,
        site: e.site,
        url: e.url,
        titulo: e.titulo,
        canal: null,
        duracao: null,
        miniatura: null,
        dataUpload: null,
        views: null,
        likes: null,
        modo: /\.(mp3|m4a|opus|aac|ogg|wav|flac)$/i.test(e.arquivos[0] ?? '') ? 'audio' : 'video',
        formato: extname(e.arquivos[0] ?? '').slice(1),
        qualidade: null,
        arquivos: e.arquivos,
        tamanho: tamanhoDe(e.arquivos),
        baixadoEm: e.baixadoEm,
        playlist: null,
        tags: [],
        colecoes: []
      }))
    }
  }
  return dados
}

function tamanhoDe(arquivos: string[]): number {
  return arquivos.reduce((t, a) => {
    try {
      return t + statSync(a).size
    } catch {
      return t
    }
  }, 0)
}

function mudou() {
  gravador.agendar(biblioteca())
  aoMudar?.(listarBiblioteca())
}

export function aoMudarBiblioteca(cb: (b: Biblioteca) => void): void {
  aoMudar = cb
}

export function salvarBibliotecaAgora(): void {
  gravador.descarregar()
}

/** Lista com a informação de arquivo existente (item 69). */
export function listarBiblioteca(): Biblioteca {
  const b = biblioteca()
  return {
    colecoes: b.colecoes,
    itens: b.itens.map((i) => ({ ...i, arquivoExiste: i.arquivos.some((a) => existsSync(a)) }))
  }
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

function chaveDoItem(i: Pick<ItemBiblioteca, 'site' | 'idMidia' | 'url'>): string {
  // Partes de um arquivo dividido não contam como a mídia original
  if (i.idMidia.includes('#parte')) return `parte:${i.idMidia}`
  return i.site.toLowerCase() === 'youtube' && i.idMidia ? `youtube:${i.idMidia}` : chaveDoLink(i.url)
}

export function procurarDuplicados(urls: string[]): Map<string, Duplicado> {
  const porChave = new Map<string, ItemBiblioteca>()
  for (const i of biblioteca().itens) porChave.set(chaveDoItem(i), i)
  const achados = new Map<string, Duplicado>()
  for (const url of urls) {
    const i = porChave.get(chaveDoLink(url))
    if (i) {
      achados.set(url, { url, titulo: i.titulo, baixadoEm: i.baixadoEm, arquivoExiste: i.arquivos.some((a) => existsSync(a)) })
    }
  }
  return achados
}

// ---------- Registrar downloads ----------

function colecaoPorNome(nome: string): Colecao {
  const b = biblioteca()
  const existente = b.colecoes.find((c) => c.nome.toLowerCase() === nome.toLowerCase())
  if (existente) return existente
  const nova = { id: novoId('c'), nome, criadaEm: Date.now() }
  b.colecoes.push(nova)
  return nova
}

function qualidadeDe(m: MidiaBaixada, item: ItemFila): string | null {
  if (item.opcoes.modo === 'audio') {
    if (item.opcoes.bitrateAudio && !item.opcoes.manterOriginal) return `${item.opcoes.bitrateAudio}k`
    return m.abr ? `${Math.round(m.abr)}k` : null
  }
  if (!m.altura) return null
  return `${m.altura}p${m.fps && m.fps > 30 ? Math.round(m.fps) : ''}`
}

export function registrarDownload(item: ItemFila): void {
  if (item.opcoes.somenteInfo) return
  const b = biblioteca()
  // Sem os dados por arquivo (não deveria acontecer), usa a informação do link
  const midias: MidiaBaixada[] = item.midias.length
    ? item.midias
    : item.arquivos.map((arquivo) => ({
        idMidia: item.info?.id ?? '',
        titulo: item.info?.titulo ?? basename(arquivo),
        canal: item.info?.canal ?? null,
        site: item.info?.site ?? '',
        url: item.info?.urlPagina || item.url,
        duracao: item.info?.duracao ?? null,
        altura: null,
        fps: null,
        abr: null,
        ext: extname(arquivo).slice(1),
        arquivo,
        miniatura: item.info?.miniatura ?? null,
        dataUpload: item.info?.dataUpload ?? null,
        playlist: item.info?.playlist?.titulo ?? null,
        views: item.info?.views ?? null,
        likes: item.info?.likes ?? null
      }))

  const colecao = midias.some((m) => m.playlist) && configuracoes().colecoesAutomaticas ? colecaoPorNome(midias.find((m) => m.playlist)!.playlist!) : null

  for (const m of midias) {
    const novo: ItemBiblioteca = {
      id: novoId('b'),
      idMidia: m.idMidia,
      site: m.site,
      url: m.url,
      titulo: m.titulo,
      canal: m.canal,
      duracao: m.duracao,
      miniatura: m.miniatura,
      dataUpload: m.dataUpload,
      views: m.views,
      likes: m.likes,
      modo: item.opcoes.modo,
      formato: extname(m.arquivo).slice(1) || m.ext,
      qualidade: qualidadeDe(m, item),
      arquivos: [m.arquivo],
      tamanho: tamanhoDe([m.arquivo]),
      baixadoEm: Date.now(),
      playlist: m.playlist,
      tags: [],
      colecoes: colecao ? [colecao.id] : []
    }
    // Baixou de novo a mesma mídia no mesmo formato: substitui a entrada antiga
    const i = b.itens.findIndex((x) => chaveDoItem(x) === chaveDoItem(novo) && x.formato === novo.formato && x.modo === novo.modo)
    if (i >= 0) {
      novo.tags = b.itens[i].tags
      novo.colecoes = [...new Set([...b.itens[i].colecoes, ...novo.colecoes])]
      b.itens.splice(i, 1)
    }
    b.itens.push(novo)
  }
  mudou()
}

// ---------- Edição ----------

function achar(id: string): ItemBiblioteca {
  const i = biblioteca().itens.find((x) => x.id === id)
  if (!i) throw new Error('Item não encontrado na biblioteca')
  return i
}

export function etiquetar(id: string, tags: string[], colecoes: string[]): void {
  const i = achar(id)
  i.tags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))]
  i.colecoes = colecoes.filter((c) => biblioteca().colecoes.some((x) => x.id === c))
  mudou()
}

export function renomearNaBiblioteca(id: string, novoNome: string): { ok: boolean; erro?: string } {
  const i = achar(id)
  const arquivo = i.arquivos[0]
  if (!arquivo || !existsSync(arquivo)) return { ok: false, erro: 'O arquivo não existe mais' }
  const limpo = novoNome.trim().replace(/[<>:"/\\|?*]/g, '_')
  if (!limpo) return { ok: false, erro: 'Nome vazio' }
  const destino = join(dirname(arquivo), limpo + extname(arquivo))
  if (destino === arquivo) return { ok: true }
  if (existsSync(destino)) return { ok: false, erro: 'Já existe um arquivo com esse nome' }
  try {
    renameSync(arquivo, destino)
    i.arquivos = [destino, ...i.arquivos.slice(1)]
    mudou()
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

/** Remove da biblioteca e, se pedido, manda os arquivos para a Lixeira (item 68). */
export async function excluirDaBiblioteca(ids: string[], apagarArquivos: boolean): Promise<number> {
  const b = biblioteca()
  let falhas = 0
  for (const id of ids) {
    const i = b.itens.find((x) => x.id === id)
    if (!i) continue
    if (apagarArquivos) {
      for (const a of i.arquivos) {
        if (!existsSync(a)) continue
        try {
          await shell.trashItem(a)
        } catch (e) {
          falhas++
          logar('erro', `Não foi possível mandar para a Lixeira: ${a} (${e instanceof Error ? e.message : e})`)
        }
      }
    }
  }
  b.itens = b.itens.filter((x) => !ids.includes(x.id))
  mudou()
  return falhas
}

export function removerSemArquivo(): number {
  const b = biblioteca()
  const antes = b.itens.length
  b.itens = b.itens.filter((i) => i.arquivos.some((a) => existsSync(a)))
  mudou()
  return antes - b.itens.length
}

// ---------- Coleções (item 67) ----------

export function criarColecao(nome: string): Colecao {
  const c = colecaoPorNome(nome.trim() || 'Nova coleção')
  mudou()
  return c
}

export function renomearColecao(id: string, nome: string): void {
  const c = biblioteca().colecoes.find((x) => x.id === id)
  if (c && nome.trim()) c.nome = nome.trim()
  mudou()
}

export function excluirColecao(id: string): void {
  const b = biblioteca()
  b.colecoes = b.colecoes.filter((c) => c.id !== id)
  for (const i of b.itens) i.colecoes = i.colecoes.filter((c) => c !== id)
  mudou()
}

// ---------- Dividir em partes (item 70) ----------

function duracaoDoArquivo(arquivo: string): Promise<number | null> {
  return new Promise((resolve) =>
    execFile(
      exe('ffprobe.exe'),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arquivo],
      { env: ambiente(), windowsHide: true },
      (erro, stdout) => resolve(erro ? null : Number(stdout.trim()) || null)
    )
  )
}

export async function duracaoNaBiblioteca(id: string): Promise<number | null> {
  const i = achar(id)
  if (!i.arquivos[0] || !existsSync(i.arquivos[0])) return i.duracao
  return (await duracaoDoArquivo(i.arquivos[0])) ?? i.duracao
}

/** Corta sem recodificar (rápido), nos quadros-chave mais próximos dos pontos pedidos. */
export async function dividirArquivo(id: string, cortes: number[], apagarOriginal: boolean): Promise<{ ok: boolean; partes?: number; erro?: string }> {
  const i = achar(id)
  const arquivo = i.arquivos[0]
  if (!arquivo || !existsSync(arquivo)) return { ok: false, erro: 'O arquivo não existe mais' }
  const pontos = [...new Set(cortes.filter((c) => c > 0))].sort((a, b) => a - b)
  if (!pontos.length) return { ok: false, erro: 'Nenhum ponto de corte' }

  const ext = extname(arquivo)
  const base = basename(arquivo, ext)
  const pasta = dirname(arquivo)
  const prefixo = `${base} - parte `
  const args = [
    '-hide_banner', '-y', '-i', arquivo,
    // "V" maiúsculo ignora a capa embutida, que quebraria a divisão
    '-map', '0:V?', '-map', '0:a?', '-c', 'copy',
    '-f', 'segment', '-segment_times', pontos.join(','), '-segment_start_number', '1', '-reset_timestamps', '1',
    join(pasta, `${prefixo}%03d${ext}`)
  ]
  logar('comando', `ffmpeg ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`)
  const erro = await new Promise<string | null>((resolve) =>
    execFile(exe('ffmpeg.exe'), args, { env: ambiente(), windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (e, _out, stderr) =>
      resolve(e ? stderr.trim().split('\n').pop() || e.message : null)
    )
  )
  if (erro) {
    logar('erro', `Falha ao dividir: ${erro}`)
    return { ok: false, erro }
  }

  const partes = readdirSync(pasta)
    .filter((n) => n.startsWith(prefixo) && n.endsWith(ext))
    .sort()
    .map((n) => join(pasta, n))
  const b = biblioteca()
  const posicao = b.itens.indexOf(i)
  const total = (await duracaoDoArquivo(arquivo)) ?? i.duracao
  const limites = [0, ...pontos, total ?? 0]
  const agora = Date.now()
  const novos: ItemBiblioteca[] = partes.map((p, n) => ({
    ...i,
    id: novoId('b'),
    titulo: `Parte ${n + 1} · ${i.titulo}`,
    arquivos: [p],
    tamanho: tamanhoDe([p]),
    duracao: total ? Math.max(0, limites[n + 1] - limites[n]) : null,
    // Milissegundos diferentes mantêm as partes em ordem na lista
    baixadoEm: agora - n,
    idMidia: `${i.idMidia}#parte${n + 1}`
  }))
  b.itens.splice(posicao + 1, 0, ...novos)

  if (apagarOriginal) {
    try {
      await shell.trashItem(arquivo)
      b.itens = b.itens.filter((x) => x.id !== id)
    } catch (e) {
      logar('aviso', `As partes foram criadas, mas o original não foi para a Lixeira: ${e instanceof Error ? e.message : e}`)
    }
  }
  mudou()
  logar('info', `Dividido em ${partes.length} partes: ${base}`)
  return { ok: true, partes: partes.length }
}
