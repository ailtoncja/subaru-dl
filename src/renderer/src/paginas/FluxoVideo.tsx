// Baixar vídeo ou áudio: cola o link, confere a prévia, escolhe e baixa (com o yt-dlp).
import {
  AlertTriangle,
  ClipboardPaste,
  Download,
  FileText,
  History,
  Images,
  Link2,
  ListPlus,
  FilePlay,
  ListVideo,
  Loader2,
  Music,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { bytes, duracao, faixasParaEscolher, numeroCurto, tempoRelativo, tempoTotal } from '@shared/formatar'
import { estimarTamanho, FORMATOS_AUDIO, BITRATES, QUALIDADES } from '@shared/formatos'
import { capaRemota } from '@shared/miniatura'
import type { Duplicado, InfoMidia, ItemLote, OpcoesDownload } from '@shared/tipos'
import { CampoLinks } from '../componentes/CampoLinks'
import { SelecaoLegenda } from '../componentes/SelecaoLegenda'
import { CampoPasta, SelecaoOrganizar } from '../componentes/Destino'
import OpcoesAvancadas, { expandir, ListaPlaylist, somaPlaylist } from '../componentes/OpcoesAvancadas'
import { adicionarLote, avisar, extrairLinks, useEstado } from '../estado'
import { juntarLinks, ListaLinks, type LinhaLink } from '../componentes/ListaLinks'
import { BarraTempo } from '../componentes/Placar'

const SUFIXO: Record<string, string> = { '4320': '8K', '2160': '4K UHD', '1440': '2K QHD', '1080': 'Full HD', '720': 'HD', '480': 'SD', '360': '' }

const mensagemErro = (e: unknown) => (e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))

interface Previa {
  url: string
  info: InfoMidia
  duplicado: Duplicado | null
}

/** Partes com "·" entre elas. */
function ComPontos({ partes }: { partes: Array<ReactNode | null | false | undefined> }) {
  return (
    <>
      {partes.filter(Boolean).map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">·</span>}
          {p}
        </Fragment>
      ))}
    </>
  )
}

export default function FluxoVideo({
  slot,
  modo,
  texto,
  setTexto,
  pedido,
  aoTentarImagens
}: {
  /** Onde o campo do link é desenhado (no alto da tela, ao lado de Vídeo / Áudio / Imagens) */
  slot: HTMLElement | null
  modo: 'video' | 'audio'
  texto: string
  setTexto: (t: string) => void
  /** Link para abrir agora (Ctrl+V, link copiado, troca de modo) */
  pedido: { url: string; n: number } | null
  aoTentarImagens: () => void
}) {
  const { config, linkCopiado } = useEstado()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [opcoes, setOpcoes] = useState<OpcoesDownload>(() => ({ ...structuredClone(config!.padrao), modo }))
  const [avancado, setAvancado] = useState(false)
  const [verLista, setVerLista] = useState(false)
  /** Vários links de uma vez (um por linha): mostra a lista em vez da prévia */
  const [lote, setLote] = useState<LinhaVideo[] | null>(null)
  const [arrastando, setArrastando] = useState(false)

  // Vídeo ou áudio é escolhido no alto da tela: a prévia acompanha
  useEffect(() => setOpcoes((o) => (o.modo === modo ? o : { ...o, modo, formatoId: null })), [modo])

  /** Shift+Enter: o link vai para a lista na hora e o campo fica livre para o próximo. */
  const acrescentarAoLote = () => {
    const links = extrairLinks(texto)
    if (!links.length) return
    setLote((atual) => juntarLinks(atual ?? [], links, novaLinhaVideo))
    setPrevia(null)
    setErro('')
    setTexto('')
  }

  const ler = async (url: string) => {
    const links = extrairLinks(url)
    if (!links.length) return setErro('Cole um link que comece com http')
    // Vários links (ou mais um numa lista já aberta): a lista, com as mesmas opções para todos
    if (links.length > 1 || lote) {
      setLote((atual) => juntarLinks(atual ?? [], links, novaLinhaVideo))
      setPrevia(null)
      setErro('')
      setTexto('')
      return
    }
    setLote(null)
    setTexto(links[0])
    setCarregando(true)
    setErro('')
    setPrevia(null)
    setAvancado(false)
    try {
      const r = await window.api.lerLink(links[0])
      setPrevia({ url: links[0], ...r })
      setOpcoes({ ...structuredClone(useEstado.getState().config!.padrao), modo })
      // Playlist: a lista para escolher os vídeos já vem aberta
      setVerLista(!!r.info.playlist)
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (pedido) void ler(pedido.url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.n])

  const colar = async () => {
    const link = extrairLinks(await window.api.lerClipboard())
    if (link.length) void ler(link.join('\n'))
    else avisar('Nenhum link na área de transferência. Copie o link no navegador primeiro.', 'erro')
  }

  const mudar = (p: Partial<OpcoesDownload>) => setOpcoes((o) => ({ ...o, ...p }))

  const importar = async () => {
    const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
    if (achados.length) void ler(achados.join('\n'))
  }

  // Arrastar links ou um .txt com links para a tela
  const soltar = async (e: DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const achados: string[] = []
    for (const arquivo of Array.from(e.dataTransfer.files)) {
      if (/\.(txt|csv|list)$/i.test(arquivo.name)) achados.push(...extrairLinks(await arquivo.text()))
    }
    achados.push(...extrairLinks(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')))
    if (achados.length) void ler(achados.join('\n'))
    else avisar('Nada para adicionar no que foi solto', 'erro')
  }

  const baixar = async (iniciar: boolean) => {
    if (!previa) return
    const pl = previa.info.playlist
    if (pl && opcoes.itensPlaylist.trim() === '0') return avisar('Marque pelo menos um vídeo da playlist', 'erro')
    await window.api.adicionarComInfo(previa.url, previa.info, opcoes, iniciar)
    avisar(iniciar ? 'Baixando — acompanhe no placar ao vivo' : 'Na fila. Mande baixar pela aba "Na fila" quando quiser.')
    setPrevia(null)
    setTexto('')
  }

  const temLink = extrairLinks(texto).length > 0
  const cartaoAberto = !!previa || lote !== null

  // Uma só placa amarela por tela: quando a prévia (ou a lista) está aberta, o botão de baixar é o dela
  let principal: ReactNode
  if (cartaoAberto)
    principal = (
      <button className="btn grande" onClick={colar}>
        <ClipboardPaste /> Colar outro
      </button>
    )
  else if (carregando)
    principal = (
      <button className="btn primario grande" disabled>
        <Loader2 className="girando" /> Lendo…
      </button>
    )
  else if (temLink)
    principal = (
      <button className="btn primario grande" onClick={() => ler(texto)}>
        <Download /> Baixar
      </button>
    )
  else
    principal = (
      <button className="btn primario grande" onClick={colar}>
        <ClipboardPaste /> Colar link
      </button>
    )

  return (
    <div
      className="fluxo"
      onDragOver={(e) => {
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setArrastando(false)}
      onDrop={soltar}
    >
      {slot &&
        createPortal(
      <div className={`caixa-url${arrastando ? ' arrastando' : ''}`}>
        <div className="campo-link" title="Shift+Enter junta vários links, um por linha">
        <Link2 />
        <CampoLinks
          valor={texto}
          autoFocus
          aoMudar={setTexto}
          aoEnviar={() => ler(texto)}
          aoAcrescentar={acrescentarAoLote}
          aoColar={(e) => {
            // Campo vazio: colar já abre o link. Já tem link (Shift+Enter): só acrescenta a linha.
            const colado = e.clipboardData.getData('text')
            if (!extrairLinks(texto).length && extrairLinks(colado).length) {
              e.preventDefault()
              void ler(colado)
            }
          }}
          placeholder={modo === 'audio' ? 'Cole aqui o link da música, do vídeo ou da playlist' : 'Cole aqui o link do vídeo ou da playlist'}
        />
        {texto && !carregando && (
          <button className="icone-btn leve" title="Limpar" onClick={() => (setTexto(''), setPrevia(null), setErro(''))}>
            <X />
          </button>
        )}
        <button className="icone-btn leve" title="Importar uma lista de links (.txt)" onClick={importar}>
          <FileText />
        </button>
        </div>
        {principal}
      </div>,
          slot
        )}

      {linkCopiado && !previa && !carregando && (
        <div className="aviso-azul">
          <ClipboardPaste />
          <span className="flex-1 truncar">
            Você copiou um link: <span className="muted">{linkCopiado}</span>
          </span>
          <button className="btn pequeno" onClick={() => (useEstado.setState({ linkCopiado: null }), void ler(linkCopiado))}>
            Ver
          </button>
          <button className="icone-btn leve" title="Ignorar" onClick={() => useEstado.setState({ linkCopiado: null })}>
            <X />
          </button>
        </div>
      )}

      {carregando && (
        <div className="cartao lendo" role="status">
          <strong>Lendo o link…</strong>
          <span className="mono">{texto}</span>
          <BarraTempo correndo rotulo="Lendo o link" />
        </div>
      )}

      {erro && !carregando && (
        <div className="aviso-erro">
          <AlertTriangle />
          <span className="flex-1 selecionavel">{erro}</span>
          {temLink && (
            <>
              <button className="btn pequeno" onClick={() => ler(texto)}>
                <RefreshCw /> Tentar de novo
              </button>
              <button className="btn pequeno" onClick={aoTentarImagens} title="Para perfis e posts de fotos (Instagram, X, Pixiv…)">
                <Images /> Tentar como imagens
              </button>
            </>
          )}
        </div>
      )}

      {previa && !carregando && (
        <CartaoPrevia
          previa={previa}
          opcoes={opcoes}
          mudar={mudar}
          verLista={verLista}
          setVerLista={setVerLista}
          avancado={avancado}
          setAvancado={setAvancado}
          baixar={baixar}
          fechar={() => (setPrevia(null), setTexto(''))}
        />
      )}

      {lote !== null && !carregando && <CartaoLote modo={modo} linhas={lote} setLinhas={setLote} fechar={() => setLote(null)} />}
    </div>
  )
}

function CartaoPrevia({
  previa,
  opcoes: o,
  mudar,
  verLista,
  setVerLista,
  avancado,
  setAvancado,
  baixar,
  fechar
}: {
  previa: Previa
  opcoes: OpcoesDownload
  mudar: (p: Partial<OpcoesDownload>) => void
  verLista: boolean
  setVerLista: (v: boolean) => void
  avancado: boolean
  setAvancado: (v: boolean) => void
  baixar: (iniciar: boolean) => void
  fechar: () => void
}) {
  const { info, duplicado } = previa
  const pl = info.playlist
  const maior = Math.max(0, ...info.formatos.map((f) => f.altura ?? 0))

  // Qualidades que existem de verdade, com o tamanho estimado de cada uma
  const qualidades = useMemo(() => {
    const tam = (q: OpcoesDownload['qualidade']) => {
      const e = estimarTamanho(info, { ...o, modo: 'video', qualidade: q, formatoId: null })
      return e ? ` · ${e.aproximado ? '~' : ''}${bytes(e.bytes)}` : ''
    }
    const lista = QUALIDADES.filter((q) => q.valor !== 'melhor' && (!info.formatos.length || maior >= Number(q.valor) * 0.9)).map((q) => ({
      valor: q.valor,
      nome: `${q.curto}${SUFIXO[q.valor] ? ' ' + SUFIXO[q.valor] : ''}${tam(q.valor)}`
    }))
    return [{ valor: 'melhor' as const, nome: `A melhor${maior ? ` (${maior}p)` : ''}${tam('melhor')}` }, ...lista]
  }, [info, o, maior])

  const bitrates = useMemo(
    () =>
      BITRATES.map((b) => {
        const e = estimarTamanho(info, { ...o, modo: 'audio', bitrateAudio: b, formatoId: null })
        return { valor: b, nome: `${b ? `${b} kbps` : 'A melhor'}${e ? ` · ~${bytes(e.bytes)}` : ''}` }
      }),
    [info, o]
  )

  const selecionados = pl ? expandir(o.itensPlaylist, pl.total).size : 0
  const semPerda = o.formatoAudio === 'wav' || o.formatoAudio === 'flac'
  const audio = o.modo === 'audio'
  const rotuloBaixar = pl
    ? `Baixar ${selecionados} ${selecionados === 1 ? (audio ? 'áudio' : 'vídeo') : audio ? 'áudios' : 'vídeos'}`
    : audio
      ? `Baixar ${o.manterOriginal ? 'áudio' : o.formatoAudio.toUpperCase()}`
      : 'Baixar vídeo'

  return (
    <div className="cartao previa">
      <div className="capa" style={capaRemota(info.miniatura) ? { backgroundImage: `url("${capaRemota(info.miniatura, 480)}")` } : undefined}>
        {!capaRemota(info.miniatura) && (
          <div className="sem-capa" aria-hidden="true">
            {pl ? <ListVideo /> : audio ? <Music /> : <FilePlay />}
          </div>
        )}
        {info.duracao != null && !info.aoVivo && <span className="duracao">{duracao(info.duracao)}</span>}
        {info.aoVivo && <span className="ao-vivo">Transmissão ao vivo</span>}
      </div>

      <div className="cabeca-previa">
        <div className="titulo-previa">
          <h2 className="selecionavel">{info.titulo}</h2>
          <button className="icone-btn leve" title="Fechar a prévia" onClick={fechar}>
            <X />
          </button>
        </div>
        <div className="meta">
          <ComPontos
            partes={[
              info.canal,
              info.site,
              info.views != null && `${numeroCurto(info.views)} visualizações`,
              pl ? `playlist com ${pl.total} vídeos` : maior > 0 && `até ${maior}p${SUFIXO[String(maior)] ? ` ${SUFIXO[String(maior)]}` : ''}`
            ]}
          />
        </div>

        {duplicado && (
          <div className="aviso-azul ja-baixado">
            <History />
            <span>
              Você já baixou isso {tempoRelativo(duplicado.baixadoEm)}
              {duplicado.arquivoExiste ? '. Baixar de novo cria outra cópia.' : ', mas o arquivo não existe mais.'}
            </span>
          </div>
        )}

        {pl && pl.total === 0 && (
          <div className="aviso-azul">
            <AlertTriangle />
            <span>Essa playlist está vazia ou é privada. Se for sua, entre na conta em Ajustes → Rede e login.</span>
          </div>
        )}
      </div>

      <div className="opcoes">
        {audio ? (
          <>
            <label className="rotulado largo">
              <span>Qualidade do áudio</span>
              <select value={o.bitrateAudio} disabled={semPerda} onChange={(e) => mudar({ bitrateAudio: Number(e.target.value) })}>
                {bitrates.map((b) => (
                  <option key={b.valor} value={b.valor}>
                    {semPerda ? 'Sem perda (WAV/FLAC)' : b.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="rotulado estreito">
              <span>Formato</span>
              <select value={o.formatoAudio} onChange={(e) => mudar({ formatoAudio: e.target.value as OpcoesDownload['formatoAudio'] })}>
                {FORMATOS_AUDIO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="rotulado largo">
              <span>Qualidade</span>
              <select value={o.qualidade} onChange={(e) => mudar({ qualidade: e.target.value as OpcoesDownload['qualidade'], formatoId: null })}>
                {qualidades.map((q) => (
                  <option key={q.valor} value={q.valor}>
                    {q.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="rotulado estreito">
              <span>Formato</span>
              <select value={o.container} onChange={(e) => mudar({ container: e.target.value as OpcoesDownload['container'] })}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </label>
          </>
        )}
        {info.idiomasAudio.length > 1 && (
          <label className="rotulado" title="A faixa original vem marcada">
            <span>Faixa de áudio</span>
            <select value={o.idiomaAudio ?? ''} onChange={(e) => mudar({ idiomaAudio: e.target.value || null })}>
              {faixasParaEscolher(info.idiomasAudio, info.idiomaOriginal).map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        {!audio && <SelecaoLegenda info={info} o={o} mudar={mudar} />}
      </div>

      {pl && pl.total > 0 && (
        <div className="lista-previa">
          <button className="link-amarelo" aria-expanded={verLista} onClick={() => setVerLista(!verLista)}>
            <ListVideo /> {verLista ? 'Esconder a lista' : `Escolher os vídeos (${selecionados} de ${pl.total})`}
          </button>
          {verLista && <ListaPlaylist info={info} o={o} mudar={mudar} semSoma />}
        </div>
      )}

      <div className="rodape-previa">
        <CampoPasta pasta={o.pasta} modo={o.modo} aoMudar={(pasta) => mudar({ pasta })} />
        <SelecaoOrganizar o={o} mudar={mudar} compacto />
        <button className="link-amarelo" aria-expanded={avancado} onClick={() => setAvancado(!avancado)}>
          <SlidersHorizontal /> {avancado ? 'Menos opções' : 'Mais opções'}
        </button>
      </div>
      {avancado && <OpcoesAvancadas embutido titulo="Mais opções" info={info} opcoes={o} mudar={mudar} aoFechar={() => setAvancado(false)} />}

      {/* Presa no pé da tela enquanto o cartão está à vista: o botão de baixar nunca some */}
      <div className="barra-acoes">
        {pl && pl.total > 0 && <SomaPlaylist info={info} o={o} />}
        <button className="btn grande" disabled={!!pl && !selecionados} onClick={() => baixar(false)} title="Fica esperando na aba Na fila até você mandar baixar">
          <ListPlus /> Pôr na fila
        </button>
        <button className="btn primario grande" disabled={!!pl && !selecionados} onClick={() => baixar(true)}>
          <Download /> {rotuloBaixar}
        </button>
      </div>
    </div>
  )
}

/** "12 de 246 marcados · 3 h 10 min · ~420 MB" na barra de ações. */
function SomaPlaylist({ info, o }: { info: InfoMidia; o: OpcoesDownload }) {
  const s = somaPlaylist(info, o)
  return (
    <span className="soma">
      <b>
        {s.marcados} de {s.total}
      </b>
      <span className="so-largo"> marcados</span>
      {s.segundos > 0 && ` · ${tempoTotal(s.segundos)}`}
      {s.tamanho ? (
        <span title={o.modo === 'audio' ? 'Estimativa pela qualidade do áudio' : 'Estimativa pela qualidade escolhida (em "A melhor", conta como 1080p); o tamanho real muda de vídeo para vídeo'}>
          {' · ~'}
          {bytes(s.tamanho)}
        </span>
      ) : (
        ''
      )}
    </span>
  )
}

/** Um link da lista, com a prévia lida sob demanda e os vídeos escolhidos da playlist. */
interface LinhaVideo extends LinhaLink {
  info: InfoMidia | null
  carregando: boolean
  erro: string | null
  itensPlaylist: string
}

const novaLinhaVideo = (url: string): LinhaVideo => ({ url, pasta: null, aberto: false, info: null, carregando: false, erro: null, itensPlaylist: '' })

/** Vários links de uma vez: opções comuns, mas pasta e vídeos escolhidos por link. */
function CartaoLote({
  modo,
  linhas,
  setLinhas,
  fechar
}: {
  modo: 'video' | 'audio'
  linhas: LinhaVideo[]
  setLinhas: (f: (l: LinhaVideo[] | null) => LinhaVideo[] | null) => void
  fechar: () => void
}) {
  const config = useEstado((s) => s.config)!
  const [o, setO] = useState<OpcoesDownload>(() => ({ ...structuredClone(config.padrao), modo }))
  const [avancado, setAvancado] = useState(false)
  const mudar = (p: Partial<OpcoesDownload>) => setO((atual) => ({ ...atual, ...p }))
  const pastaComum = o.pasta ?? (o.modo === 'audio' ? config.pastaAudio : config.pastaVideo)

  useEffect(() => setO((atual) => (atual.modo === modo ? atual : { ...atual, modo })), [modo])

  const mudarLinha = (i: number, p: Partial<LinhaVideo>) => setLinhas((ls) => ls && ls.map((l, n) => (n === i ? { ...l, ...p } : l)))

  // "Ver": lê a prévia do link (uma vez só)
  const abrir = async (i: number) => {
    const l = linhas[i]
    if (!l || l.info || l.carregando) return
    mudarLinha(i, { carregando: true, erro: null })
    try {
      const r = await window.api.lerLink(l.url)
      setLinhas((ls) => ls && ls.map((x) => (x.url === l.url ? { ...x, info: r.info, carregando: false } : x)))
    } catch (e) {
      setLinhas((ls) => ls && ls.map((x) => (x.url === l.url ? { ...x, erro: mensagemErro(e), carregando: false } : x)))
    }
  }

  const enviar = async (iniciar: boolean) => {
    if (!linhas.length) return avisar('Nenhum link na lista', 'erro')
    if (linhas.some((l) => l.itensPlaylist === '0')) return avisar('Há uma playlist sem nenhum vídeo marcado', 'erro')
    const lote: ItemLote[] = linhas.map((l) => ({
      url: l.url,
      info: l.info,
      opcoes: { ...o, pasta: l.pasta ?? o.pasta, itensPlaylist: l.itensPlaylist }
    }))
    const n = await adicionarLote(lote, iniciar)
    if (n) avisar(iniciar ? `${n} ${n === 1 ? 'link baixando' : 'links baixando'} — acompanhe no placar ao vivo` : `${n} ${n === 1 ? 'link' : 'links'} na fila`)
    fechar()
  }

  return (
    <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ListaLinks
        linhas={linhas}
        mudarLinha={mudarLinha}
        remover={(i) => setLinhas((ls) => (ls && ls.length > 1 ? ls.filter((_, n) => n !== i) : null))}
        acrescentar={(urls) => setLinhas((ls) => juntarLinks(ls ?? [], urls, novaLinhaVideo))}
        limpar={fechar}
        pastaComum={pastaComum}
        aoAbrir={abrir}
        info={(l) => {
          const pl = l.info?.playlist
          return {
            titulo: l.info?.titulo,
            miniatura: l.info?.miniatura,
            carregando: l.carregando,
            erro: l.erro,
            resumo: pl ? `${expandir(l.itensPlaylist, pl.total).size} de ${pl.total} vídeos` : l.info?.duracao != null ? duracao(l.info.duracao) : null
          }
        }}
        previa={(l, i) =>
          l.carregando ? (
            <span className="muted pequeno flex">
              <Loader2 className="girando" width={15} /> Lendo o link…
            </span>
          ) : l.erro ? (
            <span className="erro-texto pequeno">{l.erro}</span>
          ) : l.info?.playlist ? (
            <ListaPlaylist info={l.info} o={{ ...o, itensPlaylist: l.itensPlaylist }} mudar={(p) => p.itensPlaylist !== undefined && mudarLinha(i, { itensPlaylist: p.itensPlaylist })} />
          ) : l.info ? (
            <div className="flex" style={{ gap: 14, alignItems: 'flex-start' }}>
              {capaRemota(l.info.miniatura) && <div className="miniatura" style={{ backgroundImage: `url("${capaRemota(l.info.miniatura)}")` }} />}
              <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong className="selecionavel">{l.info.titulo}</strong>
                <span className="muted pequeno">
                  <ComPontos partes={[l.info.canal, l.info.site, duracao(l.info.duracao), l.info.views != null && `${numeroCurto(l.info.views)} visualizações`]} />
                </span>
                {(() => {
                  const e = estimarTamanho(l.info, o)
                  return e ? (
                    <span className="pequeno muted tabular">
                      Tamanho estimado: {e.aproximado ? '~' : ''}
                      {bytes(e.bytes)}
                    </span>
                  ) : null
                })()}
              </div>
            </div>
          ) : null
        }
      />

      <div className="previa" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 0 }}>
        <div className="opcoes">
          {o.modo === 'video' ? (
            <>
              <label className="rotulado largo">
                <span>Qualidade (para todos)</span>
                <select value={o.qualidade} onChange={(e) => mudar({ qualidade: e.target.value as OpcoesDownload['qualidade'] })}>
                  {QUALIDADES.map((q) => (
                    <option key={q.valor} value={q.valor}>
                      {q.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rotulado estreito">
                <span>Formato</span>
                <select value={o.container} onChange={(e) => mudar({ container: e.target.value as OpcoesDownload['container'] })}>
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="rotulado largo">
                <span>Qualidade do áudio (para todos)</span>
                <select value={o.bitrateAudio} onChange={(e) => mudar({ bitrateAudio: Number(e.target.value) })}>
                  {BITRATES.map((b) => (
                    <option key={b} value={b}>
                      {b ? `${b} kbps` : 'A melhor'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rotulado estreito">
                <span>Formato</span>
                <select value={o.formatoAudio} onChange={(e) => mudar({ formatoAudio: e.target.value as OpcoesDownload['formatoAudio'] })}>
                  {FORMATOS_AUDIO.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="rodape-previa">
          <span className="flex" style={{ gap: 6 }}>
            <span className="muted">Pasta comum:</span>
            <CampoPasta pasta={o.pasta} modo={o.modo} aoMudar={(pasta) => mudar({ pasta })} semRotulo />
          </span>
          <SelecaoOrganizar o={o} mudar={mudar} compacto />
          {o.modo === 'video' && (
            <label>
              <input
                type="checkbox"
                checked={o.legendas.ativas}
                onChange={(e) => mudar({ legendas: { ...o.legendas, ativas: e.target.checked, automaticas: e.target.checked ? true : o.legendas.automaticas } })}
              />
              Legendas {(config.padrao.legendas.idiomas[0] ?? 'pt').toUpperCase()} (ou automática)
            </label>
          )}
          <button className="link-amarelo" aria-expanded={avancado} onClick={() => setAvancado(!avancado)}>
            <SlidersHorizontal /> {avancado ? 'Menos opções' : 'Mais opções'}
          </button>
        </div>
        {avancado && <OpcoesAvancadas embutido titulo="Mais opções (para todos)" info={null} opcoes={o} mudar={mudar} aoFechar={() => setAvancado(false)} />}
      </div>

      <div className="barra-acoes">
        <button className="btn grande" disabled={!linhas.length} onClick={() => enviar(false)}>
          <ListPlus /> Pôr na fila
        </button>
        <button className="btn primario grande" disabled={!linhas.length} onClick={() => enviar(true)}>
          <Download /> Baixar {linhas.length} {linhas.length === 1 ? 'link' : 'links'}
        </button>
      </div>
    </div>
  )
}
