// "Opções avançadas" de um download: dentro da prévia da tela Baixar (embutidas) e numa janela nos itens da fila.
import { Film, Info, LayoutGrid, List, Split } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEstado } from '../estado'
import { bytes, dataUpload, duracao, lerTempo, numero, tempoTotal } from '@shared/formatar'
import { codecCurto, escolherFormatos, temAudio, temVideo } from '@shared/formatos'
import { urlMiniaturaRemota } from '@shared/miniatura'
import type { EntradaPlaylist, InfoMidia, OpcoesDownload } from '@shared/tipos'
import { EditorLegendas, EditorPosProcesso, EditorQualidade } from './EditorOpcoes'
import { CampoPasta, SelecaoOrganizar } from './Destino'
import { Dialogo, Linha, LinhaInterruptor } from './ui'

type Aba = 'qualidade' | 'formatos' | 'trecho' | 'legendas' | 'saida' | 'playlist' | 'detalhes'
type Mudar = (parcial: Partial<OpcoesDownload>) => void

export default function OpcoesAvancadas({
  titulo,
  info,
  opcoes,
  mudar,
  aoFechar,
  bloqueado,
  aoSepararPlaylist,
  embutido
}: {
  titulo: string
  info: InfoMidia | null
  opcoes: OpcoesDownload
  mudar: Mudar
  aoFechar: () => void
  /** Texto explicando por que não dá para editar (download em andamento). */
  bloqueado?: string | null
  aoSepararPlaylist?: () => void
  /** Dentro do cartão da prévia (sem janela por cima) */
  embutido?: boolean
}) {
  const abas: Array<[Aba, string]> = [
    ['qualidade', 'Qualidade'],
    ...(info?.formatos.length ? ([['formatos', 'Formato exato']] as Array<[Aba, string]>) : []),
    ...(info && !info.playlist ? ([['trecho', 'Trecho e capítulos']] as Array<[Aba, string]>) : []),
    ['legendas', 'Legendas'],
    ['saida', 'Salvar e pós-processar'],
    ...(info?.playlist ? ([['playlist', `Playlist (${info.playlist.total})`]] as Array<[Aba, string]>) : []),
    ...(info && !info.playlist ? ([['detalhes', 'Detalhes']] as Array<[Aba, string]>) : [])
  ]
  const [aba, setAba] = useState<Aba>('qualidade')
  const o = opcoes

  const corpo = (
    <>
      <div className="abas" role="tablist">
        {abas.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
            {nome}
          </button>
        ))}
      </div>
      {bloqueado && aba !== 'detalhes' && (
        <div className="aviso-azul" style={{ marginBottom: 12 }}>
          <Info />
          {bloqueado}
        </div>
      )}
      <div style={bloqueado && aba !== 'detalhes' ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
        {aba === 'qualidade' && (
          <div className="cartao">
            <EditorQualidade o={o} mudar={mudar} info={info} semTipo={embutido} />
          </div>
        )}
        {aba === 'formatos' && info && <TabelaFormatos info={info} o={o} mudar={mudar} />}
        {aba === 'trecho' && info && <EditorTrecho info={info} o={o} mudar={mudar} />}
        {aba === 'legendas' && (
          <div className="cartao">
            <EditorLegendas o={o} mudar={mudar} info={info} />
          </div>
        )}
        {aba === 'saida' && (
          <div className="cartao">
            <Linha rotulo="Salvar em">
              <CampoPasta pasta={o.pasta} modo={o.modo} aoMudar={(pasta) => mudar({ pasta })} semRotulo />
            </Linha>
            <Linha rotulo="Organizar em subpastas" coluna={o.subpasta === 'personalizado'}>
              <SelecaoOrganizar o={o} mudar={mudar} />
            </Linha>
            <EditorPosProcesso o={o} mudar={mudar} />
          </div>
        )}
        {aba === 'playlist' && info?.playlist && <EditorPlaylist info={info} o={o} mudar={mudar} aoSeparar={aoSepararPlaylist} />}
      </div>
      {aba === 'detalhes' && info && <Detalhes info={info} />}
    </>
  )

  if (embutido) return <div className="painel-avancado">{corpo}</div>

  return (
    <Dialogo titulo={titulo} aoFechar={aoFechar} largo rodape={<button className="btn primario" onClick={aoFechar}>Pronto</button>}>
      {corpo}
    </Dialogo>
  )
}

/** Lista real de formatos do vídeo (item 11). */
function TabelaFormatos({ info, o, mudar }: { info: InfoMidia; o: OpcoesDownload; mudar: Mudar }) {
  const automatico = escolherFormatos(info, { ...o, formatoId: null })
  const formatos = useMemo(
    () =>
      [...info.formatos]
        .filter((f) => (o.modo === 'audio' ? temAudio(f) : true))
        .sort((a, b) => Number(temVideo(b)) - Number(temVideo(a)) || (b.altura ?? 0) - (a.altura ?? 0) || (b.tbr ?? b.abr ?? 0) - (a.tbr ?? a.abr ?? 0)),
    [info.formatos, o.modo]
  )

  return (
    <>
      <div className="flex" style={{ marginBottom: 10 }}>
        <span className="muted pequeno flex-1">
          {o.formatoId
            ? `Formato ${o.formatoId} escolhido. Se ele for só vídeo, o melhor áudio é juntado automaticamente.`
            : `Automático: ${[automatico.video?.id, automatico.audio?.id].filter(Boolean).join(' + ') || '—'} (pela qualidade e codec escolhidos). Clique numa linha para fixar um formato.`}
        </span>
        {o.formatoId && (
          <button className="btn pequeno" onClick={() => mudar({ formatoId: null })}>
            Voltar ao automático
          </button>
        )}
      </div>
      <div className="rolagem" style={{ maxHeight: 360 }}>
        <table className="tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Resolução</th>
              <th>FPS</th>
              <th>Vídeo</th>
              <th>Áudio</th>
              <th>Formato</th>
              <th>Tamanho</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {formatos.map((f) => {
              const escolhido = o.formatoId ? o.formatoId === f.id : automatico.video?.id === f.id || automatico.audio?.id === f.id
              return (
                <tr key={f.id} className={`clicavel${escolhido ? ' escolhido' : ''}`} onClick={() => mudar({ formatoId: o.formatoId === f.id ? null : f.id })}>
                  <td className="mono">{f.id}</td>
                  <td>{temVideo(f) ? (temAudio(f) ? 'Vídeo + áudio' : 'Só vídeo') : 'Só áudio'}</td>
                  <td>{temVideo(f) ? (f.altura ? `${f.altura}p` : f.resolucao) : '—'}</td>
                  <td>{f.fps ? Math.round(f.fps) : '—'}</td>
                  <td>{codecCurto(f.vcodec) || '—'}</td>
                  <td>
                    {codecCurto(f.acodec) || '—'}
                    {f.abr ? ` ${Math.round(f.abr)}k` : ''}
                  </td>
                  <td>{f.ext}</td>
                  <td>{f.tamanho ? (f.aproximado ? '~' : '') + bytes(f.tamanho) : '—'}</td>
                  <td className="muted">{[f.idioma, f.nota].filter(Boolean).join(' · ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Trecho, capítulos e corte preciso (categoria E). */
function EditorTrecho({ info, o, mudar }: { info: InfoMidia; o: OpcoesDownload; mudar: Mudar }) {
  const [inicio, setInicio] = useState(o.trecho ? duracao(o.trecho.inicio) : '')
  const [fim, setFim] = useState(o.trecho ? duracao(o.trecho.fim) : '')
  const [erro, setErro] = useState('')

  const aplicar = () => {
    const a = lerTempo(inicio) ?? 0
    const b = lerTempo(fim) ?? info.duracao ?? null
    if (b == null) return setErro('Informe o fim do trecho')
    if (b <= a) return setErro('O fim precisa ser depois do início')
    if (info.duracao && a >= info.duracao) return setErro('O início passa da duração do vídeo')
    setErro('')
    mudar({ trecho: { inicio: a, fim: info.duracao ? Math.min(b, info.duracao) : b } })
  }

  return (
    <div className="cartao">
      <Linha
        rotulo="Baixar só um trecho"
        dica={o.trecho ? `Trecho atual: ${duracao(o.trecho.inicio)} até ${duracao(o.trecho.fim)}` : 'Formato 1:23, 01:02:03 ou segundos'}
        coluna
      >
        <div className="flex">
          <input className="campo" style={{ width: 110 }} placeholder="Início" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <span className="muted">até</span>
          <input className="campo" style={{ width: 110 }} placeholder={info.duracao ? duracao(info.duracao) : 'Fim'} value={fim} onChange={(e) => setFim(e.target.value)} />
          <button className="btn pequeno primario" onClick={aplicar}>
            Aplicar
          </button>
          {o.trecho && (
            <button
              className="btn pequeno"
              onClick={() => {
                setInicio('')
                setFim('')
                mudar({ trecho: null })
              }}
            >
              Remover trecho
            </button>
          )}
          {erro && <span className="erro-texto pequeno">{erro}</span>}
        </div>
      </Linha>

      {info.capitulos.length > 0 && (
        <Linha rotulo="Baixar só alguns capítulos" dica={o.capitulos.length ? `${o.capitulos.length} escolhido(s)` : 'Nenhum marcado = vídeo inteiro'} coluna>
          <div className="lista-check">
            {info.capitulos.map((c, i) => (
              <label key={`${c.titulo}-${i}`}>
                <input
                  type="checkbox"
                  checked={o.capitulos.includes(c.titulo)}
                  onChange={(e) => mudar({ capitulos: e.target.checked ? [...o.capitulos, c.titulo] : o.capitulos.filter((t) => t !== c.titulo) })}
                />
                <span className="num">{duracao(c.inicio)}</span>
                <span className="flex-1">{c.titulo}</span>
                <span className="muted pequeno">{duracao(c.fim - c.inicio)}</span>
              </label>
            ))}
          </div>
        </Linha>
      )}

      {info.capitulos.length > 0 && (
        <LinhaInterruptor
          rotulo="Separar em um arquivo por capítulo"
          dica="Cria uma pasta com um arquivo para cada capítulo"
          ligado={o.separarCapitulos}
          aoMudar={(separarCapitulos) => mudar({ separarCapitulos })}
        />
      )}
      <LinhaInterruptor
        rotulo="Corte preciso"
        dica="Corta no quadro exato em vez do quadro-chave mais próximo. Bem mais lento (recodifica)."
        ligado={o.cortePreciso}
        aoMudar={(cortePreciso) => mudar({ cortePreciso })}
        desativado={!o.trecho && !o.capitulos.length}
      />
    </div>
  )
}

/** Transforma {1,2,3,5,7,8} em "1-3,5,7-8". */
export function compactar(indices: number[]): string {
  const ordenados = [...indices].sort((a, b) => a - b)
  const partes: string[] = []
  for (let i = 0; i < ordenados.length; i++) {
    const inicio = ordenados[i]
    while (ordenados[i + 1] === ordenados[i] + 1) i++
    partes.push(inicio === ordenados[i] ? String(inicio) : `${inicio}-${ordenados[i]}`)
  }
  return partes.join(',')
}

/** "1-3,5" → {1,2,3,5}. Vazio = todos. "0" = nenhum. */
export function expandir(spec: string, total: number): Set<number> {
  const r = new Set<number>()
  if (spec.trim() === '0') return r
  if (!spec.trim()) {
    for (let n = 1; n <= total; n++) r.add(n)
    return r
  }
  const resolver = (v: string, padrao: number) => (v === '' ? padrao : Number(v) < 0 ? total + Number(v) + 1 : Number(v))
  for (const parte of spec.split(',')) {
    const t = parte.trim()
    const m = t.match(/^(-?\d*)\s*(?::|(?<=\d)-)\s*(-?\d*)$/)
    if (/^-?\d+$/.test(t)) r.add(resolver(t, 1))
    else if (m) for (let n = Math.max(1, resolver(m[1], 1)); n <= Math.min(total, resolver(m[2], total)); n++) r.add(n)
  }
  return r
}

/** Capa de um vídeo da playlist (reduzida e guardada em cache pelo motor; só carrega quando chega perto da tela). */
function CapaVideo({ e }: { e: EntradaPlaylist }) {
  const [falhou, setFalhou] = useState(false)
  if (!e.miniatura || falhou) {
    return (
      <span className="capa-video vazia">
        <Film />
      </span>
    )
  }
  return (
    <span className="capa-video">
      <img src={urlMiniaturaRemota(e.miniatura)} loading="lazy" decoding="async" alt="" onError={() => setFalhou(true)} />
    </span>
  )
}

/** Quantos vídeos marcados, o tempo somado e, no áudio, o tamanho aproximado pela taxa de bits. */
export function somaPlaylist(info: InfoMidia, o: OpcoesDownload): { marcados: number; total: number; segundos: number; tamanho: number | null } {
  const pl = info.playlist!
  const selecao = expandir(o.itensPlaylist, pl.total)
  const segundos = pl.entradas.reduce((t, e) => t + (selecao.has(e.indice) ? (e.duracao ?? 0) : 0), 0)
  const tamanho = o.modo === 'audio' && o.bitrateAudio > 0 && segundos ? (o.bitrateAudio * 1000 * segundos) / 8 : null
  return { marcados: selecao.size, total: pl.total, segundos, tamanho }
}

/** Lista para marcar os vídeos da playlist, em lista ou em grade de capas (também usada na prévia da tela Baixar). */
/** semSoma: a prévia já mostra o total na barra de ações presa no pé da tela. */
export function ListaPlaylist({ info, o, mudar, semSoma }: { info: InfoMidia; o: OpcoesDownload; mudar: Mudar; semSoma?: boolean }) {
  const pl = info.playlist!
  const historico = useEstado((s) => s.historico)
  // O que já foi baixado antes aparece riscado (comparando pelo id do vídeo ou pelo link)
  const baixados = useMemo(() => new Set(historico.flatMap((h) => [h.idMidia, h.url])), [historico])
  const jaBaixado = (e: EntradaPlaylist) => baixados.has(e.id) || baixados.has(e.url)
  const [grade, setGrade] = useState(() => {
    try {
      return localStorage.getItem('playlistGrade') === '1'
    } catch {
      return false
    }
  })
  const selecao = expandir(o.itensPlaylist, pl.total)
  const definir = (s: Set<number>) => mudar({ itensPlaylist: s.size === pl.total ? '' : s.size ? compactar([...s]) : '0' })
  const alternar = (indice: number, marcar: boolean) => {
    const nova = new Set(selecao)
    if (marcar) nova.add(indice)
    else nova.delete(indice)
    definir(nova)
  }
  const escolherModo = (g: boolean) => {
    setGrade(g)
    try {
      localStorage.setItem('playlistGrade', g ? '1' : '0')
    } catch {
      /* sem armazenamento: só não lembra */
    }
  }
  // Total corrido da seleção: tempo somado e, no áudio, o tamanho aproximado pela taxa de bits
  const segundos = pl.entradas.reduce((t, e) => t + (selecao.has(e.indice) ? (e.duracao ?? 0) : 0), 0)
  const tamanho = o.modo === 'audio' && o.bitrateAudio > 0 && segundos ? (o.bitrateAudio * 1000 * segundos) / 8 : null
  const repetidos = pl.entradas.filter((e) => selecao.has(e.indice) && jaBaixado(e)).length

  return (
    <>
      <div className="total-corrido">
        <span className="alternador" role="group" aria-label="Modo de exibição">
          <button className={grade ? '' : 'ativo'} title="Lista" onClick={() => escolherModo(false)}>
            <List />
          </button>
          <button className={grade ? 'ativo' : ''} title="Grade de capas" onClick={() => escolherModo(true)}>
            <LayoutGrid />
          </button>
        </span>
        <button className="btn pequeno" onClick={() => definir(new Set(pl.entradas.map((e) => e.indice)))}>
          Marcar todos
        </button>
        <button className="btn pequeno" onClick={() => definir(new Set())}>
          Desmarcar
        </button>
        <span className="soma">
          {!semSoma && (
            <>
              <b>
                {selecao.size} de {pl.total}
              </b>{' '}
              marcados
              {segundos > 0 && ` · ${tempoTotal(segundos)}`}
              {tamanho ? ` · ~${bytes(tamanho)}` : ''}
            </>
          )}
          {repetidos > 0 && `${semSoma ? '' : ' · '}${repetidos} já ${repetidos === 1 ? 'baixado' : 'baixados'} (riscados)`}
        </span>
      </div>
      {grade ? (
        <div className="grade-videos">
          {pl.entradas.map((e) => {
            const marcado = selecao.has(e.indice)
            return (
              <label key={e.indice} className={`video${marcado ? ' marcado' : ''}${jaBaixado(e) ? ' ja-baixado' : ''}`} title={jaBaixado(e) ? `${e.titulo} (já baixado)` : e.titulo}>
                <span className="capa-wrap">
                  <CapaVideo e={e} />
                  <input type="checkbox" checked={marcado} onChange={(ev) => alternar(e.indice, ev.target.checked)} />
                  <span className="num">{e.indice}</span>
                  {e.duracao ? <span className="dur">{duracao(e.duracao)}</span> : null}
                </span>
                <span className="titulo">{e.titulo}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <div className="lista-check">
          {pl.entradas.map((e) => (
            <label key={e.indice}>
              <input type="checkbox" checked={selecao.has(e.indice)} onChange={(ev) => alternar(e.indice, ev.target.checked)} />
              <span className="num">{e.indice}</span>
              <CapaVideo e={e} />
              <span className={`flex-1 truncar${jaBaixado(e) ? ' ja-baixado' : ''}`}>{e.titulo}</span>
              {jaBaixado(e) && <span className="marca-baixado">já baixado</span>}
              <span className="muted pequeno tabular">{duracao(e.duracao)}</span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

/** Escolher os vídeos da playlist, limite, ordem e numeração (categoria D). */
function EditorPlaylist({ info, o, mudar, aoSeparar }: { info: InfoMidia; o: OpcoesDownload; mudar: Mudar; aoSeparar?: () => void }) {
  const [avancado, setAvancado] = useState(o.itensPlaylist)
  return (
    <div className="cartao">
      <Linha rotulo="Vídeos que serão baixados" coluna>
        <ListaPlaylist info={info} o={o} mudar={mudar} />
      </Linha>
      <Linha rotulo="Seleção avançada" dica='Ex.: "1-5,8,10-" ou "-3:" (os 3 últimos). Números negativos contam do fim.'>
        <input className="campo mono" style={{ width: 180 }} value={avancado} onChange={(e) => setAvancado(e.target.value)} placeholder="todos" />
        <button className="btn pequeno" onClick={() => mudar({ itensPlaylist: avancado.trim() })}>
          Aplicar
        </button>
      </Linha>
      <Linha rotulo="Limite de vídeos" dica="Baixa só os primeiros N (0 = sem limite). Ignorado se houver seleção.">
        <input
          className="campo"
          type="number"
          min={0}
          style={{ width: 90 }}
          value={o.limitePlaylist}
          onChange={(e) => mudar({ limitePlaylist: Math.max(0, Number(e.target.value) || 0) })}
        />
      </Linha>
      <LinhaInterruptor rotulo="Ordem invertida" dica="Baixa e numera do último para o primeiro" ligado={o.ordemInvertida} aoMudar={(ordemInvertida) => mudar({ ordemInvertida })} />
      {aoSeparar && (
        <Linha rotulo="Separar em vídeos individuais" dica="Cada vídeo marcado vira um item na fila, com progresso e opções próprios">
          <button className="btn pequeno" onClick={aoSeparar}>
            <Split /> Separar
          </button>
        </Linha>
      )}
    </div>
  )
}

/** Detalhes do vídeo (item 75). */
function Detalhes({ info }: { info: InfoMidia }) {
  return (
    <div className="cartao">
      <Linha rotulo="Canal">{info.canal ?? '—'}</Linha>
      <Linha rotulo="Site">{info.site}</Linha>
      <Linha rotulo="Publicado em">{dataUpload(info.dataUpload)}</Linha>
      <Linha rotulo="Duração">{duracao(info.duracao)}</Linha>
      <Linha rotulo="Visualizações">{numero(info.views)}</Linha>
      <Linha rotulo="Curtidas">{numero(info.likes)}</Linha>
      {info.capitulos.length > 0 && (
        <Linha rotulo={`Capítulos (${info.capitulos.length})`} coluna>
          <div className="lista-check">
            {info.capitulos.map((c, i) => (
              <label key={i} style={{ cursor: 'default' }}>
                <span className="num">{duracao(c.inicio)}</span>
                <span className="flex-1">{c.titulo}</span>
              </label>
            ))}
          </div>
        </Linha>
      )}
      {info.descricao && (
        <Linha rotulo="Descrição" coluna>
          <div className="selecionavel muted" style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', fontSize: 13 }}>
            {info.descricao}
          </div>
        </Linha>
      )}
    </div>
  )
}
