import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  FilePlay,
  FileX2,
  FolderOpen,
  Info,
  Library,
  MoreHorizontal,
  Music,
  PencilLine,
  Plus,
  Scissors,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  User,
  Video
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bytes, dataUpload, duracao, lerTempo, numero, tempoRelativo } from '@shared/formatar'
import type { Colecao, ItemBiblioteca } from '@shared/tipos'
import { Dialogo, Etiquetas, Linha, Segmentado, Selecao } from '../componentes/ui'
import { adicionarLinks, avisar, useEstado } from '../estado'

type Ordem = 'recentes' | 'antigos' | 'tamanho' | 'titulo'
type Periodo = 'tudo' | 'hoje' | '7' | '30'
type Dialogos =
  | { tipo: 'tags'; item: ItemBiblioteca }
  | { tipo: 'renomear'; item: ItemBiblioteca }
  | { tipo: 'excluir'; ids: string[] }
  | { tipo: 'dividir'; item: ItemBiblioteca }
  | { tipo: 'detalhes'; item: ItemBiblioteca }
  | { tipo: 'colecao'; colecao: Colecao | null }
  | null

const POR_PAGINA = 150

/** "Parte 2" antes de "Parte 10" */
const porTitulo = (a: ItemBiblioteca, b: ItemBiblioteca) => a.titulo.localeCompare(b.titulo, 'pt-BR', { numeric: true })

/** Biblioteca com busca, ordenação e filtros (itens 66 a 70). */
export default function BibliotecaPagina() {
  const { biblioteca, config } = useEstado()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [tipo, setTipo] = useState<'todos' | 'video' | 'audio'>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('tudo')
  const [colecao, setColecao] = useState<string | null>(null)
  const [verFiltros, setVerFiltros] = useState(false)
  const [sites, setSites] = useState<string[]>([])
  const [formatos, setFormatos] = useState<string[]>([])
  const [qualidades, setQualidades] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [limite, setLimite] = useState(POR_PAGINA)
  const [dialogo, setDialogo] = useState<Dialogos>(null)

  useEffect(() => void window.api.obterBiblioteca().then((b) => useEstado.setState({ biblioteca: b })), [])

  const todos = biblioteca.itens
  const opcoes = useMemo(
    () => ({
      sites: [...new Set(todos.map((i) => i.site).filter(Boolean))].sort(),
      formatos: [...new Set(todos.map((i) => i.formato).filter(Boolean))].sort(),
      qualidades: [...new Set(todos.map((i) => i.qualidade).filter((q): q is string => !!q))].sort((a, b) => parseInt(b) - parseInt(a)),
      tags: [...new Set(todos.flatMap((i) => i.tags))].sort()
    }),
    [todos]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const desde = periodo === 'tudo' ? 0 : periodo === 'hoje' ? new Date().setHours(0, 0, 0, 0) : Date.now() - Number(periodo) * 86_400_000
    const lista = todos.filter(
      (i) =>
        (!termo || `${i.titulo} ${i.canal ?? ''} ${i.tags.join(' ')} ${i.playlist ?? ''}`.toLowerCase().includes(termo)) &&
        (tipo === 'todos' || i.modo === tipo) &&
        i.baixadoEm >= desde &&
        (!colecao || i.colecoes.includes(colecao)) &&
        (!sites.length || sites.includes(i.site)) &&
        (!formatos.length || formatos.includes(i.formato)) &&
        (!qualidades.length || (i.qualidade && qualidades.includes(i.qualidade))) &&
        (!tags.length || tags.every((t) => i.tags.includes(t)))
    )
    const ordenar: Record<Ordem, (a: ItemBiblioteca, b: ItemBiblioteca) => number> = {
      recentes: (a, b) => b.baixadoEm - a.baixadoEm || porTitulo(a, b),
      antigos: (a, b) => a.baixadoEm - b.baixadoEm || porTitulo(a, b),
      tamanho: (a, b) => b.tamanho - a.tamanho,
      titulo: porTitulo
    }
    return lista.sort(ordenar[ordem])
  }, [todos, busca, tipo, periodo, colecao, sites, formatos, qualidades, tags, ordem])

  const qtdFiltros = sites.length + formatos.length + qualidades.length + tags.length
  const tamanhoTotal = filtrados.reduce((t, i) => t + i.tamanho, 0)
  const semArquivo = todos.filter((i) => i.arquivoExiste === false).length

  const alternar = (lista: string[], valor: string, set: (v: string[]) => void) =>
    set(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor])

  const marcar = (id: string) =>
    setSelecionados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const pedirExclusao = (ids: string[]) => {
    const acao = config!.excluirArquivo
    if (acao === 'perguntar') return setDialogo({ tipo: 'excluir', ids })
    void excluir(ids, acao === 'sempre')
  }

  const excluir = async (ids: string[], apagar: boolean) => {
    const falhas = await window.api.excluirDaBiblioteca(ids, apagar)
    setSelecionados(new Set())
    setDialogo(null)
    if (falhas) avisar(`${falhas} arquivo(s) não puderam ir para a Lixeira`, 'erro')
    else avisar(apagar ? 'Removido e enviado para a Lixeira' : 'Removido da biblioteca')
  }

  const adicionarSelecaoAColecao = async (idColecao: string) => {
    for (const id of selecionados) {
      const i = todos.find((x) => x.id === id)
      if (i && !i.colecoes.includes(idColecao)) await window.api.etiquetar(id, i.tags, [...i.colecoes, idColecao])
    }
    avisar('Adicionado à coleção')
  }

  return (
    <>
      <div className="cabecalho">
        <h1>
          Biblioteca <span className="sub">{todos.length} downloads · {bytes(todos.reduce((t, i) => t + i.tamanho, 0))}</span>
        </h1>
        {semArquivo > 0 && (
          <button
            className="btn fantasma"
            title="Tira da lista os itens cujo arquivo foi apagado ou movido"
            onClick={async () => avisar(`${await window.api.removerSemArquivo()} item(ns) sem arquivo removido(s)`)}
          >
            <FileX2 /> Limpar {semArquivo} sem arquivo
          </button>
        )}
      </div>
      <div className="pagina">
        <div className="config">
          <nav className="indice">
            <button className={!colecao ? 'ativo-indice' : ''} onClick={() => setColecao(null)}>
              <Library width={15} style={{ verticalAlign: -3, marginRight: 6 }} />
              Tudo <span className="muted">· {todos.length}</span>
            </button>
            <div className="rotulo-secao" style={{ margin: '12px 0 4px', padding: '0 10px' }}>
              Coleções
            </div>
            {biblioteca.colecoes.map((c) => (
              <button
                key={c.id}
                className={colecao === c.id ? 'ativo-indice' : ''}
                onClick={() => setColecao(c.id)}
                onDoubleClick={() => setDialogo({ tipo: 'colecao', colecao: c })}
                title="Clique duas vezes para renomear ou excluir"
              >
                {c.nome} <span className="muted">· {todos.filter((i) => i.colecoes.includes(c.id)).length}</span>
              </button>
            ))}
            <button className="muted" onClick={() => setDialogo({ tipo: 'colecao', colecao: null })}>
              <Plus width={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Nova coleção
            </button>
          </nav>

          <div className="secoes">
            <div className="flex" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
              <div className="caixa-busca flex-1">
                <Search width={16} className="muted" />
                <input placeholder="Procurar por título, canal, tag ou playlist…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Segmentado
                valor={tipo}
                aoMudar={setTipo}
                opcoes={[
                  { valor: 'todos', nome: 'Tudo' },
                  { valor: 'video', nome: <><Video /> Vídeo</> },
                  { valor: 'audio', nome: <><Music /> Áudio</> }
                ]}
              />
              <Selecao
                valor={periodo}
                aoMudar={setPeriodo}
                opcoes={[
                  { valor: 'tudo', nome: 'Qualquer data' },
                  { valor: 'hoje', nome: 'Hoje' },
                  { valor: '7', nome: 'Últimos 7 dias' },
                  { valor: '30', nome: 'Últimos 30 dias' }
                ]}
              />
              <Selecao
                valor={ordem}
                aoMudar={setOrdem}
                opcoes={[
                  { valor: 'recentes', nome: 'Mais recentes' },
                  { valor: 'antigos', nome: 'Mais antigos' },
                  { valor: 'tamanho', nome: 'Maiores' },
                  { valor: 'titulo', nome: 'Título (A–Z)' }
                ]}
              />
              <button className={`btn${verFiltros || qtdFiltros ? ' amarelo' : ''}`} onClick={() => setVerFiltros(!verFiltros)}>
                <SlidersHorizontal /> Filtros{qtdFiltros ? ` (${qtdFiltros})` : ''}
              </button>
            </div>

            {verFiltros && (
              <div className="cartao" style={{ marginBottom: 10 }}>
                {(
                  [
                    ['Site', opcoes.sites, sites, setSites],
                    ['Formato', opcoes.formatos, formatos, setFormatos],
                    ['Qualidade', opcoes.qualidades, qualidades, setQualidades],
                    ['Tags', opcoes.tags, tags, setTags]
                  ] as const
                ).map(([nome, valores, ativos, set]) =>
                  valores.length ? (
                    <Linha key={nome} rotulo={nome}>
                      <div className="chips" style={{ justifyContent: 'flex-end' }}>
                        {valores.map((v) => (
                          <button key={v} className={`chip${ativos.includes(v) ? ' ativo' : ''}`} onClick={() => alternar([...ativos], v, set)}>
                            {nome === 'Formato' ? v.toUpperCase() : v}
                          </button>
                        ))}
                      </div>
                    </Linha>
                  ) : null
                )}
                {qtdFiltros > 0 && (
                  <Linha rotulo="">
                    <button
                      className="btn fantasma pequeno"
                      onClick={() => {
                        setSites([])
                        setFormatos([])
                        setQualidades([])
                        setTags([])
                      }}
                    >
                      Limpar filtros
                    </button>
                  </Linha>
                )}
              </div>
            )}

            {selecionados.size > 0 && (
              <div className="copiado" style={{ marginTop: 0, marginBottom: 10 }}>
                <span className="flex-1">{selecionados.size} selecionado(s)</span>
                {biblioteca.colecoes.length > 0 && (
                  <Selecao
                    valor=""
                    aoMudar={(v) => v && adicionarSelecaoAColecao(v)}
                    opcoes={[{ valor: '', nome: 'Adicionar à coleção…' }, ...biblioteca.colecoes.map((c) => ({ valor: c.id, nome: c.nome }))]}
                  />
                )}
                <button className="btn pequeno perigo" onClick={() => pedirExclusao([...selecionados])}>
                  <Trash2 /> Excluir
                </button>
                <button className="btn pequeno fantasma" onClick={() => setSelecionados(new Set())}>
                  Limpar seleção
                </button>
              </div>
            )}

            <div className="muted pequeno" style={{ marginBottom: 8 }}>
              {filtrados.length === todos.length ? `${todos.length} itens` : `${filtrados.length} de ${todos.length} itens`} · {bytes(tamanhoTotal)}
            </div>

            {filtrados.length ? (
              <div className="lista-fila">
                {filtrados.slice(0, limite).map((i) => (
                  <ItemDaBiblioteca
                    key={i.id}
                    item={i}
                    colecoes={biblioteca.colecoes}
                    marcado={selecionados.has(i.id)}
                    aoMarcar={() => marcar(i.id)}
                    abrirDialogo={setDialogo}
                    aoExcluir={() => pedirExclusao([i.id])}
                  />
                ))}
                {filtrados.length > limite && (
                  <button className="btn" style={{ alignSelf: 'center' }} onClick={() => setLimite(limite + POR_PAGINA)}>
                    Mostrar mais ({filtrados.length - limite})
                  </button>
                )}
              </div>
            ) : (
              <div className="vazio">
                <Library />
                <strong>{todos.length ? 'Nada encontrado com esses filtros' : 'A biblioteca está vazia'}</strong>
                <span>{todos.length ? '' : 'Tudo o que você baixar aparece aqui.'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {dialogo?.tipo === 'tags' && <DialogoTags item={dialogo.item} colecoes={biblioteca.colecoes} aoFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'renomear' && <DialogoRenomear item={dialogo.item} aoFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'dividir' && <DialogoDividir item={dialogo.item} aoFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'detalhes' && <DialogoDetalhes item={dialogo.item} colecoes={biblioteca.colecoes} aoFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'colecao' && (
        <DialogoColecao
          colecao={dialogo.colecao}
          aoFechar={() => setDialogo(null)}
          aoExcluir={() => colecao === dialogo.colecao?.id && setColecao(null)}
        />
      )}
      {dialogo?.tipo === 'excluir' && (
        <Dialogo
          titulo={dialogo.ids.length === 1 ? 'Excluir da biblioteca' : `Excluir ${dialogo.ids.length} itens`}
          aoFechar={() => setDialogo(null)}
          rodape={
            <>
              <button className="btn" onClick={() => excluir(dialogo.ids, false)}>
                Só tirar da biblioteca
              </button>
              <button className="btn primario" onClick={() => excluir(dialogo.ids, true)}>
                <Trash2 /> Apagar o arquivo também
              </button>
            </>
          }
        >
          O arquivo apagado vai para a Lixeira do Windows, então dá para recuperar. Para não perguntar mais, mude em Configurações → Biblioteca.
        </Dialogo>
      )}
    </>
  )
}

function ItemDaBiblioteca({
  item,
  colecoes,
  marcado,
  aoMarcar,
  abrirDialogo,
  aoExcluir
}: {
  item: ItemBiblioteca
  colecoes: Colecao[]
  marcado: boolean
  aoMarcar: () => void
  abrirDialogo: (d: Dialogos) => void
  aoExcluir: () => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const api = window.api
  const arquivo = item.arquivos[0]
  const existe = item.arquivoExiste !== false

  useEffect(() => {
    if (!menu) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false)
    window.addEventListener('mousedown', fora)
    return () => window.removeEventListener('mousedown', fora)
  }, [menu])

  const acao = (fn: () => unknown) => () => {
    setMenu(false)
    void fn()
  }

  return (
    <div className={`item${marcado ? ' aberto' : ''}`} style={marcado ? { borderColor: 'var(--yellow)' } : undefined}>
      <div className="principal">
        <input type="checkbox" checked={marcado} onChange={aoMarcar} style={{ alignSelf: 'center' }} />
        <div
          className="miniatura"
          style={{ ...(item.miniatura ? { backgroundImage: `url("${item.miniatura}")` } : {}), width: 112, height: 63, cursor: existe ? 'pointer' : 'default' }}
          onClick={() => existe && arquivo && api.abrirArquivo(arquivo)}
          title={existe ? 'Abrir' : undefined}
        >
          {!item.miniatura && <div className="vazia">{item.modo === 'audio' ? <Music /> : <FilePlay />}</div>}
          {item.duracao != null && <span className="selo">{duracao(item.duracao)}</span>}
        </div>
        <div className="corpo">
          <div className="titulo selecionavel" title={item.titulo}>
            {item.titulo}
          </div>
          <div className="meta">
            {item.canal && (
              <span>
                <User /> {item.canal}
              </span>
            )}
            {item.site && <span>{item.site}</span>}
            <span>
              {item.qualidade ? `${item.qualidade} · ` : ''}
              {item.formato.toUpperCase()}
            </span>
            <span>{bytes(item.tamanho)}</span>
            <span title={new Date(item.baixadoEm).toLocaleString('pt-BR')}>{tempoRelativo(item.baixadoEm)}</span>
          </div>
          <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
            {!existe && (
              <span className="estado erro pequeno" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <AlertTriangle width={13} /> Arquivo não encontrado
              </span>
            )}
            {item.colecoes.map((c) => {
              const nome = colecoes.find((x) => x.id === c)?.nome
              return nome ? (
                <span key={c} className="etiqueta" style={{ padding: '0 8px', borderColor: 'var(--accent)' }}>
                  {nome}
                </span>
              ) : null
            })}
            {item.tags.map((t) => (
              <span key={t} className="etiqueta" style={{ padding: '0 8px' }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
        <div className="acoes">
          {existe && arquivo ? (
            <>
              <button className="icone-btn amarelo" title="Abrir" onClick={() => api.abrirArquivo(arquivo)}>
                <FilePlay />
              </button>
              <button className="icone-btn" title="Mostrar na pasta" onClick={() => api.mostrarNaPasta(arquivo)}>
                <FolderOpen />
              </button>
            </>
          ) : (
            <button className="icone-btn amarelo" title="Baixar de novo" onClick={() => adicionarLinks([item.url], true)}>
              <Download />
            </button>
          )}
          <button className="icone-btn" title="Tags e coleções" onClick={() => abrirDialogo({ tipo: 'tags', item })}>
            <Tags />
          </button>
          <div ref={ref} style={{ position: 'relative' }}>
            <button className="icone-btn" title="Mais ações" onClick={() => setMenu(!menu)}>
              <MoreHorizontal />
            </button>
            {menu && (
              <div className="menu">
                <button onClick={acao(() => abrirDialogo({ tipo: 'detalhes', item }))}>
                  <Info /> Detalhes
                </button>
                {existe && (
                  <button onClick={acao(() => abrirDialogo({ tipo: 'renomear', item }))}>
                    <PencilLine /> Renomear arquivo
                  </button>
                )}
                {existe && (
                  <button onClick={acao(() => abrirDialogo({ tipo: 'dividir', item }))}>
                    <Scissors /> Dividir em partes
                  </button>
                )}
                <button onClick={acao(() => adicionarLinks([item.url], true).then((n) => n && avisar('Adicionado à fila')))}>
                  <Download /> Baixar de novo
                </button>
                <button onClick={acao(async () => { await api.copiar(item.url); avisar('Link copiado') })}>
                  <Copy /> Copiar link
                </button>
                <button onClick={acao(() => api.abrirLink(item.url))}>
                  <ExternalLink /> Abrir no site
                </button>
                <hr />
                <button className="perigo" onClick={acao(aoExcluir)}>
                  <Trash2 /> Excluir…
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Tags livres e coleções (item 67). */
function DialogoTags({ item, colecoes, aoFechar }: { item: ItemBiblioteca; colecoes: Colecao[]; aoFechar: () => void }) {
  const [tags, setTags] = useState(item.tags)
  const [marcadas, setMarcadas] = useState(item.colecoes)
  const [nova, setNova] = useState('')
  const existentes = [...new Set(useEstado.getState().biblioteca.itens.flatMap((i) => i.tags))].filter((t) => !tags.includes(t))

  const salvar = async () => {
    await window.api.etiquetar(item.id, tags, marcadas)
    aoFechar()
  }

  const criar = async () => {
    if (!nova.trim()) return
    const c = await window.api.criarColecao(nova.trim())
    setMarcadas([...marcadas, c.id])
    setNova('')
  }

  return (
    <Dialogo
      titulo="Tags e coleções"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn primario" onClick={salvar}>
            Salvar
          </button>
        </>
      }
    >
      <p className="muted truncar" style={{ marginTop: 0 }}>
        {item.titulo}
      </p>
      <div className="cartao">
        <Linha rotulo="Tags" dica="Enter para adicionar" coluna>
          <Etiquetas valores={tags} aoMudar={setTags} placeholder="Nova tag…" />
          {existentes.length > 0 && (
            <div className="chips">
              {existentes.slice(0, 20).map((t) => (
                <button key={t} className="chip" onClick={() => setTags([...tags, t])}>
                  + {t}
                </button>
              ))}
            </div>
          )}
        </Linha>
        <Linha rotulo="Coleções" coluna>
          {colecoes.length > 0 && (
            <div className="chips">
              {colecoes.map((c) => {
                const ativa = marcadas.includes(c.id)
                return (
                  <button key={c.id} className={`chip${ativa ? ' ativo' : ''}`} onClick={() => setMarcadas(ativa ? marcadas.filter((x) => x !== c.id) : [...marcadas, c.id])}>
                    {c.nome}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex">
            <input className="campo flex-1" placeholder="Criar coleção…" value={nova} onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criar()} />
            <button className="btn pequeno" onClick={criar}>
              <Plus /> Criar
            </button>
          </div>
        </Linha>
      </div>
    </Dialogo>
  )
}

function DialogoColecao({ colecao, aoFechar, aoExcluir }: { colecao: Colecao | null; aoFechar: () => void; aoExcluir: () => void }) {
  const [nome, setNome] = useState(colecao?.nome ?? '')
  const salvar = async () => {
    if (!nome.trim()) return
    if (colecao) await window.api.renomearColecao(colecao.id, nome)
    else await window.api.criarColecao(nome)
    aoFechar()
  }
  return (
    <Dialogo
      titulo={colecao ? 'Editar coleção' : 'Nova coleção'}
      aoFechar={aoFechar}
      rodape={
        <>
          {colecao && (
            <button
              className="btn perigo"
              style={{ marginRight: 'auto' }}
              onClick={async () => {
                await window.api.excluirColecao(colecao.id)
                aoExcluir()
                aoFechar()
              }}
            >
              <Trash2 /> Excluir coleção
            </button>
          )}
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn primario" onClick={salvar}>
            Salvar
          </button>
        </>
      }
    >
      <input className="campo" style={{ width: '100%' }} autoFocus value={nome} placeholder="Nome da coleção" onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
      {colecao && <p className="muted pequeno">Excluir a coleção não apaga os arquivos nem os itens da biblioteca.</p>}
    </Dialogo>
  )
}

function DialogoRenomear({ item, aoFechar }: { item: ItemBiblioteca; aoFechar: () => void }) {
  const atual = item.arquivos[0]?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? ''
  const [nome, setNome] = useState(atual)
  const [erro, setErro] = useState('')
  const salvar = async () => {
    const r = await window.api.renomearNaBiblioteca(item.id, nome)
    if (r.ok) aoFechar()
    else setErro(r.erro ?? 'Falha ao renomear')
  }
  return (
    <Dialogo
      titulo="Renomear arquivo"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn primario" onClick={salvar}>
            Salvar
          </button>
        </>
      }
    >
      <input className="campo" style={{ width: '100%' }} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
      {erro && <p className="erro-texto pequeno">{erro}</p>}
    </Dialogo>
  )
}

/** Dividir o arquivo em partes (item 70). */
function DialogoDividir({ item, aoFechar }: { item: ItemBiblioteca; aoFechar: () => void }) {
  const [total, setTotal] = useState<number | null | undefined>(undefined)
  const [modo, setModo] = useState<'intervalo' | 'manual'>('intervalo')
  const [minutos, setMinutos] = useState(10)
  const [manual, setManual] = useState('')
  const [apagar, setApagar] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => void window.api.duracaoNaBiblioteca(item.id).then(setTotal), [item.id])

  const cortes = useMemo(() => {
    if (!total) return []
    if (modo === 'intervalo') {
      const passo = Math.max(1, minutos) * 60
      const lista: number[] = []
      for (let t = passo; t < total - 1; t += passo) lista.push(t)
      return lista
    }
    return manual
      .split(/[,;\s]+/)
      .map((p) => lerTempo(p))
      .filter((t): t is number => t != null && t > 0 && t < total)
      .sort((a, b) => a - b)
  }, [total, modo, minutos, manual])

  const partes = cortes.length ? [0, ...cortes].map((inicio, n) => ({ inicio, fim: cortes[n] ?? total! })) : []

  const dividir = async () => {
    setRodando(true)
    setErro('')
    const r = await window.api.dividirArquivo(item.id, cortes, apagar)
    setRodando(false)
    if (r.ok) {
      avisar(`Dividido em ${r.partes} partes`)
      aoFechar()
    } else setErro(r.erro ?? 'Falha ao dividir')
  }

  return (
    <Dialogo
      titulo="Dividir em partes"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn primario" disabled={!cortes.length || rodando} onClick={dividir}>
            <Scissors /> {rodando ? 'Dividindo…' : `Dividir em ${partes.length || '…'} partes`}
          </button>
        </>
      }
    >
      <p className="muted truncar" style={{ marginTop: 0 }}>
        {item.titulo} · {total === undefined ? 'lendo duração…' : total ? duracao(total) : 'duração desconhecida'}
      </p>
      <div className="cartao">
        <Linha rotulo="Como dividir">
          <Segmentado
            valor={modo}
            aoMudar={setModo}
            opcoes={[
              { valor: 'intervalo', nome: 'A cada X minutos' },
              { valor: 'manual', nome: 'Nos tempos que eu escolher' }
            ]}
          />
        </Linha>
        {modo === 'intervalo' ? (
          <Linha rotulo="Tamanho de cada parte">
            <input className="campo" type="number" min={1} style={{ width: 80 }} value={minutos} onChange={(e) => setMinutos(Number(e.target.value) || 1)} />
            <span className="muted">minutos</span>
          </Linha>
        ) : (
          <Linha rotulo="Pontos de corte" dica='Separados por vírgula. Ex.: "5:30, 12:00, 1:02:15"' coluna>
            <input className="campo mono" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="5:30, 12:00" />
          </Linha>
        )}
        {partes.length > 0 && (
          <Linha rotulo={`${partes.length} partes`} coluna>
            <div className="lista-check" style={{ maxHeight: 160 }}>
              {partes.map((p, n) => (
                <label key={n} style={{ cursor: 'default' }}>
                  <span className="num">{n + 1}</span>
                  <span className="flex-1">
                    {duracao(p.inicio)} – {duracao(p.fim)}
                  </span>
                  <span className="muted pequeno">{duracao(p.fim - p.inicio)}</span>
                </label>
              ))}
            </div>
          </Linha>
        )}
        <label className="linha">
          <div className="rotulo">
            Mandar o arquivo original para a Lixeira
            <small>Depois que as partes forem criadas</small>
          </div>
          <input type="checkbox" checked={apagar} onChange={(e) => setApagar(e.target.checked)} />
        </label>
      </div>
      <p className="muted pequeno">O corte é feito sem recodificar (rápido e sem perder qualidade), por isso cai no quadro-chave mais próximo do tempo pedido.</p>
      {erro && <p className="erro-texto pequeno">{erro}</p>}
    </Dialogo>
  )
}

/** Detalhes do item (item 75). */
function DialogoDetalhes({ item, colecoes, aoFechar }: { item: ItemBiblioteca; colecoes: Colecao[]; aoFechar: () => void }) {
  return (
    <Dialogo titulo="Detalhes" aoFechar={aoFechar} largo>
      <div className="cartao">
        <Linha rotulo="Título">
          <span className="selecionavel" style={{ textAlign: 'right' }}>
            {item.titulo}
          </span>
        </Linha>
        <Linha rotulo="Canal">{item.canal ?? '—'}</Linha>
        <Linha rotulo="Site">{item.site || '—'}</Linha>
        <Linha rotulo="Publicado em">{dataUpload(item.dataUpload)}</Linha>
        <Linha rotulo="Duração">{duracao(item.duracao)}</Linha>
        <Linha rotulo="Visualizações">{numero(item.views)}</Linha>
        <Linha rotulo="Curtidas">{numero(item.likes)}</Linha>
        <Linha rotulo="Formato">
          {item.qualidade ? `${item.qualidade} · ` : ''}
          {item.formato.toUpperCase()} · {bytes(item.tamanho)}
        </Linha>
        {item.playlist && <Linha rotulo="Playlist">{item.playlist}</Linha>}
        <Linha rotulo="Baixado em">{new Date(item.baixadoEm).toLocaleString('pt-BR')}</Linha>
        <Linha rotulo="Coleções">{item.colecoes.map((c) => colecoes.find((x) => x.id === c)?.nome).filter(Boolean).join(', ') || '—'}</Linha>
        <Linha rotulo="Link" coluna>
          <span className="mono pequeno selecionavel">{item.url}</span>
        </Linha>
        <Linha rotulo="Arquivo" coluna>
          {item.arquivos.map((a) => (
            <span key={a} className="mono pequeno selecionavel">
              {a}
            </span>
          ))}
        </Linha>
      </div>
    </Dialogo>
  )
}
