import { AlertTriangle, Download, ScrollText, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { NivelLog } from '@shared/tipos'
import { Segmentado } from '../componentes/ui'
import { dicaParaErro } from '@shared/dicas'
import { avisar, useEstado } from '../estado'

type Filtro = 'todos' | NivelLog

const NOMES: Record<NivelLog, string> = { comando: 'COMANDO', info: 'INFO', aviso: 'AVISO', erro: 'ERRO' }

/** Logs com filtros, busca, exportação e dicas para os erros (item 89). */
export default function Logs() {
  const { logs, fila } = useEstado()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [seguir, setSeguir] = useState(true)
  const fimRef = useRef<HTMLDivElement>(null)

  const titulos = useMemo(() => new Map(fila.map((i) => [i.id, i.info?.titulo ?? i.url])), [fila])
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return logs
      .filter((l) => filtro === 'todos' || l.nivel === filtro)
      .filter((l) => !termo || l.texto.toLowerCase().includes(termo) || (l.itemId && titulos.get(l.itemId)?.toLowerCase().includes(termo)))
      .slice(-1500)
  }, [logs, filtro, busca, titulos])

  // Últimos erros com dica de solução
  const dicas = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const l of logs.slice(-300)) {
      if (l.nivel !== 'erro') continue
      const dica = dicaParaErro(l.texto)
      if (dica) vistas.set(dica, l.texto)
    }
    return [...vistas.keys()].slice(-3)
  }, [logs])

  useEffect(() => {
    if (seguir) fimRef.current?.scrollIntoView({ block: 'end' })
  }, [visiveis.length, seguir])

  const exportar = async () => {
    const caminho = await window.api.exportarLogs()
    if (caminho) avisar('Logs exportados')
  }

  const limpar = async () => {
    await window.api.limparLogs()
    useEstado.setState({ logs: [] })
  }

  return (
    <>
      <div className="cabecalho">
        <h1>
          Logs <span className="sub">{logs.length} entradas</span>
        </h1>
        <label className="flex pequeno muted" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={seguir} onChange={(e) => setSeguir(e.target.checked)} /> Acompanhar o fim
        </label>
        <button className="btn" onClick={exportar}>
          <Download /> Exportar
        </button>
        <button className="btn perigo" onClick={limpar}>
          <Trash2 /> Limpar
        </button>
      </div>
      <div className="pagina" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="flex">
          <Segmentado
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'todos', nome: 'Todos' },
              { valor: 'comando', nome: 'Comandos' },
              { valor: 'info', nome: 'Info' },
              { valor: 'aviso', nome: 'Avisos' },
              { valor: 'erro', nome: 'Erros' }
            ]}
          />
          <div className="caixa-link flex-1 flex" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', background: 'var(--surface)' }}>
            <Search width={16} className="muted" />
            <input className="flex-1" style={{ border: 0, background: 'transparent', outline: 'none', padding: '7px 0' }} placeholder="Procurar nos logs…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {dicas.map((d) => (
          <div className="aviso-caixa" key={d}>
            <AlertTriangle />
            <span>{d}</span>
          </div>
        ))}

        {visiveis.length ? (
          <div className="cartao logs">
            {visiveis.map((l) => (
              <div key={l.id} className={`log ${l.nivel}`}>
                <span className="hora">{new Date(l.hora).toLocaleTimeString('pt-BR')}</span>
                <span className="nivel">{NOMES[l.nivel]}</span>
                <span className="texto-log">
                  {l.itemId && titulos.get(l.itemId) && <span className="muted">[{titulos.get(l.itemId)}] </span>}
                  {l.texto}
                </span>
              </div>
            ))}
            <div ref={fimRef} />
          </div>
        ) : (
          <div className="vazio">
            <ScrollText />
            <strong>Sem logs ainda</strong>
            <span>Os comandos e mensagens do yt-dlp aparecem aqui quando você baixa algo.</span>
          </div>
        )}
      </div>
    </>
  )
}
