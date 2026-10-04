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
  const entrada: EntradaLog = { id: proximoId++, hora: Date.now(), nivel, itemId, texto }
  entradas.push(entrada)
  if (entradas.length > MAXIMO) entradas.splice(0, entradas.length - MAXIMO)
  ouvinte?.(entrada)
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
