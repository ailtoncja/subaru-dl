// Galeria: imagens, perfis, álbuns e mangás com o gallery-dl (item 74).
import {
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  Clock,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Images,
  Info,
  Link2,
  Loader2,
  Pause,
  Play,
  RotateCw,
  Square,
  Trash2,
  Video,
  X,
  XCircle
} from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { tempoRelativo } from '@shared/formatar'
import { urlArquivoLocal } from '@shared/miniatura'
import type { ArquivoGaleria, ItemGaleria, OrganizarGaleria, StatusGaleria } from '@shared/tipos'
import { pastaCurta, SelecaoOrganizarGaleria } from '../componentes/Destino'
import { juntarLinks, ListaLinks, type LinhaLink } from '../componentes/ListaLinks'
import { compactar } from '../componentes/OpcoesAvancadas'
import { avisar, extrairLinks, salvarConfig, useEstado } from '../estado'

const NOMES: Record<StatusGaleria, string> = {
  aguardando: 'Na fila',
  baixando: 'Baixando',
  pausado: 'Pausado',
  concluido: 'Concluído',
  erro: 'Erro'
}

const SITES = 'Instagram, X/Twitter, Pixiv, DeviantArt, Reddit, Tumblr, Pinterest, ArtStation, Bluesky, MangaDex, Imgur e muitos outros'
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

export default function Galeria() {
  const { galeria, config } = useEstado()
  const c = config!
  const [texto, setTexto] = useState('')
  // Pasta e organização comuns (null = as das configurações)
  const [pasta, setPasta] = useState<string | null>(null)
  const [organizar, setOrganizar] = useState<OrganizarGaleria>(c.galeriaOrganizar)
  const [formatoPasta, setFormatoPasta] = useState(c.galeriaFormatoPasta)
  // Um link: prévia única. Vários: lista com pasta e prévia por link.
  const [previa, setPrevia] = useState<Listagem | null>(null)
  const [linhas, setLinhas] = useState<LinhaGaleria[] | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const link = extrairLinks(texto)[0] ?? ''
  const destino = pasta ?? c.pastaGaleria

  /** Junta links novos ao que já está na tela; dois ou mais viram a lista. */
  const acrescentar = (novos: string[]) => {
    const atuais = linhas ?? (link ? [novaLinha(link)] : [])
    const juntos = juntarLinks(atuais, novos, novaLinha)
    if (juntos.length > 1) {
      setLinhas(juntos)
      setTexto('')
      setPrevia(null)
    } else if (juntos[0]) setTexto(juntos[0].url)
  }

  const colar = async () => {
    const achados = extrairLinks(await window.api.lerClipboard())
    if (achados.length) acrescentar(achados)
    else avisar('Nenhum link na área de transferência', 'erro')
  }

  const importar = async () => {
    const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
    if (achados.length) acrescentar(achados)
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

  const verArquivos = async (mais = false) => {
    if (!link) return
    const base = mais && previa ? previa : LISTAGEM_VAZIA
    setPrevia({ ...base, carregando: true, erro: null })
    try {
      const nova = await lerMais(link, base)
      setPrevia(nova.arquivos.length ? nova : { ...nova, erro: 'Nenhum arquivo encontrado nesse link.' })
    } catch (e) {
      setPrevia({ ...base, carregando: false, erro: mensagemErro(e) })
    }
  }

  const baixarUm = async (intervalo: string | null) => {
    if (!link) return avisar('Cole um link', 'erro')
    const n = await window.api.adicionarGaleria([link], pasta, organizar, intervalo, formatoPasta)
    if (n) {
      setTexto('')
      setPrevia(null)
      avisar('Começou a baixar')
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
    avisar(`${n} link(s) na fila`)
  }

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>
          Galeria <span className="sub">perfis, posts, álbuns e capítulos de mangá</span>
        </h1>
        <button className="btn" onClick={() => window.api.abrirPasta(c.pastaGaleria)}>
          <FolderOpen className="amarelo" /> Abrir pasta
        </button>
      </div>

      <div
        className="cartao caixa-url"
        style={arrastando ? { borderColor: 'var(--amarelo)' } : undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        {linhas ? (
          <ListaLinks
            linhas={linhas}
            mudarLinha={mudarLinha}
            remover={(i) => {
              const resto = linhas.filter((_, n) => n !== i)
              // Sobrou um só: volta para o campo simples
              if (resto.length === 1) setTexto(resto[0].url)
              setLinhas(resto.length > 1 ? resto : null)
            }}
            acrescentar={acrescentar}
            limpar={() => setLinhas(null)}
            pastaComum={destino}
            aoAbrir={(i) => lerLinha(i)}
            info={(l) => ({
              titulo: null,
              miniatura: l.arquivos.find((a) => !a.video)?.url ?? null,
              carregando: l.carregando,
              erro: l.erro,
              resumo: l.lido ? `${l.marcados.size} de ${l.arquivos.length}${l.fim ? '' : '+'}` : null
            })}
            previa={(l, i) => (
              <GradeArquivos
                l={l}
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
        ) : (
          <div className="linha-url">
            <Link2 />
            <input
              value={texto}
              onChange={(e) => (setTexto(e.target.value), setPrevia(null))}
              onKeyDown={(e) => e.key === 'Enter' && verArquivos()}
              onPaste={(e) => {
                // Um campo de uma linha juntaria vários links num só: vira a lista
                const colados = extrairLinks(e.clipboardData.getData('text'))
                if (colados.length > 1) {
                  e.preventDefault()
                  acrescentar(colados)
                }
              }}
              placeholder="Cole o link de um perfil, post ou álbum (ou vários, um por linha)"
            />
            {texto && (
              <button className="icone-btn leve" onClick={() => (setTexto(''), setPrevia(null))}>
                <X />
              </button>
            )}
            <button className="icone-btn leve" title="Importar uma lista de links (.txt)" onClick={importar}>
              <FileText />
            </button>
            <button className="btn" onClick={colar}>
              <ClipboardPaste className="amarelo" /> Colar
            </button>
            <button className="btn" disabled={!link || previa?.carregando} onClick={() => verArquivos()} title="Lista os arquivos para você escolher quais baixar">
              {previa?.carregando ? <Loader2 className="girando" /> : <Eye />} Ver arquivos
            </button>
            <button className="btn primario grande" disabled={!link} onClick={() => baixarUm(null)}>
              <Images /> Baixar tudo
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginTop: 12, font: '12.5px var(--mono)', color: 'var(--muted)' }}>
          <span className="flex" style={{ gap: 8 }} title={destino}>
            <FolderOpen width={16} />
            {linhas ? 'Pasta comum:' : 'Salvar em:'} <span style={{ color: 'var(--texto)' }}>{pastaCurta(destino)}</span>
            <button
              className="link-amarelo mono pequeno"
              onClick={async () => {
                const nova = await window.api.escolherPasta(destino)
                if (nova) setPasta(nova)
              }}
            >
              Alterar
            </button>
            {pasta && (
              <button className="link-amarelo mono pequeno" style={{ color: 'var(--muted)' }} onClick={() => setPasta(null)}>
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
          <label className="flex" style={{ gap: 8, cursor: 'pointer' }} title="Lembra cada arquivo baixado e não baixa de novo">
            <input type="checkbox" checked={c.galeriaPularBaixados} onChange={(e) => salvarConfig({ galeriaPularBaixados: e.target.checked })} />
            Pular o que já baixei
          </label>
          {linhas && (
            <button className="btn primario grande" style={{ marginLeft: 'auto' }} onClick={baixarLinhas}>
              <Images /> Baixar {linhas.length} links
            </button>
          )}
        </div>
      </div>

      {previa?.erro && (
        <div className="aviso-amarelo">
          <Info />
          <span className="flex-1 selecionavel">{previa.erro}</span>
        </div>
      )}

      {previa && previa.arquivos.length > 0 && (
        <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GradeArquivos
            l={previa}
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
          <div className="flex" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => baixarUm(null)}>
              <Images /> Baixar tudo
            </button>
            <button
              className="btn primario grande"
              disabled={!previa.marcados.size}
              onClick={() => (previa.marcados.size ? baixarUm(intervaloDe(previa)) : avisar('Marque pelo menos um arquivo', 'erro'))}
            >
              <Download /> Baixar {previa.marcados.size} marcado(s)
            </button>
          </div>
        </div>
      )}

      {c.cookies.origem === 'nenhum' && !previa && !linhas && (
        <div className="aviso-azul">
          <Info />
          <span>Instagram, X/Twitter e Pixiv costumam exigir login. Ative os cookies do navegador em Configurações → Rede e login.</span>
        </div>
      )}

      <div className="titulo-secao">
        <Images />
        <h2>Downloads da galeria</h2>
        {galeria.some((i) => i.status === 'concluido') && (
          <button className="btn fantasma pequeno direita" onClick={() => window.api.limparGaleriaConcluidos()}>
            <Trash2 /> Limpar concluídos
          </button>
        )}
      </div>

      {galeria.length ? (
        <div className="lista">
          {[...galeria].reverse().map((i) => (
            <ItemDaGaleria key={i.id} item={i} />
          ))}
        </div>
      ) : (
        <div className="cartao vazio">
          <Images />
          <strong>Nenhuma galeria ainda</strong>
          <span>Funciona com {SITES}.</span>
        </div>
      )}
    </div>
  )
}

/** Grade de miniaturas com marcar/desmarcar e "carregar mais" (prévia de um link). */
function GradeArquivos({
  l,
  alternar,
  marcarTodos,
  carregarMais,
  fechar
}: {
  l: Listagem
  alternar: (indice: number) => void
  marcarTodos: (sim: boolean) => void
  carregarMais: () => void
  fechar?: () => void
}) {
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
      <div className="flex">
        <strong className="flex-1">
          {l.arquivos.length}
          {l.fim ? '' : '+'} arquivo(s) <span className="muted mono pequeno">· {l.marcados.size} marcado(s)</span>
        </strong>
        <button className="btn pequeno" onClick={() => marcarTodos(true)}>
          <CheckSquare /> Marcar todos
        </button>
        <button className="btn pequeno" onClick={() => marcarTodos(false)}>
          <Square /> Desmarcar
        </button>
        {fechar && (
          <button className="icone-btn leve" title="Fechar a prévia" onClick={fechar}>
            <X />
          </button>
        )}
      </div>
      <div className="grade-arquivos">
        {l.arquivos.map((a) => (
          <MiniaturaArquivo key={a.indice} arquivo={a} marcado={l.marcados.has(a.indice)} aoClicar={() => alternar(a.indice)} />
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

/** Miniatura de um arquivo na prévia. Alguns sites bloqueiam a imagem fora do site: aí mostra só o ícone. */
function MiniaturaArquivo({ arquivo: a, marcado, aoClicar }: { arquivo: ArquivoGaleria; marcado: boolean; aoClicar: () => void }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <div className={`arquivo${marcado ? ' marcado' : ''}`} onClick={aoClicar} title={`${a.nome}${a.largura ? ` · ${a.largura}×${a.altura}` : ''}`}>
      <input type="checkbox" checked={marcado} readOnly />
      {a.video || falhou ? (
        <div className="sem-imagem">{a.video ? <Video /> : <Images />}</div>
      ) : (
        <img src={a.url} loading="lazy" referrerPolicy="no-referrer" alt="" onError={() => setFalhou(true)} />
      )}
      {a.video && <span className="tipo">VÍDEO</span>}
      <span className="num">{a.indice}</span>
    </div>
  )
}

function IconeStatus({ status }: { status: StatusGaleria }) {
  if (status === 'baixando') return <Loader2 className="girando" width={15} />
  if (status === 'concluido') return <CheckCircle2 width={15} />
  if (status === 'erro') return <XCircle width={15} />
  if (status === 'pausado') return <Pause width={15} />
  return <Clock width={15} />
}

function ItemDaGaleria({ item }: { item: ItemGaleria }) {
  const api = window.api
  const cor = item.status === 'concluido' ? 'ok' : item.status === 'erro' ? 'erro' : item.status === 'pausado' ? 'aviso' : ''
  return (
    <div className="cartao tarefa">
      <div className="topo">
        <Mosaico amostras={item.amostras} baixando={item.status === 'baixando'} />
        <div className="texto">
          <div className="nome">
            <strong className="selecionavel mono" style={{ fontSize: 14 }} title={item.url}>
              {item.url}
            </strong>
          </div>
          <div className="origem flex" style={{ gap: 8, fontSize: 13 }}>
            <span className={`estado-texto ${cor} flex`} style={{ gap: 5 }}>
              <IconeStatus status={item.status} /> {NOMES[item.status]}
            </span>
            <span className="muted mono pequeno">
              {item.arquivos} baixado(s)
              {item.pulados > 0 && ` · ${item.pulados} já existiam`}
              {item.falhas > 0 && <span className="erro-texto"> · {item.falhas} falharam</span>}
              {item.concluidoEm && ` · ${tempoRelativo(item.concluidoEm)}`}
              {' · '}
              {pastaCurta(item.pasta)}
              {item.organizar === 'plana' ? ' (sem subpastas)' : item.organizar === 'site' ? ' (por site)' : item.organizar === 'personalizado' ? ` (${item.formatoPasta})` : ''}
              {item.intervalo ? ` · arquivos ${item.intervalo}` : ''}
            </span>
          </div>
          {item.ultimoArquivo && (
            <div className="muted pequeno truncar mono" title={item.ultimoArquivo}>
              {item.ultimoArquivo}
            </div>
          )}
        </div>
        <div className="acoes">
          {item.status === 'baixando' || item.status === 'aguardando' ? (
            <button className="icone-btn" title="Pausar" onClick={() => api.pausarGaleria(item.id)}>
              <Pause />
            </button>
          ) : (
            <button className="icone-btn amarelo" title={item.status === 'pausado' ? 'Continuar' : 'Baixar de novo (pula o que já existe)'} onClick={() => api.retomarGaleria(item.id)}>
              {item.status === 'pausado' ? <Play /> : <RotateCw />}
            </button>
          )}
          <button className="icone-btn" title="Abrir a pasta" onClick={() => (item.ultimoArquivo ? api.mostrarNaPasta(item.ultimoArquivo) : api.abrirPasta(item.pasta))}>
            <FolderOpen />
          </button>
          <button className="icone-btn" title="Remover da lista" onClick={() => api.removerGaleria([item.id])}>
            <X />
          </button>
        </div>
      </div>
      {item.status === 'baixando' && (
        <div className="barra-progresso indeterminado" style={{ marginTop: 14 }}>
          <div />
        </div>
      )}
      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : 'estado-texto aviso'}>{item.erro}</div>
          {item.dicaErro && <div className="dica">{item.dicaErro}</div>}
        </div>
      )}
    </div>
  )
}

/** Mosaico com as últimas imagens baixadas: 1 inteira, 2 lado a lado, 3–4 em grade. */
function Mosaico({ amostras, baixando }: { amostras: string[]; baixando: boolean }) {
  const [quebradas, setQuebradas] = useState<string[]>([])
  const visiveis = amostras.filter((a) => !quebradas.includes(a)).slice(-4)
  if (!visiveis.length) {
    return (
      <div className="miniatura">
        <div className="vazia">{baixando ? <Loader2 className="girando" /> : <Images />}</div>
      </div>
    )
  }
  return (
    <div className={`miniatura mosaico qtd-${visiveis.length}`}>
      {visiveis.map((a) => (
        <img key={a} src={urlArquivoLocal(a)} alt="" loading="lazy" onError={() => setQuebradas((q) => [...q, a])} />
      ))}
      {baixando && (
        <span className="baixando">
          <Loader2 className="girando" />
        </span>
      )}
    </div>
  )
}
