import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FilePlay,
  FolderOpen,
  FolderInput,
  HardDrive,
  ListVideo,
  Loader2,
  MoreHorizontal,
  Pause,
  PencilLine,
  Play,
  RotateCw,
  Settings2,
  Split,
  Trash2,
  User,
  XCircle
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { bytes, duracao, velocidade } from '@shared/formatar'
import { estimarTamanho, QUALIDADES } from '@shared/formatos'
import type { ItemFila as TItem, StatusItem } from '@shared/tipos'
import { Dialogo } from '../componentes/ui'
import { avisar, useEstado } from '../estado'
import PreferenciasItem from './PreferenciasItem'

const NOMES_STATUS: Record<StatusItem, string> = {
  buscando: 'Lendo o link…',
  pronto: 'Na fila',
  baixando: 'Baixando',
  processando: 'Processando',
  pausado: 'Pausado',
  'aguardando-nova-tentativa': 'Vai tentar de novo',
  concluido: 'Concluído',
  erro: 'Erro'
}

function IconeStatus({ status }: { status: StatusItem }) {
  switch (status) {
    case 'buscando':
    case 'processando':
      return <Loader2 className="girando" />
    case 'baixando':
      return <Loader2 className="girando" />
    case 'concluido':
      return <CheckCircle2 />
    case 'erro':
      return <XCircle />
    case 'pausado':
      return <Pause />
    case 'aguardando-nova-tentativa':
      return <RotateCw />
    default:
      return <Clock />
  }
}

function resumoOpcoes(item: TItem): string {
  const o = item.opcoes
  if (o.somenteInfo) return 'Só informações'
  if (o.modo === 'audio') {
    if (o.manterOriginal) return 'Áudio original'
    return `${o.formatoAudio.toUpperCase()}${o.bitrateAudio ? ` ${o.bitrateAudio}k` : ''}`
  }
  if (o.formatoId) return `Formato ${o.formatoId}`
  const q = QUALIDADES.find((x) => x.valor === o.qualidade)?.curto ?? o.qualidade
  return `${q} · ${o.manterOriginal ? 'original' : o.container.toUpperCase()}`
}

/** Itens que já começaram não podem mudar de opções. */
export const podeEditar = (s: StatusItem) => ['buscando', 'pronto', 'pausado', 'erro', 'aguardando-nova-tentativa'].includes(s)

export default function ItemFila({ item }: { item: TItem }) {
  const [aberto, setAberto] = useState(false)
  const [menu, setMenu] = useState(false)
  const [renomeando, setRenomeando] = useState(false)
  const info = item.info
  const p = item.progresso
  const api = window.api
  const estimado = estimarTamanho(info, item.opcoes)
  const arquivo = item.arquivos[item.arquivos.length - 1]
  const playlist = info?.playlist
  const config = useEstado((e) => e.config)!
  const pastaDoItem = item.opcoes.pasta ?? (item.opcoes.modo === 'audio' ? config.pastaAudio : config.pastaVideo)

  const detalheProgresso = () => {
    if (item.status === 'baixando') {
      const partes = [`${p.porcentagem.toFixed(1).replace('.', ',')}%`]
      if (p.etapa) partes.unshift(p.etapa)
      if (p.itemAtual && p.itensTotal) partes.push(`vídeo ${p.itemAtual} de ${p.itensTotal}`)
      if (p.total) partes.push(`${bytes(p.baixado)} de ${bytes(p.total)}`)
      if (p.velocidade) partes.push(velocidade(p.velocidade))
      if (p.eta != null) partes.push(`${duracao(p.eta)} restante`)
      return partes.join(' · ')
    }
    if (item.status === 'processando') return p.etapa ?? 'Processando'
    if (item.status === 'aguardando-nova-tentativa' && item.proximaTentativaEm) {
      return `Tentativa ${item.tentativa} · em ${Math.max(0, Math.round((item.proximaTentativaEm - Date.now()) / 1000))}s`
    }
    if (item.status === 'pausado' && p.porcentagem > 0) return `${p.porcentagem.toFixed(0)}% baixado`
    if (item.status === 'concluido' && item.arquivos.length > 1) return `${item.arquivos.length} arquivos`
    return null
  }

  const classeBarra =
    item.status === 'processando'
      ? 'processando'
      : item.status === 'concluido'
        ? 'concluido'
        : item.status === 'erro'
          ? 'erro'
          : item.status === 'buscando'
            ? 'indeterminado'
            : ''

  return (
    <div className={`item${aberto ? ' aberto' : ''}`}>
      <div className="principal">
        <div className="miniatura" style={info?.miniatura ? { backgroundImage: `url("${info.miniatura}")` } : undefined}>
          {!info?.miniatura && (
            <div className="vazia">{item.status === 'buscando' ? <Loader2 className="girando" /> : <FilePlay />}</div>
          )}
          {info?.aoVivo && <span className="selo vivo">AO VIVO</span>}
          {playlist && (
            <span className="selo lista">
              <ListVideo width={11} height={11} style={{ verticalAlign: -1 }} /> {playlist.total}
            </span>
          )}
          {info?.duracao != null && !info.aoVivo && <span className="selo">{duracao(info.duracao)}</span>}
        </div>

        <div className="corpo">
          <div className="titulo selecionavel" title={info?.titulo ?? item.url}>
            {info?.titulo ?? item.url}
          </div>
          <div className="meta">
            {info?.canal && (
              <span>
                <User /> {info.canal}
              </span>
            )}
            {info?.site && <span>{info.site}</span>}
            <span>{resumoOpcoes(item)}</span>
            {estimado && item.status !== 'concluido' && (
              <span title="Tamanho estimado">
                <HardDrive /> {estimado.aproximado ? '~' : ''}
                {bytes(estimado.bytes)}
              </span>
            )}
            {item.opcoes.trecho && (
              <span>
                ✂ {duracao(item.opcoes.trecho.inicio)}–{duracao(item.opcoes.trecho.fim)}
              </span>
            )}
          </div>
          <div className="status">
            <span className={`estado ${item.status}`}>
              <IconeStatus status={item.status} />
              {NOMES_STATUS[item.status]}
            </span>
            <span className="truncar">{detalheProgresso()}</span>
          </div>
          {(['baixando', 'processando', 'buscando', 'pausado'].includes(item.status) || (item.status === 'concluido' && aberto)) && (
            <div className={`progresso ${classeBarra}`}>
              <div style={{ width: `${item.status === 'concluido' ? 100 : p.porcentagem}%` }} />
            </div>
          )}
        </div>

        <div className="acoes">
          {item.status === 'pronto' && (
            <button className="icone-btn amarelo" title="Baixar agora" onClick={() => api.baixarAgora(item.id)}>
              <Play />
            </button>
          )}
          {(item.status === 'baixando' || item.status === 'processando' || item.status === 'aguardando-nova-tentativa') && (
            <button className="icone-btn" title="Pausar" onClick={() => api.pausar(item.id)}>
              <Pause />
            </button>
          )}
          {item.status === 'pausado' && (
            <button className="icone-btn amarelo" title="Continuar" onClick={() => api.retomar(item.id)}>
              <Play />
            </button>
          )}
          {item.status === 'erro' && (
            <button className="icone-btn amarelo" title="Tentar de novo" onClick={() => api.tentarDeNovo(item.id)}>
              <RotateCw />
            </button>
          )}
          {item.status === 'concluido' && !arquivo && (
            <button className="icone-btn amarelo" title="Abrir a pasta" onClick={() => api.abrirPasta(pastaDoItem)}>
              <FolderOpen />
            </button>
          )}
          {item.status === 'concluido' && arquivo && (
            <>
              <button className="icone-btn amarelo" title="Abrir o arquivo" onClick={() => api.abrirArquivo(arquivo)}>
                <FilePlay />
              </button>
              <button className="icone-btn" title="Mostrar na pasta" onClick={() => api.mostrarNaPasta(arquivo)}>
                <FolderOpen />
              </button>
            </>
          )}
          {!item.opcoes.somenteInfo && (
            <button className={`icone-btn${aberto ? ' amarelo' : ''}`} title="Preferências deste item" onClick={() => setAberto(!aberto)}>
              <Settings2 />
            </button>
          )}
          <MenuItem item={item} aberto={menu} setAberto={setMenu} aoRenomear={() => setRenomeando(true)} />
        </div>
      </div>

      {item.erro && item.status !== 'concluido' && (
        <div className="erro-msg selecionavel">
          <div className="erro-texto">{item.erro}</div>
          {item.dicaErro && (
            <div className="dica">
              <AlertTriangle width={13} height={13} style={{ verticalAlign: -2 }} /> {item.dicaErro}
            </div>
          )}
        </div>
      )}
      {item.erro && item.status === 'concluido' && (
        <div className="erro-msg" style={{ background: 'rgb(245 185 66 / 0.06)' }}>
          <span style={{ color: 'var(--aviso)' }}>{item.erro}</span>
        </div>
      )}

      {aberto && <PreferenciasItem item={item} />}
      {renomeando && <DialogoRenomear item={item} aoFechar={() => setRenomeando(false)} />}
    </div>
  )
}

function MenuItem({ item, aberto, setAberto, aoRenomear }: { item: TItem; aberto: boolean; setAberto: (v: boolean) => void; aoRenomear: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const api = window.api
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false)
    window.addEventListener('mousedown', fora)
    return () => window.removeEventListener('mousedown', fora)
  }, [aberto, setAberto])

  const acao = (fn: () => unknown) => () => {
    setAberto(false)
    void fn()
  }
  const editavel = podeEditar(item.status)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icone-btn" title="Mais ações" onClick={() => setAberto(!aberto)}>
        <MoreHorizontal />
      </button>
      {aberto && (
        <div className="menu">
          <button onClick={acao(async () => { await api.copiar(item.info?.urlPagina || item.url); avisar('Link copiado') })}>
            <Copy /> Copiar link
          </button>
          <button onClick={acao(() => api.abrirLink(item.info?.urlPagina || item.url))}>
            <ExternalLink /> Abrir no site
          </button>
          {item.status === 'concluido' && item.arquivos.length === 1 && (
            <button onClick={acao(aoRenomear)}>
              <PencilLine /> Renomear arquivo
            </button>
          )}
          {editavel && (
            <button
              onClick={acao(async () => {
                const pasta = await api.escolherPasta(item.opcoes.pasta ?? undefined)
                if (pasta) await api.atualizarOpcoes(item.id, { pasta })
              })}
            >
              <FolderInput /> Trocar a pasta deste item
            </button>
          )}
          {item.info?.playlist && editavel && (
            <button onClick={acao(() => api.dividirPlaylist(item.id))}>
              <Split /> Separar em vídeos individuais
            </button>
          )}
          <button onClick={acao(() => api.mover(item.id, 'cima'))}>
            <ArrowUp /> Mover para cima
          </button>
          <button onClick={acao(() => api.mover(item.id, 'baixo'))}>
            <ArrowDown /> Mover para baixo
          </button>
          {item.status === 'concluido' && (
            <button onClick={acao(() => api.tentarDeNovo(item.id))}>
              <RotateCw /> Baixar de novo
            </button>
          )}
          <hr />
          <button className="perigo" onClick={acao(() => api.remover([item.id]))}>
            <Trash2 /> Remover da fila
          </button>
        </div>
      )}
    </div>
  )
}

function DialogoRenomear({ item, aoFechar }: { item: TItem; aoFechar: () => void }) {
  const arquivo = item.arquivos[0] ?? ''
  const nomeAtual = arquivo.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? ''
  const [nome, setNome] = useState(nomeAtual)
  const [erro, setErro] = useState('')
  const salvar = async () => {
    const r = await window.api.renomear(item.id, nome)
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
      <input className="campo" style={{ width: '100%' }} value={nome} autoFocus onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} />
      {erro && <p className="erro-texto pequeno">{erro}</p>}
    </Dialogo>
  )
}
