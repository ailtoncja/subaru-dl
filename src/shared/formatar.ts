export function bytes(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < unidades.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : n >= 100 ? 0 : 1).replace('.', ',')} ${unidades[i]}`
}

export function velocidade(n: number | null | undefined): string {
  return n == null ? '—' : `${bytes(n)}/s`
}

/** 3725 → "1:02:05" */
export function duracao(segundos: number | null | undefined): string {
  if (segundos == null || !isFinite(segundos)) return '—'
  const s = Math.round(segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`
}

/** "1:02:05", "62:05", "125" ou "1h2m5s" → segundos. null se inválido. */
export function lerTempo(texto: string): number | null {
  const t = texto.trim()
  if (!t) return null
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t)
  const partes = t.split(':')
  if (partes.length > 1 && partes.every((p) => /^\d+(\.\d+)?$/.test(p))) {
    return partes.reduce((total, p) => total * 60 + Number(p), 0)
  }
  const m = t.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/i)
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return null
}

export function numero(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('pt-BR')
}

export function numeroCurto(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace('.', ',')} bi`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} mi`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace('.', ',')} mil`
  return String(n)
}

/** "20050424" → "24/04/2005" */
export function dataUpload(d: string | null | undefined): string {
  if (!d || d.length !== 8) return '—'
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
}

export function tempoRelativo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}

const NOMES_IDIOMA: Record<string, string> = {
  pt: 'Português', 'pt-BR': 'Português (Brasil)', 'pt-PT': 'Português (Portugal)', en: 'Inglês', es: 'Espanhol',
  fr: 'Francês', de: 'Alemão', it: 'Italiano', ja: 'Japonês', ko: 'Coreano', zh: 'Chinês', 'zh-Hans': 'Chinês (simplificado)',
  'zh-Hant': 'Chinês (tradicional)', ru: 'Russo', ar: 'Árabe', hi: 'Hindi', tr: 'Turco', pl: 'Polonês', nl: 'Holandês',
  id: 'Indonésio', th: 'Tailandês', vi: 'Vietnamita', uk: 'Ucraniano', sv: 'Sueco'
}

export function nomeIdioma(codigo: string): string {
  const base = codigo.replace(/-orig$/, '')
  const nome = NOMES_IDIOMA[base] ?? NOMES_IDIOMA[base.split('-')[0]]
  const original = codigo.endsWith('-orig') ? ' (original)' : ''
  return nome ? `${nome}${original} · ${base}` : codigo
}
