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
  const caixa = useRef<HTMLDivElement>(null)

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
    if (seguir && caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight
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
    <div className="fluxo">
      <div className="ferramentas-barra">
        <span className="muted pequeno flex-1">
          {logs.length} {logs.length === 1 ? 'entrada' : 'entradas'} · o que o yt-dlp e o gallery-dl responderam, para quando algo der errado
        </span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <div className="busca">
            <Search />
            <input placeholder="Procurar no registro" aria-label="Procurar no registro" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {dicas.map((d) => (
          <div className="aviso-azul" key={d}>
            <AlertTriangle />
            <span>{d}</span>
          </div>
        ))}

        {visiveis.length ? (
          <div className="cartao logs" ref={caixa}>
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
          </div>
        ) : (
          <div className="vazio">
            <ScrollText />
            <strong>Registro vazio</strong>
            <span>Os comandos e mensagens do yt-dlp aparecem aqui quando você baixa algo.</span>
          </div>
        )}
      </div>
    </div>
  )
}
