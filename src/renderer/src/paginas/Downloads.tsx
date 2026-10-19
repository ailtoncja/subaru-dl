// Downloads: o que está na fila, o que já chegou e o que falhou — vídeos, áudios e imagens juntos.
import { CheckCircle2, FolderOpen, Inbox, Pause, Play, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EntradaHistorico, ItemFila as TItem, ItemGaleria } from '@shared/tipos'
import { Segmentado } from '../componentes/ui'
import { useEstado } from '../estado'
import ItemFila, { ItemConcluido, ItemDaGaleria, nomeGaleria } from './ItemFila'

type Aba = 'andamento' | 'concluidos' | 'falhas'
type Tipo = 'todos' | 'video' | 'audio' | 'imagens'

const EM_ANDAMENTO = ['buscando', 'pronto', 'baixando', 'processando', 'pausado', 'aguardando-nova-tentativa']

export default function Downloads() {
  const { fila, historico, galeria, config } = useEstado()
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
  const bateHistorico = (h: EntradaHistorico) => (!termo || `${h.titulo} ${h.canal ?? ''}`.toLowerCase().includes(termo)) && (tipo === 'todos' || h.modo === tipo)
  const bateGaleria = (g: ItemGaleria) => (!termo || nomeGaleria(g.url).toLowerCase().includes(termo)) && (tipo === 'todos' || tipo === 'imagens')

  const andamento = useMemo(() => fila.filter((i) => EM_ANDAMENTO.includes(i.status)), [fila])
  const galeriaAndamento = useMemo(() => galeria.filter((g) => g.status === 'aguardando' || g.status === 'baixando' || g.status === 'pausado'), [galeria])
  const galeriaConcluida = useMemo(() => [...galeria].reverse().filter((g) => g.status === 'concluido'), [galeria])
  const falhasFila = useMemo(() => fila.filter((i) => i.status === 'erro'), [fila])
  const falhasGaleria = useMemo(() => galeria.filter((g) => g.status === 'erro'), [galeria])

  const ativos = fila.filter((i) => i.status === 'baixando' || i.status === 'processando').length + galeria.filter((g) => g.status === 'baixando').length
  const pendentes = fila.filter((i) => i.status === 'pronto' || i.status === 'pausado').length

  const nAndamento = andamento.length + galeriaAndamento.length
  const nConcluidos = historico.length + galeriaConcluida.length
  const nFalhas = falhasFila.length + falhasGaleria.length

  const vAndamento = andamento.filter(bateItem)
  const vGaleriaAndamento = galeriaAndamento.filter(bateGaleria)
  const vHistorico = historico.filter(bateHistorico)
  const vGaleriaConcluida = galeriaConcluida.filter(bateGaleria)
  const vFalhasFila = falhasFila.filter(bateItem)
  const vFalhasGaleria = falhasGaleria.filter(bateGaleria)

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Downloads</h1>
        {ativos > 0 ? (
          <button className="btn" onClick={() => window.api.pausarTodos()}>
            <Pause /> Pausar tudo
          </button>
        ) : (
          pendentes > 0 && (
            <button className="btn primario" onClick={() => window.api.iniciarFila()}>
              <Play /> Baixar a fila ({pendentes})
            </button>
          )
        )}
        <button className="btn" onClick={() => window.api.abrirPasta(config!.pastaVideo)}>
          <FolderOpen /> Abrir pasta
        </button>
      </div>

      <div className="barra-filtros">
        <Segmentado
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'andamento', nome: <>Na fila <span className="numero">{nAndamento}</span></> },
            { valor: 'concluidos', nome: <>Concluídos <span className="numero">{nConcluidos}</span></> },
            { valor: 'falhas', nome: <>Falhas <span className="numero">{nFalhas}</span></> }
          ]}
        />
        <div className="busca">
          <Search />
          <input ref={campoBusca} placeholder="Procurar por nome ou canal" aria-label="Procurar nos downloads" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <span className="kbd" title="Atalho">/</span>
        </div>
        <Segmentado
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: 'todos', nome: 'Todos' },
            { valor: 'video', nome: 'Vídeo' },
            { valor: 'audio', nome: 'Áudio' },
            { valor: 'imagens', nome: 'Imagens' }
          ]}
        />
      </div>

      {aba === 'andamento' &&
        (vAndamento.length || vGaleriaAndamento.length ? (
          <>
            <div className="titulo-secao">
              <h2>Na fila</h2>
              <span className="contagem">
                {ativos} baixando · {config!.simultaneos} ao mesmo tempo
              </span>
            </div>
            <div className="lista">
              {vAndamento.map((i, n) => (
                <ItemFila key={i.id} item={i} posicao={n + 1} />
              ))}
              {vGaleriaAndamento.map((g, n) => (
                <ItemDaGaleria key={g.id} item={g} posicao={vAndamento.length + n + 1} />
              ))}
            </div>
          </>
        ) : (
          <div className="cartao vazio">
            <Inbox />
            <strong>{nAndamento ? 'Nada com esse filtro' : 'Nada na fila'}</strong>
            <span>{nAndamento ? 'Mude a busca ou o tipo.' : 'Cole um link na tela Baixar para começar.'}</span>
          </div>
        ))}

      {aba === 'concluidos' && (
        <>
          {nConcluidos > 0 && (
            <div className="titulo-secao">
              <h2>Concluídos</h2>
              <span className="contagem">os mais novos primeiro</span>
              <button
                className="btn fantasma pequeno direita"
                onClick={() => (window.api.limparHistorico(), window.api.limparGaleriaConcluidos())}
                title="Só limpa a lista; os arquivos continuam no disco"
              >
                <Trash2 /> Limpar a lista
              </button>
            </div>
          )}
          {vHistorico.length || vGaleriaConcluida.length ? (
            <div className="lista">
              {vHistorico.slice(0, 300).map((h) => (
                <ItemConcluido key={h.id} entrada={h} />
              ))}
              {vGaleriaConcluida.map((g) => (
                <ItemDaGaleria key={g.id} item={g} />
              ))}
            </div>
          ) : (
            <div className="cartao vazio">
              <CheckCircle2 />
              <strong>{nConcluidos ? 'Nada com esse filtro' : 'Nada baixado ainda'}</strong>
              <span>{nConcluidos ? 'Mude a busca ou o tipo.' : 'O que você baixar aparece aqui, com Abrir e Mostrar na pasta.'}</span>
            </div>
          )}
        </>
      )}

      {aba === 'falhas' && (
        <>
          {nFalhas > 0 && (
            <div className="titulo-secao">
              <h2>Falhas</h2>
              <span className="contagem">cada uma diz o que aconteceu e o que fazer</span>
              <button
                className="btn fantasma pequeno direita"
                onClick={() => (window.api.remover(falhasFila.map((i) => i.id)), window.api.removerGaleria(falhasGaleria.map((g) => g.id)))}
              >
                <Trash2 /> Remover todas
              </button>
            </div>
          )}
          {vFalhasFila.length || vFalhasGaleria.length ? (
            <div className="lista">
              {vFalhasFila.map((i) => (
                <ItemFila key={i.id} item={i} />
              ))}
              {vFalhasGaleria.map((g) => (
                <ItemDaGaleria key={g.id} item={g} />
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
