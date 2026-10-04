import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function pastaDados(...partes: string[]): string {
  const pasta = join(app.getPath('userData'), ...partes)
  mkdirSync(pasta, { recursive: true })
  return pasta
}

export function lerJson<T>(nome: string, padrao: T): T {
  const arquivo = join(pastaDados(), nome)
  if (!existsSync(arquivo)) return padrao
  try {
    return JSON.parse(readFileSync(arquivo, 'utf8')) as T
  } catch {
    return padrao
  }
}

/** Grava em um arquivo temporário e renomeia, para não corromper o JSON se o app fechar no meio. */
export function gravarJson(nome: string, dados: unknown): void {
  const arquivo = join(pastaDados(), nome)
  const temp = arquivo + '.tmp'
  writeFileSync(temp, JSON.stringify(dados, null, 2), 'utf8')
  renameSync(temp, arquivo)
}

/** Agrupa gravações frequentes (ex.: progresso da fila) em uma a cada `ms`. */
export function gravadorAdiado(nome: string, ms = 1000) {
  let timer: NodeJS.Timeout | null = null
  let pendente: unknown
  const descarregar = () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (pendente !== undefined) gravarJson(nome, pendente)
    pendente = undefined
  }
  return {
    agendar(dados: unknown) {
      pendente = dados
      if (!timer) timer = setTimeout(descarregar, ms)
    },
    descarregar
  }
}
