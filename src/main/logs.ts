import type { EntradaLog, NivelLog } from '@shared/tipos'

export { dicaParaErro } from '@shared/dicas'

const MAXIMO = 3000
const entradas: EntradaLog[] = []
let proximoId = 1
let ouvinte: ((e: EntradaLog) => void) | null = null

export function aoLogar(cb: (e: EntradaLog) => void): void {
  ouvinte = cb
}

export function logar(nivel: NivelLog, texto: string, itemId: string | null = null): void {
  // Algumas ferramentas (ex.: deno upgrade) mandam cores mesmo com NO_COLOR
  // e nenhuma linha leva "usuario:senha@" de um proxy ou link para o Registro
  const limpo = semLoginNaUrl(texto.replace(/\x1b\[[0-9;]*m/g, ''))
  const entrada: EntradaLog = { id: proximoId++, hora: Date.now(), nivel, itemId, texto: limpo }
  entradas.push(entrada)
  if (entradas.length > MAXIMO) entradas.splice(0, entradas.length - MAXIMO)
  ouvinte?.(entrada)
}

/** Opções cujo valor é segredo, no yt-dlp e no gallery-dl. */
const SENSIVEIS = new Set([
  '--password', '-p', '--video-password', '--add-headers', '--add-header', '--proxy', '--username', '-u',
  '--ap-password', '--ap-username', '--twofactor', '-2', '--client-certificate-password', '--geo-verification-proxy'
])

/** Tira o "usuario:senha@" de endereços (proxy, links). */
const semLoginNaUrl = (texto: string) => texto.replace(/(\b[a-z][\w+.-]*:\/\/)[^\s/@]+@/gi, '$1••••@')

/**
 * Argumentos prontos para o Registro: valores de senha, token, cabeçalho e proxy viram ••••, nas formas
 * "--opção valor" e "--opção=valor"; tokens dentro de --extractor-args (po_token, visitor_data…) também.
 */
export function mascararArgs(args: string[]): string {
  return args
    .map((arg, i) => {
      if (SENSIVEIS.has(args[i - 1])) return '••••'
      const igual = arg.match(/^(--?[\w-]+)=/)
      if (igual && SENSIVEIS.has(igual[1])) return `${igual[1]}=••••`
      let texto = semLoginNaUrl(arg)
      if (args[i - 1] === '--extractor-args') texto = texto.replace(/((?:po_token|visitor_data|data_sync_id|token)=)[^;]+/gi, '$1••••')
      return /\s|"/.test(texto) ? `"${texto.replaceAll('"', '\\"')}"` : texto
    })
    .join(' ')
}

export function todosLogs(): EntradaLog[] {
  return entradas.slice()
}

export function limparLogs(): void {
  entradas.length = 0
}

export function logsComoTexto(): string {
  return entradas
    .map((e) => `[${new Date(e.hora).toLocaleString('pt-BR')}] ${e.nivel.toUpperCase()}${e.itemId ? ` (${e.itemId})` : ''}: ${e.texto}`)
    .join('\n')
}
