// Ajustes: as preferências, as ferramentas embutidas e o registro, numa janela no meio, por cima da tabela.
// O campo do link e o placar continuam à vista em cima; Esc ou o X fecham e a tabela está onde estava.
import { Package, ScrollText, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const { abaAjustes, irAjustes, fecharAjustes, logs } = useEstado()
  const [versao, setVersao] = useState('')
  const errosLog = logs.filter((l) => l.nivel === 'erro').length

  useEffect(() => void window.api.versaoApp().then(setVersao), [])

  // Esc fecha o painel (um diálogo aberto por cima fecha primeiro)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.fundo-dialogo')) fecharAjustes()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fecharAjustes])

  return (
    <>
      <button className="veu-ajustes" tabIndex={-1} aria-label="Fechar Ajustes" onClick={fecharAjustes} />
      <aside className="painel-ajustes" aria-label="Ajustes">
        <header className="cabeca-painel">
          <h2>Ajustes</h2>
          <div className="abas-ajustes" role="tablist">
            {ABAS.map(({ id, nome, icone: Icone }) => (
              <button key={id} role="tab" aria-selected={abaAjustes === id} className={abaAjustes === id ? 'ativo' : ''} onClick={() => irAjustes(id)}>
                <Icone /> {nome}
                {id === 'registro' && errosLog > 0 && <span className="contador">{errosLog}</span>}
              </button>
            ))}
          </div>
          <span className="versao">Versão {versao}</span>
          <button className="icone-btn leve" title="Fechar (Esc)" onClick={fecharAjustes}>
            <X />
          </button>
        </header>
        <div className={`corpo-painel${abaAjustes === 'registro' ? ' registro' : ''}`}>
          {abaAjustes === 'preferencias' && <Configuracoes />}
          {abaAjustes === 'ferramentas' && <Dependencias />}
          {abaAjustes === 'registro' && <Logs />}
        </div>
      </aside>
    </>
  )
}
