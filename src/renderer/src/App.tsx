import { AlertCircle, CheckCircle2, Download, Package, ScrollText, Search, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import icone from '../../../resources/icone.png'
import { DialogoDuplicados } from './componentes/DialogoDuplicados'
import { useEstado, type Pagina } from './estado'
import Busca from './paginas/Busca'
import Configuracoes from './paginas/Configuracoes'
import Dependencias from './paginas/Dependencias'
import Downloads from './paginas/Downloads'
import Logs from './paginas/Logs'

const PAGINAS: Array<{ id: Pagina; nome: string; icone: typeof Download }> = [
  { id: 'downloads', nome: 'Downloads', icone: Download },
  { id: 'busca', nome: 'Buscar no YouTube', icone: Search },
  { id: 'logs', nome: 'Logs', icone: ScrollText },
  { id: 'dependencias', nome: 'Dependências', icone: Package },
  { id: 'configuracoes', nome: 'Configurações', icone: Settings }
]

export default function App() {
  const { pagina, ir, fila, config, toasts, logs } = useEstado()
  const [versao, setVersao] = useState('')
  useEffect(() => void window.api.versaoApp().then(setVersao), [])

  const ativos = fila.filter((i) => i.status === 'baixando' || i.status === 'processando').length
  const errosNovos = logs.filter((l) => l.nivel === 'erro').length

  if (!config) return null

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <img src={icone} alt="" />
          <span>
            Subaru <b>DL</b>
          </span>
        </div>
        <nav className="nav">
          {PAGINAS.map(({ id, nome, icone: Icone }) => (
            <button key={id} className={pagina === id ? 'ativo' : ''} onClick={() => ir(id)}>
              <Icone />
              {nome}
              {id === 'downloads' && ativos > 0 && <span className="contador">{ativos}</span>}
              {id === 'logs' && errosNovos > 0 && pagina !== 'logs' && <span className="contador" style={{ background: 'var(--erro)' }}>{errosNovos}</span>}
            </button>
          ))}
        </nav>
        <div className="rodape">v{versao}</div>
      </aside>

      <main className="conteudo">
        {pagina === 'downloads' && <Downloads />}
        {pagina === 'busca' && <Busca />}
        {pagina === 'logs' && <Logs />}
        {pagina === 'dependencias' && <Dependencias />}
        {pagina === 'configuracoes' && <Configuracoes />}
      </main>

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
