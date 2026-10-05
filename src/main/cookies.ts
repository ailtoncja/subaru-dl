// Gera um cookies.txt a partir dos cookies do navegador (o yt-dlp lê o navegador e grava o arquivo).
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResultadoCookies } from '@shared/tipos'
import { executarAteFim } from './ferramentas'
import { logar } from './logs'

/** Sites de vídeo e imagem: com a opção "só sites de vídeo", o resto dos cookies do navegador nem sai do navegador. */
const DOMINIOS = [
  'youtube.com', 'youtu.be', 'google.com', 'googlevideo.com', 'youtube-nocookie.com',
  'instagram.com', 'cdninstagram.com', 'facebook.com', 'fb.com', 'fbcdn.net',
  'twitter.com', 'x.com', 'twimg.com', 'tiktok.com', 'tiktokv.com', 'twitch.tv',
  'reddit.com', 'redd.it', 'pixiv.net', 'vimeo.com', 'soundcloud.com', 'dailymotion.com',
  'bilibili.com', 'kick.com', 'tumblr.com', 'deviantart.com', 'patreon.com', 'nicovideo.jp',
  'pinterest.com', 'bsky.app', 'bsky.social', 'discord.com', 'danbooru.donmai.us', 'kemono.su', 'coomer.su'
]

export const arquivoCookies = () => join(app.getPath('userData'), 'cookies-navegador.txt')

function dominioDaLinha(linha: string): string {
  return (linha.split('\t')[0] ?? '').replace(/^#HttpOnly_/, '').replace(/^\./, '').toLowerCase()
}

function deSite(dominio: string): boolean {
  return DOMINIOS.some((d) => dominio === d || dominio.endsWith('.' + d))
}

function explicarErro(saida: string): string {
  if (/could not copy .* cookie database|database is locked|PermissionError|Permission denied/i.test(saida))
    return 'O navegador está com o arquivo de cookies em uso. Feche o navegador e tente de novo (o Firefox costuma funcionar aberto).'
  if (/Failed to decrypt|DPAPI|app.bound|v20|decrypt/i.test(saida))
    return 'Este navegador protege os cookies com criptografia que o programa não consegue abrir (Chrome e Edge novos). Use o Firefox, ou exporte um cookies.txt com uma extensão e escolha o arquivo.'
  if (/could not find .* (browser|profile)|No such file|not found|cookies database/i.test(saida))
    return 'Não achei esse navegador (ou esse perfil) neste computador.'
  return saida.split(/\r?\n/).filter((l) => /error/i.test(l)).pop()?.replace(/^ERROR:\s*/, '') ?? 'Não consegui ler os cookies do navegador.'
}

export async function exportarCookies(navegador: string, perfil: string, soSites: boolean): Promise<ResultadoCookies> {
  const destino = arquivoCookies()
  const bruto = join(app.getPath('temp'), `subaru-cookies-${Date.now()}.txt`)
  const falha = (erro: string): ResultadoCookies => ({ ok: false, salvos: 0, total: 0, sites: 0, arquivo: destino, erro })

  mkdirSync(app.getPath('userData'), { recursive: true })
  const origem = navegador + (perfil ? `:${perfil}` : '')
  const args = ['--color', 'never', '--cookies-from-browser', origem, '--cookies', bruto, '--skip-download', '--no-warnings', '--no-playlist', 'https://example.com/']
  logar('comando', `yt-dlp --cookies-from-browser ${origem} --cookies (arquivo temporário) …`)
  // O yt-dlp acaba reclamando que example.com não é suportado; isso não importa: ele já gravou os cookies
  const { stdout, stderr } = await executarAteFim('yt-dlp.exe', args, 90_000)
  const saida = `${stdout}\n${stderr}`

  try {
    if (!existsSync(bruto) || statSync(bruto).size === 0) {
      const erro = explicarErro(saida)
      logar('erro', `Cookies do navegador: ${erro}`)
      return falha(erro)
    }
    const linhas = readFileSync(bruto, 'utf8').split(/\r?\n/)
    const cookies = linhas.filter((l) => l.trim() && !l.startsWith('# ') && l.split('\t').length >= 7)
    const mantidos = soSites ? cookies.filter((l) => deSite(dominioDaLinha(l))) : cookies
    if (!mantidos.length) {
      const erro = soSites
        ? 'O navegador não tem cookies de nenhum site de vídeo. Entre nas suas contas nele primeiro (ou desmarque "só sites de vídeo").'
        : 'O navegador não tem cookies salvos.'
      return falha(erro)
    }
    const sites = new Set(mantidos.map(dominioDaLinha)).size
    const cabecalho = ['# Netscape HTTP Cookie File', '# Gerado pelo Subaru DL a partir do navegador. Contém logins: não compartilhe.', '']
    writeFileSync(destino, [...cabecalho, ...mantidos].join('\n') + '\n', 'utf8')
    logar('info', `Cookies do navegador: ${mantidos.length} de ${cookies.length} salvos (${sites} sites)`)
    return { ok: true, salvos: mantidos.length, total: cookies.length, sites, arquivo: destino, erro: null }
  } finally {
    rmSync(bruto, { force: true })
  }
}
