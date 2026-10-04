import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  Gauge,
  History,
  Images,
  Minus,
  Package,
  ScrollText,
  Settings,
  Square,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { velocidade } from '@shared/formatar'
import icone from '../../../resources/icone.png'
import { DialogoDuplicados } from './componentes/DialogoDuplicados'
import { abrirNoInicio, avisar, extrairLinks, useEstado, type Pagina } from './estado'
import Configuracoes from './paginas/Configuracoes'
import Dependencias from './paginas/Dependencias'
import Downloads from './paginas/Downloads'
import Galeria from './paginas/Galeria'
import Inicio from './paginas/Inicio'
import Logs from './paginas/Logs'

const PAGINAS: Array<{ id: Pagina; nome: string; icone: typeof Download }> = [
  { id: 'inicio', nome: 'Início', icone: Download },
  { id: 'downloads', nome: 'Downloads', icone: History },
  { id: 'galeria', nome: 'Galeria', icone: Images },
  { id: 'logs', nome: 'Logs', icone: ScrollText },
  { id: 'dependencias', nome: 'Dependências', icone: Package },
  { id: 'configuracoes', nome: 'Configurações', icone: Settings }
]

/** Cola o link da área de transferência e abre na tela Início. */
async function colarUrl() {
  const link = extrairLinks(await window.api.lerClipboard())[0]
  if (link) abrirNoInicio(link)
  else avisar('Nenhum link na área de transferência', 'erro')
}

export default function App() {
  const { pagina, ir, fila, galeria, config, toasts, logs } = useEstado()
  const [versao, setVersao] = useState('')
  const [maximizada, setMaximizada] = useState(false)

  useEffect(() => void window.api.versaoApp().then(setVersao), [])
  useEffect(() => window.api.aoMaximizar(setMaximizada), [])

  // Ctrl+V fora de um campo de texto cola o link direto na tela Início
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (!(e.ctrlKey && e.key.toLowerCase() === 'v') || /INPUT|TEXTAREA/.test(alvo.tagName)) return
      e.preventDefault()
      void colarUrl()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const ativos = fila.filter((i) => i.status === 'baixando' || i.status === 'processando')
  const falhas = fila.filter((i) => i.status === 'erro').length
  const galeriaAtivos = galeria.filter((i) => i.status === 'baixando').length
  const velocidadeTotal = ativos.reduce((t, i) => t + (i.progresso.velocidade ?? 0), 0)
  const errosLog = logs.filter((l) => l.nivel === 'erro').length

  if (!config) return null

  return (
    <div className="app">
      <header className="titulo-janela">
        <div className="logo">
          <img src={icone} alt="" />
          Subaru DL
          <span className="selo-azul">DESKTOP</span>
        </div>
        <span className="pilula">
          <span className={`ponto${ativos.length ? ' azul' : ''}`} />
          {ativos.length ? `Baixando ${ativos.length}` : 'Pronto para baixar'}
        </span>
        <span className="velocidade-topo">
          <Gauge /> {velocidadeTotal ? velocidade(velocidadeTotal) : '0 B/s'}
        </span>
        <div className="flex-1" />
        <button className="btn" onClick={colarUrl} title="Cola o link copiado e mostra a prévia">
          <ClipboardPaste className="amarelo" /> Colar URL <span className="kbd">Ctrl+V</span>
        </button>
        <div className="controles-janela">
          <button title="Minimizar" onClick={() => window.api.janelaMinimizar()}>
            <Minus />
          </button>
          <button title={maximizada ? 'Restaurar' : 'Maximizar'} onClick={() => window.api.janelaMaximizar()}>
            {maximizada ? <Copy /> : <Square />}
          </button>
          <button className="fechar" title="Fechar" onClick={() => window.api.janelaFechar()}>
            <X />
          </button>
        </div>
      </header>

      <div className="corpo-app">
        <aside className="lateral">
          <div className="cabeca">
            MENU <span className="selo-amarelo">v{versao}</span>
          </div>
          <nav className="nav">
            {PAGINAS.map(({ id, nome, icone: Icone }) => (
              <button key={id} className={pagina === id ? 'ativo' : ''} onClick={() => ir(id)}>
                <Icone />
                {nome}
                {id === 'downloads' && ativos.length > 0 && <span className="contador">{ativos.length}</span>}
                {id === 'downloads' && !ativos.length && falhas > 0 && <span className="contador vermelho">{falhas}</span>}
                {id === 'galeria' && galeriaAtivos > 0 && <span className="contador">{galeriaAtivos}</span>}
                {id === 'logs' && errosLog > 0 && pagina !== 'logs' && <span className="contador vermelho">{errosLog}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="conteudo">
          {pagina === 'inicio' && <Inicio />}
          {pagina === 'downloads' && <Downloads />}
          {pagina === 'galeria' && <Galeria />}
          {pagina === 'logs' && <Logs />}
          {pagina === 'dependencias' && <Dependencias />}
          {pagina === 'configuracoes' && <Configuracoes />}
        </main>
      </div>

      <DialogoDuplicados />

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'erro' ? <AlertCircle /> : <CheckCircle2 />}
            {t.texto}
          </div>
        ))}
      </div>
    </div>
  )
}
