import { create } from 'zustand'
import type { Configuracoes, Duplicado, EntradaHistorico, EntradaLog, EstadoFerramenta, ItemFila, ItemGaleria, ItemLote, OpcoesDownload } from '@shared/tipos'

/** Abas do painel Ajustes: preferências, ferramentas embutidas e o registro */
export type AbaAjustes = 'preferencias' | 'ferramentas' | 'registro'
/** Abas da tabela de downloads */
export type AbaTabela = 'todos' | 'vivo' | 'fila' | 'concluidos' | 'falhas'

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
  /** O painel Ajustes desliza por cima da tabela; o campo e o placar continuam à vista */
  ajustesAberto: boolean
  abaAjustes: AbaAjustes
  abaTabela: AbaTabela
  fila: ItemFila[]
  historico: EntradaHistorico[]
  galeria: ItemGaleria[]
  config: Configuracoes | null
  logs: EntradaLog[]
  ferramentas: EstadoFerramenta[]
  /** Link copiado no navegador, oferecido logo abaixo do campo */
  linkCopiado: string | null
  /** Link que o campo deve abrir (Ctrl+V fora de um campo de texto) */
  linkParaAbrir: string | null
  duplicados: PedidoDuplicados | null
  toasts: Toast[]
  irAjustes: (aba: AbaAjustes) => void
  fecharAjustes: () => void
  verAba: (aba: AbaTabela) => void
}

export const useEstado = create<Estado>((set) => ({
  ajustesAberto: false,
  abaAjustes: 'preferencias',
  abaTabela: 'todos',
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
  irAjustes: (abaAjustes) => set({ ajustesAberto: true, abaAjustes }),
  fecharAjustes: () => set({ ajustesAberto: false }),
  verAba: (abaTabela) => set({ abaTabela, ajustesAberto: false })
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

/** Abre um link no campo (prévia) e tira o painel Ajustes da frente. */
export function abrirNoInicio(url: string): void {
  useEstado.setState({ linkParaAbrir: url, linkCopiado: null, ajustesAberto: false })
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
