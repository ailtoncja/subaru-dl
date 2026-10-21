// Assistente de primeiro uso: três escolhas rápidas (pastas, jeito de baixar, contas) por cima da tela principal.
// Abre sozinho só na primeira vez; "Pular" está sempre à vista e nada aqui é obrigatório para baixar.
// Depois, fica em Ajustes → Sistema → Assistente de primeiro uso.
import { AlertCircle, Check, CheckCircle2, Download, FolderOpen, Images, LogIn, Music, Video } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Configuracoes, Navegador, OpcoesDownload } from '@shared/tipos'
import { ehChromium, lojaExtensao, useCookies } from '../cookies'
import { avisar, salvarConfig, useEstado } from '../estado'
import { Chips, Segmentado } from './ui'

const ETAPAS = ['Pastas', 'Jeito de baixar', 'Contas'] as const

const NOMES: Record<Navegador, string> = {
  nenhum: 'Nenhum',
  firefox: 'Firefox',
  chrome: 'Chrome',
  edge: 'Edge',
  brave: 'Brave',
  opera: 'Opera',
  vivaldi: 'Vivaldi',
  chromium: 'Chromium'
}

/** Os navegadores oferecidos como chips; Vivaldi e Chromium entram só se forem o padrão do computador. */
const NAVEGADORES_COMUNS: Navegador[] = ['firefox', 'chrome', 'edge', 'brave', 'opera']

const QUALIDADES: Array<{ valor: OpcoesDownload['qualidade']; nome: string }> = [
  { valor: 'melhor', nome: 'A melhor que tiver' },
  { valor: '2160', nome: '4K' },
  { valor: '1080', nome: '1080p' },
  { valor: '720', nome: '720p' },
  { valor: '480', nome: '480p' }
]

const FORMATOS_AUDIO: Array<{ valor: OpcoesDownload['formatoAudio']; nome: string }> = [
  { valor: 'mp3', nome: 'MP3' },
  { valor: 'm4a', nome: 'M4A' },
  { valor: 'opus', nome: 'Opus' },
  { valor: 'flac', nome: 'FLAC' }
]

export function Assistente() {
  const c = useEstado((s) => s.config)!
  const [etapa, setEtapa] = useState(0)
  const titulo = useRef<HTMLHeadingElement>(null)
  const ultima = etapa === ETAPAS.length - 1

  const fechar = async (concluiu: boolean) => {
    if (!c.setupConcluido) await salvarConfig({ setupConcluido: true })
    useEstado.setState({ assistenteAberto: false })
    if (concluiu) avisar('Tudo pronto. Copie um link e cole lá em cima.')
  }

  // Esc pula; o foco vai para o título de cada etapa, para o leitor de tela anunciar onde está
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && void fechar(false)
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })
  useEffect(() => titulo.current?.focus(), [etapa])

  return createPortal(
    <div className="fundo-dialogo">
      <div className="dialogo assistente" role="dialog" aria-modal="true" aria-labelledby="titulo-assistente">
        <header>
          <ol className="etapas-assistente" aria-label="Etapas">
            {ETAPAS.map((nome, i) => (
              <li key={nome} className={i === etapa ? 'atual' : i < etapa ? 'feita' : ''} aria-current={i === etapa ? 'step' : undefined}>
                <button type="button" onClick={() => setEtapa(i)}>
                  <span className={`zona num n-tabela ${i === etapa ? 'vivo' : i < etapa ? 'fila' : 'sumiu'}`}>
                    {i < etapa ? <Check /> : String(i + 1).padStart(2, '0')}
                  </span>
                  {nome}
                </button>
              </li>
            ))}
          </ol>
          <button className="btn fantasma pequeno" onClick={() => void fechar(false)} title="Fechar o assistente (Esc). Tudo continua nos padrões e pode ser mudado em Ajustes.">
            Pular
          </button>
        </header>

        <div className="corpo-dialogo" key={etapa}>
          {etapa === 0 && <EtapaPastas c={c} titulo={titulo} />}
          {etapa === 1 && <EtapaJeito c={c} titulo={titulo} />}
          {etapa === 2 && <EtapaContas c={c} titulo={titulo} />}
        </div>

        <footer>
          <span className="rodape-assistente">Etapa {etapa + 1} de {ETAPAS.length}. Dá para mudar tudo depois em Ajustes.</span>
          {etapa > 0 && (
            <button className="btn fantasma" onClick={() => setEtapa(etapa - 1)}>
              Voltar
            </button>
          )}
          <button className="btn primario" onClick={() => (ultima ? void fechar(true) : setEtapa(etapa + 1))}>
            {ultima ? 'Concluir' : 'Continuar'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

interface PropsEtapa {
  c: Configuracoes
  titulo: RefObject<HTMLHeadingElement | null>
}

function Cabeca({ titulo, children, refTitulo }: { titulo: string; children: ReactNode; refTitulo: PropsEtapa['titulo'] }) {
  return (
    <div className="cabeca-etapa">
      <h2 id="titulo-assistente" ref={refTitulo} tabIndex={-1}>
        {titulo}
      </h2>
      <p>{children}</p>
    </div>
  )
}

// ---------- 1. Pastas ----------

function EtapaPastas({ c, titulo }: PropsEtapa) {
  const pastas: Array<{ chave: 'pastaVideo' | 'pastaAudio' | 'pastaGaleria'; nome: string; icone: typeof Video }> = [
    { chave: 'pastaVideo', nome: 'Vídeos', icone: Video },
    { chave: 'pastaAudio', nome: 'Músicas e áudios', icone: Music },
    { chave: 'pastaGaleria', nome: 'Imagens', icone: Images }
  ]
  const trocar = async (chave: (typeof pastas)[number]['chave']) => {
    const pasta = await window.api.escolherPasta(c[chave])
    if (pasta) void salvarConfig({ [chave]: pasta })
  }
  return (
    <>
      <Cabeca titulo="Onde os arquivos vão ficar" refTitulo={titulo}>
        Cada tipo já tem uma pasta pronta. Troque só se preferir outro lugar, como um HD externo.
      </Cabeca>
      <div className="cartao">
        {pastas.map(({ chave, nome, icone: Icone }) => (
          <div key={chave} className="linha linha-pasta">
            <Icone className="icone-pasta" aria-hidden="true" />
            <div className="rotulo">
              {nome}
              <small title={c[chave]}>{c[chave]}</small>
            </div>
            <button className="btn pequeno" onClick={() => void trocar(chave)}>
              <FolderOpen /> Trocar…
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ---------- 2. Jeito de baixar ----------

function EtapaJeito({ c, titulo }: PropsEtapa) {
  const mudar = (parcial: Partial<OpcoesDownload>) => void salvarConfig({ padrao: { ...c.padrao, ...parcial } })
  // Uma qualidade fora da lista curta (8K, 2K, 360p) continua valendo; só não aparece marcada aqui
  return (
    <>
      <Cabeca titulo="Como baixar quando você colar um link" refTitulo={titulo}>
        Isso vira o padrão. Cada link ainda mostra as opções antes de baixar, para mudar só naquele.
      </Cabeca>
      <div className="cartao">
        <div className="linha">
          <div className="rotulo">
            Começar em
            <small>O que fica escolhido ao abrir o programa</small>
          </div>
          <Segmentado
            valor={c.padrao.modo === 'audio' ? 'audio' : 'video'}
            aoMudar={(modo) => mudar({ modo })}
            opcoes={[
              {
                valor: 'video',
                nome: (
                  <>
                    <Video /> Vídeo
                  </>
                )
              },
              {
                valor: 'audio',
                nome: (
                  <>
                    <Music /> Só o áudio
                  </>
                )
              }
            ]}
          />
        </div>
        <div className="linha coluna">
          <div className="rotulo">
            Qualidade do vídeo
            <small>Quanto maior, mais espaço o arquivo ocupa. Se o vídeo não tiver essa, vem a mais próxima abaixo.</small>
          </div>
          <Chips valor={c.padrao.qualidade} aoMudar={(qualidade) => mudar({ qualidade })} opcoes={QUALIDADES} />
        </div>
        <div className="linha coluna">
          <div className="rotulo">
            Formato do áudio
            <small>MP3 toca em qualquer aparelho. FLAC guarda o som sem perda, mas ocupa bem mais.</small>
          </div>
          <Chips valor={c.padrao.formatoAudio} aoMudar={(formatoAudio) => mudar({ formatoAudio })} opcoes={FORMATOS_AUDIO} />
        </div>
      </div>
    </>
  )
}

// ---------- 3. Contas e cookies ----------

type Escolha = Navegador | 'depois'

function EtapaContas({ c, titulo }: PropsEtapa) {
  const cookies = useCookies()
  const [padrao, setPadrao] = useState<Navegador>('nenhum')
  // Quem já conectou uma conta vê o navegador que usou; senão o assistente sugere o navegador padrão do Windows
  const [escolha, setEscolha] = useState<Escolha | null>(c.cookies.origem !== 'nenhum' ? c.cookies.navegador : null)

  useEffect(() => {
    void window.api.navegadorPadrao().then((n) => {
      setPadrao(n)
      setEscolha((atual) => atual ?? (n === 'nenhum' ? 'firefox' : n))
    })
  }, [])

  const escolher = (n: Escolha) => {
    setEscolha(n)
    cookies.setResultado(null)
    if (n !== 'depois' && n !== c.cookies.navegador) void salvarConfig({ cookies: { ...c.cookies, navegador: n, perfil: '' } })
  }

  const opcoes: Array<{ valor: Escolha; nome: string }> = [
    ...[...NAVEGADORES_COMUNS, ...(NAVEGADORES_COMUNS.includes(padrao) || padrao === 'nenhum' ? [] : [padrao])].map((n) => ({
      valor: n as Escolha,
      nome: NOMES[n]
    })),
    { valor: 'depois', nome: 'Agora não' }
  ]
  const nome = escolha && escolha !== 'depois' ? NOMES[escolha] : ''
  const conectado = c.cookies.origem !== 'nenhum'

  return (
    <>
      <Cabeca titulo="Suas contas nos sites" refTitulo={titulo}>
        Serve para vídeos com restrição de idade, privados ou só para membros, e para perfis que pedem login. Fora isso, tudo
        funciona sem conta. O programa usa o login que já está no seu navegador; sua senha nunca passa por aqui.
      </Cabeca>
      <div className="cartao">
        <div className="linha coluna">
          <div className="rotulo">
            Em qual navegador você entra nas suas contas?
            {padrao !== 'nenhum' && <small>O {NOMES[padrao]} é o navegador padrão deste computador.</small>}
          </div>
          {escolha === null ? (
            <span className="pequeno dim">Procurando o navegador padrão…</span>
          ) : (
            <Chips valor={escolha} aoMudar={escolher} opcoes={opcoes} />
          )}
        </div>

        {escolha === 'firefox' && (
          <div className="linha coluna">
            <div className="rotulo">
              Conectar o Firefox
              <small>O Firefox deixa o programa ler o login direto, mesmo aberto. Depois disso é automático: entrou numa conta nele, o programa já usa.</small>
            </div>
            <button className="btn" disabled={cookies.gerando} onClick={() => void cookies.gerar('firefox', '', true, 'navegador')}>
              <LogIn /> {cookies.gerando ? 'Lendo o Firefox…' : 'Conectar o Firefox'}
            </button>
          </div>
        )}

        {escolha && escolha !== 'depois' && ehChromium(escolha) && (
          <div className="linha coluna">
            <div className="rotulo">
              Trazer o login do {nome}
              <small>
                O {nome} não deixa outros programas lerem o login (é uma proteção dele, não dá para desligar). O caminho é uma extensão
                que salva um arquivo cookies.txt. Leva um minuto e só precisa repetir quando o login vencer.
              </small>
            </div>
            <ol className="passos-assistente">
              <li>
                <span className="num">1</span>
                <span>Instale uma extensão que exporta cookies.txt (a loja abre já com a busca feita).</span>
                <button className="btn pequeno" onClick={() => void window.api.abrirLink(lojaExtensao(escolha))}>
                  <Download /> Abrir a loja
                </button>
              </li>
              <li>
                <span className="num">2</span>
                <span>Abra o site já com a conta entrada (por exemplo, youtube.com), clique na extensão e em “Export”.</span>
              </li>
              <li>
                <span className="num">3</span>
                <span>Volte aqui e importe. O programa acha o arquivo sozinho na pasta Downloads.</span>
                <button className="btn pequeno" disabled={cookies.importando} onClick={() => void cookies.importar(true)}>
                  <FolderOpen /> {cookies.importando ? 'Importando…' : 'Importar o cookies.txt'}
                </button>
              </li>
            </ol>
          </div>
        )}

        {escolha === 'depois' && (
          <div className="linha coluna">
            <div className="rotulo">
              Tudo bem
              <small>Quando um site pedir login, o aviso de erro mostra o caminho. Isso também fica em Ajustes → Rede e login.</small>
            </div>
          </div>
        )}
      </div>

      {cookies.resultado ? (
        <div className={cookies.resultado.ok ? 'aviso-azul' : 'aviso-erro'} role="status">
          {cookies.resultado.ok ? <CheckCircle2 /> : <AlertCircle />}
          {cookies.resultado.texto}
        </div>
      ) : (
        conectado &&
        escolha !== 'depois' && (
          <div className="aviso-azul" role="status">
            <CheckCircle2 />
            {c.cookies.origem === 'navegador'
              ? `Já conectado: o programa lê o login do ${NOMES[c.cookies.navegador]}.`
              : 'Já conectado: o programa está usando um cookies.txt.'}
          </div>
        )
      )}
    </>
  )
}
