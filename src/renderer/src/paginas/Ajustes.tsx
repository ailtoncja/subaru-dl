// Ajustes: as preferências, as ferramentas embutidas e o registro, num lugar só (longe da tela de baixar).
import { Package, ScrollText, SlidersHorizontal } from 'lucide-react'
import { useEstado, type AbaAjustes } from '../estado'
import Configuracoes from './Configuracoes'
import Dependencias from './Dependencias'
import Logs from './Logs'

const ABAS: Array<{ id: AbaAjustes; nome: string; icone: typeof Package }> = [
  { id: 'preferencias', nome: 'Preferências', icone: SlidersHorizontal },
  { id: 'ferramentas', nome: 'Ferramentas', icone: Package },
  { id: 'registro', nome: 'Registro', icone: ScrollText }
]

export default function Ajustes() {
  const { abaAjustes, irAjustes, logs } = useEstado()
  const errosLog = logs.filter((l) => l.nivel === 'erro').length

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Ajustes</h1>
      </div>
      <div className="abas-ajustes" role="tablist">
        {ABAS.map(({ id, nome, icone: Icone }) => (
          <button key={id} role="tab" aria-selected={abaAjustes === id} className={abaAjustes === id ? 'ativo' : ''} onClick={() => irAjustes(id)}>
            <Icone /> {nome}
            {id === 'registro' && errosLog > 0 && <span className="contador">{errosLog}</span>}
          </button>
        ))}
      </div>
      {abaAjustes === 'preferencias' && <Configuracoes />}
      {abaAjustes === 'ferramentas' && <Dependencias />}
      {abaAjustes === 'registro' && <Logs />}
    </div>
  )
}
