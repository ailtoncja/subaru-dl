import type {
  Biblioteca,
  CampoDados,
  Colecao,
  Configuracoes,
  Duplicado,
  EntradaLog,
  EstadoFerramenta,
  FiltrosBusca,
  FonteDados,
  FormatoExportacao,
  ItemFila,
  ItemGaleria,
  LinhaDados,
  NomeFerramenta,
  OpcoesDownload,
  ResultadoBusca,
  Segredos
} from './tipos'

/** O que a interface pode pedir para o motor. Exposto em window.api pelo preload. */
export interface ApiSubaru {
  // Fila
  adicionar(urls: string[], opcoes?: Partial<OpcoesDownload>, iniciar?: boolean): Promise<{ adicionados: number; duplicados: Duplicado[] }>
  adicionarMesmoAssim(urls: string[], opcoes?: Partial<OpcoesDownload>): Promise<void>
  remover(ids: string[]): Promise<void>
  limparConcluidos(): Promise<void>
  iniciarFila(): Promise<void>
  pausarTodos(): Promise<void>
  pausar(id: string): Promise<void>
  retomar(id: string): Promise<void>
  tentarDeNovo(id: string): Promise<void>
  baixarAgora(id: string): Promise<void>
  atualizarOpcoes(id: string, opcoes: Partial<OpcoesDownload>): Promise<void>
  mover(id: string, direcao: 'cima' | 'baixo'): Promise<void>
  dividirPlaylist(id: string): Promise<void>
  obterFila(): Promise<ItemFila[]>

  // Biblioteca (fase 2)
  obterBiblioteca(): Promise<Biblioteca>
  etiquetar(id: string, tags: string[], colecoes: string[]): Promise<void>
  renomearNaBiblioteca(id: string, novoNome: string): Promise<{ ok: boolean; erro?: string }>
  excluirDaBiblioteca(ids: string[], apagarArquivos: boolean): Promise<number>
  removerSemArquivo(): Promise<number>
  criarColecao(nome: string): Promise<Colecao>
  renomearColecao(id: string, nome: string): Promise<void>
  excluirColecao(id: string): Promise<void>
  duracaoNaBiblioteca(id: string): Promise<number | null>
  dividirArquivo(id: string, cortes: number[], apagarOriginal: boolean): Promise<{ ok: boolean; partes?: number; erro?: string }>

  // Dados (fase 2)
  lerDados(fonte: FonteDados, entrada: string, limite: number, detalhado: boolean): Promise<LinhaDados[]>
  exportarDados(linhas: LinhaDados[], campos: CampoDados[], formato: FormatoExportacao): Promise<string | null>

  // Galeria (fase 3)
  obterGaleria(): Promise<ItemGaleria[]>
  adicionarGaleria(urls: string[]): Promise<number>
  pausarGaleria(id: string): Promise<void>
  retomarGaleria(id: string): Promise<void>
  removerGaleria(ids: string[]): Promise<void>
  limparGaleriaConcluidos(): Promise<void>

  // Arquivos
  abrirArquivo(caminho: string): Promise<void>
  abrirPasta(caminho: string): Promise<void>
  mostrarNaPasta(caminho: string): Promise<void>
  renomear(id: string, novoNome: string): Promise<{ ok: boolean; erro?: string }>
  escolherPasta(atual?: string): Promise<string | null>
  escolherArquivo(filtros?: { name: string; extensions: string[] }[]): Promise<string | null>
  lerArquivoLinks(): Promise<string[]>
  abrirLink(url: string): Promise<void>
  copiar(texto: string): Promise<void>

  // Configurações
  obterConfiguracoes(): Promise<Configuracoes>
  salvarConfiguracoes(parcial: Partial<Configuracoes>): Promise<Configuracoes>
  restaurarPadroes(): Promise<Configuracoes>
  obterSegredos(): Promise<Segredos>
  salvarSegredos(segredos: Segredos): Promise<void>
  perfisNavegador(navegador: string): Promise<string[]>

  // Busca no YouTube
  buscar(termo: string, filtros: FiltrosBusca, limite: number): Promise<ResultadoBusca[]>

  // Ferramentas
  ferramentas(): Promise<EstadoFerramenta[]>
  atualizarFerramenta(nome: NomeFerramenta): Promise<void>
  alvosImpersonar(): Promise<string[]>

  // Logs
  obterLogs(): Promise<EntradaLog[]>
  limparLogs(): Promise<void>
  exportarLogs(): Promise<string | null>

  // App
  versaoApp(): Promise<string>
  verificarAtualizacaoApp(): Promise<{ disponivel: boolean; versao?: string; mensagem: string }>

  // Eventos do motor
  aoMudarFila(cb: (fila: ItemFila[]) => void): () => void
  aoNovoLog(cb: (entrada: EntradaLog) => void): () => void
  aoMudarFerramentas(cb: (estado: EstadoFerramenta[]) => void): () => void
  aoLinkCopiado(cb: (url: string) => void): () => void
  aoDuplicados(cb: (urls: string[], duplicados: Duplicado[], iniciar: boolean) => void): () => void
  aoNavegar(cb: (pagina: string) => void): () => void
  aoMudarBiblioteca(cb: (b: Biblioteca) => void): () => void
  aoProgressoDados(cb: (lidos: number) => void): () => void
  aoMudarGaleria(cb: (itens: ItemGaleria[]) => void): () => void
}

/** Canais IPC: nome do método → canal. Eventos usam o prefixo "evt:". */
export const CANAIS_INVOKE = [
  'adicionar',
  'adicionarMesmoAssim',
  'remover',
  'limparConcluidos',
  'iniciarFila',
  'pausarTodos',
  'pausar',
  'retomar',
  'tentarDeNovo',
  'baixarAgora',
  'atualizarOpcoes',
  'mover',
  'dividirPlaylist',
  'obterFila',
  'obterBiblioteca',
  'etiquetar',
  'renomearNaBiblioteca',
  'excluirDaBiblioteca',
  'removerSemArquivo',
  'criarColecao',
  'renomearColecao',
  'excluirColecao',
  'duracaoNaBiblioteca',
  'dividirArquivo',
  'lerDados',
  'exportarDados',
  'obterGaleria',
  'adicionarGaleria',
  'pausarGaleria',
  'retomarGaleria',
  'removerGaleria',
  'limparGaleriaConcluidos',
  'abrirArquivo',
  'abrirPasta',
  'mostrarNaPasta',
  'renomear',
  'escolherPasta',
  'escolherArquivo',
  'lerArquivoLinks',
  'abrirLink',
  'copiar',
  'obterConfiguracoes',
  'salvarConfiguracoes',
  'restaurarPadroes',
  'obterSegredos',
  'salvarSegredos',
  'perfisNavegador',
  'buscar',
  'ferramentas',
  'atualizarFerramenta',
  'alvosImpersonar',
  'obterLogs',
  'limparLogs',
  'exportarLogs',
  'versaoApp',
  'verificarAtualizacaoApp'
] as const satisfies readonly (keyof ApiSubaru)[]

export const EVENTOS = {
  aoMudarFila: 'evt:fila',
  aoNovoLog: 'evt:log',
  aoMudarFerramentas: 'evt:ferramentas',
  aoLinkCopiado: 'evt:link-copiado',
  aoDuplicados: 'evt:duplicados',
  aoNavegar: 'evt:navegar',
  aoMudarBiblioteca: 'evt:biblioteca',
  aoProgressoDados: 'evt:dados-progresso',
  aoMudarGaleria: 'evt:galeria'
} as const satisfies Partial<Record<keyof ApiSubaru, string>>
