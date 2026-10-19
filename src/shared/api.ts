import type {
  ArquivoGaleria,
  CelularEncontrado,
  Configuracoes,
  Duplicado,
  EntradaHistorico,
  EntradaLog,
  EstadoAtualizacao,
  EstadoFerramenta,
  InfoMidia,
  ItemFila,
  ItemGaleria,
  ItemLote,
  NomeFerramenta,
  OpcoesDownload,
  OrganizarGaleria,
  ResultadoCookies,
  ResultadoEnvioCelular,
  Segredos
} from './tipos'

/** O que a interface pode pedir para o motor. Exposto em window.api pelo preload. */
export interface ApiSubaru {
  // Fila
  /** Lê o link para a prévia (e diz se já foi baixado antes). */
  lerLink(url: string): Promise<{ info: InfoMidia; duplicado: Duplicado | null }>
  adicionar(urls: string[], opcoes?: Partial<OpcoesDownload>, iniciar?: boolean): Promise<{ adicionados: number; duplicados: Duplicado[] }>
  adicionarMesmoAssim(urls: string[], opcoes?: Partial<OpcoesDownload>, iniciar?: boolean): Promise<void>
  adicionarComInfo(url: string, info: InfoMidia, opcoes: Partial<OpcoesDownload>, iniciar: boolean): Promise<void>
  /** Vários links, cada um com as suas opções. */
  adicionarLote(lote: ItemLote[], iniciar: boolean, ignorarDuplicados?: boolean): Promise<{ adicionados: number; duplicados: Duplicado[] }>
  remover(ids: string[]): Promise<void>
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

  // Histórico (Downloads → Concluídos)
  obterHistorico(): Promise<EntradaHistorico[]>
  removerDoHistorico(ids: string[]): Promise<void>
  limparHistorico(): Promise<void>

  // Galeria
  obterGaleria(): Promise<ItemGaleria[]>
  adicionarGaleria(urls: string[], pasta?: string | null, organizar?: OrganizarGaleria | null, intervalo?: string | null, formatoPasta?: string | null): Promise<number>
  /** Prévia: lista os arquivos de um link sem baixar. */
  listarArquivosGaleria(url: string, inicio: number, quantidade: number): Promise<{ arquivos: ArquivoGaleria[]; fim: boolean }>
  pausarGaleria(id: string): Promise<void>
  retomarGaleria(id: string): Promise<void>
  removerGaleria(ids: string[]): Promise<void>
  limparGaleriaConcluidos(): Promise<void>

  // Arquivos
  abrirArquivo(caminho: string): Promise<void>
  abrirPasta(caminho: string): Promise<void>
  mostrarNaPasta(caminho: string): Promise<void>
  escolherPasta(atual?: string): Promise<string | null>
  escolherArquivo(filtros?: { name: string; extensions: string[] }[]): Promise<string | null>
  lerArquivoLinks(): Promise<string[]>
  abrirLink(url: string): Promise<void>
  copiar(texto: string): Promise<void>
  lerClipboard(): Promise<string>

  // Janela (barra de título própria)
  janelaMinimizar(): Promise<void>
  janelaMaximizar(): Promise<void>
  janelaFechar(): Promise<void>

  // Configurações
  obterConfiguracoes(): Promise<Configuracoes>
  salvarConfiguracoes(parcial: Partial<Configuracoes>): Promise<Configuracoes>
  restaurarPadroes(): Promise<Configuracoes>
  obterSegredos(): Promise<Segredos>
  salvarSegredos(segredos: Segredos): Promise<void>
  perfisNavegador(navegador: string): Promise<string[]>
  /** Lê os cookies do navegador e grava um cookies.txt pronto para o yt-dlp e o gallery-dl */
  exportarCookies(navegador: string, perfil: string, soSites: boolean): Promise<ResultadoCookies>
  /** Importa um cookies.txt (ex.: exportado por extensão no Chrome/Edge), valida e passa a usá-lo */
  importarCookies(caminho: string, soSites: boolean): Promise<ResultadoCookies>
  /** Procura na pasta Downloads o cookies.txt que uma extensão acabou de exportar. Devolve o caminho ou null */
  acharCookiesBaixado(): Promise<string | null>
  /** Copia o cookies.txt gerado para onde o usuário escolher (ex.: para levar ao celular). Devolve o destino. */
  salvarCookiesComo(): Promise<string | null>
  /** Procura, na rede local, celulares com o Subaru DL esperando cookies */
  procurarCelulares(): Promise<CelularEncontrado[]>
  /** Manda o cookies.txt para o celular (cifrado com o código que aparece lá) */
  enviarCookiesAoCelular(endereco: string, codigo: string): Promise<ResultadoEnvioCelular>

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
  estadoAtualizacao(): Promise<EstadoAtualizacao>
  /** Fecha, instala a versão já baixada e abre o programa de novo */
  instalarAtualizacao(): Promise<void>

  // Eventos do motor
  aoMudarFila(cb: (fila: ItemFila[]) => void): () => void
  aoMudarHistorico(cb: (h: EntradaHistorico[]) => void): () => void
  aoMudarGaleria(cb: (itens: ItemGaleria[]) => void): () => void
  aoNovoLog(cb: (entrada: EntradaLog) => void): () => void
  aoMudarFerramentas(cb: (estado: EstadoFerramenta[]) => void): () => void
  aoLinkCopiado(cb: (url: string) => void): () => void
  aoDuplicados(cb: (urls: string[], duplicados: Duplicado[], iniciar: boolean) => void): () => void
  aoMaximizar(cb: (maximizada: boolean) => void): () => void
  aoMudarAtualizacao(cb: (estado: EstadoAtualizacao) => void): () => void
}

/** Canais IPC: nome do método → canal. Eventos usam o prefixo "evt:". */
export const CANAIS_INVOKE = [
  'lerLink',
  'adicionar',
  'adicionarMesmoAssim',
  'adicionarComInfo',
  'adicionarLote',
  'remover',
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
  'obterHistorico',
  'removerDoHistorico',
  'limparHistorico',
  'obterGaleria',
  'adicionarGaleria',
  'listarArquivosGaleria',
  'pausarGaleria',
  'retomarGaleria',
  'removerGaleria',
  'limparGaleriaConcluidos',
  'abrirArquivo',
  'abrirPasta',
  'mostrarNaPasta',
  'escolherPasta',
  'escolherArquivo',
  'lerArquivoLinks',
  'abrirLink',
  'copiar',
  'lerClipboard',
  'janelaMinimizar',
  'janelaMaximizar',
  'janelaFechar',
  'obterConfiguracoes',
  'salvarConfiguracoes',
  'restaurarPadroes',
  'obterSegredos',
  'salvarSegredos',
  'perfisNavegador',
  'exportarCookies',
  'importarCookies',
  'acharCookiesBaixado',
  'salvarCookiesComo',
  'procurarCelulares',
  'enviarCookiesAoCelular',
  'ferramentas',
  'atualizarFerramenta',
  'alvosImpersonar',
  'obterLogs',
  'limparLogs',
  'exportarLogs',
  'versaoApp',
  'verificarAtualizacaoApp',
  'estadoAtualizacao',
  'instalarAtualizacao'
] as const satisfies readonly (keyof ApiSubaru)[]

export const EVENTOS = {
  aoMudarFila: 'evt:fila',
  aoMudarHistorico: 'evt:historico',
  aoMudarGaleria: 'evt:galeria',
  aoNovoLog: 'evt:log',
  aoMudarFerramentas: 'evt:ferramentas',
  aoLinkCopiado: 'evt:link-copiado',
  aoDuplicados: 'evt:duplicados',
  aoMaximizar: 'evt:maximizar',
  aoMudarAtualizacao: 'evt:atualizacao'
} as const satisfies Partial<Record<keyof ApiSubaru, string>>
