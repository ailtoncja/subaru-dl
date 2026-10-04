import { CheckSquare, ListPlus, Loader2, Search, SlidersHorizontal, Square } from 'lucide-react'
import { useState } from 'react'
import { duracao, numeroCurto } from '@shared/formatar'
import type { FiltrosBusca, ResultadoBusca } from '@shared/tipos'
import { Chips, Selecao } from '../componentes/ui'
import { adicionarLinks, avisar } from '../estado'

const FILTROS_PADRAO: FiltrosBusca = { data: 'qualquer', duracao: 'qualquer', ordem: 'relevancia', recursos: [] }

const RECURSOS: Array<{ valor: FiltrosBusca['recursos'][number]; nome: string }> = [
  { valor: 'aoVivo', nome: 'Ao vivo' },
  { valor: '4k', nome: '4K' },
  { valor: 'hd', nome: 'HD' },
  { valor: 'hdr', nome: 'HDR' },
  { valor: 'legendas', nome: 'Legendas' },
  { valor: 'cc', nome: 'Creative Commons' },
  { valor: '360', nome: '360°' },
  { valor: 'vr180', nome: 'VR180' },
  { valor: '3d', nome: '3D' }
]

/** Busca no YouTube por palavra-chave, com filtros (item 6). */
export default function Busca() {
  const [termo, setTermo] = useState('')
  const [filtros, setFiltros] = useState<FiltrosBusca>(FILTROS_PADRAO)
  const [verFiltros, setVerFiltros] = useState(false)
  const [limite, setLimite] = useState(20)
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [buscou, setBuscou] = useState(false)

  const buscar = async (quantidade = limite) => {
    if (!termo.trim()) return
    setCarregando(true)
    setErro('')
    try {
      const r = await window.api.buscar(termo.trim(), filtros, quantidade)
      setResultados(r)
      if (quantidade === limite) setMarcados(new Set())
      setBuscou(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))
    } finally {
      setCarregando(false)
    }
  }

  const alternar = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const adicionar = async (iniciar: boolean) => {
    const escolhidos = resultados.filter((r) => marcados.has(r.id))
    const n = await adicionarLinks(escolhidos.map((r) => r.url), iniciar)
    if (n) avisar(`${n} vídeo(s) adicionado(s) à fila`)
    setAdicionados((a) => new Set([...a, ...escolhidos.map((r) => r.id)]))
    setMarcados(new Set())
  }

  const qtdFiltros = (filtros.data !== 'qualquer' ? 1 : 0) + (filtros.duracao !== 'qualquer' ? 1 : 0) + (filtros.ordem !== 'relevancia' ? 1 : 0) + filtros.recursos.length

  return (
    <>
      <div className="cabecalho">
        <h1>Buscar no YouTube</h1>
      </div>
      <div className="pagina">
        <div className="entrada">
          <div className="flex">
            <div className="caixa-link flex-1">
              <Search />
              <input
                value={termo}
                autoFocus
                placeholder="O que você quer encontrar?"
                onChange={(e) => setTermo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
            </div>
            <Selecao
              valor={limite}
              aoMudar={setLimite}
              opcoes={[10, 20, 50, 100].map((n) => ({ valor: n, nome: `${n} resultados` }))}
            />
            <button className={`btn${verFiltros || qtdFiltros ? ' amarelo' : ''}`} onClick={() => setVerFiltros(!verFiltros)}>
              <SlidersHorizontal /> Filtros{qtdFiltros ? ` (${qtdFiltros})` : ''}
            </button>
            <button className="btn primario" disabled={carregando || !termo.trim()} onClick={() => buscar()}>
              {carregando ? <Loader2 className="girando" /> : <Search />} Buscar
            </button>
          </div>

          {verFiltros && (
            <div className="rapidas" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <div className="flex">
                <span className="muted pequeno" style={{ width: 110 }}>Data de envio</span>
                <Chips
                  valor={filtros.data}
                  aoMudar={(data) => setFiltros({ ...filtros, data })}
                  opcoes={[
                    { valor: 'qualquer', nome: 'Qualquer' },
                    { valor: 'hoje', nome: 'Hoje' },
                    { valor: 'semana', nome: 'Esta semana' },
                    { valor: 'mes', nome: 'Este mês' },
                    { valor: 'ano', nome: 'Este ano' }
                  ]}
                />
              </div>
              <div className="flex">
                <span className="muted pequeno" style={{ width: 110 }}>Duração</span>
                <Chips
                  valor={filtros.duracao}
                  aoMudar={(duracao) => setFiltros({ ...filtros, duracao })}
                  opcoes={[
                    { valor: 'qualquer', nome: 'Qualquer' },
                    { valor: 'curto', nome: 'Menos de 4 min' },
                    { valor: 'medio', nome: '4 a 20 min' },
                    { valor: 'longo', nome: 'Mais de 20 min' }
                  ]}
                />
              </div>
              <div className="flex">
                <span className="muted pequeno" style={{ width: 110 }}>Ordenar por</span>
                <Chips
                  valor={filtros.ordem}
                  aoMudar={(ordem) => setFiltros({ ...filtros, ordem })}
                  opcoes={[
                    { valor: 'relevancia', nome: 'Relevância' },
                    { valor: 'views', nome: 'Visualizações' },
                    { valor: 'data', nome: 'Mais recentes' },
                    { valor: 'avaliacao', nome: 'Avaliação' }
                  ]}
                />
              </div>
              <div className="flex">
                <span className="muted pequeno" style={{ width: 110 }}>Recursos</span>
                <div className="chips">
                  {RECURSOS.map((r) => {
                    const ativo = filtros.recursos.includes(r.valor)
                    return (
                      <button
                        key={r.valor}
                        className={`chip${ativo ? ' ativo' : ''}`}
                        onClick={() =>
                          setFiltros({ ...filtros, recursos: ativo ? filtros.recursos.filter((x) => x !== r.valor) : [...filtros.recursos, r.valor] })
                        }
                      >
                        {r.nome}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <button className="btn fantasma pequeno" onClick={() => setFiltros(FILTROS_PADRAO)}>
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {erro && (
          <p className="erro-texto selecionavel" style={{ marginTop: 14 }}>
            {erro}
          </p>
        )}

        {resultados.length > 0 && (
          <div className="barra-fila">
            <h2>{resultados.length} resultados</h2>
            <span className="muted pequeno">{marcados.size} selecionado(s)</span>
            <button className="btn fantasma pequeno" onClick={() => setMarcados(new Set(resultados.map((r) => r.id)))}>
              <CheckSquare /> Marcar todos
            </button>
            <button className="btn fantasma pequeno" onClick={() => setMarcados(new Set())}>
              <Square /> Limpar
            </button>
            <div className="flex-1" />
            <button className="btn" disabled={!marcados.size} onClick={() => adicionar(false)}>
              <ListPlus /> Adicionar à fila
            </button>
            <button className="btn primario" disabled={!marcados.size} onClick={() => adicionar(true)}>
              Baixar agora
            </button>
          </div>
        )}

        {resultados.length > 0 ? (
          <>
            <div className="resultados">
              {resultados.map((r) => (
                <div key={r.id} className={`resultado${marcados.has(r.id) ? ' marcado' : ''}`} onClick={() => alternar(r.id)}>
                  <div className="capa" style={r.miniatura ? { backgroundImage: `url("${r.miniatura}")` } : undefined}>
                    <input type="checkbox" checked={marcados.has(r.id)} readOnly />
                    {r.duracao != null && <span className="selo">{duracao(r.duracao)}</span>}
                    {adicionados.has(r.id) && <span className="adicionado">Na fila</span>}
                  </div>
                  <div className="texto">
                    <strong title={r.titulo}>{r.titulo}</strong>
                    <small>
                      {r.canal ?? ''}
                      {r.views != null && ` · ${numeroCurto(r.views)} visualizações`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            {resultados.length >= limite && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  className="btn"
                  disabled={carregando}
                  onClick={() => {
                    const mais = resultados.length + limite
                    void buscar(mais)
                  }}
                >
                  {carregando && <Loader2 className="girando" />} Carregar mais
                </button>
              </div>
            )}
          </>
        ) : (
          !carregando && (
            <div className="vazio">
              <Search />
              <strong>{buscou ? 'Nada encontrado' : 'Busque vídeos do YouTube'}</strong>
              <span>Marque os que quiser e adicione à fila de uma vez.</span>
            </div>
          )
        )}
      </div>
    </>
  )
}
