// Baixar: cola o link (vídeo, áudio ou imagens), escolhe e acompanha o que está andando, tudo na mesma tela.
import { ArrowRight, ChevronRight, Images, Music, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { extrairLinks, INICIO_SESSAO, useEstado } from '../estado'
import FluxoImagens from './FluxoImagens'
import FluxoVideo from './FluxoVideo'
import ItemFila, { ItemConcluido, ItemDaGaleria, Placa } from './ItemFila'

type ModoBaixar = 'video' | 'audio' | 'imagens'
type Pedido = { url: string; n: number } | null

const MODOS: Array<{ valor: ModoBaixar; nome: string; icone: typeof Video }> = [
  { valor: 'video', nome: 'Vídeo', icone: Video },
  { valor: 'audio', nome: 'Áudio', icone: Music },
  { valor: 'imagens', nome: 'Imagens', icone: Images }
]

const EM_ANDAMENTO = ['buscando', 'pronto', 'baixando', 'processando', 'pausado', 'aguardando-nova-tentativa']

export default function Baixar() {
  const config = useEstado((s) => s.config)!
  const linkParaAbrir = useEstado((s) => s.linkParaAbrir)
  const [modo, setModo] = useState<ModoBaixar>(config.padrao.modo === 'audio' ? 'audio' : 'video')
  const [texto, setTexto] = useState('')
  const [pedido, setPedido] = useState<Pedido>(null)

  // Link vindo do Ctrl+V em qualquer tela ou do aviso de link copiado
  useEffect(() => {
    if (!linkParaAbrir) return
    useEstado.setState({ linkParaAbrir: null })
    setPedido((p) => ({ url: linkParaAbrir, n: (p?.n ?? 0) + 1 }))
  }, [linkParaAbrir])

  const trocarModo = (novo: ModoBaixar) => {
    if (novo === modo) return
    const trocaMotor = (novo === 'imagens') !== (modo === 'imagens')
    setModo(novo)
    // Entre vídeo/áudio e imagens o link vai junto e já é lido de novo pelo outro motor
    if (trocaMotor) {
      const links = extrairLinks(texto)
      setPedido((p) => (links.length ? { url: links.join('\n'), n: (p?.n ?? 0) + 1 } : null))
    }
  }

  return (
    <div className="pagina">
      <div className="topo-baixar">
        <h1>O que você quer baixar?</h1>
        <div className="segmentado grande" role="radiogroup" aria-label="Tipo de download">
          {MODOS.map(({ valor, nome, icone: Icone }) => (
            <button key={valor} type="button" role="radio" aria-checked={modo === valor} className={modo === valor ? 'ativo' : ''} onClick={() => trocarModo(valor)}>
              <Icone /> {nome}
            </button>
          ))}
        </div>
      </div>

      {modo === 'imagens' ? (
        <FluxoImagens texto={texto} setTexto={setTexto} pedido={pedido} />
      ) : (
        <FluxoVideo modo={modo} texto={texto} setTexto={setTexto} pedido={pedido} aoTentarImagens={() => trocarModo('imagens')} />
      )}

      <SeusDownloads />
    </div>
  )
}

/** O que está andando agora e o que chegou desde que o programa abriu. */
function SeusDownloads() {
  const { fila, galeria, historico, ir } = useEstado()

  const filaAtiva = fila.filter((i) => EM_ANDAMENTO.includes(i.status))
  const galeriaAtiva = galeria.filter((g) => g.status === 'aguardando' || g.status === 'baixando' || g.status === 'pausado')
  const entreguesSessao = historico.filter((h) => h.baixadoEm >= INICIO_SESSAO)
  const galeriaSessao = galeria.filter((g) => g.status === 'concluido' && (g.concluidoEm ?? 0) >= INICIO_SESSAO)
  const falhas = fila.filter((i) => i.status === 'erro').length + galeria.filter((g) => g.status === 'erro').length

  const baixando = filaAtiva.filter((i) => i.status === 'baixando' || i.status === 'processando').length + galeriaAtiva.filter((g) => g.status === 'baixando').length
  const esperando = filaAtiva.length + galeriaAtiva.length - baixando
  const entregues = entreguesSessao.length + galeriaSessao.length

  if (!filaAtiva.length && !galeriaAtiva.length && !entregues && !falhas) {
    // Primeira vez: o caminho em três passos
    if (!historico.length) return <ComoFunciona />
    // Nada andando: os últimos que chegaram, para abrir de novo sem procurar
    return (
      <section className="secao" aria-label="Últimos downloads">
        <div className="titulo-secao">
          <h2>Últimos downloads</h2>
          <button className="link-amarelo direita" onClick={() => ir('downloads')}>
            Ver todos <ArrowRight />
          </button>
        </div>
        <div className="lista">
          {historico.slice(0, 3).map((h) => (
            <ItemConcluido key={h.id} entrada={h} />
          ))}
        </div>
      </section>
    )
  }

  const resumo = [
    baixando > 0 && `${baixando} baixando`,
    esperando > 0 && `${esperando} na fila`,
    entregues > 0 && `${entregues} ${entregues === 1 ? 'entregue' : 'entregues'} agora`,
    falhas > 0 && `${falhas} com falha`
  ].filter(Boolean)

  return (
    <section className="secao" aria-label="Seus downloads">
      <div className="titulo-secao">
        <h2>Seus downloads</h2>
        <span className="contagem">{resumo.join(' · ')}</span>
        <button className="link-amarelo direita" onClick={() => ir('downloads')}>
          Ver todos <ArrowRight />
        </button>
      </div>
      <div className="lista">
        {filaAtiva.map((i, n) => (
          <ItemFila key={i.id} item={i} posicao={n + 1} />
        ))}
        {galeriaAtiva.map((g, n) => (
          <ItemDaGaleria key={g.id} item={g} posicao={filaAtiva.length + n + 1} />
        ))}
        {entreguesSessao.slice(0, 3).map((h) => (
          <ItemConcluido key={h.id} entrada={h} recente />
        ))}
        {galeriaSessao
          .slice(-2)
          .reverse()
          .map((g) => (
            <ItemDaGaleria key={g.id} item={g} recente />
          ))}
      </div>
    </section>
  )
}

function ComoFunciona() {
  return (
    <ol className="como-funciona" aria-label="Como funciona">
      <li>
        <Placa>1</Placa>
        <span>
          <b>Copie o link</b> do vídeo, da música, da playlist ou do perfil no navegador.
        </span>
      </li>
      <ChevronRight className="seta" aria-hidden="true" />
      <li>
        <Placa>2</Placa>
        <span>
          <b>Cole aqui em cima</b>, ou aperte Ctrl+V em qualquer tela do programa.
        </span>
      </li>
      <ChevronRight className="seta" aria-hidden="true" />
      <li>
        <Placa>3</Placa>
        <span>
          <b>Escolha e baixe.</b> O arquivo vai para a pasta Vídeos, Músicas ou Imagens.
        </span>
      </li>
    </ol>
  )
}
