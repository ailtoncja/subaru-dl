// Baixar imagens: perfis, posts, álbuns e mangás com o gallery-dl (item 74).
import { CheckSquare, ClipboardPaste, Download, Eye, FileText, Images, Info, Link2, Loader2, Square, Video, X } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { urlMiniaturaRemota } from '@shared/miniatura'
import type { ArquivoGaleria, OrganizarGaleria } from '@shared/tipos'
import { CampoLinks } from '../componentes/CampoLinks'
import { pastaCurta, SelecaoOrganizarGaleria } from '../componentes/Destino'
import { juntarLinks, ListaLinks, type LinhaLink } from '../componentes/ListaLinks'
import { compactar } from '../componentes/OpcoesAvancadas'
import { avisar, extrairLinks, salvarConfig, useEstado } from '../estado'

const POR_VEZ = 200

/** Arquivos listados de um link (prévia) e quais estão marcados. */
interface Listagem {
  arquivos: ArquivoGaleria[]
  fim: boolean
  marcados: Set<number>
  carregando: boolean
  erro: string | null
  lido: boolean
}

const LISTAGEM_VAZIA: Listagem = { arquivos: [], fim: false, marcados: new Set(), carregando: false, erro: null, lido: false }

interface LinhaGaleria extends LinhaLink, Listagem {}

const novaLinha = (url: string): LinhaGaleria => ({ url, pasta: null, aberto: false, ...LISTAGEM_VAZIA, marcados: new Set() })

const mensagemErro = (e: unknown) => (e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))

/** Lê (mais) arquivos de um link e devolve a listagem atualizada. Tudo novo já vem marcado. */
async function lerMais(url: string, atual: Listagem): Promise<Listagem> {
  const r = await window.api.listarArquivosGaleria(url, atual.arquivos.length + 1, POR_VEZ)
  const marcados = new Set(atual.marcados)
  for (const a of r.arquivos) marcados.add(a.indice)
  // Só os campos da listagem: quem chama mistura com o resto da linha (pasta, aberto…) sem sobrescrever
  return { arquivos: [...atual.arquivos, ...r.arquivos], fim: r.fim, marcados, carregando: false, erro: null, lido: true }
}

/** null = baixar tudo; "0" nunca sai daqui (quem chama confere se há marcados). */
function intervaloDe(l: Listagem): string | null {
  if (!l.lido) return null
  return l.marcados.size === l.arquivos.length && l.fim ? null : compactar([...l.marcados])
}

export default function FluxoImagens({
  slot,
  texto,
  setTexto,
  pedido
}: {
  /** Onde o campo do link é desenhado (no alto da tela, ao lado de Vídeo / Áudio / Imagens) */
  slot: HTMLElement | null
  texto: string
  setTexto: (t: string) => void
  pedido: { url: string; n: number } | null
}) {
  const { config, irAjustes } = useEstado()
  const c = config!
  // Pasta e organização comuns (null = as dos ajustes)
  const [pasta, setPasta] = useState<string | null>(null)
  const [organizar, setOrganizar] = useState<OrganizarGaleria>(c.galeriaOrganizar)
  const [formatoPasta, setFormatoPasta] = useState(c.galeriaFormatoPasta)
  // Um link: prévia única. Vários: lista com pasta e prévia por link.
  const [previa, setPrevia] = useState<Listagem | null>(null)
  const [linhas, setLinhas] = useState<LinhaGaleria[] | null>(null)
  const [arrastando, setArrastando] = useState(false)
  // Shift+Enter deixa colocar vários links no campo, um por linha
  const links = extrairLinks(texto)
  const link = links[0] ?? ''
  const destino = pasta ?? c.pastaGaleria

  /** Junta links novos ao que já está na tela; dois ou mais viram a lista. */
  const acrescentar = (novos: string[]) => {
    const atuais = linhas ?? links.map(novaLinha)
    const juntos = juntarLinks(atuais, novos, novaLinha)
    if (juntos.length > 1) {
      setLinhas(juntos)
      setTexto('')
      setPrevia(null)
    } else if (juntos[0]) setTexto(juntos[0].url)
  }

  const colar = async () => {
    const achados = extrairLinks(await window.api.lerClipboard())
    if (achados.length === 1 && !linhas) void verArquivos(false, achados[0])
    else if (achados.length) acrescentar(achados)
    else avisar('Nenhum link na área de transferência. Copie o link no navegador primeiro.', 'erro')
  }

  const importar = async () => {
    const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
    if (achados.length) acrescentar(achados)
  }

  /** Shift+Enter: o link vai para a lista na hora e o campo fica livre para o próximo. */
  const acrescentarAoCampo = () => {
    if (!links.length) return
    setLinhas(juntarLinks(linhas ?? [], links, novaLinha))
    setTexto('')
    setPrevia(null)
  }

  // Arrastar links ou um .txt com links
  const soltar = async (e: DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const achados: string[] = []
    for (const arquivo of Array.from(e.dataTransfer.files)) {
      if (/\.(txt|csv|list)$/i.test(arquivo.name)) achados.push(...extrairLinks(await arquivo.text()))
    }
    achados.push(...extrairLinks(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')))
    if (achados.length) acrescentar(achados)
    else avisar('Nada para adicionar no que foi solto', 'erro')
  }

  // ---------- Um link ----------

  const verArquivos = async (mais = false, forcado?: string) => {
    const alvo = forcado ?? link
    if (!alvo) return
    if (forcado) setTexto(forcado)
    // Vários links no campo: vira a lista, cada um com a sua prévia
    if (!forcado && (links.length > 1 || linhas)) return linhas ? acrescentarAoCampo() : acrescentar([])
    const base = mais && previa ? previa : LISTAGEM_VAZIA
    setPrevia({ ...base, carregando: true, erro: null })
    try {
      const nova = await lerMais(alvo, base)
      setPrevia(nova.arquivos.length ? nova : { ...nova, erro: 'Nenhum arquivo encontrado nesse link.' })
    } catch (e) {
      setPrevia({ ...base, carregando: false, erro: mensagemErro(e) })
    }
  }

  // Link vindo do Ctrl+V, da troca de modo ou do aviso de link copiado
  useEffect(() => {
    if (!pedido) return
    const achados = extrairLinks(pedido.url)
    if (achados.length > 1) acrescentar(achados)
    else if (achados[0]) void verArquivos(false, achados[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.n])

  const baixarUm = async (intervalo: string | null) => {
    if (!link) return avisar('Cole um link', 'erro')
    const n = await window.api.adicionarGaleria(links, pasta, organizar, intervalo, formatoPasta)
    if (n) {
      setTexto('')
      setPrevia(null)
      avisar('Baixando — acompanhe no placar ao vivo')
    }
  }

  // ---------- Vários links ----------

  const mudarLinha = (i: number, p: Partial<LinhaGaleria>) => setLinhas((ls) => ls && ls.map((l, n) => (n === i ? { ...l, ...p } : l)))

  const lerLinha = async (i: number, mais = false) => {
    const l = linhas?.[i]
    if (!l || l.carregando || (l.lido && !mais)) return
    mudarLinha(i, { carregando: true, erro: null })
    try {
      const nova = await lerMais(l.url, l)
      setLinhas((ls) => ls && ls.map((x) => (x.url === l.url ? { ...x, ...nova, erro: nova.arquivos.length ? null : 'Nenhum arquivo encontrado' } : x)))
    } catch (e) {
      setLinhas((ls) => ls && ls.map((x) => (x.url === l.url ? { ...x, carregando: false, erro: mensagemErro(e) } : x)))
    }
  }

  const baixarLinhas = async () => {
    if (!linhas?.length) return
    const vazias = linhas.filter((l) => l.lido && !l.marcados.size)
    if (vazias.length) return avisar(`${vazias.length} link(s) sem nenhum arquivo marcado`, 'erro')
    let n = 0
    for (const l of linhas) n += await window.api.adicionarGaleria([l.url], l.pasta ?? pasta, organizar, intervaloDe(l), formatoPasta)
    setLinhas(null)
    avisar(`${n} ${n === 1 ? 'link baixando' : 'links baixando'} — acompanhe no placar ao vivo`)
  }

  const previaAberta = !!previa && (previa.arquivos.length > 0 || previa.carregando)

  // Uma só placa amarela por tela: com a prévia (ou a lista) aberta, o botão de baixar é o dela
  let botoes: ReactNode
  if (previaAberta || linhas)
    botoes = (
      <button className="btn grande" onClick={colar}>
        <ClipboardPaste /> Colar outro
      </button>
    )
  else if (link)
    botoes = (
      <>
        <button className="btn grande" disabled={previa?.carregando} onClick={() => verArquivos()} title="Lista os arquivos para você escolher quais baixar">
          {previa?.carregando ? <Loader2 className="girando" /> : <Eye />} Escolher
        </button>
        <button className="btn primario grande" onClick={() => baixarUm(null)}>
          <Download /> Baixar tudo
        </button>
      </>
    )
  else
    botoes = (
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
          aoMudar={(t) => (setTexto(t), setPrevia(null))}
          aoEnviar={() => verArquivos()}
          aoAcrescentar={acrescentarAoCampo}
          aoColar={(e) => {
            const colados = extrairLinks(e.clipboardData.getData('text'))
            // Colou vários de uma vez: vira a lista. Um só, com o campo vazio: já lista os arquivos.
            if (colados.length > 1) {
              e.preventDefault()
              acrescentar(colados)
            } else if (colados.length === 1 && !links.length && !linhas) {
              e.preventDefault()
              void verArquivos(false, colados[0])
            }
          }}
          placeholder="Cole aqui o link de um perfil, post ou álbum"
        />
        {texto && (
          <button className="icone-btn leve" title="Limpar" onClick={() => (setTexto(''), setPrevia(null))}>
            <X />
          </button>
        )}
        <button className="icone-btn leve" title="Importar uma lista de links (.txt)" onClick={importar}>
          <FileText />
        </button>
        </div>
        {botoes}
      </div>,
          slot
        )}

      <div className="rodape-previa">
        <span className="destino" title={destino}>
          <Images />
          <span className="muted">{linhas ? 'Pasta comum' : 'Salvar em'}</span>
          <span className="caminho">{pastaCurta(destino)}</span>
          <button
            className="link-amarelo"
            onClick={async () => {
              const nova = await window.api.escolherPasta(destino)
              if (nova) setPasta(nova)
            }}
          >
            Alterar
          </button>
          {pasta && (
            <button className="link-amarelo" style={{ color: 'var(--muted)' }} onClick={() => setPasta(null)}>
              Padrão
            </button>
          )}
        </span>
        <SelecaoOrganizarGaleria
          valor={organizar}
          formato={formatoPasta}
          compacto
          aoMudar={(v, f) => {
            setOrganizar(v)
            setFormatoPasta(f)
          }}
        />
        <label title="Lembra cada arquivo baixado e não baixa de novo">
          <input type="checkbox" checked={c.galeriaPularBaixados} onChange={(e) => salvarConfig({ galeriaPularBaixados: e.target.checked })} />
          Pular o que já baixei
        </label>
      </div>

      {c.cookies.origem === 'nenhum' && !previa && !linhas && (
        <div className="aviso-azul">
          <Info />
          <span className="flex-1">Instagram, X e Pixiv costumam pedir login para mostrar as fotos.</span>
          <button className="btn pequeno" onClick={() => irAjustes('preferencias')}>
            Configurar contas
          </button>
        </div>
      )}

      {linhas && (
        <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ListaLinks
            linhas={linhas}
            mudarLinha={mudarLinha}
            remover={(i) => {
              const resto = linhas.filter((_, n) => n !== i)
              setLinhas(resto.length ? resto : null)
            }}
            acrescentar={acrescentar}
            limpar={() => setLinhas(null)}
            pastaComum={destino}
            aoAbrir={(i) => lerLinha(i)}
            info={(l) => ({
              titulo: null,
              miniatura: (() => {
                const primeira = l.arquivos.find((a) => !a.video)
                return primeira ? urlMiniaturaRemota(primeira.url, l.url) : null
              })(),
              carregando: l.carregando,
              erro: l.erro,
              resumo: l.lido ? `${l.marcados.size} de ${l.arquivos.length}${l.fim ? '' : '+'}` : null
            })}
            previa={(l, i) => (
              <GradeArquivos
                l={l}
                pagina={l.url}
                alternar={(indice) => {
                  const marcados = new Set(l.marcados)
                  if (marcados.has(indice)) marcados.delete(indice)
                  else marcados.add(indice)
                  mudarLinha(i, { marcados })
                }}
                marcarTodos={(sim) => mudarLinha(i, { marcados: sim ? new Set(l.arquivos.map((a) => a.indice)) : new Set() })}
                carregarMais={() => lerLinha(i, true)}
              />
            )}
          />
          <div className="barra-acoes">
            <button className="btn primario grande" onClick={baixarLinhas}>
              <Download /> Baixar {linhas.length} {linhas.length === 1 ? 'link' : 'links'}
            </button>
          </div>
        </div>
      )}

      {previa?.erro && (
        <div className="aviso-erro">
          <Info />
          <span className="flex-1 selecionavel">{previa.erro}</span>
        </div>
      )}

      {previaAberta && previa && (
        <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GradeArquivos
            l={previa}
            pagina={link}
            alternar={(indice) => {
              const marcados = new Set(previa.marcados)
              if (marcados.has(indice)) marcados.delete(indice)
              else marcados.add(indice)
              setPrevia({ ...previa, marcados })
            }}
            marcarTodos={(sim) => setPrevia({ ...previa, marcados: sim ? new Set(previa.arquivos.map((a) => a.indice)) : new Set() })}
            carregarMais={() => verArquivos(true)}
            fechar={() => setPrevia(null)}
          />
          <div className="barra-acoes">
            <span className="soma">
              <b>
                {previa.marcados.size} de {previa.arquivos.length}
                {previa.fim ? '' : '+'}
              </b>{' '}
              marcados
            </span>
            <button className="btn grande" onClick={() => baixarUm(null)}>
              <Images /> Baixar tudo
            </button>
            <button
              className="btn primario grande"
              disabled={!previa.marcados.size}
              onClick={() => (previa.marcados.size ? baixarUm(intervaloDe(previa)) : avisar('Marque pelo menos um arquivo', 'erro'))}
            >
              <Download /> Baixar {previa.marcados.size} {previa.marcados.size === 1 ? 'marcado' : 'marcados'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Grade de miniaturas com marcar/desmarcar e "carregar mais" (prévia de um link). */
function GradeArquivos({
  l,
  pagina,
  alternar,
  marcarTodos,
  carregarMais,
  fechar
}: {
  l: Listagem
  /** Link da galeria (para as miniaturas pedirem a imagem como se viessem do site) */
  pagina: string
  alternar: (indice: number) => void
  marcarTodos: (sim: boolean) => void
  carregarMais: () => void
  fechar?: () => void
}) {
  // Função estável: marcar uma foto só redesenha aquela foto, não a grade inteira
  const ultimo = useRef(alternar)
  ultimo.current = alternar
  const aoAlternar = useCallback((indice: number) => ultimo.current(indice), [])

  if (l.carregando && !l.arquivos.length) {
    return (
      <span className="muted pequeno flex">
        <Loader2 className="girando" width={15} /> Listando os arquivos…
      </span>
    )
  }
  if (l.erro && !l.arquivos.length) return <span className="erro-texto pequeno">{l.erro}</span>
  return (
    <>
      <div className="total-corrido">
        <button className="btn pequeno" onClick={() => marcarTodos(true)}>
          <CheckSquare /> Marcar todos
        </button>
        <button className="btn pequeno" onClick={() => marcarTodos(false)}>
          <Square /> Desmarcar
        </button>
        <span className="soma">
          <b>
            {l.marcados.size} de {l.arquivos.length}
            {l.fim ? '' : '+'}
          </b>{' '}
          marcados
        </span>
        {fechar && (
          <button className="icone-btn leve" title="Fechar a prévia" onClick={fechar}>
            <X />
          </button>
        )}
      </div>
      <div className="grade-arquivos">
        {l.arquivos.map((a) => (
          <MiniaturaArquivo key={a.indice} arquivo={a} pagina={pagina} marcado={l.marcados.has(a.indice)} aoAlternar={aoAlternar} />
        ))}
      </div>
      {!l.fim && (
        <div className="flex">
          <button className="btn pequeno" disabled={l.carregando} onClick={carregarMais}>
            {l.carregando ? <Loader2 className="girando" /> : <Download />} Carregar mais {POR_VEZ}
          </button>
          <span className="muted pequeno">"Baixar tudo" pega também os que ainda não apareceram.</span>
        </div>
      )}
    </>
  )
}

// Um observador para todos os quadros: avisa quando cada um chega a ~400 px da tela.
// (O loading="lazy" do navegador não funciona junto com o content-visibility da grade.)
const avisos = new WeakMap<Element, () => void>()
let observador: IntersectionObserver | null = null
function quandoPerto(el: Element, aviso: () => void): () => void {
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue
        avisos.get(e.target)?.()
        avisos.delete(e.target)
        observador!.unobserve(e.target)
      }
    },
    { rootMargin: '400px' }
  )
  avisos.set(el, aviso)
  observador.observe(el)
  return () => {
    avisos.delete(el)
    observador?.unobserve(el)
  }
}

/**
 * Miniatura de um arquivo na prévia. A imagem vem reduzida pelo motor (rápida e em cache);
 * se o site bloquear, mostra só o ícone. memo: só redesenha quando a própria foto muda.
 */
const MiniaturaArquivo = memo(function MiniaturaArquivo({
  arquivo: a,
  pagina,
  marcado,
  aoAlternar
}: {
  arquivo: ArquivoGaleria
  pagina: string
  marcado: boolean
  aoAlternar: (indice: number) => void
}) {
  const [falhou, setFalhou] = useState(false)
  const [perto, setPerto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  // Só busca a foto quando o quadro chega perto da tela
  useEffect(() => (caixa.current && !a.video ? quandoPerto(caixa.current, () => setPerto(true)) : undefined), [a.video])
  return (
    <div ref={caixa} className={`arquivo${marcado ? ' marcado' : ''}`} onClick={() => aoAlternar(a.indice)} title={`${a.nome}${a.largura ? ` · ${a.largura}×${a.altura}` : ''}`}>
      <input type="checkbox" checked={marcado} readOnly aria-label={`Marcar ${a.nome}`} />
      {a.video || falhou ? (
        <div className="sem-imagem">{a.video ? <Video /> : <Images />}</div>
      ) : perto ? (
        <img src={urlMiniaturaRemota(a.url, pagina)} decoding="async" alt="" onError={() => setFalhou(true)} />
      ) : null}
      {a.video && <span className="tipo">VÍDEO</span>}
      <span className="num">{a.indice}</span>
    </div>
  )
})
