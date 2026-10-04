// Tela Início: cola o link, vê a prévia, escolhe o formato e baixa (foto de referência 2).
import {
  AlertTriangle,
  Camera,
  ClipboardPaste,
  Download,
  FileText,
  FolderOpen,
  Hash,
  Headphones,
  Link2,
  ListPlus,
  ListVideo,
  Loader2,
  Music,
  Music2,
  Pause,
  RefreshCw,
  SlidersHorizontal,
  Video,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { bytes, duracao, faixasParaEscolher, numeroCurto, tempoRelativo, velocidade } from '@shared/formatar'
import { estimarTamanho, FORMATOS_AUDIO, BITRATES, QUALIDADES } from '@shared/formatos'
import type { Duplicado, InfoMidia, ItemLote, OpcoesDownload } from '@shared/tipos'
import { CampoLinks } from '../componentes/CampoLinks'
import { CampoPasta, SelecaoOrganizar } from '../componentes/Destino'
import OpcoesAvancadas, { expandir, ListaPlaylist } from '../componentes/OpcoesAvancadas'
import { adicionarLote, avisar, extrairLinks, useEstado } from '../estado'
import { juntarLinks, ListaLinks, type LinhaLink } from '../componentes/ListaLinks'

const SUFIXO: Record<string, string> = { '4320': '8K', '2160': '4K UHD', '1440': '2K QHD', '1080': 'FHD', '720': 'HD', '480': 'SD', '360': '' }

interface Previa {
  url: string
  info: InfoMidia
  duplicado: Duplicado | null
}

export default function Inicio() {
  const { config, linkParaAbrir, linkCopiado, fila } = useEstado()
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [opcoes, setOpcoes] = useState<OpcoesDownload>(() => structuredClone(config!.padrao))
  const [avancado, setAvancado] = useState(false)
  const [verLista, setVerLista] = useState(false)
  /** Vários links de uma vez (um por linha): mostra o cartão de lote em vez da prévia */
  const [lote, setLote] = useState<LinhaVideo[] | null>(null)
  const [arrastando, setArrastando] = useState(false)

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
    // Vários links (ou mais um num lote já aberto): cartão de lote, com as mesmas opções para todos
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
    try {
      const r = await window.api.lerLink(links[0])
      setPrevia({ url: links[0], ...r })
      setOpcoes(structuredClone(useEstado.getState().config!.padrao))
      // Playlist: a lista para escolher os vídeos já vem aberta
      setVerLista(!!r.info.playlist)
    } catch (e) {
      setErro(e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))
    } finally {
      setCarregando(false)
    }
  }

  // Link vindo do botão "Colar URL", do Ctrl+V ou do aviso de link copiado
  useEffect(() => {
    if (!linkParaAbrir) return
    useEstado.setState({ linkParaAbrir: null })
    void ler(linkParaAbrir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkParaAbrir])

  const colar = async () => {
    const link = extrairLinks(await window.api.lerClipboard())
    if (link.length) void ler(link.join('\n'))
    else avisar('Nenhum link na área de transferência', 'erro')
  }

  const mudar = (p: Partial<OpcoesDownload>) => setOpcoes((o) => ({ ...o, ...p }))

  const importar = async () => {
    const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
    if (achados.length) void ler(achados.join('\n'))
  }

  // Arrastar links ou um .txt com links para a janela
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
    avisar(iniciar ? 'Download iniciado' : 'Adicionado à fila')
    setPrevia(null)
    setTexto('')
  }

  const ativo = fila.find((i) => i.status === 'baixando' || i.status === 'processando')
  const naFila = fila.filter((i) => ['pronto', 'buscando', 'baixando', 'processando'].includes(i.status)).length

  return (
    <div
      className="pagina"
      onDragOver={(e) => {
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setArrastando(false)}
      onDrop={soltar}
    >
      <div className="heroi">
        <h1>Baixe vídeos e áudios em alta qualidade</h1>
        <p>Cole o link do YouTube, TikTok, Instagram, Twitch ou de mais de 1.800 sites.</p>
      </div>

      <div className="cartao caixa-url" style={arrastando ? { borderColor: 'var(--amarelo)' } : undefined}>
        <div className="linha-url">
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
            placeholder="Cole um link (Shift+Enter para adicionar à lista)"
          />
          {texto && !carregando && (
            <button className="icone-btn leve" title="Limpar" onClick={() => (setTexto(''), setPrevia(null), setErro(''))}>
              <X />
            </button>
          )}
          <button className="icone-btn leve" title="Importar uma lista de links (.txt)" onClick={importar}>
            <FileText />
          </button>
          <button className="btn" onClick={colar}>
            <ClipboardPaste className="amarelo" /> Colar <span className="kbd">Ctrl+V</span>
          </button>
          <button className="btn primario grande" disabled={carregando || !texto.trim()} onClick={() => ler(texto)}>
            {carregando ? <Loader2 className="girando" /> : <Download />} Baixar
          </button>
        </div>
        <div className="sites">
          <span>
            <span className="ponto" style={{ background: '#f87171' }} /> YouTube
          </span>
          ·
          <span>
            <Music2 /> TikTok
          </span>
          ·
          <span>
            <Camera /> Instagram
          </span>
          ·
          <span>
            <Hash /> Twitter / X
          </span>
          ·
          <span>
            <Headphones /> SoundCloud
          </span>
          · <span>+1.800 sites</span>
        </div>
      </div>

      {linkCopiado && !previa && !carregando && (
        <div className="aviso-azul">
          <ClipboardPaste />
          <span className="flex-1 truncar">
            Link copiado: <span className="muted mono">{linkCopiado}</span>
          </span>
          <button className="btn pequeno primario" onClick={() => (useEstado.setState({ linkCopiado: null }), void ler(linkCopiado))}>
            Ver prévia
          </button>
          <button className="icone-btn leve" title="Ignorar" onClick={() => useEstado.setState({ linkCopiado: null })}>
            <X />
          </button>
        </div>
      )}

      {carregando && (
        <div className="cartao vazio">
          <Loader2 className="girando" style={{ color: 'var(--azul-claro)' }} />
          <strong>Lendo o link…</strong>
          <span className="mono pequeno">{texto}</span>
        </div>
      )}

      {erro && !carregando && (
        <div className="aviso-amarelo">
          <AlertTriangle />
          <span className="flex-1 selecionavel">{erro}</span>
          <button className="btn pequeno" onClick={() => ler(texto)}>
            <RefreshCw /> Tentar de novo
          </button>
        </div>
      )}

      {previa && !carregando && (
        <CartaoPrevia
          previa={previa}
          opcoes={opcoes}
          mudar={mudar}
          verLista={verLista}
          setVerLista={setVerLista}
          abrirAvancado={() => setAvancado(true)}
          baixar={baixar}
          fechar={() => setPrevia(null)}
        />
      )}

      {ativo && (
        <div className="cartao mini-progresso">
          <div className="icone">
            <RefreshCw className="girando" style={{ animationDuration: '2.5s' }} />
          </div>
          <div className="texto">
            <strong>{ativo.info?.titulo ?? ativo.url}</strong>
            <small>
              <b>{Math.round(ativo.progresso.porcentagem)}%</b> {ativo.status === 'processando' ? (ativo.progresso.etapa ?? 'processando').toLowerCase() : 'concluído'}
              {ativo.progresso.velocidade ? ` · ${velocidade(ativo.progresso.velocidade)}` : ''}
              {ativo.progresso.eta != null ? ` · ${duracao(ativo.progresso.eta)} restantes` : ''}
              {naFila > 1 ? ` · +${naFila - 1} na fila` : ''}
            </small>
          </div>
          <div className="barra-progresso">
            <div style={{ width: `${ativo.progresso.porcentagem}%` }} />
          </div>
          <button className="icone-btn leve" title="Pausar" onClick={() => window.api.pausar(ativo.id)}>
            <Pause />
          </button>
          <button className="icone-btn leve" title="Abrir a pasta" onClick={() => window.api.abrirPasta(ativo.opcoes.pasta ?? (ativo.opcoes.modo === 'audio' ? config!.pastaAudio : config!.pastaVideo))}>
            <FolderOpen />
          </button>
          <button className="btn fantasma pequeno mono" onClick={() => useEstado.getState().ir('downloads')}>
            Ver fila
          </button>
        </div>
      )}

      {lote !== null && !carregando && <CartaoLote linhas={lote} setLinhas={setLote} fechar={() => setLote(null)} />}

      {avancado && previa && (
        <OpcoesAvancadas titulo="Opções avançadas" info={previa.info} opcoes={opcoes} mudar={mudar} aoFechar={() => setAvancado(false)} />
      )}
    </div>
  )
}

function CartaoPrevia({
  previa,
  opcoes: o,
  mudar,
  verLista,
  setVerLista,
  abrirAvancado,
  baixar,
  fechar
}: {
  previa: Previa
  opcoes: OpcoesDownload
  mudar: (p: Partial<OpcoesDownload>) => void
  verLista: boolean
  setVerLista: (v: boolean) => void
  abrirAvancado: () => void
  baixar: (iniciar: boolean) => void
  fechar: () => void
}) {
  const { info, duplicado } = previa
  const pl = info.playlist
  const config = useEstado((s) => s.config)!
  const maior = Math.max(0, ...info.formatos.map((f) => f.altura ?? 0))
  const idiomaLegenda = (config.padrao.legendas.idiomas[0] ?? 'pt').toUpperCase()

  // Qualidades que existem de verdade, com o tamanho estimado de cada uma
  const qualidades = useMemo(() => {
    const tam = (q: OpcoesDownload['qualidade']) => {
      const e = estimarTamanho(info, { ...o, modo: 'video', qualidade: q, formatoId: null })
      return e ? ` • ${e.aproximado ? '~' : ''}${bytes(e.bytes)}` : ''
    }
    const lista = QUALIDADES.filter((q) => q.valor !== 'melhor' && (!info.formatos.length || maior >= Number(q.valor) * 0.9)).map((q) => ({
      valor: q.valor,
      nome: `${q.curto}${SUFIXO[q.valor] ? ' ' + SUFIXO[q.valor] : ''}${tam(q.valor)}`
    }))
    return [{ valor: 'melhor' as const, nome: `Melhor${maior ? ` (${maior}p)` : ''}${tam('melhor')}` }, ...lista]
  }, [info, o, maior])

  const bitrates = useMemo(
    () =>
      BITRATES.map((b) => {
        const e = estimarTamanho(info, { ...o, modo: 'audio', bitrateAudio: b, formatoId: null })
        return { valor: b, nome: `${b ? `${b} kbps` : 'Melhor qualidade'}${e ? ` • ~${bytes(e.bytes)}` : ''}` }
      }),
    [info, o]
  )

  const selecionados = pl ? expandir(o.itensPlaylist, pl.total).size : 0
  const semPerda = o.formatoAudio === 'wav' || o.formatoAudio === 'flac'

  return (
    <div className="cartao previa">
      <div className="capa" style={info.miniatura ? { backgroundImage: `url("${info.miniatura}")` } : undefined}>
        {info.duracao != null && !info.aoVivo && <span className="duracao">{duracao(info.duracao)}</span>}
      </div>

      <div className="info">
        <div className="selos">
          <span className="selo-amarelo">{(info.site || 'Link').toUpperCase()} · PRONTO</span>
          {info.aoVivo && <span className="selo-amarelo" style={{ color: '#f87171', borderColor: '#f87171' }}>AO VIVO</span>}
          {pl ? (
            <span className="selo-amarelo">
              <ListVideo width={12} height={12} style={{ marginRight: 4 }} /> PLAYLIST · {pl.total} vídeos
            </span>
          ) : (
            maior > 0 && <span className="selo-amarelo">{maior}p {SUFIXO[String(maior)] ?? ''}</span>
          )}
          <span className="views">{info.views != null ? `${numeroCurto(info.views)} visualizações` : ''}</span>
          <button className="icone-btn leve" title="Fechar" onClick={fechar}>
            <X />
          </button>
        </div>
        <h2 className="selecionavel">{info.titulo}</h2>
        {info.canal && <div className="canal">{info.canal}</div>}

        {duplicado && (
          <div className="aviso-amarelo">
            <AlertTriangle />
            Você já baixou isso {tempoRelativo(duplicado.baixadoEm)}
            {duplicado.arquivoExiste ? '' : ' (o arquivo não existe mais)'}.
          </div>
        )}

        <div className="opcoes">
          <div className="segmentado">
            <button className={o.modo === 'video' ? 'ativo' : ''} onClick={() => mudar({ modo: 'video', formatoId: null })}>
              <Video /> Vídeo
            </button>
            <button className={o.modo === 'audio' ? 'ativo' : ''} onClick={() => mudar({ modo: 'audio', formatoId: null })}>
              <Music /> Áudio
            </button>
          </div>
          {o.modo === 'video' ? (
            <>
              <select value={o.qualidade} onChange={(e) => mudar({ qualidade: e.target.value as OpcoesDownload['qualidade'], formatoId: null })}>
                {qualidades.map((q) => (
                  <option key={q.valor} value={q.valor}>
                    {q.nome}
                  </option>
                ))}
              </select>
              <select className="formato" value={o.container} onChange={(e) => mudar({ container: e.target.value as OpcoesDownload['container'] })}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </>
          ) : (
            <>
              <select value={o.bitrateAudio} disabled={semPerda} onChange={(e) => mudar({ bitrateAudio: Number(e.target.value) })}>
                {bitrates.map((b) => (
                  <option key={b.valor} value={b.valor}>
                    {semPerda ? 'Sem perda (WAV/FLAC)' : b.nome}
                  </option>
                ))}
              </select>
              <select className="formato" value={o.formatoAudio} onChange={(e) => mudar({ formatoAudio: e.target.value as OpcoesDownload['formatoAudio'] })}>
                {FORMATOS_AUDIO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </>
          )}
          {info.idiomasAudio.length > 1 && (
            <select
              className="faixa-audio"
              title="Faixa de áudio (a original é a padrão)"
              value={o.idiomaAudio ?? ''}
              onChange={(e) => mudar({ idiomaAudio: e.target.value || null })}
            >
              {faixasParaEscolher(info.idiomasAudio, info.idiomaOriginal).map((f) => (
                <option key={f.valor} value={f.valor}>
                  Áudio: {f.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        {pl && (
          <div className="flex">
            <button className="link-amarelo" onClick={() => setVerLista(!verLista)}>
              <ListVideo /> {verLista ? 'Esconder a lista' : 'Escolher os vídeos'} ({selecionados} de {pl.total})
            </button>
          </div>
        )}
        {pl && verLista && <ListaPlaylist info={info} o={o} mudar={mudar} />}

        <hr />

        <div className="rodape-previa">
          <CampoPasta pasta={o.pasta} modo={o.modo} aoMudar={(pasta) => mudar({ pasta })} />
          <SelecaoOrganizar o={o} mudar={mudar} compacto />
          {o.modo === 'video' && (
            <label>
              <input
                type="checkbox"
                checked={o.legendas.ativas}
                onChange={(e) => mudar({ legendas: { ...o.legendas, ativas: e.target.checked } })}
              />
              Legendas {idiomaLegenda}
            </label>
          )}
          <button className="link-amarelo mono pequeno" onClick={abrirAvancado}>
            <SlidersHorizontal /> Opções avançadas
          </button>
        </div>

        <div className="acoes-previa">
          <button className="btn" onClick={() => baixar(false)} title="Espera você clicar em Baixar tudo na tela Downloads">
            <ListPlus /> Adicionar à fila
          </button>
          <button className="btn primario grande" onClick={() => baixar(true)}>
            <Download /> Baixar Agora
          </button>
        </div>
      </div>
    </div>
  )
}

/** Um link da lista do Início, com a prévia lida sob demanda e os vídeos escolhidos da playlist. */
interface LinhaVideo extends LinhaLink {
  info: InfoMidia | null
  carregando: boolean
  erro: string | null
  itensPlaylist: string
}

const novaLinhaVideo = (url: string): LinhaVideo => ({ url, pasta: null, aberto: false, info: null, carregando: false, erro: null, itensPlaylist: '' })

/** Vários links de uma vez: opções comuns, mas pasta e vídeos escolhidos por link. */
function CartaoLote({ linhas, setLinhas, fechar }: { linhas: LinhaVideo[]; setLinhas: (f: (l: LinhaVideo[] | null) => LinhaVideo[] | null) => void; fechar: () => void }) {
  const config = useEstado((s) => s.config)!
  const [o, setO] = useState<OpcoesDownload>(() => structuredClone(config.padrao))
  const [avancado, setAvancado] = useState(false)
  const mudar = (p: Partial<OpcoesDownload>) => setO((atual) => ({ ...atual, ...p }))
  const pastaComum = o.pasta ?? (o.modo === 'audio' ? config.pastaAudio : config.pastaVideo)

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
      const erro = e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e)
      setLinhas((ls) => ls && ls.map((x) => (x.url === l.url ? { ...x, erro, carregando: false } : x)))
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
    if (n) avisar(`${n} link(s) na fila`)
    fechar()
    if (n) useEstado.getState().ir('downloads')
  }

  return (
    <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              {l.info.miniatura && <div className="miniatura" style={{ backgroundImage: `url("${l.info.miniatura}")` }} />}
              <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong className="selecionavel">{l.info.titulo}</strong>
                <span className="muted pequeno">
                  {[l.info.canal, l.info.site, duracao(l.info.duracao), l.info.views != null ? `${numeroCurto(l.info.views)} visualizações` : null].filter(Boolean).join(' · ')}
                </span>
                {(() => {
                  const e = estimarTamanho(l.info, o)
                  return e ? <span className="mono pequeno amarelo">Tamanho estimado: {e.aproximado ? '~' : ''}{bytes(e.bytes)}</span> : null
                })()}
              </div>
            </div>
          ) : null
        }
      />

      <div className="previa" style={{ display: 'block', padding: 0 }}>
        <div className="opcoes">
          <div className="segmentado">
            <button className={o.modo === 'video' ? 'ativo' : ''} onClick={() => mudar({ modo: 'video' })}>
              <Video /> Vídeo
            </button>
            <button className={o.modo === 'audio' ? 'ativo' : ''} onClick={() => mudar({ modo: 'audio' })}>
              <Music /> Áudio
            </button>
          </div>
          {o.modo === 'video' ? (
            <>
              <select value={o.qualidade} onChange={(e) => mudar({ qualidade: e.target.value as OpcoesDownload['qualidade'] })}>
                {QUALIDADES.map((q) => (
                  <option key={q.valor} value={q.valor}>
                    {q.nome}
                  </option>
                ))}
              </select>
              <select value={o.container} onChange={(e) => mudar({ container: e.target.value as OpcoesDownload['container'] })}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </>
          ) : (
            <>
              <select value={o.bitrateAudio} onChange={(e) => mudar({ bitrateAudio: Number(e.target.value) })}>
                {BITRATES.map((b) => (
                  <option key={b} value={b}>
                    {b ? `${b} kbps` : 'Melhor qualidade'}
                  </option>
                ))}
              </select>
              <select value={o.formatoAudio} onChange={(e) => mudar({ formatoAudio: e.target.value as OpcoesDownload['formatoAudio'] })}>
                {FORMATOS_AUDIO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="rodape-previa" style={{ marginTop: 14 }}>
          <span className="flex" style={{ gap: 6 }}>
            <span className="muted">Pasta comum:</span>
            <CampoPasta pasta={o.pasta} modo={o.modo} aoMudar={(pasta) => mudar({ pasta })} semRotulo />
          </span>
          <SelecaoOrganizar o={o} mudar={mudar} compacto />
          {o.modo === 'video' && (
            <label>
              <input type="checkbox" checked={o.legendas.ativas} onChange={(e) => mudar({ legendas: { ...o.legendas, ativas: e.target.checked } })} />
              Legendas {(config.padrao.legendas.idiomas[0] ?? 'pt').toUpperCase()}
            </label>
          )}
          <button className="link-amarelo mono pequeno" onClick={() => setAvancado(true)}>
            <SlidersHorizontal /> Opções avançadas
          </button>
        </div>
      </div>

      <div className="flex" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" disabled={!linhas.length} onClick={() => enviar(false)}>
          <ListPlus /> Adicionar à fila
        </button>
        <button className="btn primario grande" disabled={!linhas.length} onClick={() => enviar(true)}>
          <Download /> Baixar tudo
        </button>
      </div>

      {avancado && <OpcoesAvancadas titulo="Opções avançadas (para todos)" info={null} opcoes={o} mudar={mudar} aoFechar={() => setAvancado(false)} />}
    </div>
  )
}
