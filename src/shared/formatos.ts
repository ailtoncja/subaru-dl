import type { Formato, InfoMidia, OpcoesDownload } from './tipos'

export const QUALIDADES: Array<{ valor: OpcoesDownload['qualidade']; nome: string; curto: string }> = [
  { valor: 'melhor', nome: 'Melhor disponível', curto: 'Melhor' },
  { valor: '4320', nome: '8K Ultra HD', curto: '8K' },
  { valor: '2160', nome: '4K Ultra HD', curto: '4K' },
  { valor: '1440', nome: '2K Quad HD', curto: '2K' },
  { valor: '1080', nome: 'Full HD 1080p', curto: '1080p' },
  { valor: '720', nome: 'HD 720p', curto: '720p' },
  { valor: '480', nome: 'SD 480p', curto: '480p' },
  { valor: '360', nome: 'Baixa 360p', curto: '360p' }
]

export const FORMATOS_AUDIO: Array<{ valor: OpcoesDownload['formatoAudio']; nome: string; semPerda?: boolean }> = [
  { valor: 'mp3', nome: 'MP3' },
  { valor: 'm4a', nome: 'M4A' },
  { valor: 'opus', nome: 'Opus' },
  { valor: 'aac', nome: 'AAC' },
  { valor: 'ogg', nome: 'OGG' },
  { valor: 'wav', nome: 'WAV', semPerda: true },
  { valor: 'flac', nome: 'FLAC', semPerda: true }
]

export const BITRATES = [0, 320, 256, 192, 160, 128, 96]

export const temVideo = (f: Formato) => !!f.vcodec && f.vcodec !== 'none'
export const temAudio = (f: Formato) => !!f.acodec && f.acodec !== 'none'

const PREFIXO_CODEC: Record<string, string> = { h264: 'avc', vp9: 'vp', av1: 'av01', aac: 'mp4a', opus: 'opus' }

function bateCodec(codec: string | null, preferido: string): boolean {
  if (preferido === 'auto' || !codec) return false
  return codec.toLowerCase().startsWith(PREFIXO_CODEC[preferido] ?? preferido)
}

// Mesma ordem de preferência padrão do yt-dlp (maior = melhor)
const ORDEM_VCODEC = ['avc', 'h264', 'hev', 'hvc', 'vp09', 'vp9', 'av01']
const ORDEM_ACODEC = ['mp3', 'mp4a', 'aac', 'vorbis', 'opus']

function pesoCodec(codec: string | null, ordem: string[]): number {
  const c = (codec ?? '').toLowerCase()
  let peso = -1
  ordem.forEach((prefixo, i) => {
    if (c.startsWith(prefixo)) peso = i
  })
  return peso
}

/** Download direto (https) antes de HLS/DASH, como o yt-dlp faz. */
const pesoProtocolo = (f: Formato) => (!f.protocolo || /^https?$/.test(f.protocolo) ? 1 : 0)

function tamanhoDe(f: Formato, duracao: number | null): number | null {
  if (f.tamanho) return f.tamanho
  if (f.tbr && duracao) return (f.tbr * 1000 * duracao) / 8
  return null
}

/** Imita a escolha do yt-dlp para estimar o tamanho antes de baixar (item 17). */
export function escolherFormatos(info: InfoMidia, o: OpcoesDownload): { video: Formato | null; audio: Formato | null } {
  const formatos = info.formatos
  if (o.formatoId) {
    const f = formatos.find((x) => x.id === o.formatoId) ?? null
    if (!f) return { video: null, audio: null }
    if (temVideo(f) && !temAudio(f) && o.modo === 'video') return { video: f, audio: melhorAudio(formatos, o) }
    return temVideo(f) ? { video: f, audio: null } : { video: null, audio: f }
  }
  const audio = melhorAudio(formatos, o)
  if (o.modo === 'audio') return { video: null, audio }

  const limite = o.qualidade === 'melhor' ? Infinity : Number(o.qualidade)
  let candidatos = formatos.filter((f) => temVideo(f) && (f.altura ?? 0) <= limite && (!o.ate30fps || (f.fps ?? 0) <= 30))
  if (!candidatos.length) candidatos = formatos.filter(temVideo)
  const codec = o.container === 'webm' && o.codecVideo === 'h264' ? 'vp9' : o.codecVideo
  candidatos.sort(
    (a, b) =>
      (b.altura ?? 0) - (a.altura ?? 0) ||
      (b.fps ?? 0) - (a.fps ?? 0) ||
      Number(bateCodec(b.vcodec, codec)) - Number(bateCodec(a.vcodec, codec)) ||
      pesoCodec(b.vcodec, ORDEM_VCODEC) - pesoCodec(a.vcodec, ORDEM_VCODEC) ||
      pesoProtocolo(b) - pesoProtocolo(a) ||
      (b.tbr ?? 0) - (a.tbr ?? 0)
  )
  const video = candidatos[0] ?? null
  return { video, audio: video && temAudio(video) ? null : audio }
}

function melhorAudio(formatos: Formato[], o: OpcoesDownload): Formato | null {
  let candidatos = formatos.filter((f) => temAudio(f) && !temVideo(f))
  if (o.idiomaAudio) {
    const doIdioma = candidatos.filter((f) => f.idioma?.startsWith(o.idiomaAudio!))
    if (doIdioma.length) candidatos = doIdioma
  }
  if (!candidatos.length) candidatos = formatos.filter(temAudio)
  // Faixas "-drc" (volume comprimido) e dubladas ficam atrás da original, como no yt-dlp
  const secundaria = (f: Formato) => Number(/-drc$/.test(f.id) || /dubbed|descriptive/i.test(f.nota ?? ''))
  candidatos.sort(
    (a, b) =>
      Number(bateCodec(b.acodec, o.codecAudio)) - Number(bateCodec(a.acodec, o.codecAudio)) ||
      secundaria(a) - secundaria(b) ||
      pesoCodec(b.acodec, ORDEM_ACODEC) - pesoCodec(a.acodec, ORDEM_ACODEC) ||
      pesoProtocolo(b) - pesoProtocolo(a) ||
      (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0)
  )
  return candidatos[0] ?? null
}

export function estimarTamanho(info: InfoMidia | null, o: OpcoesDownload): { bytes: number; aproximado: boolean } | null {
  if (!info || !info.formatos.length) return null
  const { video, audio } = escolherFormatos(info, o)
  let duracao = info.duracao
  if (o.trecho && duracao) duracao = Math.max(0, Math.min(o.trecho.fim, duracao) - o.trecho.inicio)

  // Áudio convertido: o tamanho final depende do bitrate escolhido
  if (o.modo === 'audio' && !o.manterOriginal && duracao) {
    const kbps = o.formatoAudio === 'wav' ? 1411 : o.formatoAudio === 'flac' ? 900 : o.bitrateAudio || (audio?.abr ?? 160)
    return { bytes: (kbps * 1000 * duracao) / 8, aproximado: true }
  }

  let total = 0
  let aproximado = !!o.trecho
  for (const f of [video, audio]) {
    if (!f) continue
    const t = tamanhoDe(f, info.duracao)
    if (t == null) return null
    total += o.trecho && info.duracao ? (t * (duracao ?? 0)) / info.duracao : t
    aproximado ||= f.aproximado || !f.tamanho
  }
  return total ? { bytes: total, aproximado } : null
}

/** Bitrate médio aproximado (vídeo, em kbps) de cada qualidade, para estimar listas sem os formatos de cada vídeo. */
const KBPS_QUALIDADE: Record<string, number> = { '4320': 30000, '2160': 12000, '1440': 6000, '1080': 2500, '720': 1300, '480': 700, '360': 400 }

/**
 * Estimativa grosseira pelo tempo total (playlists e canais: o site não diz o tamanho de cada vídeo antes de baixar).
 * Em "A melhor", conta como 1080p. null quando não dá para estimar (manter o original, formato escolhido à mão).
 */
export function estimarPorDuracao(segundos: number, o: OpcoesDownload): number | null {
  if (!segundos || o.manterOriginal) return null
  if (o.modo === 'audio') {
    const kbps = o.formatoAudio === 'wav' ? 1411 : o.formatoAudio === 'flac' ? 900 : o.bitrateAudio || 160
    return (kbps * 1000 * segundos) / 8
  }
  if (o.formatoId) return null
  const kbps = KBPS_QUALIDADE[o.qualidade === 'melhor' ? '1080' : o.qualidade] ?? 2500
  return ((kbps + 128) * 1000 * segundos) / 8
}

/** Descrição curta de um formato da lista (item 11). */
export function descreverFormato(f: Formato): string {
  const partes: string[] = []
  if (temVideo(f)) {
    partes.push(f.altura ? `${f.altura}p${f.fps && f.fps > 30 ? Math.round(f.fps) : ''}` : (f.resolucao ?? 'vídeo'))
    partes.push(codecCurto(f.vcodec))
    if (temAudio(f)) partes.push('+ áudio')
  } else {
    partes.push(`áudio ${f.abr ? Math.round(f.abr) + 'k' : ''}`.trim())
    partes.push(codecCurto(f.acodec))
    if (f.idioma) partes.push(f.idioma)
  }
  partes.push(f.ext)
  return partes.filter(Boolean).join(' · ')
}

export function codecCurto(c: string | null): string {
  if (!c || c === 'none') return ''
  const l = c.toLowerCase()
  if (l.startsWith('avc') || l.startsWith('h264')) return 'H.264'
  if (l.startsWith('hev') || l.startsWith('hvc') || l.startsWith('h265')) return 'H.265'
  if (l.startsWith('vp09') || l === 'vp9') return 'VP9'
  if (l.startsWith('vp8')) return 'VP8'
  if (l.startsWith('av01')) return 'AV1'
  if (l.startsWith('mp4a')) return 'AAC'
  if (l.startsWith('opus')) return 'Opus'
  if (l.startsWith('vorbis')) return 'Vorbis'
  if (l.startsWith('mp3')) return 'MP3'
  if (l.startsWith('ac-3') || l.startsWith('ec-3')) return 'Dolby'
  return c.split('.')[0]
}
