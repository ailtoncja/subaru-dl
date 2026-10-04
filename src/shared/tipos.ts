// Tipos compartilhados entre o processo principal (motor) e a interface.

export type Modo = 'video' | 'audio'
export type Qualidade = 'melhor' | '4320' | '2160' | '1440' | '1080' | '720' | '480' | '360'
export type CodecVideo = 'auto' | 'h264' | 'vp9' | 'av1'
export type CodecAudio = 'auto' | 'aac' | 'opus'
export type Container = 'mp4' | 'mkv' | 'webm'
export type FormatoAudio = 'mp3' | 'm4a' | 'opus' | 'aac' | 'ogg' | 'wav' | 'flac'
export type FormatoLegenda = 'srt' | 'vtt' | 'ass' | 'ttml' | 'json3'
export type PosProcesso = 'nenhum' | 'fps30' | 'mp42' | 'personalizado'

export interface OpcoesLegendas {
  ativas: boolean
  automaticas: boolean
  /** Códigos de idioma (ex.: "pt", "en"). Vazio + todas = baixar todas. */
  idiomas: string[]
  todas: boolean
  formato: FormatoLegenda
  embutir: boolean
}

/** Opções de um download. A fila guarda uma cópia por item (item 29: preferências por item). */
export interface OpcoesDownload {
  modo: Modo
  qualidade: Qualidade
  /** Formato exato escolhido na lista real do vídeo (item 11). Tem prioridade sobre qualidade/codec. */
  formatoId: string | null
  codecVideo: CodecVideo
  codecAudio: CodecAudio
  ate30fps: boolean
  container: Container
  formatoAudio: FormatoAudio
  /** kbps; 0 = melhor qualidade possível */
  bitrateAudio: number
  /** Idioma da faixa de áudio (dublagens). null = padrão do vídeo. */
  idiomaAudio: string | null
  manterOriginal: boolean

  /** Trecho em segundos (item 35). */
  trecho: { inicio: number; fim: number } | null
  /** Títulos dos capítulos a baixar (item 36). */
  capitulos: string[]
  separarCapitulos: boolean
  cortePreciso: boolean
  liveDoInicio: boolean

  legendas: OpcoesLegendas

  embutirMetadados: boolean
  embutirCapa: boolean
  salvarMiniatura: boolean
  posProcesso: PosProcesso
  posProcessoModo: 'remux' | 'recodificar'
  posProcessoArgs: string

  /** Itens da playlist no formato do yt-dlp (ex.: "1,3,5-8"). Vazio = todos. */
  itensPlaylist: string
  limitePlaylist: number
  ordemInvertida: boolean

  /** Pasta sobrescrita só para este item. null = usa a das configurações. */
  pasta: string | null
  /** Organizar em subpastas por playlist, canal… */
  subpasta: PresetSubpasta
  subpastaPersonalizada: string
}

export type StatusItem =
  | 'buscando' // lendo as informações do link
  | 'pronto' // aguardando na fila
  | 'baixando'
  | 'processando' // juntando/convertendo depois do download
  | 'pausado'
  | 'aguardando-nova-tentativa'
  | 'concluido'
  | 'erro'

export interface Formato {
  id: string
  ext: string
  resolucao: string | null
  altura: number | null
  fps: number | null
  vcodec: string | null
  acodec: string | null
  tamanho: number | null
  aproximado: boolean
  tbr: number | null
  abr: number | null
  idioma: string | null
  nota: string | null
  /** https, m3u8_native, http_dash_segments… */
  protocolo: string | null
}

export interface Capitulo {
  titulo: string
  inicio: number
  fim: number
}

export interface EntradaPlaylist {
  indice: number
  id: string
  titulo: string
  duracao: number | null
  url: string
}

export interface InfoMidia {
  id: string
  titulo: string
  canal: string | null
  site: string
  urlPagina: string
  miniatura: string | null
  duracao: number | null
  dataUpload: string | null
  views: number | null
  likes: number | null
  descricao: string | null
  aoVivo: boolean
  formatos: Formato[]
  legendas: string[]
  legendasAuto: string[]
  idiomasAudio: string[]
  capitulos: Capitulo[]
  playlist: { titulo: string; total: number; entradas: EntradaPlaylist[] } | null
}

export interface Progresso {
  porcentagem: number
  baixado: number | null
  total: number | null
  velocidade: number | null
  eta: number | null
  /** Ex.: "Juntando vídeo e áudio", "Convertendo", "Baixando legendas" */
  etapa: string | null
  /** Para playlists: vídeo atual e total */
  itemAtual: number | null
  itensTotal: number | null
}

/** O que o yt-dlp informa de cada arquivo terminado (vídeo por vídeo, mesmo em playlists). */
export interface MidiaBaixada {
  idMidia: string
  titulo: string
  canal: string | null
  site: string
  url: string
  duracao: number | null
  altura: number | null
  fps: number | null
  abr: number | null
  ext: string
  arquivo: string
  miniatura: string | null
  dataUpload: string | null
  playlist: string | null
  views: number | null
  likes: number | null
}

export interface ItemFila {
  id: string
  url: string
  status: StatusItem
  info: InfoMidia | null
  opcoes: OpcoesDownload
  progresso: Progresso
  arquivos: string[]
  midias: MidiaBaixada[]
  erro: string | null
  dicaErro: string | null
  tentativa: number
  proximaTentativaEm: number | null
  criadoEm: number
  concluidoEm: number | null
}

export type PresetSubpasta = 'nenhuma' | 'playlist' | 'canal' | 'canal-playlist' | 'ano-mes' | 'artista-album' | 'personalizado'
export type PresetNome = 'titulo' | 'titulo-qualidade' | 'playlist-titulo-qualidade' | 'personalizado'
export type CampoNome = 'data' | 'views' | 'canal' | 'duracao' | 'resolucao' | 'id'
export type Navegador = 'nenhum' | 'firefox' | 'chrome' | 'edge' | 'brave' | 'opera' | 'vivaldi' | 'chromium'
export type CanalAtualizacao = 'stable' | 'nightly'
export type AcaoDuplicado = 'perguntar' | 'pular' | 'permitir'

export interface Configuracoes {
  // Padrões para novos downloads
  padrao: OpcoesDownload

  // Pastas e nomes
  pastaVideo: string
  pastaAudio: string
  nome: PresetNome
  nomePersonalizado: string
  camposNoNome: CampoNome[]
  numerarPlaylist: boolean
  nomesSeguros: boolean

  // Fila
  simultaneos: number
  tentativasAuto: number
  intervaloTentativa: number
  salvarFila: boolean
  usarAria2: boolean
  argsAria2: string

  // Entrada
  monitorarClipboard: boolean
  preferirVideoEmPlaylist: boolean
  acaoDuplicado: AcaoDuplicado
  atalhosAtivos: boolean
  atalhoAdicionar: string
  atalhoBaixarFila: string
  atalhoAdicionarEBaixar: string

  // Filtros
  filtros: {
    tamanhoMin: string
    tamanhoMax: string
    dataModo: 'desligado' | 'exata' | 'antes' | 'depois'
    data: string
    matchFilters: string
    breakMatchFilters: string
  }

  // Rede e login
  cookies: {
    origem: 'nenhum' | 'navegador' | 'arquivo'
    navegador: Navegador
    perfil: string
    arquivo: string
    ignorarSites: string[]
  }
  proxy: { ativo: boolean; tipo: 'http' | 'socks5'; host: string; porta: string; usuario: string }
  impersonar: string
  extractorArgs: string
  argsExtras: string
  playerJsReal: boolean

  // Sistema
  bandeja: boolean
  minimizarAoFechar: boolean
  iniciarComWindows: boolean
  iniciarMinimizado: boolean
  atualizarFerramentas: boolean
  canalYtdlp: CanalAtualizacao
  atualizarApp: boolean

  // Galeria
  pastaGaleria: string
  galeriaSimultaneos: number
  galeriaPularBaixados: boolean
  galeriaIntervalo: string
  galeriaOrganizar: OrganizarGaleria
  /** Segundos de pausa entre um arquivo e outro (evita bloqueio em alguns sites) */
  galeriaPausa: number
}

/** Dados sensíveis, guardados criptografados com o cofre do Windows (DPAPI). */
export interface Segredos {
  usuario: string
  senha: string
  senhaVideo: string
  token: string
  cabecalhos: string
  senhaProxy: string
}

/** Um arquivo baixado (aparece em Downloads → Concluídos e detecta duplicados). */
export interface EntradaHistorico {
  id: string
  idMidia: string
  site: string
  url: string
  titulo: string
  canal: string | null
  duracao: number | null
  miniatura: string | null
  modo: Modo
  /** Extensão do arquivo (mp4, mp3…) */
  formato: string
  /** "1080p", "320k"… */
  qualidade: string | null
  arquivo: string
  tamanho: number
  baixadoEm: number
  /** Preenchido ao listar: o arquivo ainda existe no disco? */
  arquivoExiste?: boolean
}

// ---------- Galeria (item 74) ----------

export type StatusGaleria = 'aguardando' | 'baixando' | 'pausado' | 'concluido' | 'erro'

export type OrganizarGaleria = 'padrao' | 'plana'

/** Um arquivo listado na prévia da galeria. `indice` é a posição usada pelo --range do gallery-dl. */
export interface ArquivoGaleria {
  indice: number
  url: string
  nome: string
  ext: string
  largura: number | null
  altura: number | null
  video: boolean
}

export interface ItemGaleria {
  id: string
  url: string
  status: StatusGaleria
  pasta: string
  organizar: OrganizarGaleria
  /** Quais arquivos baixar (ex.: "1-3,7"), escolhidos na prévia. null = todos (ou o das configurações) */
  intervalo: string | null
  arquivos: number
  ultimoArquivo: string | null
  pulados: number
  falhas: number
  dicaErro: string | null
  erro: string | null
  criadoEm: number
  concluidoEm: number | null
}

export interface Duplicado {
  url: string
  titulo: string
  baixadoEm: number
  arquivoExiste: boolean
}

export type NivelLog = 'comando' | 'info' | 'aviso' | 'erro'

export interface EntradaLog {
  id: number
  hora: number
  nivel: NivelLog
  itemId: string | null
  texto: string
}

export type NomeFerramenta = 'yt-dlp' | 'deno' | 'ffmpeg' | 'gallery-dl' | 'aria2'

export interface EstadoFerramenta {
  nome: NomeFerramenta
  descricao: string
  versao: string | null
  atualizando: boolean
  mensagem: string | null
}
