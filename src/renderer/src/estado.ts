import { create } from 'zustand'
import type { Configuracoes, Duplicado, EntradaHistorico, EntradaLog, EstadoFerramenta, ItemFila, ItemGaleria, ItemLote, OpcoesDownload } from '@shared/tipos'

export type Pagina = 'inicio' | 'downloads' | 'galeria' | 'logs' | 'dependencias' | 'configuracoes'

export interface Toast {
  id: number
  texto: string
  tipo: 'info' | 'erro'
}

interface PedidoDuplicados {
  urls: string[]
  duplicados: Duplicado[]
  iniciar: boolean
  opcoes?: Partial<OpcoesDownload>
  /** Lista com opções por link: "baixar de novo" usa as opções de cada um */
  lote?: ItemLote[]
  /** URLs novas que já entraram na fila (só informativo) */
  adicionados: number
}

interface Estado {
  pagina: Pagina
  fila: ItemFila[]
  historico: EntradaHistorico[]
  galeria: ItemGaleria[]
  config: Configuracoes | null
  logs: EntradaLog[]
  ferramentas: EstadoFerramenta[]
  /** Link copiado no navegador, oferecido na tela Início */
  linkCopiado: string | null
  /** Link que a tela Início deve abrir (Ctrl+V, botão Colar URL) */
  linkParaAbrir: string | null
  duplicados: PedidoDuplicados | null
  toasts: Toast[]
  ir: (p: Pagina) => void
}

export const useEstado = create<Estado>((set) => ({
  pagina: 'inicio',
  fila: [],
  historico: [],
  galeria: [],
  config: null,
  logs: [],
  ferramentas: [],
  linkCopiado: null,
  linkParaAbrir: null,
  duplicados: null,
  toasts: [],
  ir: (pagina) => set({ pagina })
}))

let proximoToast = 1
export function avisar(texto: string, tipo: Toast['tipo'] = 'info'): void {
  const id = proximoToast++
  useEstado.setState((s) => ({ toasts: [...s.toasts, { id, texto, tipo }] }))
  setTimeout(() => useEstado.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
}

export async function salvarConfig(parcial: Partial<Configuracoes>): Promise<void> {
  const config = await window.api.salvarConfiguracoes(parcial)
  useEstado.setState({ config })
}

/** Adiciona links à fila e abre o diálogo de duplicados quando preciso (item 8). */
export async function adicionarLinks(urls: string[], iniciar = false, opcoes?: Partial<OpcoesDownload>): Promise<number> {
  const r = await window.api.adicionar(urls, opcoes, iniciar)
  if (r.duplicados.length) {
    useEstado.setState({ duplicados: { urls: r.duplicados.map((d) => d.url), duplicados: r.duplicados, iniciar, opcoes, adicionados: r.adicionados } })
  } else if (r.adicionados === 0) {
    avisar('Nenhum link válido encontrado', 'erro')
  }
  return r.adicionados
}

/** Vários links, cada um com as suas opções (pasta, vídeos escolhidos). */
export async function adicionarLote(lote: ItemLote[], iniciar: boolean): Promise<number> {
  const r = await window.api.adicionarLote(lote, iniciar)
  if (r.duplicados.length) {
    const urls = new Set(r.duplicados.map((d) => d.url))
    useEstado.setState({
      duplicados: { urls: [...urls], duplicados: r.duplicados, iniciar, lote: lote.filter((l) => urls.has(l.url)), adicionados: r.adicionados }
    })
  }
  return r.adicionados
}

/** Abre um link na tela Início (prévia). */
export function abrirNoInicio(url: string): void {
  useEstado.setState({ linkParaAbrir: url, linkCopiado: null, pagina: 'inicio' })
}

export const extrairLinks = (texto: string): string[] => texto.match(/https?:\/\/[^\s"'<>]+/gi) ?? []

export async function iniciarEstado(): Promise<void> {
  const api = window.api
  const [fila, config, logs, historico, galeria] = await Promise.all([
    api.obterFila(),
    api.obterConfiguracoes(),
    api.obterLogs(),
    api.obterHistorico(),
    api.obterGaleria()
  ])
  useEstado.setState({ fila, config, logs, historico, galeria })

  api.aoMudarFila((fila) => useEstado.setState({ fila }))
  api.aoMudarHistorico((historico) => useEstado.setState({ historico }))
  api.aoMudarGaleria((galeria) => useEstado.setState({ galeria }))
  api.aoNovoLog((entrada) =>
    useEstado.setState((s) => ({ logs: s.logs.length > 3000 ? [...s.logs.slice(-2500), entrada] : [...s.logs, entrada] }))
  )
  api.aoMudarFerramentas((ferramentas) => useEstado.setState({ ferramentas }))
  api.aoLinkCopiado((url) => {
    // Não oferece de novo um link que já está na fila
    if (useEstado.getState().fila.some((i) => i.url === url)) return
    useEstado.setState({ linkCopiado: url })
  })
  api.aoDuplicados((urls, duplicados, iniciar) => useEstado.setState({ duplicados: { urls, duplicados, iniciar, adicionados: 0 } }))

  void api.ferramentas().then((ferramentas) => useEstado.setState({ ferramentas }))
}
