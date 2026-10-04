// Tela Downloads: fila e histórico (foto de referência 1).
import { ArrowRight, CheckCircle2, FolderOpen, History, Inbox, Pause, Play, Search, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { velocidade } from '@shared/formatar'
import type { EntradaHistorico, ItemFila as TItem } from '@shared/tipos'
import { Segmentado } from '../componentes/ui'
import { useEstado } from '../estado'
import ItemFila, { ItemConcluido } from './ItemFila'

type Aba = 'andamento' | 'concluidos' | 'falhas'
type Tipo = 'todos' | 'video' | 'audio'

const EM_ANDAMENTO = ['buscando', 'pronto', 'baixando', 'processando', 'pausado', 'aguardando-nova-tentativa']

export default function Downloads() {
  const { fila, historico, config } = useEstado()
  const [aba, setAba] = useState<Aba>('andamento')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<Tipo>('todos')
  const campoBusca = useRef<HTMLInputElement>(null)

  // "/" vai direto para a busca
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        campoBusca.current?.focus()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const termo = busca.trim().toLowerCase()
  const bateItem = (i: TItem) =>
    (!termo || `${i.info?.titulo ?? i.url} ${i.info?.canal ?? ''}`.toLowerCase().includes(termo)) && (tipo === 'todos' || i.opcoes.modo === tipo)
  const bateHistorico = (h: EntradaHistorico) =>
    (!termo || `${h.titulo} ${h.canal ?? ''}`.toLowerCase().includes(termo)) && (tipo === 'todos' || h.modo === tipo)

  const andamento = useMemo(() => fila.filter((i) => EM_ANDAMENTO.includes(i.status)), [fila])
  const falhas = useMemo(() => fila.filter((i) => i.status === 'erro'), [fila])
  const ativos = fila.filter((i) => i.status === 'baixando' || i.status === 'processando')
  const pendentes = fila.filter((i) => i.status === 'pronto' || i.status === 'pausado').length
  const total = ativos.reduce((t, i) => t + (i.progresso.velocidade ?? 0), 0)
  const [numero, unidade] = total ? velocidade(total).split(' ') : ['0', 'B/s']

  return (
    <div className="pagina">
      <div className="cartao resumo">
        <div className="grande">
          {numero}
          <small>{unidade.toUpperCase()}</small>
        </div>
        <div className="divisor" />
        <div className="contas">
          <span>
            <span className={`ponto${ativos.length ? ' azul' : ''}`} style={{ display: 'inline-block', marginRight: 8 }} />
            <b>{ativos.length}</b> baixando
          </span>
          <span>·</span>
          <span>
            <b>{pendentes}</b> na fila
          </span>
          <span>·</span>
          <span>
            <b>{historico.length}</b> concluídos
          </span>
        </div>
        {ativos.length > 0 ? (
          <button className="btn" onClick={() => window.api.pausarTodos()}>
            <Pause className="amarelo" /> Pausar Todos
          </button>
        ) : (
          <button className="btn" disabled={!pendentes} onClick={() => window.api.iniciarFila()}>
            <Play className="amarelo" /> Baixar Tudo
          </button>
        )}
        <button className="btn primario" onClick={() => window.api.abrirPasta(config!.pastaVideo)}>
          <FolderOpen /> Abrir Pasta de Downloads
        </button>
      </div>

      <div className="cartao barra-filtros">
        <Segmentado
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'andamento', nome: <>Em Andamento <span className="numero">{andamento.length}</span></> },
            { valor: 'concluidos', nome: <>Concluídos <span className="numero">{historico.length}</span></> },
            { valor: 'falhas', nome: <>Falhas <span className="numero">{falhas.length}</span></> }
          ]}
        />
        <div className="busca">
          <Search />
          <input ref={campoBusca} placeholder="Filtrar por nome ou canal…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <span className="kbd">/</span>
        </div>
        <div className="segmentado">
          {(['todos', 'video', 'audio'] as Tipo[]).map((t) => (
            <button key={t} className={tipo === t ? 'ativo' : ''} style={{ padding: '5px 12px', fontSize: 12.5 }} onClick={() => setTipo(t)}>
              {t === 'todos' ? 'Todos' : t === 'video' ? 'Vídeo' : 'Áudio'}
            </button>
          ))}
        </div>
      </div>

      {aba === 'andamento' && (
        <>
          <div className="titulo-secao">
            <span className={`ponto${ativos.length ? ' azul' : ''}`} />
            <h2>Fila Ativa ({andamento.length} {andamento.length === 1 ? 'tarefa' : 'tarefas'})</h2>
            <span className="direita">{config!.simultaneos} ao mesmo tempo</span>
          </div>
          {andamento.filter(bateItem).length ? (
            <div className="lista">
              {andamento.filter(bateItem).map((i) => (
                <ItemFila key={i.id} item={i} />
              ))}
            </div>
          ) : (
            <div className="cartao vazio">
              <Inbox />
              <strong>{andamento.length ? 'Nada com esse filtro' : 'Nenhum download em andamento'}</strong>
              <span>{andamento.length ? '' : 'Cole um link na tela Início para começar.'}</span>
            </div>
          )}

          {historico.length > 0 && (
            <>
              <div className="titulo-secao">
                <History />
                <h2>Histórico Recente</h2>
                <button className="link-amarelo direita" onClick={() => setAba('concluidos')}>
                  Ver todos os {historico.length} arquivos <ArrowRight />
                </button>
              </div>
              <div className="lista">
                {historico.filter(bateHistorico).slice(0, 3).map((h) => (
                  <ItemConcluido key={h.id} entrada={h} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {aba === 'concluidos' && (
        <>
          <div className="titulo-secao">
            <CheckCircle2 style={{ color: 'var(--ok)' }} />
            <h2>Concluídos</h2>
            {historico.length > 0 && (
              <button className="btn fantasma pequeno direita" onClick={() => window.api.limparHistorico()} title="Só limpa a lista; os arquivos continuam no disco">
                <Trash2 /> Limpar lista
              </button>
            )}
          </div>
          {historico.filter(bateHistorico).length ? (
            <div className="lista">
              {historico.filter(bateHistorico).slice(0, 300).map((h) => (
                <ItemConcluido key={h.id} entrada={h} />
              ))}
            </div>
          ) : (
            <div className="cartao vazio">
              <CheckCircle2 />
              <strong>{historico.length ? 'Nada com esse filtro' : 'Nada baixado ainda'}</strong>
            </div>
          )}
        </>
      )}

      {aba === 'falhas' && (
        <>
          <div className="titulo-secao">
            <XCircle style={{ color: 'var(--erro)' }} />
            <h2>Falhas</h2>
            {falhas.length > 0 && (
              <button className="btn fantasma pequeno direita" onClick={() => window.api.remover(falhas.map((i) => i.id))}>
                <Trash2 /> Remover todas
              </button>
            )}
          </div>
          {falhas.filter(bateItem).length ? (
            <div className="lista">
              {falhas.filter(bateItem).map((i) => (
                <ItemFila key={i.id} item={i} />
              ))}
            </div>
          ) : (
            <div className="cartao vazio">
              <CheckCircle2 />
              <strong>Nenhuma falha</strong>
              <span>Quando um download der erro ele aparece aqui, com a dica do que fazer.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
