// Galeria: imagens e coleções com o gallery-dl (item 74). Fila própria, separada da de vídeos.
import { execFile, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { ArquivoGaleria, ItemGaleria, OrganizarGaleria } from '@shared/tipos'
import { gravadorAdiado, lerJson, pastaDados } from './armazenamento'
import { configuracoes, obterSegredos } from './configuracoes'
import { executar, executarAteFim } from './ferramentas'
import { dicaParaErro, logar } from './logs'

let itens: ItemGaleria[] = []
const processos = new Map<string, ChildProcess>()
let proximoId = 1
let aoMudar: ((itens: ItemGaleria[]) => void) | null = null
let timer: NodeJS.Timeout | null = null
const gravador = gravadorAdiado('galeria.json', 1500)

export function aoMudarGaleria(cb: (itens: ItemGaleria[]) => void): void {
  aoMudar = cb
}

function mudou(imediato = true) {
  gravador.agendar(itens)
  if (imediato) {
    if (timer) clearTimeout(timer)
    timer = null
    aoMudar?.(itens)
  } else if (!timer) {
    timer = setTimeout(() => {
      timer = null
      aoMudar?.(itens)
    }, 300)
  }
}

function definir(id: string, mudanca: Partial<ItemGaleria>, imediato = true) {
  const i = itens.findIndex((x) => x.id === id)
  if (i < 0) return
  itens[i] = { ...itens[i], ...mudanca }
  mudou(imediato)
}

export function listarGaleria(): ItemGaleria[] {
  return itens
}

export function carregarGaleria(): void {
  itens = lerJson<ItemGaleria[]>('galeria.json', []).map((i) => ({
    ...i,
    falhas: i.falhas ?? 0,
    organizar: i.organizar ?? 'padrao',
    intervalo: i.intervalo ?? null,
    dicaErro: i.dicaErro ?? null,
    status: i.status === 'baixando' ? 'pausado' : i.status
  }))
  proximoId = itens.reduce((m, i) => Math.max(m, Number(i.id.replace(/\D/g, '')) || 0), 0) + 1
}

export function salvarGaleriaAgora(): void {
  gravador.agendar(itens)
  gravador.descarregar()
}

/** Cada link pode ter a sua pasta e o seu jeito de organizar (padrão: os das configurações). */
export function adicionarGaleria(
  urls: string[],
  pastaEscolhida?: string | null,
  organizarEscolhido?: OrganizarGaleria | null,
  intervalo?: string | null
): number {
  const pasta = pastaEscolhida || configuracoes().pastaGaleria
  const organizar = organizarEscolhido ?? configuracoes().galeriaOrganizar
  const novos: ItemGaleria[] = urls
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\/\S+$/i.test(u))
    .map((url) => ({
      id: `g${proximoId++}`,
      url,
      status: 'aguardando',
      pasta,
      organizar,
      intervalo: intervalo?.trim() || null,
      arquivos: 0,
      ultimoArquivo: null,
      pulados: 0,
      falhas: 0,
      erro: null,
      dicaErro: null,
      criadoEm: Date.now(),
      concluidoEm: null
    }))
  itens.push(...novos)
  mudou()
  agendar()
  return novos.length
}

function agendar() {
  const limite = Math.max(1, configuracoes().galeriaSimultaneos)
  while (itens.filter((i) => i.status === 'baixando').length < limite) {
    const proximo = itens.find((i) => i.status === 'aguardando')
    if (!proximo) return
    iniciar(proximo.id)
  }
}

/** Cookies, login e proxy: os mesmos dos vídeos. */
function argsAcesso(): string[] {
  const c = configuracoes()
  const s = obterSegredos()
  const a: string[] = []
  if (c.cookies.origem === 'navegador' && c.cookies.navegador !== 'nenhum') {
    a.push('--cookies-from-browser', c.cookies.navegador + (c.cookies.perfil ? `:${c.cookies.perfil}` : ''))
  } else if (c.cookies.origem === 'arquivo' && c.cookies.arquivo) {
    a.push('--cookies', c.cookies.arquivo)
  }
  if (s.usuario) a.push('-u', s.usuario)
  if (s.senha) a.push('-p', s.senha)
  if (c.proxy.ativo && c.proxy.host) {
    const login = c.proxy.usuario ? `${encodeURIComponent(c.proxy.usuario)}${s.senhaProxy ? ':' + encodeURIComponent(s.senhaProxy) : ''}@` : ''
    a.push('--proxy', `${c.proxy.tipo === 'socks5' ? 'socks5' : 'http'}://${login}${c.proxy.host}${c.proxy.porta ? ':' + c.proxy.porta : ''}`)
  }
  return a
}

function argumentos(item: ItemGaleria): string[] {
  const c = configuracoes()
  const a = ['--no-colors', '-d', item.pasta, ...argsAcesso()]
  // Padrão do gallery-dl: site/perfil/…; "plana" põe tudo direto na pasta escolhida
  if (item.organizar === 'plana') a.push('-o', 'directory=[]')
  if (c.galeriaPularBaixados) a.push('--download-archive', join(pastaDados(), 'galeria-baixados.sqlite3'))
  const intervalo = item.intervalo ?? c.galeriaIntervalo.trim()
  if (intervalo) a.push('--range', intervalo)
  if (c.galeriaPausa > 0) a.push('--sleep', String(c.galeriaPausa))
  a.push('--', item.url)
  return a
}

function iniciar(id: string) {
  const item = itens.find((i) => i.id === id)
  if (!item || processos.has(id)) return
  const args = argumentos(item)
  logar('comando', `gallery-dl ${args.map((a, i) => (args[i - 1] === '-p' ? '••••' : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`, id)
  definir(id, { status: 'baixando', erro: null, dicaErro: null, falhas: 0 })

  const proc = executar('gallery-dl.exe', args)
  processos.set(id, proc)
  let ultimoErro = ''

  // Cada arquivo baixado sai como uma linha com o caminho; os pulados (já existiam) começam com "# "
  createInterface({ input: proc.stdout! }).on('line', (linha) => {
    const atual = itens.find((i) => i.id === id)
    if (!atual || !linha.trim()) return
    if (linha.startsWith('# ')) definir(id, { pulados: atual.pulados + 1, ultimoArquivo: linha.slice(2).trim() }, false)
    else definir(id, { arquivos: atual.arquivos + 1, ultimoArquivo: linha.trim() }, false)
  })
  createInterface({ input: proc.stderr! }).on('line', (linha) => {
    if (!linha.trim()) return
    const atual = itens.find((i) => i.id === id)
    if (/\[error\]/i.test(linha)) {
      ultimoErro = linha.replace(/^\[[^\]]+\]\[error\]\s*/i, '')
      logar('erro', linha, id)
      if (atual && /Failed to download/i.test(linha)) definir(id, { falhas: atual.falhas + 1 }, false)
    } else if (/\[warning\]/i.test(linha)) {
      logar('aviso', linha, id)
      // O motivo real da falha costuma vir no aviso (ex.: 429, 403)
      const dica = dicaParaErro(linha)
      if (atual && dica && !atual.dicaErro) definir(id, { dicaErro: dica }, false)
    }
    else logar('info', linha, id)
  })

  proc.on('close', (codigo) => {
    processos.delete(id)
    const atual = itens.find((i) => i.id === id)
    if (atual && atual.status !== 'pausado') {
      // gallery-dl usa códigos por tipo de falha; parcial (alguns arquivos falharam) ainda conta como concluído
      const nada = atual.arquivos === 0 && atual.pulados === 0
      const dica = atual.dicaErro ?? dicaParaErro(ultimoErro)
      if (codigo === 0) {
        definir(id, { status: 'concluido', concluidoEm: Date.now(), erro: nada ? 'Nada encontrado para baixar nesse link.' : null })
      } else if (!nada) {
        // Parte baixou e parte falhou
        const erro = atual.falhas ? `${atual.falhas} arquivo(s) falharam. Clique em tentar de novo para baixar só os que faltam.` : ultimoErro || null
        definir(id, { status: 'concluido', concluidoEm: Date.now(), erro, dicaErro: dica })
      } else {
        const erro = codigo === 64 ? 'Site não suportado pelo gallery-dl' : ultimoErro || `gallery-dl terminou com o código ${codigo}`
        definir(id, { status: 'erro', erro, dicaErro: dica })
      }
    }
    agendar()
  })
  proc.on('error', (e) => {
    processos.delete(id)
    definir(id, { status: 'erro', erro: `Não foi possível iniciar o gallery-dl: ${e.message}` })
    agendar()
  })
}

function encerrar(id: string) {
  const proc = processos.get(id)
  if (proc?.pid) execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => {})
}

export function pausarGaleria(id: string): void {
  const i = itens.find((x) => x.id === id)
  if (!i || (i.status !== 'baixando' && i.status !== 'aguardando')) return
  definir(id, { status: 'pausado' })
  encerrar(id)
  agendar()
}

/** Retomar e tentar de novo: o gallery-dl pula sozinho o que já foi baixado. */
export function retomarGaleria(id: string): void {
  const i = itens.find((x) => x.id === id)
  if (!i || i.status === 'baixando') return
  definir(id, { status: 'aguardando', erro: null, arquivos: i.status === 'concluido' ? 0 : i.arquivos, pulados: 0 })
  agendar()
}

export function removerGaleria(ids: string[]): void {
  for (const id of ids) encerrar(id)
  itens = itens.filter((i) => !ids.includes(i.id))
  mudou()
  agendar()
}

export function limparGaleriaConcluidos(): void {
  itens = itens.filter((i) => i.status !== 'concluido')
  mudou()
}

export function encerrarGaleria(): void {
  for (const id of processos.keys()) {
    const i = itens.find((x) => x.id === id)
    if (i) i.status = 'pausado'
    encerrar(id)
  }
  salvarGaleriaAgora()
}

// ---------- Prévia: listar os arquivos sem baixar ----------

/** Lista os arquivos de `inicio` em diante (posições do --range). `fim` = não há mais. */
export async function listarArquivosGaleria(url: string, inicio: number, quantidade: number): Promise<{ arquivos: ArquivoGaleria[]; fim: boolean }> {
  const args = ['--no-colors', '-J', '--range', `${inicio}-${inicio + quantidade - 1}`, ...argsAcesso(), '--', url]
  logar('comando', `gallery-dl ${args.map((a, i) => (args[i - 1] === '-p' ? '••••' : /\s/.test(a) ? `"${a}"` : a)).join(' ')}`)
  const { stdout, stderr, codigo } = await executarAteFim('gallery-dl.exe', args, 180_000)
  const erro = stderr.split(/\r?\n/).filter((l) => /\[error\]/i.test(l)).pop()
  let mensagens: unknown[] = []
  try {
    mensagens = JSON.parse(stdout || '[]')
  } catch {
    /* saída vazia ou cortada */
  }
  const arquivos: ArquivoGaleria[] = []
  for (const m of mensagens) {
    // Mensagem 3 = arquivo: [3, url, dados]
    if (!Array.isArray(m) || m[0] !== 3) continue
    const [, link, dados] = m as [number, string, Record<string, unknown>]
    const ext = String(dados.extension ?? '').toLowerCase()
    arquivos.push({
      indice: inicio + arquivos.length,
      url: link.replace(/^ytdl:/, ''),
      nome: `${dados.filename ?? ''}${ext ? '.' + ext : ''}`,
      ext,
      largura: typeof dados.width === 'number' ? dados.width : null,
      altura: typeof dados.height === 'number' ? dados.height : null,
      video: link.startsWith('ytdl:') || /^(mp4|webm|mov|mkv|m4v)$/.test(ext)
    })
  }
  if (!arquivos.length && (codigo !== 0 || erro)) {
    const msg = erro?.replace(/^\[[^\]]+\]\[error\]\s*/i, '') ?? (codigo === 64 ? 'Site não suportado pelo gallery-dl' : `gallery-dl terminou com o código ${codigo}`)
    logar('erro', msg)
    throw new Error(msg)
  }
  return { arquivos, fim: arquivos.length < quantidade }
}

