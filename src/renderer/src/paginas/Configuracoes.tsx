import { FolderOpen, RefreshCw, RotateCcw, Search, X } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import type { CampoNome, Configuracoes as TConfig, Navegador, OpcoesDownload, Segredos } from '@shared/tipos'
import { SelecaoOrganizar, SelecaoOrganizarGaleria } from '../componentes/Destino'
import { EditorLegendas, EditorPosProcesso, EditorQualidade } from '../componentes/EditorOpcoes'
import { Dialogo, Etiquetas, Interruptor, Linha, LinhaInterruptor, Selecao } from '../componentes/ui'
import { avisar, salvarConfig, useEstado } from '../estado'

interface ItemConfig {
  /** Palavras usadas pela busca */
  texto: string
  el: ReactNode
}

interface SecaoConfig {
  id: string
  titulo: string
  itens: ItemConfig[]
}

const NAVEGADORES: Array<{ valor: Navegador; nome: string }> = [
  { valor: 'firefox', nome: 'Firefox' },
  { valor: 'chrome', nome: 'Chrome' },
  { valor: 'edge', nome: 'Edge' },
  { valor: 'brave', nome: 'Brave' },
  { valor: 'opera', nome: 'Opera' },
  { valor: 'vivaldi', nome: 'Vivaldi' },
  { valor: 'chromium', nome: 'Chromium' }
]

const CAMPOS_NOME: Array<{ valor: CampoNome; nome: string; exemplo: string }> = [
  { valor: 'data', nome: 'Data de envio', exemplo: '2025-03-14' },
  { valor: 'canal', nome: 'Canal', exemplo: 'Canal' },
  { valor: 'views', nome: 'Visualizações', exemplo: '15230 views' },
  { valor: 'duracao', nome: 'Duração', exemplo: '12:04' },
  { valor: 'resolucao', nome: 'Resolução', exemplo: '1920x1080' },
  { valor: 'id', nome: 'ID do vídeo', exemplo: 'dQw4w9WgXcQ' }
]

/** Mostra como o arquivo vai ficar com as opções atuais. */
function exemploNome(c: TConfig, audio: boolean): string {
  const ext = audio ? c.padrao.formatoAudio : c.padrao.container
  const qualidade = audio ? `(${c.padrao.bitrateAudio || 160}k)` : '(1080p60)'
  const pastas: Record<string, string> = {
    nenhuma: '',
    playlist: 'Minha Playlist\\',
    canal: 'Canal\\',
    'canal-playlist': 'Canal\\Minha Playlist\\',
    'ano-mes': '2025\\03\\',
    'artista-album': 'Artista\\Álbum\\',
    personalizado: c.padrao.subpastaPersonalizada.replace(/%\([^)]*\)s/g, '…') + '\\'
  }
  let nome =
    c.nome === 'titulo-qualidade'
      ? `Meu Vídeo-${qualidade}`
      : c.nome === 'playlist-titulo-qualidade'
        ? `003-Meu Vídeo-${qualidade}`
        : c.nome === 'personalizado'
          ? c.nomePersonalizado.replace(/%\(title\)s/g, 'Meu Vídeo').replace(/%\([^)]*\)[sd]/g, '…')
          : 'Meu Vídeo'
  const prefixo = c.camposNoNome.map((campo) => `[${CAMPOS_NOME.find((x) => x.valor === campo)!.exemplo}]`).join(' ')
  if (prefixo) nome = `${prefixo} ${nome}`
  if (c.nomesSeguros) nome = nome.replace(/\s+/g, '_').replace(/[^\w.\-[\]()]/g, '')
  return `${pastas[c.padrao.subpasta] ?? ''}${nome}.${ext}`
}

/** Campo que grava a tecla pressionada no formato do Electron (ex.: CommandOrControl+Shift+A). */
function CampoAtalho({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const [gravando, setGravando] = useState(false)
  return (
    <input
      className="campo mono"
      style={{ width: 230, textAlign: 'center', borderColor: gravando ? 'var(--yellow)' : undefined }}
      readOnly
      value={gravando ? 'Pressione as teclas…' : valor.replace('CommandOrControl', 'Ctrl') || 'Nenhum'}
      onFocus={() => setGravando(true)}
      onBlur={() => setGravando(false)}
      onKeyDown={(e) => {
        e.preventDefault()
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
        if (e.key === 'Escape') return e.currentTarget.blur()
        if (e.key === 'Backspace' || e.key === 'Delete') {
          aoMudar('')
          return e.currentTarget.blur()
        }
        const partes: string[] = []
        if (e.ctrlKey) partes.push('CommandOrControl')
        if (e.altKey) partes.push('Alt')
        if (e.shiftKey) partes.push('Shift')
        if (!partes.length) return // atalho global precisa de modificador
        const tecla = e.key.length === 1 ? e.key.toUpperCase() : e.key.replace(/^Arrow/, '')
        partes.push(tecla)
        aoMudar(partes.join('+'))
        e.currentTarget.blur()
      }}
    />
  )
}

/** Campo de texto que só salva ao sair (para não gravar a cada tecla). */
function CampoTexto({
  valor,
  aoSalvar,
  largura,
  placeholder,
  mono,
  multilinha,
  senha
}: {
  valor: string
  aoSalvar: (v: string) => void
  largura?: number | string
  placeholder?: string
  mono?: boolean
  multilinha?: boolean
  senha?: boolean
}) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  const props = {
    className: `campo${mono ? ' mono' : ''}`,
    style: { width: largura ?? '100%' },
    value: texto,
    placeholder,
    onChange: (e: { target: { value: string } }) => setTexto(e.target.value),
    onBlur: () => texto !== valor && aoSalvar(texto)
  }
  return multilinha ? <textarea {...props} spellCheck={false} /> : <input {...props} type={senha ? 'password' : 'text'} spellCheck={false} />
}

export default function Configuracoes() {
  const config = useEstado((s) => s.config)!
  const c = config
  const [busca, setBusca] = useState('')
  const [segredos, setSegredos] = useState<Segredos | null>(null)
  const [perfis, setPerfis] = useState<string[]>([])
  const [alvos, setAlvos] = useState<string[]>([])
  const [atualizacao, setAtualizacao] = useState('')
  const [confirmarReset, setConfirmarReset] = useState(false)

  useEffect(() => void window.api.obterSegredos().then(setSegredos), [])
  useEffect(() => {
    if (c.cookies.origem === 'navegador') void window.api.perfisNavegador(c.cookies.navegador).then(setPerfis)
  }, [c.cookies.origem, c.cookies.navegador])

  const mudarPadrao = (parcial: Partial<OpcoesDownload>) => salvarConfig({ padrao: { ...c.padrao, ...parcial } })
  const mudarSegredo = async (parcial: Partial<Segredos>) => {
    if (!segredos) return
    const novos = { ...segredos, ...parcial }
    setSegredos(novos)
    try {
      await window.api.salvarSegredos(novos)
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e), 'erro')
    }
  }
  const escolherPasta = async (chave: 'pastaVideo' | 'pastaAudio') => {
    const pasta = await window.api.escolherPasta(c[chave])
    if (pasta) void salvarConfig({ [chave]: pasta })
  }

  const secoes: SecaoConfig[] = [
    {
      id: 'padroes',
      titulo: 'Padrões de download',
      itens: [
        {
          texto: 'tipo vídeo áudio qualidade resolução formato contêiner mp4 mkv webm codec h264 vp9 av1 aac opus fps 30 bitrate mp3 m4a flac wav faixa idioma dublagem manter streams originais live começo',
          el: <EditorQualidade o={c.padrao} mudar={mudarPadrao} />
        }
      ]
    },
    {
      id: 'legendas',
      titulo: 'Legendas',
      itens: [{ texto: 'legendas automáticas idiomas formato srt vtt ass embutir', el: <EditorLegendas o={c.padrao} mudar={mudarPadrao} /> }]
    },
    {
      id: 'pos',
      titulo: 'Pós-processamento',
      itens: [
        { texto: 'metadados capa miniatura thumbnail recodificar 30 fps mp42 ffmpeg argumentos', el: <EditorPosProcesso o={c.padrao} mudar={mudarPadrao} /> }
      ]
    },
    {
      id: 'pastas',
      titulo: 'Pastas e nomes de arquivo',
      itens: [
        {
          texto: 'pasta destino vídeos',
          el: (
            <Linha rotulo="Pasta dos vídeos" dica={c.pastaVideo}>
              <button className="btn pequeno" onClick={() => escolherPasta('pastaVideo')}>
                <FolderOpen /> Escolher…
              </button>
            </Linha>
          )
        },
        {
          texto: 'pasta destino áudio músicas',
          el: (
            <Linha rotulo="Pasta dos áudios" dica={c.pastaAudio}>
              <button className="btn pequeno" onClick={() => escolherPasta('pastaAudio')}>
                <FolderOpen /> Escolher…
              </button>
            </Linha>
          )
        },
        {
          texto: 'organizar subpastas playlist canal ano mês artista álbum',
          el: (
            <Linha rotulo="Organizar em subpastas (padrão)" dica="Dá para mudar em cada download, na tela Início" coluna={c.padrao.subpasta === 'personalizado'}>
              <SelecaoOrganizar o={c.padrao} mudar={mudarPadrao} />
            </Linha>
          )
        },
        {
          texto: 'nome arquivo modelo título qualidade playlist personalizado template',
          el: (
            <Linha rotulo="Nome do arquivo" coluna={c.nome === 'personalizado'} dica={c.nome === 'personalizado' ? 'Usa o modelo do yt-dlp, ex.: %(title)s [%(id)s]' : undefined}>
              <div className="flex">
                <Selecao
                  valor={c.nome}
                  aoMudar={(nome) => salvarConfig({ nome })}
                  largura={240}
                  opcoes={[
                    { valor: 'titulo', nome: 'Só o título' },
                    { valor: 'titulo-qualidade', nome: 'Título + qualidade' },
                    { valor: 'playlist-titulo-qualidade', nome: 'Nº da playlist + título + qualidade' },
                    { valor: 'personalizado', nome: 'Personalizado' }
                  ]}
                />
                {c.nome === 'personalizado' && (
                  <CampoTexto mono valor={c.nomePersonalizado} aoSalvar={(nomePersonalizado) => salvarConfig({ nomePersonalizado })} />
                )}
              </div>
            </Linha>
          )
        },
        {
          texto: 'dados no nome data canal visualizações duração resolução id prefixo',
          el: (
            <Linha rotulo="Incluir no começo do nome" coluna>
              <div className="chips">
                {CAMPOS_NOME.map((campo) => {
                  const ativo = c.camposNoNome.includes(campo.valor)
                  return (
                    <button
                      key={campo.valor}
                      className={`chip${ativo ? ' ativo' : ''}`}
                      onClick={() =>
                        salvarConfig({ camposNoNome: ativo ? c.camposNoNome.filter((x) => x !== campo.valor) : [...c.camposNoNome, campo.valor] })
                      }
                    >
                      {campo.nome}
                    </button>
                  )
                })}
              </div>
            </Linha>
          )
        },
        {
          texto: 'numerar playlist número ordem',
          el: (
            <LinhaInterruptor
              rotulo="Numerar os arquivos de playlists"
              dica='Ex.: "003 - Título". A ordem invertida fica nas preferências de cada playlist.'
              ligado={c.numerarPlaylist}
              aoMudar={(numerarPlaylist) => salvarConfig({ numerarPlaylist })}
            />
          )
        },
        {
          texto: 'nomes seguros restringir espaços caracteres especiais',
          el: (
            <LinhaInterruptor
              rotulo="Nomes seguros"
              dica="Troca espaços por _ e remove acentos e caracteres especiais"
              ligado={c.nomesSeguros}
              aoMudar={(nomesSeguros) => salvarConfig({ nomesSeguros })}
            />
          )
        },
        {
          texto: 'exemplo prévia nome',
          el: (
            <Linha rotulo="Como vai ficar" coluna>
              <span className="mono pequeno amarelo">{exemploNome(c, c.padrao.modo === 'audio')}</span>
            </Linha>
          )
        }
      ]
    },
    {
      id: 'fila',
      titulo: 'Fila e downloads',
      itens: [
        {
          texto: 'downloads simultâneos ao mesmo tempo paralelos',
          el: (
            <Linha rotulo="Downloads ao mesmo tempo">
              <Selecao valor={c.simultaneos} aoMudar={(simultaneos) => salvarConfig({ simultaneos })} opcoes={[1, 2, 3, 4, 5, 6, 8].map((n) => ({ valor: n, nome: String(n) }))} largura={80} />
            </Linha>
          )
        },
        {
          texto: 'tentar de novo automaticamente tentativas falha erro intervalo',
          el: (
            <Linha rotulo="Tentar de novo quando falhar" dica="Quantas vezes e quanto esperar entre as tentativas">
              <Selecao
                valor={c.tentativasAuto}
                aoMudar={(tentativasAuto) => salvarConfig({ tentativasAuto })}
                opcoes={[0, 1, 2, 3, 5, 10].map((n) => ({ valor: n, nome: n ? `${n}×` : 'Não' }))}
                largura={80}
              />
              <Selecao
                valor={c.intervaloTentativa}
                aoMudar={(intervaloTentativa) => salvarConfig({ intervaloTentativa })}
                opcoes={[5, 10, 30, 60, 120, 300].map((n) => ({ valor: n, nome: n < 60 ? `${n} s` : `${n / 60} min` }))}
                largura={90}
              />
            </Linha>
          )
        },
        {
          texto: 'salvar fila fechar restaurar abrir',
          el: (
            <LinhaInterruptor
              rotulo="Salvar a fila ao fechar"
              dica="Ao abrir de novo, a fila volta e os downloads interrompidos continuam de onde pararam"
              ligado={c.salvarFila}
              aoMudar={(salvarFila) => salvarConfig({ salvarFila })}
            />
          )
        },
        {
          texto: 'aria2 acelerador conexões velocidade',
          el: (
            <LinhaInterruptor
              rotulo="Usar o aria2 (acelerador)"
              dica="Baixa com várias conexões ao mesmo tempo. Alguns sites não gostam; desligue se der erro."
              ligado={c.usarAria2}
              aoMudar={(usarAria2) => salvarConfig({ usarAria2 })}
            />
          )
        },
        ...(c.usarAria2
          ? [
              {
                texto: 'aria2 argumentos',
                el: (
                  <Linha rotulo="Argumentos do aria2" dica="-x conexões por servidor, -s partes, -k tamanho mínimo da parte">
                    <CampoTexto mono largura={220} valor={c.argsAria2} aoSalvar={(argsAria2) => salvarConfig({ argsAria2 })} />
                  </Linha>
                )
              }
            ]
          : [])
      ]
    },
    {
      id: 'entrada',
      titulo: 'Entrada de links',
      itens: [
        {
          texto: 'monitorar área de transferência clipboard copiar link',
          el: (
            <LinhaInterruptor
              rotulo="Monitorar a área de transferência"
              dica="Quando você copia um link, o Subaru DL oferece para baixar"
              ligado={c.monitorarClipboard}
              aoMudar={(monitorarClipboard) => salvarConfig({ monitorarClipboard })}
            />
          )
        },
        {
          texto: 'preferir vídeo playlist link misto',
          el: (
            <LinhaInterruptor
              rotulo="Link de vídeo dentro de playlist → só o vídeo"
              dica="Links como watch?v=…&list=… baixam só aquele vídeo, não a playlist toda"
              ligado={c.preferirVideoEmPlaylist}
              aoMudar={(preferirVideoEmPlaylist) => salvarConfig({ preferirVideoEmPlaylist })}
            />
          )
        },
        {
          texto: 'duplicados já baixados repetidos histórico',
          el: (
            <Linha rotulo="Links que já foram baixados">
              <Selecao
                valor={c.acaoDuplicado}
                aoMudar={(acaoDuplicado) => salvarConfig({ acaoDuplicado })}
                largura={200}
                opcoes={[
                  { valor: 'perguntar', nome: 'Perguntar' },
                  { valor: 'pular', nome: 'Pular sozinho' },
                  { valor: 'permitir', nome: 'Baixar de novo' }
                ]}
              />
            </Linha>
          )
        },
        {
          texto: 'atalhos globais teclado',
          el: (
            <LinhaInterruptor
              rotulo="Atalhos globais"
              dica="Funcionam mesmo com o Subaru DL minimizado. Usam o link da área de transferência."
              ligado={c.atalhosAtivos}
              aoMudar={(atalhosAtivos) => salvarConfig({ atalhosAtivos })}
            />
          )
        },
        ...(c.atalhosAtivos
          ? [
              {
                texto: 'atalho adicionar fila',
                el: (
                  <Linha rotulo="Adicionar o link copiado à fila">
                    <CampoAtalho valor={c.atalhoAdicionar} aoMudar={(atalhoAdicionar) => salvarConfig({ atalhoAdicionar })} />
                  </Linha>
                )
              },
              {
                texto: 'atalho baixar fila',
                el: (
                  <Linha rotulo="Baixar a fila">
                    <CampoAtalho valor={c.atalhoBaixarFila} aoMudar={(atalhoBaixarFila) => salvarConfig({ atalhoBaixarFila })} />
                  </Linha>
                )
              },
              {
                texto: 'atalho adicionar e baixar',
                el: (
                  <Linha rotulo="Adicionar o link copiado e baixar na hora">
                    <CampoAtalho valor={c.atalhoAdicionarEBaixar} aoMudar={(atalhoAdicionarEBaixar) => salvarConfig({ atalhoAdicionarEBaixar })} />
                  </Linha>
                )
              }
            ]
          : [])
      ]
    },
    {
      id: 'filtros',
      titulo: 'Filtros de entrada',
      itens: [
        {
          texto: 'tamanho mínimo máximo arquivo filtro',
          el: (
            <Linha rotulo="Tamanho do arquivo" dica='Pula vídeos fora do intervalo. Ex.: "50M", "1.5G"'>
              <CampoTexto largura={100} placeholder="mínimo" valor={c.filtros.tamanhoMin} aoSalvar={(tamanhoMin) => salvarConfig({ filtros: { ...c.filtros, tamanhoMin } })} />
              <CampoTexto largura={100} placeholder="máximo" valor={c.filtros.tamanhoMax} aoSalvar={(tamanhoMax) => salvarConfig({ filtros: { ...c.filtros, tamanhoMax } })} />
            </Linha>
          )
        },
        {
          texto: 'data envio upload antes depois filtro',
          el: (
            <Linha rotulo="Data de envio" dica="Útil em playlists e canais">
              <Selecao
                valor={c.filtros.dataModo}
                aoMudar={(dataModo) => salvarConfig({ filtros: { ...c.filtros, dataModo } })}
                largura={170}
                opcoes={[
                  { valor: 'desligado', nome: 'Qualquer data' },
                  { valor: 'exata', nome: 'Exatamente em' },
                  { valor: 'antes', nome: 'Em ou antes de' },
                  { valor: 'depois', nome: 'Em ou depois de' }
                ]}
              />
              {c.filtros.dataModo !== 'desligado' && (
                <input
                  type="date"
                  className="campo"
                  value={c.filtros.data}
                  onChange={(e) => salvarConfig({ filtros: { ...c.filtros, data: e.target.value } })}
                />
              )}
            </Linha>
          )
        },
        {
          texto: 'filtros avançados match filters yt-dlp duração likes',
          el: (
            <Linha rotulo="Filtros avançados (yt-dlp)" dica='Um por linha. Ex.: "duration > 600", "!is_live", "like_count >=? 100"' coluna>
              <CampoTexto mono multilinha valor={c.filtros.matchFilters} aoSalvar={(matchFilters) => salvarConfig({ filtros: { ...c.filtros, matchFilters } })} />
            </Linha>
          )
        },
        {
          texto: 'parar filtro break match filters',
          el: (
            <Linha rotulo="Parar quando um item não passar" dica="Igual aos filtros acima, mas para de ler a playlist no primeiro que falhar" coluna>
              <CampoTexto mono multilinha valor={c.filtros.breakMatchFilters} aoSalvar={(breakMatchFilters) => salvarConfig({ filtros: { ...c.filtros, breakMatchFilters } })} />
            </Linha>
          )
        }
      ]
    },
    {
      id: 'rede',
      titulo: 'Rede e login',
      itens: [
        {
          texto: 'cookies navegador firefox chrome login idade privado membros',
          el: (
            <Linha rotulo="Cookies" dica="Para vídeos com restrição de idade, privados ou de membros. O Firefox é o mais confiável no Windows.">
              <Selecao
                valor={c.cookies.origem}
                aoMudar={(origem) => salvarConfig({ cookies: { ...c.cookies, origem } })}
                largura={190}
                opcoes={[
                  { valor: 'nenhum', nome: 'Não usar' },
                  { valor: 'navegador', nome: 'Do navegador' },
                  { valor: 'arquivo', nome: 'De um cookies.txt' }
                ]}
              />
            </Linha>
          )
        },
        ...(c.cookies.origem === 'navegador'
          ? [
              {
                texto: 'cookies navegador perfil',
                el: (
                  <Linha rotulo="Navegador e perfil">
                    <Selecao valor={c.cookies.navegador} aoMudar={(navegador) => salvarConfig({ cookies: { ...c.cookies, navegador, perfil: '' } })} opcoes={NAVEGADORES} largura={130} />
                    <Selecao
                      valor={c.cookies.perfil}
                      aoMudar={(perfil) => salvarConfig({ cookies: { ...c.cookies, perfil } })}
                      largura={220}
                      opcoes={[{ valor: '', nome: 'Perfil padrão' }, ...perfis.map((p) => ({ valor: p, nome: p }))]}
                    />
                  </Linha>
                )
              }
            ]
          : []),
        ...(c.cookies.origem === 'arquivo'
          ? [
              {
                texto: 'cookies arquivo txt',
                el: (
                  <Linha rotulo="Arquivo cookies.txt" dica={c.cookies.arquivo || 'Nenhum escolhido (formato Netscape)'}>
                    <button
                      className="btn pequeno"
                      onClick={async () => {
                        const arquivo = await window.api.escolherArquivo([{ name: 'Cookies', extensions: ['txt'] }])
                        if (arquivo) void salvarConfig({ cookies: { ...c.cookies, arquivo } })
                      }}
                    >
                      Escolher…
                    </button>
                  </Linha>
                )
              }
            ]
          : []),
        {
          texto: 'cookies ignorar sites exceções',
          el: (
            <Linha rotulo="Não usar cookies nestes sites" dica="Ex.: tiktok.com (Enter para adicionar)" coluna desativada={c.cookies.origem === 'nenhum'}>
              <Etiquetas valores={c.cookies.ignorarSites} aoMudar={(ignorarSites) => salvarConfig({ cookies: { ...c.cookies, ignorarSites } })} placeholder="site.com" />
            </Linha>
          )
        },
        {
          texto: 'login usuário senha conta',
          el: (
            <Linha rotulo="Usuário e senha do site" dica="Guardados criptografados no cofre do Windows">
              <CampoTexto largura={170} placeholder="usuário" valor={segredos?.usuario ?? ''} aoSalvar={(usuario) => mudarSegredo({ usuario })} />
              <CampoTexto largura={170} placeholder="senha" senha valor={segredos?.senha ?? ''} aoSalvar={(senha) => mudarSegredo({ senha })} />
            </Linha>
          )
        },
        {
          texto: 'senha do vídeo vimeo protegido',
          el: (
            <Linha rotulo="Senha do vídeo" dica="Para vídeos protegidos por senha (ex.: Vimeo)">
              <CampoTexto largura={220} senha valor={segredos?.senhaVideo ?? ''} aoSalvar={(senhaVideo) => mudarSegredo({ senhaVideo })} />
            </Linha>
          )
        },
        {
          texto: 'token bearer autenticação',
          el: (
            <Linha rotulo="Token (Bearer)">
              <CampoTexto largura={300} senha mono valor={segredos?.token ?? ''} aoSalvar={(token) => mudarSegredo({ token })} />
            </Linha>
          )
        },
        {
          texto: 'cabeçalhos headers http personalizados',
          el: (
            <Linha rotulo="Cabeçalhos HTTP" dica='Um por linha, no formato "Campo: valor"' coluna>
              <CampoTexto mono multilinha valor={segredos?.cabecalhos ?? ''} aoSalvar={(cabecalhos) => mudarSegredo({ cabecalhos })} />
            </Linha>
          )
        },
        {
          texto: 'proxy socks5 http vpn bloqueio região',
          el: <LinhaInterruptor rotulo="Usar proxy" ligado={c.proxy.ativo} aoMudar={(ativo) => salvarConfig({ proxy: { ...c.proxy, ativo } })} />
        },
        ...(c.proxy.ativo
          ? [
              {
                texto: 'proxy endereço porta usuário senha',
                el: (
                  <Linha rotulo="Endereço do proxy" dica="Comuns: Clash 7890, V2Ray 10809, Shadowsocks 1080" coluna>
                    <div className="flex">
                      <Selecao
                        valor={c.proxy.tipo}
                        aoMudar={(tipo) => salvarConfig({ proxy: { ...c.proxy, tipo } })}
                        largura={110}
                        opcoes={[
                          { valor: 'http', nome: 'HTTP' },
                          { valor: 'socks5', nome: 'SOCKS5' }
                        ]}
                      />
                      <CampoTexto largura={180} placeholder="127.0.0.1" valor={c.proxy.host} aoSalvar={(host) => salvarConfig({ proxy: { ...c.proxy, host } })} />
                      <CampoTexto largura={80} placeholder="porta" valor={c.proxy.porta} aoSalvar={(porta) => salvarConfig({ proxy: { ...c.proxy, porta } })} />
                      <CampoTexto largura={130} placeholder="usuário" valor={c.proxy.usuario} aoSalvar={(usuario) => salvarConfig({ proxy: { ...c.proxy, usuario } })} />
                      <CampoTexto largura={130} placeholder="senha" senha valor={segredos?.senhaProxy ?? ''} aoSalvar={(senhaProxy) => mudarSegredo({ senhaProxy })} />
                    </div>
                  </Linha>
                )
              }
            ]
          : []),
        {
          texto: 'se passar por navegador impersonate fingerprint bloqueio cloudflare',
          el: (
            <Linha rotulo="Se passar por um navegador" dica="Ajuda em sites que bloqueiam programas (ex.: Cloudflare)">
              {!alvos.length && (
                <button className="btn pequeno fantasma" onClick={() => window.api.alvosImpersonar().then(setAlvos)}>
                  <RefreshCw /> Carregar opções
                </button>
              )}
              <Selecao
                valor={c.impersonar}
                aoMudar={(impersonar) => salvarConfig({ impersonar })}
                largura={200}
                opcoes={[
                  { valor: '', nome: 'Não' },
                  { valor: 'qualquer', nome: 'Qualquer navegador' },
                  ...[...new Set([...(c.impersonar && c.impersonar !== 'qualquer' ? [c.impersonar] : []), ...alvos])].map((a) => ({ valor: a, nome: a }))
                ]}
              />
            </Linha>
          )
        },
        {
          texto: 'youtube player js real erro unable to download correção',
          el: (
            <LinhaInterruptor
              rotulo='Correção do YouTube: "usar o player.js real"'
              dica='Resolve erros "unable to download" em alguns vídeos'
              ligado={c.playerJsReal}
              aoMudar={(playerJsReal) => salvarConfig({ playerJsReal })}
            />
          )
        },
        {
          texto: 'argumentos extrator extractor args avançado',
          el: (
            <Linha rotulo="Argumentos de extrator" dica='Um por linha. Ex.: "youtube:player_client=default,web"' coluna>
              <CampoTexto mono multilinha valor={c.extractorArgs} aoSalvar={(extractorArgs) => salvarConfig({ extractorArgs })} />
            </Linha>
          )
        },
        {
          texto: 'opções avançadas yt-dlp argumentos extras linha de comando',
          el: (
            <Linha rotulo="Opções extras do yt-dlp" dica='Vão no fim de todo download. Ex.: --limit-rate 5M --sleep-interval 2' coluna>
              <CampoTexto mono valor={c.argsExtras} aoSalvar={(argsExtras) => salvarConfig({ argsExtras })} />
            </Linha>
          )
        }
      ]
    },
    {
      id: 'galeria',
      titulo: 'Galeria',
      itens: [
        {
          texto: 'galeria pasta imagens gallery-dl',
          el: (
            <Linha rotulo="Pasta da galeria" dica={c.pastaGaleria}>
              <button
                className="btn pequeno"
                onClick={async () => {
                  const p = await window.api.escolherPasta(c.pastaGaleria)
                  if (p) void salvarConfig({ pastaGaleria: p })
                }}
              >
                <FolderOpen /> Escolher…
              </button>
            </Linha>
          )
        },
        {
          texto: 'galeria organizar subpastas site perfil mesma pasta',
          el: (
            <Linha rotulo="Organizar a galeria (padrão)" dica="Dá para mudar a cada download, na própria Galeria">
              <SelecaoOrganizarGaleria
                valor={c.galeriaOrganizar}
                formato={c.galeriaFormatoPasta}
                aoMudar={(galeriaOrganizar, galeriaFormatoPasta) => salvarConfig({ galeriaOrganizar, galeriaFormatoPasta })}
              />
            </Linha>
          )
        },
        {
          texto: 'galeria simultâneos ao mesmo tempo',
          el: (
            <Linha rotulo="Galerias ao mesmo tempo">
              <Selecao
                valor={c.galeriaSimultaneos}
                aoMudar={(galeriaSimultaneos) => salvarConfig({ galeriaSimultaneos })}
                opcoes={[1, 2, 3, 4].map((n) => ({ valor: n, nome: String(n) }))}
                largura={80}
              />
            </Linha>
          )
        },
        {
          texto: 'galeria pular já baixados arquivo histórico',
          el: (
            <LinhaInterruptor
              rotulo="Pular o que já foi baixado"
              dica="Lembra cada arquivo baixado e não baixa de novo, mesmo se você apagar"
              ligado={c.galeriaPularBaixados}
              aoMudar={(galeriaPularBaixados) => salvarConfig({ galeriaPularBaixados })}
            />
          )
        },
        {
          texto: 'galeria pausa espera entre arquivos bloqueio instagram',
          el: (
            <Linha rotulo="Pausa entre arquivos" dica="Alguns sites (ex.: Instagram) bloqueiam quem baixa rápido demais">
              <Selecao
                valor={c.galeriaPausa}
                aoMudar={(galeriaPausa) => salvarConfig({ galeriaPausa })}
                opcoes={[0, 1, 2, 5, 10].map((n) => ({ valor: n, nome: n ? `${n} s` : 'Nenhuma' }))}
                largura={110}
              />
            </Linha>
          )
        },
        {
          texto: 'galeria intervalo quantidade arquivos range',
          el: (
            <Linha rotulo="Quais arquivos baixar" dica='Ex.: "1-50" para os 50 primeiros. Vazio = todos'>
              <CampoTexto largura={120} placeholder="todos" valor={c.galeriaIntervalo} aoSalvar={(galeriaIntervalo) => salvarConfig({ galeriaIntervalo })} />
            </Linha>
          )
        }
      ]
    },
    {
      id: 'sistema',
      titulo: 'Sistema',
      itens: [
        {
          texto: 'bandeja ícone relógio tray',
          el: (
            <LinhaInterruptor
              rotulo="Ícone na bandeja"
              dica="Perto do relógio, com atalhos para baixar a fila e pausar"
              ligado={c.bandeja}
              aoMudar={(bandeja) => salvarConfig({ bandeja })}
            />
          )
        },
        {
          texto: 'minimizar bandeja fechar janela',
          el: (
            <LinhaInterruptor
              rotulo="Fechar a janela só esconde na bandeja"
              dica="Os downloads continuam. Para sair de vez, use o menu da bandeja."
              ligado={c.minimizarAoFechar}
              aoMudar={(minimizarAoFechar) => salvarConfig({ minimizarAoFechar })}
              desativado={!c.bandeja}
            />
          )
        },
        {
          texto: 'iniciar com windows login automático',
          el: (
            <LinhaInterruptor rotulo="Iniciar com o Windows" ligado={c.iniciarComWindows} aoMudar={(iniciarComWindows) => salvarConfig({ iniciarComWindows })} />
          )
        },
        {
          texto: 'iniciar minimizado escondido bandeja',
          el: (
            <LinhaInterruptor
              rotulo="Iniciar minimizado na bandeja"
              ligado={c.iniciarMinimizado}
              aoMudar={(iniciarMinimizado) => salvarConfig({ iniciarMinimizado })}
              desativado={!c.iniciarComWindows || !c.bandeja}
            />
          )
        },
        {
          texto: 'atualizar programa app versão automática',
          el: (
            <Linha rotulo="Atualizar o Subaru DL automaticamente" dica={atualizacao || 'Baixa em segundo plano e instala ao fechar'}>
              <button
                className="btn pequeno"
                onClick={async () => {
                  setAtualizacao('Verificando…')
                  setAtualizacao((await window.api.verificarAtualizacaoApp()).mensagem)
                }}
              >
                Verificar agora
              </button>
              <Interruptor ligado={c.atualizarApp} aoMudar={(atualizarApp) => salvarConfig({ atualizarApp })} />
            </Linha>
          )
        },
        {
          texto: 'restaurar padrões resetar configurações',
          el: (
            <Linha rotulo="Restaurar os padrões" dica="Volta todas as configurações ao original. A fila, o histórico e as senhas não são apagados.">
              <button className="btn perigo pequeno" onClick={() => setConfirmarReset(true)}>
                <RotateCcw /> Restaurar
              </button>
            </Linha>
          )
        }
      ]
    }
  ]

  const termo = busca.trim().toLowerCase()
  const filtradas = secoes
    .map((s) => ({ ...s, itens: termo ? s.itens.filter((i) => `${s.titulo} ${i.texto}`.toLowerCase().includes(termo)) : s.itens }))
    .filter((s) => s.itens.length)

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Configurações</h1>
        <div className="busca" style={{ maxWidth: 320 }}>
          <Search width={16} className="muted" />
          <input
            className="flex-1"
            style={{ border: 0, background: 'transparent', outline: 'none', padding: '7px 0' }}
            placeholder="Procurar configuração…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button className="icone-btn" style={{ width: 22, height: 22 }} onClick={() => setBusca('')}>
              <X width={14} />
            </button>
          )}
        </div>
      </div>
      <div>
        <div className="config">
          {!termo && (
            <nav className="indice">
              {secoes.map((s) => (
                <button key={s.id} onClick={() => document.getElementById(`cfg-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
                  {s.titulo}
                </button>
              ))}
            </nav>
          )}
          <div className="secoes">
            {filtradas.map((s) => (
              <section className="secao" id={`cfg-${s.id}`} key={s.id}>
                <h3 className="rotulo-secao">{s.titulo}</h3>
                <div className="cartao">{s.itens.map((i, n) => <Fragment key={n}>{i.el}</Fragment>)}</div>
              </section>
            ))}
            {!filtradas.length && (
              <div className="vazio">
                <Search />
                <strong>Nenhuma configuração encontrada</strong>
              </div>
            )}
          </div>
        </div>
      </div>
      {confirmarReset && (
        <Dialogo
          titulo="Restaurar os padrões?"
          aoFechar={() => setConfirmarReset(false)}
          rodape={
            <>
              <button className="btn" onClick={() => setConfirmarReset(false)}>
                Cancelar
              </button>
              <button
                className="btn primario"
                onClick={async () => {
                  useEstado.setState({ config: await window.api.restaurarPadroes() })
                  setConfirmarReset(false)
                  avisar('Configurações restauradas')
                }}
              >
                Restaurar
              </button>
            </>
          }
        >
          Todas as configurações voltam ao original. A fila, o histórico e as senhas guardadas continuam.
        </Dialogo>
      )}
    </div>
  )
}
