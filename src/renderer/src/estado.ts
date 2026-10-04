import { create } from 'zustand'
import type { Biblioteca, Configuracoes, Duplicado, EntradaLog, EstadoFerramenta, ItemFila, ItemGaleria } from '@shared/tipos'

export type Pagina = 'downloads' | 'busca' | 'biblioteca' | 'galeria' | 'dados' | 'logs' | 'dependencias' | 'configuracoes'

export interface Toast {
  id: number
  texto: string
  tipo: 'info' | 'erro'
}

interface PedidoDuplicados {
  urls: string[]
  duplicados: Duplicado[]
  iniciar: boolean
  /** URLs novas que já entraram na fila (só informativo) */
  adicionados: number
}

interface Estado {
  pagina: Pagina
  fila: ItemFila[]
  biblioteca: Biblioteca
  galeria: ItemGaleria[]
  config: Configuracoes | null
  logs: EntradaLog[]
  ferramentas: EstadoFerramenta[]
  linkCopiado: string | null
  duplicados: PedidoDuplicados | null
  toasts: Toast[]
  ir: (p: Pagina) => void
}

export const useEstado = create<Estado>((set) => ({
  pagina: 'downloads',
  fila: [],
  biblioteca: { itens: [], colecoes: [] },
  galeria: [],
  config: null,
  logs: [],
  ferramentas: [],
  linkCopiado: null,
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
export async function adicionarLinks(urls: string[], iniciar = false, opcoes?: Parameters<typeof window.api.adicionar>[1]): Promise<number> {
  const r = await window.api.adicionar(urls, opcoes, iniciar)
  if (r.duplicados.length) {
    useEstado.setState({ duplicados: { urls: r.duplicados.map((d) => d.url), duplicados: r.duplicados, iniciar, adicionados: r.adicionados } })
  } else if (r.adicionados === 0) {
    avisar('Nenhum link válido encontrado', 'erro')
  }
  return r.adicionados
}

export async function iniciarEstado(): Promise<void> {
  const api = window.api
  const [fila, config, logs, biblioteca, galeria] = await Promise.all([
    api.obterFila(),
    api.obterConfiguracoes(),
    api.obterLogs(),
    api.obterBiblioteca(),
    api.obterGaleria()
  ])
  useEstado.setState({ fila, config, logs, biblioteca, galeria })

  api.aoMudarFila((fila) => useEstado.setState({ fila }))
  api.aoMudarBiblioteca((biblioteca) => useEstado.setState({ biblioteca }))
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
  api.aoNavegar((pagina) => useEstado.setState({ pagina: pagina as Pagina }))

  void api.ferramentas().then((ferramentas) => useEstado.setState({ ferramentas }))
}
