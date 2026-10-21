// A tela única: escolhe Vídeo, Áudio ou Imagens, cola o link, acompanha no placar ao vivo e acha tudo na tabela.
// O campo e o placar ficam fixos no alto; a prévia e a tabela rolam embaixo; Ajustes desliza por cima da tabela.
import { Images, Music, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Placar } from '../componentes/Placar'
import { extrairLinks, useEstado } from '../estado'
import Ajustes from './Ajustes'
import FluxoImagens from './FluxoImagens'
import FluxoVideo from './FluxoVideo'
import Tabela from './Tabela'

type ModoBaixar = 'video' | 'audio' | 'imagens'
type Pedido = { url: string; n: number } | null

const MODOS: Array<{ valor: ModoBaixar; nome: string; icone: typeof Video }> = [
  { valor: 'video', nome: 'Vídeo', icone: Video },
  { valor: 'audio', nome: 'Áudio', icone: Music },
  { valor: 'imagens', nome: 'Imagens', icone: Images }
]

export default function Principal() {
  const config = useEstado((s) => s.config)!
  const linkParaAbrir = useEstado((s) => s.linkParaAbrir)
  const ajustesAberto = useEstado((s) => s.ajustesAberto)
  const [modo, setModo] = useState<ModoBaixar>(config.padrao.modo === 'audio' ? 'audio' : 'video')
  const [texto, setTexto] = useState('')
  const [pedido, setPedido] = useState<Pedido>(null)
  // O campo de cada modo é desenhado aqui no alto (portal), ao lado da escolha Vídeo / Áudio / Imagens
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)

  // Ao fechar o assistente, a tela começa no jeito de baixar escolhido lá
  const assistenteAberto = useEstado((s) => s.assistenteAberto)
  useEffect(() => {
    if (!assistenteAberto) setModo((atual) => (atual === 'imagens' ? atual : config.padrao.modo === 'audio' ? 'audio' : 'video'))
  }, [assistenteAberto])

  // Link vindo do Ctrl+V fora de um campo ou do aviso de link copiado
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
    <div className="principal">
      <h1 className="so-leitor">Subaru DL</h1>
      <div className="topo">
        <div className="segmentado modo" role="radiogroup" aria-label="O que você quer baixar">
          {MODOS.map(({ valor, nome, icone: Icone }) => (
            <button key={valor} type="button" role="radio" aria-checked={modo === valor} className={modo === valor ? 'ativo' : ''} onClick={() => trocarModo(valor)}>
              <Icone /> {nome}
            </button>
          ))}
        </div>
        <div className="slot-campo" ref={setSlot} />
      </div>

      <Placar />

      <div className="area">
        <div className="mesa">
          {modo === 'imagens' ? (
            <FluxoImagens slot={slot} texto={texto} setTexto={setTexto} pedido={pedido} />
          ) : (
            <FluxoVideo slot={slot} modo={modo} texto={texto} setTexto={setTexto} pedido={pedido} aoTentarImagens={() => trocarModo('imagens')} />
          )}
          <Tabela />
        </div>
        {ajustesAberto && <Ajustes />}
      </div>
    </div>
  )
}
