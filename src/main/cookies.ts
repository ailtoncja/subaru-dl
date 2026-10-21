// Cookies do programa: gerados a partir do navegador ou importados de um cookies.txt.
// Ficam cifrados com o cofre do Windows (safeStorage/DPAPI); o yt-dlp e o gallery-dl recebem uma cópia
// temporária só enquanto rodam, apagada no fim (veja acesso.ts).
import { app, safeStorage, shell } from 'electron'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Navegador, ResultadoCookies } from '@shared/tipos'
import { pastaDados } from './armazenamento'
import { arquivoCookiesDoPrograma } from './configuracoes'
import { executarAteFim } from './ferramentas'
import { logar } from './logs'

/** ProgId do navegador que abre links https no Windows → o navegador que o yt-dlp conhece */
const PROGIDS: Array<[RegExp, Navegador]> = [
  [/^FirefoxURL/i, 'firefox'],
  [/^MSEdgeHTM/i, 'edge'],
  [/^ChromeHTML/i, 'chrome'],
  [/^BraveHTML/i, 'brave'],
  [/^Opera/i, 'opera'],
  [/^VivaldiHTM/i, 'vivaldi'],
  [/^ChromiumHTM/i, 'chromium']
]

/** Programas do Windows pelo caminho completo (um reg.exe ou taskkill.exe na pasta atual não passa na frente). */
export const programaDoSistema = (nome: string) => join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', nome)

/** O navegador padrão do Windows, para o assistente já sugerir o caminho certo dos cookies. */
export function navegadorPadrao(): Promise<Navegador> {
  const chave = 'HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice'
  return new Promise((resolve) => {
    execFile(programaDoSistema('reg.exe'), ['query', chave, '/v', 'ProgId'], { windowsHide: true, timeout: 5000 }, (erro, saida) => {
      const progId = erro ? '' : (/ProgId\s+REG_SZ\s+(\S+)/i.exec(saida)?.[1] ?? '')
      resolve(PROGIDS.find(([re]) => re.test(progId))?.[1] ?? 'nenhum')
    })
  })
}

/** Sites de vídeo e imagem: com a opção "só sites de vídeo", o resto dos cookies do navegador nem sai do navegador. */
const DOMINIOS = [
  'youtube.com', 'youtu.be', 'google.com', 'googlevideo.com', 'youtube-nocookie.com',
  'instagram.com', 'cdninstagram.com', 'facebook.com', 'fb.com', 'fbcdn.net',
  'twitter.com', 'x.com', 'twimg.com', 'tiktok.com', 'tiktokv.com', 'twitch.tv',
  'reddit.com', 'redd.it', 'pixiv.net', 'vimeo.com', 'soundcloud.com', 'dailymotion.com',
  'bilibili.com', 'kick.com', 'tumblr.com', 'deviantart.com', 'patreon.com', 'nicovideo.jp',
  'pinterest.com', 'bsky.app', 'bsky.social', 'discord.com', 'danbooru.donmai.us', 'kemono.su', 'coomer.su'
]

/** O identificador do cookies.txt do programa nas configurações (o conteúdo de verdade fica cifrado). */
export const arquivoCookies = arquivoCookiesDoPrograma
const arquivoCifrado = () => join(app.getPath('userData'), 'cookies-navegador.bin')
/** Cópias de trabalho: apagadas no fim de cada execução e ao abrir o programa. */
const pastaTemporaria = () => pastaDados('tmp')

function dominioDaLinha(linha: string): string {
  return (linha.split('\t')[0] ?? '').replace(/^#HttpOnly_/, '').replace(/^\./, '').toLowerCase()
}

function deSite(dominio: string): boolean {
  return DOMINIOS.some((d) => dominio === d || dominio.endsWith('.' + d))
}

/** As linhas de cookie (formato Netscape) de um texto. */
function linhasDeCookie(texto: string): string[] {
  return texto.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('# ') && l.split('\t').length >= 7)
}

/** Só os cookies dos sites de vídeo e imagem (o que vai para o celular, por exemplo). */
export function soSitesDeVideo(texto: string): string {
  const mantidas = linhasDeCookie(texto).filter((l) => deSite(dominioDaLinha(l)))
  return ['# Netscape HTTP Cookie File', '', ...mantidas].join('\n') + '\n'
}

// ---------- Guardar cifrado ----------

/** Grava os cookies do programa cifrados; sem o cofre do Windows, cai para o arquivo comum (e avisa no Registro). */
export function gravarCookiesDoPrograma(texto: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(arquivoCifrado(), safeStorage.encryptString(texto))
    rmSync(arquivoCookies(), { force: true })
  } else {
    logar('aviso', 'O cofre do Windows não está disponível: os cookies ficam num arquivo comum.')
    writeFileSync(arquivoCookies(), texto, 'utf8')
  }
}

export function lerCookiesDoPrograma(): string | null {
  try {
    if (existsSync(arquivoCifrado())) return safeStorage.decryptString(readFileSync(arquivoCifrado()))
    if (existsSync(arquivoCookies())) return readFileSync(arquivoCookies(), 'utf8')
  } catch (e) {
    logar('erro', `Não consegui abrir os cookies guardados: ${e instanceof Error ? e.message : String(e)}`)
  }
  return null
}

export const existemCookiesDoPrograma = () => existsSync(arquivoCifrado()) || existsSync(arquivoCookies())

/** O conteúdo do cookies.txt em uso, seja o do programa (cifrado) ou um arquivo escolhido pelo usuário. */
export function lerCookiesEmUso(arquivo: string): string | null {
  if (resolve(arquivo) === resolve(arquivoCookies())) return lerCookiesDoPrograma()
  try {
    return readFileSync(arquivo, 'utf8')
  } catch {
    return null
  }
}

/**
 * Cópia temporária para uma execução do yt-dlp ou do gallery-dl. No fim, o que a ferramenta renovou
 * (sessões que o site troca) volta para o cofre e a cópia é apagada.
 */
export function copiaTemporaria(): { caminho: string; fim: () => void } | null {
  const texto = lerCookiesDoPrograma()
  if (texto == null) return null
  const caminho = join(pastaTemporaria(), `c-${randomUUID()}.txt`)
  writeFileSync(caminho, texto, 'utf8')
  return {
    caminho,
    fim: () => {
      try {
        const depois = readFileSync(caminho, 'utf8')
        if (depois !== texto && linhasDeCookie(depois).length) gravarCookiesDoPrograma(depois)
      } catch {
        /* a ferramenta apagou ou nunca gravou: nada a guardar */
      }
      rmSync(caminho, { force: true })
    }
  }
}

/** Ao abrir: o cookies.txt antigo (em texto puro) vai para o cofre, e sobras de execuções interrompidas somem. */
export function prepararCookies(): void {
  try {
    for (const nome of readdirSync(pastaTemporaria())) rmSync(join(pastaTemporaria(), nome), { force: true, recursive: true })
  } catch {
    /* pasta vazia */
  }
  if (existsSync(arquivoCookies()) && safeStorage.isEncryptionAvailable()) {
    try {
      gravarCookiesDoPrograma(readFileSync(arquivoCookies(), 'utf8'))
      logar('info', 'Cookies do programa passaram a ficar cifrados com o cofre do Windows.')
    } catch (e) {
      logar('erro', `Não consegui cifrar os cookies: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

// ---------- Gerar e importar ----------

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
  // Arquivo bruto (com todos os cookies do navegador) na pasta do programa, nunca em %TEMP%; apagado no fim
  const bruto = join(pastaTemporaria(), `bruto-${randomUUID()}.txt`)
  const falha = (erro: string): ResultadoCookies => ({ ok: false, salvos: 0, total: 0, sites: 0, arquivo: destino, erro })

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
    const cookies = linhasDeCookie(readFileSync(bruto, 'utf8'))
    const mantidos = soSites ? cookies.filter((l) => deSite(dominioDaLinha(l))) : cookies
    if (!mantidos.length) {
      const erro = soSites
        ? 'O navegador não tem cookies de nenhum site de vídeo. Entre nas suas contas nele primeiro (ou desmarque "só sites de vídeo").'
        : 'O navegador não tem cookies salvos.'
      return falha(erro)
    }
    const sites = new Set(mantidos.map(dominioDaLinha)).size
    const cabecalho = ['# Netscape HTTP Cookie File', '# Gerado pelo Subaru DL a partir do navegador. Contém logins: não compartilhe.', '']
    gravarCookiesDoPrograma([...cabecalho, ...mantidos].join('\n') + '\n')
    logar('info', `Cookies do navegador: ${mantidos.length} de ${cookies.length} salvos (${sites} sites)`)
    return { ok: true, salvos: mantidos.length, total: cookies.length, sites, arquivo: destino, erro: null }
  } finally {
    rmSync(bruto, { force: true })
  }
}

/** Confere se o texto tem linhas de cookie no formato Netscape (domínio<TAB>…, 7 campos). */
function pareceNetscape(texto: string): boolean {
  return linhasDeCookie(texto).length > 0
}

const pastaDownloads = () => {
  try {
    return app.getPath('downloads')
  } catch {
    return null
  }
}

/**
 * Importa um cookies.txt (formato Netscape, ex.: exportado por uma extensão do navegador), valida, filtra
 * se pedido e guarda cifrado. É o caminho para Chrome e Edge novos, que criptografam os cookies de um
 * jeito que nenhum programa externo consegue ler. O arquivo exportado na pasta Downloads vai para a Lixeira:
 * ele tem os logins em texto puro e costuma ser sincronizado com a nuvem.
 */
export async function importarCookies(caminho: string, soSites: boolean): Promise<ResultadoCookies> {
  const destino = arquivoCookies()
  const falha = (erro: string): ResultadoCookies => ({ ok: false, salvos: 0, total: 0, sites: 0, arquivo: destino, erro })
  if (!caminho || !existsSync(caminho)) return falha('Arquivo não encontrado.')
  if (statSync(caminho).size > 20 * 1024 * 1024) return falha('Esse arquivo é grande demais para ser um cookies.txt.')
  let texto: string
  try {
    texto = readFileSync(caminho, 'utf8')
  } catch {
    return falha('Não consegui ler o arquivo.')
  }
  const cookies = linhasDeCookie(texto)
  if (!cookies.length) return falha('Esse arquivo não parece um cookies.txt (formato Netscape, com tabulações).')
  const mantidos = soSites ? cookies.filter((l) => deSite(dominioDaLinha(l))) : cookies
  if (!mantidos.length) return falha('O arquivo não tem cookies de sites de vídeo. Desmarque "só sites de vídeo" para usar todos.')
  const sites = new Set(mantidos.map(dominioDaLinha)).size
  const cabecalho = ['# Netscape HTTP Cookie File', '# Importado pelo Subaru DL. Contém logins: não compartilhe.', '']
  gravarCookiesDoPrograma([...cabecalho, ...mantidos].join('\n') + '\n')
  logar('info', `Cookies importados: ${mantidos.length} de ${cookies.length} salvos (${sites} sites)`)

  let paraLixeira = false
  const downloads = pastaDownloads()
  if (downloads && resolve(dirname(caminho)) === resolve(downloads)) {
    try {
      await shell.trashItem(caminho)
      paraLixeira = true
    } catch (e) {
      logar('aviso', `Não consegui mandar o cookies.txt exportado para a Lixeira: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { ok: true, salvos: mantidos.length, total: cookies.length, sites, arquivo: destino, erro: null, paraLixeira }
}

/**
 * Procura na pasta Downloads o cookies.txt mais recente (da última hora) que uma extensão tenha exportado,
 * para o usuário não precisar caçar o arquivo. Devolve o caminho ou null.
 */
export function acharCookiesBaixado(): string | null {
  const dir = pastaDownloads()
  if (!dir || !existsSync(dir)) return null
  let nomes: string[]
  try {
    nomes = readdirSync(dir)
  } catch {
    return null
  }
  const limite = Date.now() - 60 * 60 * 1000
  let melhor: { caminho: string; mtime: number } | null = null
  for (const nome of nomes) {
    if (!/\.txt$/i.test(nome) || !/cookie/i.test(nome)) continue
    const caminho = join(dir, nome)
    try {
      const st = statSync(caminho)
      if (!st.isFile() || st.mtimeMs < limite) continue
      if (!pareceNetscape(readFileSync(caminho, 'utf8').slice(0, 8192))) continue
      if (!melhor || st.mtimeMs > melhor.mtime) melhor = { caminho, mtime: st.mtimeMs }
    } catch {
      continue
    }
  }
  return melhor?.caminho ?? null
}
