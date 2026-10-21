// Cookies, login e proxy de uma execução do yt-dlp ou do gallery-dl.
// Senhas, token, cabeçalhos e o proxy com senha vão num arquivo de configuração temporário (não na linha de
// comando, que outros programas e o Registro do Windows conseguem ver), e só para os sites que o usuário listou.
// Tudo o que é criado aqui é apagado em fim().
import { randomUUID } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Configuracoes, Segredos } from '@shared/tipos'
import { pastaDados } from './armazenamento'
import { arquivoCookies, copiaTemporaria } from './cookies'

export interface Acesso {
  args: string[]
  fim: () => void
}

export function hostDe(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** "vimeo.com" vale para vimeo.com e www.vimeo.com; "*.site.com" também. */
export function hostNaLista(host: string, lista: string[]): boolean {
  return lista.some((p) => {
    const padrao = p.trim().toLowerCase().replace(/^\*\./, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return padrao && (host === padrao || host.endsWith('.' + padrao))
  })
}

export function urlProxy(c: Configuracoes, s: Segredos): string | null {
  if (!c.proxy.ativo || !c.proxy.host) return null
  const esquema = c.proxy.tipo === 'socks5' ? 'socks5' : 'http'
  const login = c.proxy.usuario ? `${encodeURIComponent(c.proxy.usuario)}${s.senhaProxy ? ':' + encodeURIComponent(s.senhaProxy) : ''}@` : ''
  return `${esquema}://${login}${c.proxy.host}${c.proxy.porta ? ':' + c.proxy.porta : ''}`
}

/** Valor entre aspas simples no formato que o yt-dlp lê (shlex): ' vira '"'"'. Sem quebras de linha. */
function aspas(v: string): string {
  return `'${v.replace(/[\r\n]+/g, ' ').replace(/'/g, `'"'"'`)}'`
}

function linhas(texto: string): string[] {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
}

export function prepararAcesso(ferramenta: 'yt-dlp' | 'gallery-dl', c: Configuracoes, s: Segredos, url: string): Acesso {
  const args: string[] = []
  const limpar: Array<() => void> = []
  const host = hostDe(url)

  // Cookies (menos nos sites da lista "não usar cookies")
  if (!hostNaLista(host, c.cookies.ignorarSites)) {
    if (c.cookies.origem === 'navegador' && c.cookies.navegador !== 'nenhum') {
      args.push('--cookies-from-browser', c.cookies.navegador + (c.cookies.perfil ? `:${c.cookies.perfil}` : ''))
    } else if (c.cookies.origem === 'arquivo' && c.cookies.arquivo) {
      if (resolve(c.cookies.arquivo) === resolve(arquivoCookies())) {
        const copia = copiaTemporaria()
        if (copia) {
          args.push('--cookies', copia.caminho)
          limpar.push(copia.fim)
        }
      } else {
        args.push('--cookies', c.cookies.arquivo)
      }
    }
  }

  // Login, token e cabeçalhos: só nos sites listados pelo usuário
  const login = hostNaLista(host, c.sitesLogin)
  const proxy = urlProxy(c, s)
  const arquivo = join(pastaDados('tmp'), `a-${randomUUID()}.${ferramenta === 'yt-dlp' ? 'conf' : 'json'}`)

  if (ferramenta === 'yt-dlp') {
    const conf: string[] = []
    if (login) {
      if (s.usuario) conf.push(`--username ${aspas(s.usuario)}`)
      if (s.senha) conf.push(`--password ${aspas(s.senha)}`)
      if (s.senhaVideo) conf.push(`--video-password ${aspas(s.senhaVideo)}`)
      if (s.token) conf.push(`--add-headers ${aspas(`Authorization:Bearer ${s.token}`)}`)
      for (const linha of linhas(s.cabecalhos)) {
        const i = linha.indexOf(':')
        if (i > 0) conf.push(`--add-headers ${aspas(`${linha.slice(0, i).trim()}:${linha.slice(i + 1).trim()}`)}`)
      }
    }
    if (proxy) conf.push(`--proxy ${aspas(proxy)}`)
    if (conf.length) {
      // A primeira linha diz a codificação: senhas com acento não viram outra coisa no Windows
      writeFileSync(arquivo, ['# coding: utf-8', ...conf].join('\n') + '\n', 'utf8')
      args.push('--config-locations', arquivo)
      limpar.push(() => rmSync(arquivo, { force: true }))
    }
  } else {
    const extrator: Record<string, string> = {}
    if (login && s.usuario) extrator.username = s.usuario
    if (login && s.senha) extrator.password = s.senha
    if (proxy) extrator.proxy = proxy
    if (Object.keys(extrator).length) {
      writeFileSync(arquivo, JSON.stringify({ extractor: extrator }), 'utf8')
      args.push('-c', arquivo)
      limpar.push(() => rmSync(arquivo, { force: true }))
    }
  }

  return {
    args,
    fim: () => {
      for (const f of limpar) {
        try {
          f()
        } catch {
          /* arquivo já apagado */
        }
      }
    }
  }
}
