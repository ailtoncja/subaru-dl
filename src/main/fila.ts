// Gerenciador da fila: busca informações, controla quantos downloads rodam ao mesmo tempo,
// pausa/retoma, tenta de novo quando falha e salva a fila em disco.
import { execFile, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { Duplicado, InfoMidia, ItemFila, MidiaBaixada, OpcoesDownload, Progresso, StatusItem } from '@shared/tipos'
import { gravadorAdiado, lerJson } from './armazenamento'
import { configuracoes, obterSegredos } from './configuracoes'
import { executar } from './ferramentas'
import { procurarDuplicados, registrarDownload } from './historico'
import { dicaParaErro, logar } from './logs'
import { argsDownload, buscarInfo, comandoParaLog, MARCA_ARQUIVO, MARCA_POS, MARCA_PROGRESSO, nomeSite } from './ytdlp'

const PROGRESSO_ZERO: Progresso = {
  porcentagem: 0,
  baixado: null,
  total: null,
  velocidade: null,
  eta: null,
  etapa: null,
  itemAtual: null,
  itensTotal: null
}

const ETAPAS_POS: Array<[RegExp, string]> = [
  [/Merger/i, 'Juntando vídeo e áudio'],
  [/ExtractAudio/i, 'Convertendo áudio'],
  [/VideoConvertor/i, 'Recodificando vídeo'],
  [/VideoRemuxer/i, 'Convertendo o contêiner'],
  [/EmbedSubtitle/i, 'Embutindo legendas'],
  [/SubtitlesConvertor/i, 'Convertendo legendas'],
  [/EmbedThumbnail/i, 'Embutindo a capa'],
  [/ThumbnailsConvertor/i, 'Convertendo a miniatura'],
  [/Metadata/i, 'Gravando metadados'],
  [/SplitChapters/i, 'Separando capítulos'],
  [/ModifyChapters|FixupM/i, 'Ajustando o arquivo'],
  [/MoveFiles/i, 'Finalizando']
]

const MAX_BUSCAS_SIMULTANEAS = 3

let itens: ItemFila[] = []
const processos = new Map<string, ChildProcess>()
const timersTentativa = new Map<string, NodeJS.Timeout>()
/** Itens que o usuário mandou baixar agora, mesmo acima do limite de simultâneos. */
const prioritarios = new Set<string>()
let filaRodando = false
let buscasAtivas = 0
let proximoId = 1
let aoMudar: ((fila: ItemFila[]) => void) | null = null
let timerEmissao: NodeJS.Timeout | null = null
const gravador = gravadorAdiado('fila.json', 1500)

// ---------- Estado ----------

export function aoMudarFila(cb: (fila: ItemFila[]) => void): void {
  aoMudar = cb
}

/** Avisa a interface no máximo ~4 vezes por segundo (o progresso chega muito rápido). */
function mudou(imediato = false) {
  if (configuracoes().salvarFila) gravador.agendar(itens)
  if (imediato) {
    if (timerEmissao) clearTimeout(timerEmissao)
    timerEmissao = null
    aoMudar?.(itens)
    return
  }
  if (!timerEmissao) {
    timerEmissao = setTimeout(() => {
      timerEmissao = null
      aoMudar?.(itens)
    }, 250)
  }
}

export function fila(): ItemFila[] {
  return itens
}

function item(id: string): ItemFila | undefined {
  return itens.find((i) => i.id === id)
}

function definir(id: string, mudanca: Partial<ItemFila>, imediato = true) {
  const i = itens.findIndex((x) => x.id === id)
  if (i < 0) return
  itens[i] = { ...itens[i], ...mudanca }
  mudou(imediato)
}

export function carregarFila(): void {
  if (!configuracoes().salvarFila) return
  const salvos = lerJson<ItemFila[]>('fila.json', [])
  itens = salvos.map((i) => {
    // O que estava em andamento quando o app fechou volta pausado (o yt-dlp continua de onde parou)
    const interrompido: StatusItem[] = ['baixando', 'processando', 'aguardando-nova-tentativa']
    const status: StatusItem = interrompido.includes(i.status) ? 'pausado' : i.status === 'buscando' ? 'buscando' : i.status
    return { ...i, midias: i.midias ?? [], status, proximaTentativaEm: null, progresso: { ...i.progresso, velocidade: null, eta: null } }
  })
  proximoId = itens.reduce((max, i) => Math.max(max, Number(i.id.replace(/\D/g, '')) || 0), 0) + 1
  for (const i of itens) if (i.status === 'buscando') buscarProximasInfos()
}

export function salvarFilaAgora(): void {
  if (configuracoes().salvarFila) gravador.agendar(itens)
  gravador.descarregar()
}

// ---------- Adicionar ----------

function novoItem(url: string, opcoes?: Partial<OpcoesDownload>): ItemFila {
  const padrao = configuracoes().padrao
  return {
    id: `i${proximoId++}`,
    url,
    status: 'buscando',
    info: null,
    opcoes: { ...structuredClone(padrao), ...opcoes },
    progresso: { ...PROGRESSO_ZERO },
    arquivos: [],
    midias: [],
    erro: null,
    dicaErro: null,
    tentativa: 0,
    proximaTentativaEm: null,
    criadoEm: Date.now(),
    concluidoEm: null
  }
}

export function normalizarUrls(urls: string[]): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []
  for (const bruto of urls) {
    const url = bruto.trim()
    if (!/^https?:\/\/\S+$/i.test(url) || vistos.has(url)) continue
    vistos.add(url)
    resultado.push(url)
  }
  return resultado
}

/** Adiciona links. Devolve os que já tinham sido baixados quando a configuração é "perguntar" (item 8). */
export function adicionar(
  urls: string[],
  opcoes?: Partial<OpcoesDownload>,
  iniciar = false,
  ignorarDuplicados = false
): { adicionados: number; duplicados: Duplicado[] } {
  let lista = normalizarUrls(urls)
  const duplicados: Duplicado[] = []
  const acao = configuracoes().acaoDuplicado
  if (!ignorarDuplicados && acao !== 'permitir') {
    const achados = procurarDuplicados(lista)
    if (achados.size) {
      lista = lista.filter((u) => !achados.has(u))
      if (acao === 'perguntar') duplicados.push(...achados.values())
      else logar('info', `${achados.size} link(s) já baixado(s) foram pulados`)
    }
  }
  const novos = lista.map((url) => novoItem(url, opcoes))
  // Um link: começa na hora. Vários: liga a fila, respeitando o limite de downloads ao mesmo tempo
  if (iniciar && novos.length === 1) prioritarios.add(novos[0].id)
  else if (iniciar && novos.length) filaRodando = true
  itens.push(...novos)
  mudou(true)
  buscarProximasInfos()
  return { adicionados: novos.length, duplicados }
}

/** Adiciona um link cuja informação já foi lida (prévia da tela Início): não precisa ler de novo. */
export function adicionarComInfo(url: string, info: InfoMidia, opcoes: Partial<OpcoesDownload>, iniciar: boolean): void {
  const novo = { ...novoItem(url, opcoes), info, status: 'pronto' as const }
  itens.push(novo)
  if (iniciar) prioritarios.add(novo.id)
  mudou(true)
  agendar()
}

function buscarProximasInfos() {
  while (buscasAtivas < MAX_BUSCAS_SIMULTANEAS) {
    const proximo = itens.find((i) => i.status === 'buscando' && !buscando.has(i.id))
    if (!proximo) return
    void buscarInfoDoItem(proximo.id)
  }
}

const buscando = new Set<string>()

async function buscarInfoDoItem(id: string) {
  const alvo = item(id)
  if (!alvo) return
  buscando.add(id)
  buscasAtivas++
  try {
    const info = await buscarInfo(alvo.url, configuracoes(), obterSegredos(), id)
    if (!item(id)) return // removido enquanto buscava
    definir(id, { info, status: 'pronto', erro: null, dicaErro: null })
    agendar()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (item(id)) definir(id, { status: 'erro', erro: msg, dicaErro: dicaParaErro(msg) })
    prioritarios.delete(id)
  } finally {
    buscando.delete(id)
    buscasAtivas--
    buscarProximasInfos()
  }
}

// ---------- Agendador ----------

function ativos(): number {
  return itens.filter((i) => i.status === 'baixando' || i.status === 'processando').length
}

function agendar() {
  // Prioritários começam na hora, independentemente do limite
  for (const id of [...prioritarios]) {
    const i = item(id)
    if (!i) {
      prioritarios.delete(id)
      continue
    }
    if (i.status === 'pronto') {
      prioritarios.delete(id)
      iniciarDownload(id)
    }
  }
  if (!filaRodando) return
  const limite = Math.max(1, configuracoes().simultaneos)
  while (ativos() < limite) {
    const proximo = itens.find((i) => i.status === 'pronto')
    if (!proximo) break
    iniciarDownload(proximo.id)
  }
  const restantes = itens.some((i) => ['pronto', 'buscando', 'baixando', 'processando', 'aguardando-nova-tentativa'].includes(i.status))
  if (!restantes) filaRodando = false
}

export function iniciarFila(): void {
  filaRodando = true
  for (const i of itens) if (i.status === 'pausado') definir(i.id, { status: 'pronto' })
  agendar()
}

export function filaEstaRodando(): boolean {
  return filaRodando
}

// ---------- Download ----------

function iniciarDownload(id: string) {
  const alvo = item(id)
  if (!alvo || processos.has(id)) return
  // "0" = o usuário desmarcou todos os vídeos da playlist
  if (alvo.info?.playlist && alvo.opcoes.itensPlaylist.trim() === '0') {
    definir(id, { status: 'erro', erro: 'Nenhum vídeo da playlist está marcado.', dicaErro: 'Abra as preferências do item → Playlist.' })
    return
  }
  const args = argsDownload(alvo, configuracoes(), obterSegredos())
  logar('comando', comandoParaLog(args), id)

  const ehPlaylist = !!alvo.info?.playlist
  definir(id, {
    status: 'baixando',
    erro: null,
    dicaErro: null,
    arquivos: ehPlaylist ? alvo.arquivos : [],
    midias: ehPlaylist ? alvo.midias : [],
    progresso: { ...PROGRESSO_ZERO, etapa: 'Iniciando' }
  })

  const proc = executar('yt-dlp.exe', args)
  processos.set(id, proc)
  let ultimoErro = ''
  const avisos: string[] = []

  createInterface({ input: proc.stdout! }).on('line', (linha) => {
    if (linha.startsWith(MARCA_PROGRESSO)) return lerProgresso(id, linha.slice(MARCA_PROGRESSO.length))
    if (linha.startsWith(MARCA_POS)) return lerPosProcesso(id, linha.slice(MARCA_POS.length))
    if (linha.startsWith(MARCA_ARQUIVO)) {
      const midia = lerMidia(linha.slice(MARCA_ARQUIVO.length))
      const atual = item(id)
      if (midia && atual && !atual.arquivos.includes(midia.arquivo)) {
        definir(id, { arquivos: [...atual.arquivos, midia.arquivo], midias: [...atual.midias, midia] })
      }
      return
    }
    if (linha.trim()) logar('info', linha, id)
  })

  createInterface({ input: proc.stderr! }).on('line', (linha) => {
    if (!linha.trim()) return
    if (linha.startsWith('ERROR')) {
      ultimoErro = linha.replace(/^ERROR:\s*/, '')
      logar('erro', linha, id)
    } else if (linha.startsWith('WARNING')) {
      avisos.push(linha)
      logar('aviso', linha, id)
    } else {
      logar('info', linha, id)
    }
  })

  proc.on('close', (codigo) => {
    processos.delete(id)
    const atual = item(id)
    if (!atual) return agendar()
    // Pausado pelo usuário: o processo foi encerrado de propósito
    if (atual.status === 'pausado') return agendar()

    if (codigo === 0 && !atual.arquivos.length) {
      // Terminou sem baixar nada (ex.: tudo filtrado pelos filtros de entrada)
      definir(id, {
        status: 'erro',
        erro: avisos.length ? 'Nada foi baixado. Veja os avisos nos logs.' : 'Nada foi baixado.',
        dicaErro: 'Confira os filtros de entrada em Configurações.'
      })
    } else if (codigo === 0) {
      // Concluído sai da fila e vai para o histórico (Downloads → Concluídos)
      registrarDownload(atual)
      logar('info', `Concluído: ${atual.info?.titulo ?? atual.url}`, id)
      itens = itens.filter((i) => i.id !== id)
      mudou(true)
    } else {
      falhou(id, ultimoErro || `O yt-dlp terminou com o código ${codigo}`)
    }
    agendar()
  })

  proc.on('error', (e) => {
    processos.delete(id)
    falhou(id, `Não foi possível iniciar o yt-dlp: ${e.message}`)
    agendar()
  })
}

function falhou(id: string, mensagem: string) {
  const atual = item(id)
  if (!atual) return
  const { tentativasAuto, intervaloTentativa } = configuracoes()
  const dica = dicaParaErro(mensagem)
  // Erros que não se resolvem tentando de novo
  const definitivo = /Unsupported URL|Video unavailable|Private video|not available in your country|Requested format is not available|members.only/i.test(mensagem)
  if (!definitivo && atual.tentativa < tentativasAuto) {
    const espera = Math.max(1, intervaloTentativa) * 1000
    definir(id, {
      status: 'aguardando-nova-tentativa',
      tentativa: atual.tentativa + 1,
      proximaTentativaEm: Date.now() + espera,
      erro: mensagem,
      dicaErro: dica
    })
    logar('aviso', `Tentativa ${atual.tentativa + 1}/${tentativasAuto} em ${espera / 1000}s: ${mensagem}`, id)
    timersTentativa.set(
      id,
      setTimeout(() => {
        timersTentativa.delete(id)
        const i = item(id)
        if (i?.status !== 'aguardando-nova-tentativa') return
        definir(id, { status: 'pronto', proximaTentativaEm: null })
        prioritarios.add(id)
        agendar()
      }, espera)
    )
  } else {
    definir(id, { status: 'erro', erro: mensagem, dicaErro: dica, proximaTentativaEm: null })
  }
}

/** Dados de um arquivo terminado, impressos pelo yt-dlp em JSON (veja argsDownload). */
function lerMidia(json: string): MidiaBaixada | null {
  try {
    const d = JSON.parse(json)
    if (!d.filepath) return null
    return {
      idMidia: String(d.id ?? ''),
      titulo: d.title ?? '',
      canal: d.channel ?? d.uploader ?? null,
      site: nomeSite(d.extractor_key ?? ''),
      url: d.webpage_url ?? '',
      duracao: d.duration ?? null,
      altura: d.height ?? null,
      fps: d.fps ?? null,
      abr: d.abr ?? null,
      ext: d.ext ?? '',
      arquivo: d.filepath,
      miniatura: d.thumbnail ?? null,
      dataUpload: d.upload_date ?? null,
      playlist: d.playlist_title ?? null,
      views: d.view_count ?? null,
      likes: d.like_count ?? null
    }
  } catch {
    return null
  }
}

function numeroOuNull(v: string | undefined): number | null {
  if (v == null || v === 'NA' || v === 'None' || v === '') return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

function lerProgresso(id: string, dados: string) {
  const atual = item(id)
  if (!atual || atual.status === 'pausado') return
  const [status, baixado, total, estimado, vel, eta, indice, nItens, vcodec, frag, nFrag] = dados.split('|')
  const b = numeroOuNull(baixado)
  const t = numeroOuNull(total) ?? numeroOuNull(estimado)
  let fracao = b != null && t ? b / t : null
  // Lives e HLS: o total é desconhecido, mas os fragmentos dão uma noção
  const f = numeroOuNull(frag)
  const nf = numeroOuNull(nFrag)
  if (fracao == null && f != null && nf) fracao = f / nf
  if (status === 'finished') fracao = 1

  const idx = numeroOuNull(indice)
  const n = numeroOuNull(nItens)
  let porcentagem = (fracao ?? 0) * 100
  if (idx != null && n && n > 1) porcentagem = ((idx - 1 + (fracao ?? 0)) / n) * 100

  const soAudio = vcodec === 'none'
  const etapa = atual.opcoes.modo === 'audio' ? 'Baixando áudio' : soAudio ? 'Baixando áudio' : 'Baixando vídeo'
  definir(
    id,
    {
      status: 'baixando',
      progresso: {
        porcentagem: Math.min(100, porcentagem),
        baixado: b,
        total: t,
        velocidade: numeroOuNull(vel),
        eta: numeroOuNull(eta),
        etapa,
        itemAtual: idx,
        itensTotal: n
      }
    },
    false
  )
}

function lerPosProcesso(id: string, dados: string) {
  const atual = item(id)
  if (!atual || atual.status === 'pausado') return
  const [status, nome] = dados.split('|')
  if (status !== 'started') return
  const etapa = ETAPAS_POS.find(([re]) => re.test(nome ?? ''))?.[1] ?? 'Processando'
  const porPlaylist = atual.info?.playlist && (atual.progresso.itensTotal ?? 0) > 1
  definir(id, {
    // Em playlists o pós-processamento acontece entre um vídeo e outro: continua "baixando"
    status: porPlaylist ? 'baixando' : 'processando',
    progresso: { ...atual.progresso, etapa, velocidade: null, eta: null }
  })
}

/** Encerra o yt-dlp e os filhos dele (ffmpeg, aria2). */
function encerrarProcesso(id: string) {
  const proc = processos.get(id)
  if (!proc?.pid) return
  execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => {})
}

// ---------- Ações da interface ----------

export function pausar(id: string): void {
  const atual = item(id)
  if (!atual) return
  prioritarios.delete(id)
  clearTimeout(timersTentativa.get(id))
  timersTentativa.delete(id)
  if (['baixando', 'processando', 'pronto', 'aguardando-nova-tentativa'].includes(atual.status)) {
    definir(id, {
      status: 'pausado',
      proximaTentativaEm: null,
      progresso: { ...atual.progresso, velocidade: null, eta: null, etapa: null }
    })
    encerrarProcesso(id)
  }
}

export function pausarTodos(): void {
  filaRodando = false
  for (const i of itens) pausar(i.id)
}

export function retomar(id: string): void {
  const atual = item(id)
  if (atual?.status !== 'pausado') return
  definir(id, { status: atual.info ? 'pronto' : 'buscando' })
  if (!atual.info) return buscarProximasInfos()
  prioritarios.add(id)
  agendar()
}

export function baixarAgora(id: string): void {
  const atual = item(id)
  if (!atual) return
  if (atual.status === 'pausado' || atual.status === 'erro') definir(id, { status: atual.info ? 'pronto' : 'buscando', tentativa: 0 })
  if (!atual.info) {
    prioritarios.add(id)
    return buscarProximasInfos()
  }
  prioritarios.add(id)
  agendar()
}

export function tentarDeNovo(id: string): void {
  const atual = item(id)
  if (!atual) return
  clearTimeout(timersTentativa.get(id))
  timersTentativa.delete(id)
  definir(id, { tentativa: 0, erro: null, dicaErro: null, proximaTentativaEm: null, status: atual.info ? 'pronto' : 'buscando' })
  prioritarios.add(id)
  if (!atual.info) buscarProximasInfos()
  else agendar()
}

export function remover(ids: string[]): void {
  for (const id of ids) {
    prioritarios.delete(id)
    clearTimeout(timersTentativa.get(id))
    timersTentativa.delete(id)
    encerrarProcesso(id)
  }
  itens = itens.filter((i) => !ids.includes(i.id))
  mudou(true)
  agendar()
}

export function atualizarOpcoes(id: string, opcoes: Partial<OpcoesDownload>): void {
  const atual = item(id)
  if (!atual) return
  definir(id, { opcoes: { ...atual.opcoes, ...opcoes } })
}

export function mover(id: string, direcao: 'cima' | 'baixo'): void {
  const i = itens.findIndex((x) => x.id === id)
  const j = direcao === 'cima' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= itens.length) return
  ;[itens[i], itens[j]] = [itens[j], itens[i]]
  mudou(true)
}

/** Troca uma playlist por um item para cada vídeo selecionado. */
export function dividirPlaylist(id: string): void {
  const atual = item(id)
  const entradas = atual?.info?.playlist?.entradas
  if (!atual || !entradas?.length) return
  const selecao = selecionados(atual.opcoes.itensPlaylist, entradas.length, atual.opcoes.limitePlaylist)
  const novos = entradas
    .filter((e) => e.url && selecao.has(e.indice))
    .map((e) => novoItem(e.url, { ...atual.opcoes, itensPlaylist: '', limitePlaylist: 0 }))
  const i = itens.findIndex((x) => x.id === id)
  itens.splice(i, 1, ...novos)
  mudou(true)
  buscarProximasInfos()
}

/** Interpreta "1,3,5-8,-2" (sintaxe do yt-dlp) em um conjunto de índices. */
export function selecionados(spec: string, total: number, limite = 0): Set<number> {
  const resultado = new Set<number>()
  const texto = spec.trim()
  if (!texto) {
    const fim = limite > 0 ? Math.min(limite, total) : total
    for (let n = 1; n <= fim; n++) resultado.add(n)
    return resultado
  }
  // Números negativos contam do fim (-1 = último)
  const resolver = (v: string, padrao: number) => {
    if (v === '') return padrao
    const n = Number(v)
    return n < 0 ? total + n + 1 : n
  }
  for (const bruto of texto.split(',')) {
    const parte = bruto.trim()
    const unico = parte.match(/^-?\d+$/)
    // Intervalo: "3-7", "3:7", ":5", "10:", "-3:-1"
    const intervalo = parte.match(/^(-?\d*)\s*(?::|(?<=\d)-)\s*(-?\d*)$/)
    if (unico) {
      resultado.add(resolver(parte, 1))
    } else if (intervalo) {
      const a = resolver(intervalo[1], 1)
      const b = resolver(intervalo[2], total)
      for (let n = Math.max(1, a); n <= Math.min(total, b); n++) resultado.add(n)
    }
  }
  return resultado
}

/** Ao fechar o app: para tudo e deixa como pausado, para retomar na próxima vez. */
export function encerrarTudo(): void {
  for (const id of processos.keys()) {
    const atual = item(id)
    if (atual) atual.status = 'pausado'
    encerrarProcesso(id)
  }
  salvarFilaAgora()
}
