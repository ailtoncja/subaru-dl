// Galeria: imagens, perfis, álbuns e mangás com o gallery-dl (item 74).
import {
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  Clock,
  Download,
  Eye,
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
import { useState } from 'react'
import { tempoRelativo } from '@shared/formatar'
import type { ArquivoGaleria, ItemGaleria, OrganizarGaleria, StatusGaleria } from '@shared/tipos'
import { pastaCurta } from '../componentes/Destino'
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

interface Previa {
  url: string
  arquivos: ArquivoGaleria[]
  fim: boolean
  marcados: Set<number>
}

export default function Galeria() {
  const { galeria, config } = useEstado()
  const c = config!
  const [texto, setTexto] = useState('')
  // Pasta e organização escolhidas para os próximos links (null = as das configurações)
  const [pasta, setPasta] = useState<string | null>(null)
  const [organizar, setOrganizar] = useState<OrganizarGaleria>(c.galeriaOrganizar)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const links = [...new Set(extrairLinks(texto))]
  const destino = pasta ?? c.pastaGaleria

  const baixar = async (lista: string[], intervalo?: string | null) => {
    if (!lista.length) return avisar('Cole pelo menos um link', 'erro')
    const n = await window.api.adicionarGaleria(lista, pasta, organizar, intervalo ?? null)
    if (n) {
      setTexto('')
      setPrevia(null)
      avisar(n === 1 ? 'Começou a baixar' : `${n} links na fila`)
    }
  }

  /** Prévia: lista os arquivos sem baixar, para escolher quais quer. */
  const verArquivos = async (mais = false) => {
    const url = mais && previa ? previa.url : links[0]
    if (!url) return
    setLendo(true)
    setErro('')
    try {
      const inicio = mais && previa ? previa.arquivos.length + 1 : 1
      const r = await window.api.listarArquivosGaleria(url, inicio, POR_VEZ)
      if (mais && previa) {
        const marcados = new Set(previa.marcados)
        for (const a of r.arquivos) marcados.add(a.indice)
        setPrevia({ ...previa, arquivos: [...previa.arquivos, ...r.arquivos], fim: r.fim, marcados })
      } else {
        if (!r.arquivos.length) setErro('Nenhum arquivo encontrado nesse link.')
        setPrevia(r.arquivos.length ? { url, ...r, marcados: new Set(r.arquivos.map((a) => a.indice)) } : null)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))
    } finally {
      setLendo(false)
    }
  }

  const alternar = (indice: number) =>
    previa &&
    setPrevia((p) => {
      if (!p) return p
      const marcados = new Set(p.marcados)
      if (marcados.has(indice)) marcados.delete(indice)
      else marcados.add(indice)
      return { ...p, marcados }
    })

  const baixarMarcados = () => {
    if (!previa || !previa.marcados.size) return avisar('Marque pelo menos um arquivo', 'erro')
    const todos = previa.marcados.size === previa.arquivos.length
    // Tudo marcado e a lista acabou: baixa sem limitar (pega também arquivos novos)
    void baixar([previa.url], todos && previa.fim ? null : compactar([...previa.marcados]))
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

      <div className="cartao caixa-url">
        {links.length > 1 || texto.includes('\n') ? (
          <textarea className="mono" value={texto} onChange={(e) => setTexto(e.target.value)} />
        ) : (
          <div className="linha-url">
            <Link2 />
            <input
              value={texto}
              onChange={(e) => (setTexto(e.target.value), setPrevia(null))}
              onKeyDown={(e) => e.key === 'Enter' && verArquivos()}
              placeholder="Cole o link de um perfil, post, álbum ou galeria"
            />
            {texto && (
              <button className="icone-btn leve" onClick={() => (setTexto(''), setPrevia(null), setErro(''))}>
                <X />
              </button>
            )}
            <button
              className="btn"
              onClick={async () => {
                const achados = extrairLinks(await window.api.lerClipboard())
                if (achados.length) setTexto(achados.join('\n'))
                else avisar('Nenhum link na área de transferência', 'erro')
              }}
            >
              <ClipboardPaste className="amarelo" /> Colar
            </button>
            <button className="btn" disabled={!links.length || lendo} onClick={() => verArquivos()} title="Lista os arquivos para você escolher quais baixar">
              {lendo ? <Loader2 className="girando" /> : <Eye />} Ver arquivos
            </button>
            <button className="btn primario grande" disabled={!links.length} onClick={() => baixar(links)}>
              <Images /> Baixar tudo
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginTop: 12, font: '12.5px var(--mono)', color: 'var(--muted)' }}>
          <span className="flex" style={{ gap: 8 }} title={destino}>
            <FolderOpen width={16} />
            Salvar em: <span style={{ color: 'var(--texto)' }}>{pastaCurta(destino)}</span>
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
          <select className="mono" style={{ padding: '4px 30px 4px 8px', fontSize: 12.5 }} value={organizar} onChange={(e) => setOrganizar(e.target.value as OrganizarGaleria)}>
            <option value="padrao">Organizar: por site e perfil</option>
            <option value="plana">Organizar: tudo na mesma pasta</option>
          </select>
          <label className="flex" style={{ gap: 8, cursor: 'pointer' }} title="Lembra cada arquivo baixado e não baixa de novo">
            <input type="checkbox" checked={c.galeriaPularBaixados} onChange={(e) => salvarConfig({ galeriaPularBaixados: e.target.checked })} />
            Pular o que já baixei
          </label>
          {(links.length > 1 || texto.includes('\n')) && (
            <button className="btn primario" style={{ marginLeft: 'auto' }} disabled={!links.length} onClick={() => baixar(links)}>
              <Images /> Baixar {links.length} links
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="aviso-amarelo">
          <Info />
          <span className="flex-1 selecionavel">{erro}</span>
        </div>
      )}

      {previa && (
        <div className="cartao recheado" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="flex">
            <strong className="flex-1">
              {previa.arquivos.length}
              {previa.fim ? '' : '+'} arquivo(s) <span className="muted mono pequeno">· {previa.marcados.size} marcado(s)</span>
            </strong>
            <button className="btn pequeno" onClick={() => setPrevia({ ...previa, marcados: new Set(previa.arquivos.map((a) => a.indice)) })}>
              <CheckSquare /> Marcar todos
            </button>
            <button className="btn pequeno" onClick={() => setPrevia({ ...previa, marcados: new Set() })}>
              <Square /> Desmarcar
            </button>
            <button className="icone-btn leve" title="Fechar a prévia" onClick={() => setPrevia(null)}>
              <X />
            </button>
          </div>
          <div className="grade-arquivos">
            {previa.arquivos.map((a) => (
              <MiniaturaArquivo key={a.indice} arquivo={a} marcado={previa.marcados.has(a.indice)} aoClicar={() => alternar(a.indice)} />
            ))}
          </div>
          <div className="flex">
            {!previa.fim && (
              <button className="btn" disabled={lendo} onClick={() => verArquivos(true)}>
                {lendo ? <Loader2 className="girando" /> : <Download />} Carregar mais {POR_VEZ}
              </button>
            )}
            <span className="muted pequeno flex-1">
              {previa.fim ? 'Esses são todos os arquivos do link.' : 'Mostrando os primeiros. "Baixar tudo" pega também os que ainda não apareceram.'}
            </span>
            <button className="btn" onClick={() => baixar([previa.url])}>
              <Images /> Baixar tudo
            </button>
            <button className="btn primario grande" disabled={!previa.marcados.size} onClick={baixarMarcados}>
              <Download /> Baixar {previa.marcados.size} marcado(s)
            </button>
          </div>
        </div>
      )}

      {c.cookies.origem === 'nenhum' && !previa && (
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
        <div className="miniatura quadrada">
          <div className="vazia">{item.status === 'baixando' ? <Loader2 className="girando" /> : <Images />}</div>
        </div>
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
              {item.organizar === 'plana' ? ' (sem subpastas)' : ''}
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
