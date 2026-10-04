// Monta os argumentos do yt-dlp a partir das opções da interface e lê as informações dos links.
import type {
  Capitulo,
  Configuracoes,
  EntradaPlaylist,
  FiltrosBusca,
  Formato,
  InfoMidia,
  ItemFila,
  OpcoesDownload,
  ResultadoBusca,
  Segredos
} from '@shared/tipos'
import { executarAteFim, pastaBin } from './ferramentas'
import { logar } from './logs'

/** Marcadores que o motor procura na saída do yt-dlp. */
export const MARCA_PROGRESSO = 'SUBARU_P '
export const MARCA_POS = 'SUBARU_PP '
export const MARCA_ARQUIVO = 'SUBARU_ARQ '

/** Divide uma linha de argumentos respeitando aspas: `-x "a b"` → ['-x', 'a b'] */
export function dividirArgs(texto: string): string[] {
  const args: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) args.push(m[1] ?? m[2] ?? m[3])
  return args
}

function linhas(texto: string): string[] {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

// ---------- Rede, login e cookies (usado tanto para ler informações quanto para baixar) ----------

export function argsRede(c: Configuracoes, s: Segredos, url: string, extrasExtrator: string[] = []): string[] {
  const a: string[] = []

  // Cookies (itens 58, 59, 60)
  const host = hostDe(url)
  const ignorar = c.cookies.ignorarSites.some((p) => {
    const padrao = p.trim().toLowerCase().replace(/^\*\./, '')
    return padrao && (host === padrao || host.endsWith('.' + padrao))
  })
  if (!ignorar) {
    if (c.cookies.origem === 'navegador' && c.cookies.navegador !== 'nenhum') {
      a.push('--cookies-from-browser', c.cookies.navegador + (c.cookies.perfil ? `:${c.cookies.perfil}` : ''))
    } else if (c.cookies.origem === 'arquivo' && c.cookies.arquivo) {
      a.push('--cookies', c.cookies.arquivo)
    }
  }

  // Login e cabeçalhos (item 61)
  if (s.usuario) a.push('--username', s.usuario)
  if (s.senha) a.push('--password', s.senha)
  if (s.senhaVideo) a.push('--video-password', s.senhaVideo)
  if (s.token) a.push('--add-headers', `Authorization:Bearer ${s.token}`)
  for (const linha of linhas(s.cabecalhos)) {
    const i = linha.indexOf(':')
    if (i > 0) a.push('--add-headers', `${linha.slice(0, i).trim()}:${linha.slice(i + 1).trim()}`)
  }

  // Proxy (item 62)
  if (c.proxy.ativo && c.proxy.host) {
    const esquema = c.proxy.tipo === 'socks5' ? 'socks5' : 'http'
    const login = c.proxy.usuario
      ? `${encodeURIComponent(c.proxy.usuario)}${s.senhaProxy ? ':' + encodeURIComponent(s.senhaProxy) : ''}@`
      : ''
    a.push('--proxy', `${esquema}://${login}${c.proxy.host}${c.proxy.porta ? ':' + c.proxy.porta : ''}`)
  }

  // Se passar por um navegador (item 63)
  if (c.impersonar) a.push('--impersonate', c.impersonar === 'qualquer' ? '' : c.impersonar)

  // Argumentos de extrator, agrupados por site (item 64) + player.js real (item 65)
  const porExtrator = new Map<string, string[]>()
  const extrator = [...linhas(c.extractorArgs), ...extrasExtrator]
  if (c.playerJsReal) extrator.push('youtube:player_js_version=actual')
  for (const linha of extrator) {
    const i = linha.indexOf(':')
    if (i <= 0) continue
    const chave = linha.slice(0, i).trim().toLowerCase()
    porExtrator.set(chave, [...(porExtrator.get(chave) ?? []), linha.slice(i + 1).trim()])
  }
  for (const [chave, valores] of porExtrator) a.push('--extractor-args', `${chave}:${valores.join(';')}`)

  return a
}

/** Opções comuns a todas as chamadas. */
function argsBase(c: Configuracoes): string[] {
  const a = ['--color', 'never', '--ffmpeg-location', pastaBin()]
  if (c.preferirVideoEmPlaylist) a.push('--no-playlist')
  return a
}

// ---------- Seleção de formato (categoria B) ----------

const SORT_CODEC: Record<string, string> = { h264: 'vcodec:h264', vp9: 'vcodec:vp9', av1: 'vcodec:av01', aac: 'acodec:aac', opus: 'acodec:opus' }

function argsFormato(o: OpcoesDownload, info: InfoMidia | null): string[] {
  const a: string[] = []
  const audioIdioma = o.idiomaAudio ? `ba[language^=${o.idiomaAudio}]/ba` : 'ba'

  if (o.modo === 'audio') {
    a.push('-f', o.formatoId ?? `${audioIdioma}/b`)
    if (!o.manterOriginal) {
      a.push('-x', '--audio-format', o.formatoAudio)
      if (o.formatoAudio !== 'wav' && o.formatoAudio !== 'flac') {
        a.push('--audio-quality', o.bitrateAudio ? `${o.bitrateAudio}K` : '0')
      }
    }
    const sort = SORT_CODEC[o.codecAudio]
    if (sort && !o.formatoId) a.push('-S', sort)
    return a
  }

  // WebM só aceita VP9/AV1 + Opus: ajusta o codec para o arquivo sair válido
  const webm = o.container === 'webm' && !o.manterOriginal
  const codecVideo = webm && o.codecVideo === 'h264' ? 'vp9' : o.codecVideo
  const codecAudio = webm ? 'opus' : o.codecAudio

  if (o.formatoId) {
    const escolhido = info?.formatos.find((f) => f.id === o.formatoId)
    const soVideo = escolhido && escolhido.acodec === 'none'
    a.push('-f', soVideo ? `${o.formatoId}+${audioIdioma}/${o.formatoId}` : o.formatoId)
  } else {
    const filtro = `${o.qualidade === 'melhor' ? '' : `[height<=${o.qualidade}]`}${o.ate30fps ? '[fps<=30]' : ''}`
    // Se não existir na qualidade pedida, pega a mais próxima abaixo; em último caso, a pior disponível
    a.push('-f', `bv*${filtro}+${audioIdioma}/b${filtro}/wv*+ba/w`)
    const sort = [SORT_CODEC[codecVideo], SORT_CODEC[codecAudio]].filter(Boolean)
    if (sort.length) a.push('-S', sort.join(','))
  }

  if (!o.manterOriginal) a.push('--merge-output-format', o.container, '--remux-video', o.container)
  return a
}

// ---------- Pastas e nomes (categoria I) ----------

const CAMPOS_NOME: Record<string, string> = {
  data: '%(upload_date>%Y-%m-%d)s',
  views: '%(view_count)s views',
  canal: '%(channel,uploader|)s',
  duracao: '%(duration_string)s',
  resolucao: '%(resolution)s',
  id: '%(id)s'
}

function modeloSaida(c: Configuracoes, o: OpcoesDownload, ehPlaylist: boolean): string {
  const audio = o.modo === 'audio'
  let pasta = ''
  switch (c.subpasta) {
    case 'playlist':
      pasta = ehPlaylist ? '%(playlist_title,playlist)s/' : ''
      break
    case 'canal':
      pasta = '%(channel,uploader|Desconhecido)s/'
      break
    case 'canal-playlist':
      pasta = '%(channel,uploader|Desconhecido)s/' + (ehPlaylist ? '%(playlist_title,playlist)s/' : '')
      break
    case 'ano-mes':
      pasta = '%(upload_date>%Y|Sem data)s/%(upload_date>%m|)s/'
      break
    case 'artista-album':
      pasta = '%(artist,creator,uploader|Desconhecido)s/%(album|Sem álbum)s/'
      break
    case 'personalizado':
      pasta = c.subpastaPersonalizada.trim().replace(/[\\/]+$/, '') + '/'
      break
  }

  const qualidade = audio ? (o.bitrateAudio ? `(${o.bitrateAudio}k)` : '(%(abr)dk)') : '(%(height)sp%(fps)s)'
  const indice = o.ordemInvertida ? '%(n_entries+1-playlist_index)03d' : '%(playlist_index)03d'
  let nome: string
  switch (c.nome) {
    case 'titulo-qualidade':
      nome = `%(title)s-${qualidade}`
      break
    case 'playlist-titulo-qualidade':
      nome = `${ehPlaylist ? indice + '-' : ''}%(title)s-${qualidade}`
      break
    case 'personalizado':
      nome = c.nomePersonalizado.trim() || '%(title)s'
      break
    default:
      nome = '%(title)s'
  }

  const prefixos = c.camposNoNome.map((campo) => `[${CAMPOS_NOME[campo]}]`).join(' ')
  if (prefixos) nome = `${prefixos} ${nome}`
  if (ehPlaylist && c.numerarPlaylist && !nome.includes('playlist_index')) nome = `${indice} - ${nome}`
  return `${pasta}${nome}.%(ext)s`
}

// ---------- Download completo ----------

export function argsDownload(item: ItemFila, c: Configuracoes, s: Segredos): string[] {
  const o = item.opcoes
  const info = item.info
  const ehPlaylist = !!info?.playlist
  const pasta = o.pasta ?? (o.modo === 'audio' ? c.pastaAudio : c.pastaVideo)
  const a: string[] = [
    ...argsBase(c),
    '--newline',
    '--progress',
    '--no-quiet',
    '--no-mtime',
    '--progress-template',
    `download:${MARCA_PROGRESSO}%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(info.playlist_index)s|%(info.n_entries)s|%(info.vcodec)s|%(progress.fragment_index)s|%(progress.fragment_count)s`,
    '--progress-template',
    `postprocess:${MARCA_POS}%(progress.status)s|%(progress.postprocessor)s|%(info.playlist_index)s`,
    '--print',
    `after_move:${MARCA_ARQUIVO}%(filepath)s`,
    '-P',
    `home:${pasta}`,
    '-o',
    modeloSaida(c, o, ehPlaylist),
    ...argsFormato(o, info)
  ]

  if (c.nomesSeguros) a.push('--restrict-filenames')

  // Trechos e capítulos (categoria E)
  if (o.trecho) a.push('--download-sections', `*${o.trecho.inicio}-${o.trecho.fim}`)
  for (const titulo of o.capitulos) {
    a.push('--download-sections', `^${titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  }
  if (o.separarCapitulos) {
    a.push('--split-chapters', '-o', 'chapter:%(title)s/%(section_number)02d - %(section_title)s.%(ext)s')
  }
  if (o.cortePreciso && (o.trecho || o.capitulos.length)) a.push('--force-keyframes-at-cuts')

  // Live (item 39)
  if (o.liveDoInicio && info?.aoVivo) a.push('--live-from-start')

  // Legendas (categoria G)
  if (o.legendas.ativas && o.modo === 'video') {
    // Com --embed-subs o yt-dlp baixa a legenda e apaga o arquivo depois de embutir;
    // --write-subs junto faria ele manter o .srt ao lado do vídeo
    if (!o.legendas.embutir) a.push('--write-subs')
    if (o.legendas.automaticas) a.push('--write-auto-subs')
    const idiomas = o.legendas.todas ? 'all,-live_chat' : o.legendas.idiomas.join(',')
    if (idiomas) a.push('--sub-langs', idiomas)
    a.push('--sub-format', `${o.legendas.formato}/best`)
    if (['srt', 'vtt', 'ass'].includes(o.legendas.formato)) a.push('--convert-subs', o.legendas.formato)
    if (o.legendas.embutir) a.push('--embed-subs')
  }

  // Pós-processamento (categoria H)
  if (o.embutirMetadados) a.push('--embed-metadata')
  const aceitaCapa = o.modo === 'audio' ? o.formatoAudio !== 'wav' : o.container !== 'webm' || o.manterOriginal
  if (o.embutirCapa && aceitaCapa) a.push('--embed-thumbnail')
  if (o.salvarMiniatura) a.push('--write-thumbnail')
  if (o.embutirCapa || o.salvarMiniatura) a.push('--convert-thumbnails', 'jpg')

  if (o.modo === 'video' && !o.manterOriginal) {
    switch (o.posProcesso) {
      case 'fps30':
        a.push('--recode-video', o.container, '--postprocessor-args', 'VideoConvertor:-r 30')
        break
      case 'mp42':
        if (o.container === 'mp4') {
          a.push('--postprocessor-args', 'Merger+ffmpeg_o:-brand mp42')
          a.push('--postprocessor-args', 'VideoRemuxer+ffmpeg_o:-brand mp42')
        }
        break
      case 'personalizado':
        if (o.posProcessoArgs.trim()) {
          const recodificar = o.posProcessoModo === 'recodificar'
          a.push(recodificar ? '--recode-video' : '--remux-video', o.container)
          a.push('--postprocessor-args', `${recodificar ? 'VideoConvertor' : 'VideoRemuxer'}+ffmpeg_o:${o.posProcessoArgs.trim()}`)
        }
        break
    }
  }

  // Playlist (categoria D)
  if (ehPlaylist) {
    if (o.itensPlaylist.trim()) a.push('-I', o.itensPlaylist.trim())
    else if (o.limitePlaylist > 0) a.push('-I', `:${o.limitePlaylist}`)
    if (o.ordemInvertida) a.push('--playlist-reverse')
  }

  // Filtros de entrada (categoria J)
  const f = c.filtros
  if (f.tamanhoMin.trim()) a.push('--min-filesize', f.tamanhoMin.trim())
  if (f.tamanhoMax.trim()) a.push('--max-filesize', f.tamanhoMax.trim())
  if (f.dataModo !== 'desligado' && f.data) {
    const data = f.data.replaceAll('-', '')
    a.push(f.dataModo === 'exata' ? '--date' : f.dataModo === 'antes' ? '--datebefore' : '--dateafter', data)
  }
  for (const filtro of linhas(f.matchFilters)) a.push('--match-filters', filtro)
  for (const filtro of linhas(f.breakMatchFilters)) a.push('--break-match-filters', filtro)

  // Aria2 (item 28)
  if (c.usarAria2) {
    a.push('--downloader', 'aria2c')
    if (c.argsAria2.trim()) a.push('--downloader-args', `aria2c:${c.argsAria2.trim()}`)
  }

  // Nova tentativa depois de um 403 no YouTube: troca o cliente usado para pedir os formatos
  const extras: string[] = []
  if (item.tentativa > 0 && /403/.test(item.erro ?? '') && /youtu\.?be/i.test(item.url)) {
    const clientes = ['tv', 'web_safari', 'mweb']
    extras.push(`youtube:player_client=${clientes[(item.tentativa - 1) % clientes.length]}`)
  }
  a.push(...argsRede(c, s, item.url, extras))
  if (c.argsExtras.trim()) a.push(...dividirArgs(c.argsExtras))
  a.push('--', item.url)
  return a
}

/** Esconde senhas e tokens antes de mostrar o comando nos logs. */
export function comandoParaLog(args: string[]): string {
  const sensiveis = new Set(['--password', '--video-password', '--add-headers', '--proxy', '--username'])
  return (
    'yt-dlp ' +
    args
      .map((arg, i) => (sensiveis.has(args[i - 1]) ? '••••' : /\s|"/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg))
      .join(' ')
  )
}

// ---------- Informações do link ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
function lerFormato(f: any): Formato {
  return {
    id: String(f.format_id),
    ext: f.ext ?? '',
    resolucao: f.resolution ?? null,
    altura: f.height ?? null,
    fps: f.fps ?? null,
    vcodec: f.vcodec ?? null,
    acodec: f.acodec ?? null,
    tamanho: f.filesize ?? f.filesize_approx ?? null,
    aproximado: !f.filesize,
    tbr: f.tbr ?? null,
    abr: f.abr ?? null,
    idioma: f.language ?? null,
    nota: f.format_note ?? null,
    protocolo: f.protocol ?? null
  }
}

/** "YoutubeTab" → "YouTube", "TwitchVod" → "Twitch"… */
function nomeSite(chave: string): string {
  const base = chave.replace(/(Tab|Playlist|Vod|Clips?|Live|User|Channel|Post|Video|Search(URL)?)$/i, '') || chave
  const NOMES: Record<string, string> = { youtube: 'YouTube', tiktok: 'TikTok', twitch: 'Twitch', instagram: 'Instagram', twitter: 'X/Twitter', facebook: 'Facebook', vimeo: 'Vimeo', soundcloud: 'SoundCloud', reddit: 'Reddit', kick: 'Kick', bilibili: 'Bilibili', dailymotion: 'Dailymotion' }
  return NOMES[base.toLowerCase()] ?? base
}

function lerInfo(d: any): InfoMidia {
  const ehPlaylist = d._type === 'playlist' || Array.isArray(d.entries)
  const formatos: Formato[] = (d.formats ?? [])
    .filter((f: any) => f.format_id && !/storyboard|mhtml/i.test(f.format_note ?? '') && f.ext !== 'mhtml')
    .map(lerFormato)
  const idiomasAudio = [...new Set(formatos.filter((f) => f.vcodec === 'none' && f.idioma).map((f) => f.idioma!))]
  const capitulos: Capitulo[] = (d.chapters ?? []).map((c: any) => ({
    titulo: c.title ?? '',
    inicio: c.start_time ?? 0,
    fim: c.end_time ?? 0
  }))
  const entradas: EntradaPlaylist[] = ehPlaylist
    ? (d.entries ?? []).filter(Boolean).map((e: any, i: number) => ({
        indice: e.playlist_index ?? i + 1,
        id: e.id ?? String(i),
        titulo: e.title ?? e.id ?? `Item ${i + 1}`,
        duracao: e.duration ?? null,
        url: e.url ?? e.webpage_url ?? ''
      }))
    : []
  // Em playlists e canais, a capa do primeiro vídeo fica melhor que o banner do canal
  const capaEntrada = (e: any) => e?.thumbnails?.[e.thumbnails.length - 1]?.url ?? e?.thumbnail ?? null
  const miniatura = ehPlaylist
    ? (capaEntrada(d.entries?.find(Boolean)) ?? d.thumbnail ?? null)
    : (d.thumbnail ?? capaEntrada(d))

  return {
    id: String(d.id ?? ''),
    titulo: d.title ?? d.id ?? 'Sem título',
    canal: d.channel ?? d.uploader ?? null,
    site: nomeSite(d.extractor_key ?? d.extractor ?? ''),
    urlPagina: d.webpage_url ?? d.original_url ?? '',
    miniatura,
    duracao: d.duration ?? (ehPlaylist ? entradas.reduce((t, e) => t + (e.duracao ?? 0), 0) || null : null),
    dataUpload: d.upload_date ?? null,
    views: d.view_count ?? null,
    likes: d.like_count ?? null,
    descricao: d.description ?? null,
    aoVivo: d.is_live === true || d.live_status === 'is_live',
    formatos,
    legendas: Object.keys(d.subtitles ?? {}).filter((k) => k !== 'live_chat'),
    legendasAuto: Object.keys(d.automatic_captions ?? {}).filter((k) => !k.includes('-') || k.endsWith('-orig')),
    idiomasAudio,
    capitulos,
    playlist: ehPlaylist ? { titulo: d.title ?? 'Playlist', total: d.playlist_count ?? entradas.length, entradas } : null
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class ErroYtdlp extends Error {}

export async function buscarInfo(url: string, c: Configuracoes, s: Segredos, itemId: string): Promise<InfoMidia> {
  const args = [...argsBase(c), '-J', '--flat-playlist', ...argsRede(c, s, url), '--', url]
  logar('comando', comandoParaLog(args), itemId)
  const { stdout, stderr, codigo } = await executarAteFim('yt-dlp.exe', args, 180_000)
  for (const linha of stderr.split(/\r?\n/)) {
    if (linha.startsWith('WARNING')) logar('aviso', linha, itemId)
  }
  if (codigo !== 0 || !stdout.trim()) {
    const erro = stderr.split(/\r?\n/).filter((l) => l.startsWith('ERROR')).pop() ?? stderr.trim().split('\n').pop() ?? 'Falha ao ler o link'
    logar('erro', erro, itemId)
    throw new ErroYtdlp(erro.replace(/^ERROR:\s*/, ''))
  }
  return lerInfo(JSON.parse(stdout))
}

// ---------- Busca no YouTube (item 6) ----------

// O filtro da busca do YouTube é um protobuf em base64 no parâmetro "sp".
function varint(n: number): number[] {
  const out: number[] = []
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  out.push(n)
  return out
}
const campo = (numero: number, valor: number) => [...varint((numero << 3) | 0), ...varint(valor)]

function parametroFiltro(f: FiltrosBusca): string | null {
  const ORDEM = { relevancia: 0, avaliacao: 1, data: 2, views: 3 }
  const DATA = { qualquer: 0, hoje: 2, semana: 3, mes: 4, ano: 5 }
  const DURACAO = { qualquer: 0, curto: 1, longo: 2, medio: 3 }
  const RECURSO = { hd: 4, legendas: 5, cc: 6, '3d': 7, aoVivo: 8, '4k': 14, '360': 15, hdr: 25, vr180: 26 }

  const filtros: number[] = [...campo(2, 1)] // tipo: vídeo
  if (DATA[f.data]) filtros.push(...campo(1, DATA[f.data]))
  if (DURACAO[f.duracao]) filtros.push(...campo(3, DURACAO[f.duracao]))
  for (const r of f.recursos) filtros.push(...campo(RECURSO[r], 1))

  const msg: number[] = []
  if (ORDEM[f.ordem]) msg.push(...campo(1, ORDEM[f.ordem]))
  msg.push(...varint((2 << 3) | 2), ...varint(filtros.length), ...filtros)
  return Buffer.from(msg).toString('base64')
}

export async function buscarNoYoutube(termo: string, f: FiltrosBusca, limite: number, c: Configuracoes, s: Segredos): Promise<ResultadoBusca[]> {
  const sp = parametroFiltro(f)
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}${sp ? `&sp=${encodeURIComponent(sp)}` : ''}`
  const args = ['--color', 'never', '-J', '--flat-playlist', '-I', `:${limite}`, ...argsRede(c, s, url), '--', url]
  logar('comando', comandoParaLog(args))
  const { stdout, stderr, codigo } = await executarAteFim('yt-dlp.exe', args, 120_000)
  if (codigo !== 0 || !stdout.trim()) throw new ErroYtdlp(stderr.trim().split('\n').pop() || 'A busca falhou')
  const d = JSON.parse(stdout)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (d.entries ?? [])
    .filter((e: any) => e && e.id && (e.ie_key === 'Youtube' || /watch\?v=|shorts\//.test(e.url ?? '')))
    .map((e: any) => ({
      id: e.id,
      url: e.url?.startsWith('http') ? e.url : `https://www.youtube.com/watch?v=${e.id}`,
      titulo: e.title ?? e.id,
      canal: e.channel ?? e.uploader ?? null,
      duracao: e.duration ?? null,
      views: e.view_count ?? null,
      miniatura: e.thumbnails?.[e.thumbnails.length - 1]?.url ?? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`
    }))
}
