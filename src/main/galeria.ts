// Galeria: imagens e coleções com o gallery-dl (item 74). Fila própria, separada da de vídeos.
import { execFile, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { EXTENSOES_IMAGEM } from '@shared/miniatura'
import type { ArquivoGaleria, ItemGaleria, OrganizarGaleria } from '@shared/tipos'
import { prepararAcesso, type Acesso } from './acesso'
import { gravadorAdiado, lerJson, pastaDados } from './armazenamento'
import { configuracoes, obterSegredos } from './configuracoes'
import { programaDoSistema } from './cookies'
import { executar, executarAteFim } from './ferramentas'
import { dentroDaPasta } from './fila'
import { dicaParaErro, logar, mascararArgs } from './logs'

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
    amostras: i.amostras ?? [],
    organizar: i.organizar ?? 'padrao',
    formatoPasta: i.formatoPasta ?? '{category}/{user}',
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
  intervalo?: string | null,
  formatoPasta?: string | null
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
      formatoPasta: formatoPasta?.trim() || configuracoes().galeriaFormatoPasta,
      intervalo: intervalo?.trim() || null,
      arquivos: 0,
      ultimoArquivo: null,
      amostras: [],
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

/** Cookies, login e proxy: os mesmos dos vídeos, com as mesmas regras (sites sem cookies, login só nos sites listados). */
function acessoPara(url: string): Acesso {
  return prepararAcesso('gallery-dl', configuracoes(), obterSegredos(), url)
}

/** As imagens que a prévia da galeria pode mostrar do disco: as últimas baixadas de cada item. */
export function ehAmostra(caminho: string): boolean {
  return itens.some((i) => i.amostras.includes(caminho) || i.ultimoArquivo === caminho)
}

/** Pastas de destino da galeria (para "Abrir a pasta"). */
export function pastasDaGaleria(): string[] {
  return itens.map((i) => i.pasta)
}

/**
 * Uma pasta com o nome do perfil. Cada site chama o perfil por um campo diferente
 * (Instagram: username, X: user[name], Pixiv: user[account], Bluesky: author[handle]…);
 * o gallery-dl usa o primeiro que existir e, se nenhum existir, o nome do site.
 */
const PASTA_PERFIL =
  '{username|user[account]|user[name]|author[handle]|author[name]|owner[username]|blog_name|blog[name]|subreddit|uploader|search_tags|category}'

function argumentos(item: ItemGaleria, acesso: string[]): string[] {
  const c = configuracoes()
  const a = ['--no-colors', '-d', item.pasta, ...acesso]
  // Padrão do gallery-dl: site/perfil/…; os outros trocam a lista de subpastas
  const subpastas = {
    plana: [],
    site: ['{category}'],
    perfil: [PASTA_PERFIL],
    padrao: null,
    personalizado: item.formatoPasta.split(/[\\/]+/).map((p) => p.trim()).filter(Boolean)
  }[item.organizar]
  if (subpastas) a.push('-o', `directory=${JSON.stringify(subpastas)}`)
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
  const acesso = acessoPara(item.url)
  const args = argumentos(item, acesso.args)
  logar('comando', `gallery-dl ${mascararArgs(args)}`, id)
  definir(id, { status: 'baixando', erro: null, dicaErro: null, falhas: 0 })

  const proc = executar('gallery-dl.exe', args)
  processos.set(id, proc)
  let ultimoErro = ''

  // Cada arquivo baixado sai como uma linha com o caminho; os pulados (já existiam) começam com "# "
  createInterface({ input: proc.stdout! }).on('line', (linha) => {
    const atual = itens.find((i) => i.id === id)
    if (!atual || !linha.trim()) return
    const pulado = linha.startsWith('# ')
    const arquivo = (pulado ? linha.slice(2) : linha).trim()
    // Só conta (e mostra na prévia) o que está dentro da pasta de destino
    if (!dentroDaPasta(arquivo, atual.pasta)) return logar('info', linha, id)
    // Guarda as últimas imagens para o mosaico (vídeos ficam de fora)
    const amostras = EXTENSOES_IMAGEM.test(arquivo) ? [...atual.amostras.filter((a) => a !== arquivo), arquivo].slice(-4) : atual.amostras
    if (pulado) definir(id, { pulados: atual.pulados + 1, ultimoArquivo: arquivo, amostras }, false)
    else definir(id, { arquivos: atual.arquivos + 1, ultimoArquivo: arquivo, amostras }, false)
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
    acesso.fim()
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
    acesso.fim()
    definir(id, { status: 'erro', erro: `Não foi possível iniciar o gallery-dl: ${e.message}` })
    agendar()
  })
}

function encerrar(id: string) {
  const proc = processos.get(id)
  if (proc?.pid) execFile(programaDoSistema('taskkill.exe'), ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => {})
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
  const acesso = acessoPara(url)
  const args = ['--no-colors', '-J', '--range', `${inicio}-${inicio + quantidade - 1}`, ...acesso.args, '--', url]
  logar('comando', `gallery-dl ${mascararArgs(args)}`)
  const { stdout, stderr, codigo } = await executarAteFim('gallery-dl.exe', args, 180_000).finally(acesso.fim)
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

