// Janela "Opções avançadas" de um download: usada na prévia da tela Início e nos itens da fila.
import { Info, Split } from 'lucide-react'
import { useMemo, useState } from 'react'
import { bytes, dataUpload, duracao, lerTempo, numero } from '@shared/formatar'
import { codecCurto, escolherFormatos, temAudio, temVideo } from '@shared/formatos'
import type { InfoMidia, OpcoesDownload } from '@shared/tipos'
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
  aoSepararPlaylist
}: {
  titulo: string
  info: InfoMidia | null
  opcoes: OpcoesDownload
  mudar: Mudar
  aoFechar: () => void
  /** Texto explicando por que não dá para editar (download em andamento). */
  bloqueado?: string | null
  aoSepararPlaylist?: () => void
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

  return (
    <Dialogo titulo={titulo} aoFechar={aoFechar} largo rodape={<button className="btn primario" onClick={aoFechar}>Pronto</button>}>
      <div className="abas">
        {abas.map(([id, nome]) => (
          <button key={id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
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
            <EditorQualidade o={o} mudar={mudar} info={info} />
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

/** Lista para marcar os vídeos da playlist (também usada na prévia da tela Início). */
export function ListaPlaylist({ info, o, mudar }: { info: InfoMidia; o: OpcoesDownload; mudar: Mudar }) {
  const pl = info.playlist!
  const selecao = expandir(o.itensPlaylist, pl.total)
  const definir = (s: Set<number>) => mudar({ itensPlaylist: s.size === pl.total ? '' : s.size ? compactar([...s]) : '0' })
  return (
    <>
      <div className="flex">
        <span className="muted pequeno flex-1">
          {selecao.size} de {pl.total} marcados
        </span>
        <button className="btn pequeno" onClick={() => definir(new Set(pl.entradas.map((e) => e.indice)))}>
          Marcar todos
        </button>
        <button className="btn pequeno" onClick={() => definir(new Set())}>
          Desmarcar
        </button>
      </div>
      <div className="lista-check">
        {pl.entradas.map((e) => (
          <label key={e.indice}>
            <input
              type="checkbox"
              checked={selecao.has(e.indice)}
              onChange={(ev) => {
                const nova = new Set(selecao)
                if (ev.target.checked) nova.add(e.indice)
                else nova.delete(e.indice)
                definir(nova)
              }}
            />
            <span className="num">{e.indice}</span>
            <span className="flex-1 truncar">{e.titulo}</span>
            <span className="muted pequeno mono">{duracao(e.duracao)}</span>
          </label>
        ))}
      </div>
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
