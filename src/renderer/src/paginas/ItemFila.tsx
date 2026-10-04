// Cartões da tela Downloads: tarefa da fila (com progresso) e arquivo concluído.
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  FilePlay,
  FolderInput,
  FolderOpen,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCw,
  SlidersHorizontal,
  Split,
  Trash2,
  X
} from 'lucide-react'
import { useState } from 'react'
import { bytes, duracao, tempoRelativo, velocidade } from '@shared/formatar'
import { estimarTamanho, QUALIDADES } from '@shared/formatos'
import type { EntradaHistorico, ItemFila as TItem, StatusItem } from '@shared/tipos'
import { pastaPadrao } from '../componentes/Destino'
import OpcoesAvancadas from '../componentes/OpcoesAvancadas'
import { MenuAcoes } from '../componentes/ui'
import { adicionarLinks, avisar } from '../estado'

/** Itens que já começaram não podem mudar de opções. */
const podeEditar = (s: StatusItem) => ['buscando', 'pronto', 'pausado', 'erro', 'aguardando-nova-tentativa'].includes(s)

function seloQualidade(item: TItem): string {
  const o = item.opcoes
  if (o.modo === 'audio') return o.bitrateAudio && !o.manterOriginal ? `${o.bitrateAudio} kbps` : 'áudio'
  if (o.formatoId) return `#${o.formatoId}`
  return QUALIDADES.find((q) => q.valor === o.qualidade)?.curto ?? o.qualidade
}

function formato(item: TItem): string {
  const o = item.opcoes
  if (o.manterOriginal) return 'original'
  return o.modo === 'audio' ? o.formatoAudio : o.container
}

export default function ItemFila({ item }: { item: TItem }) {
  const [opcoes, setOpcoes] = useState(false)
  const api = window.api
  const info = item.info
  const p = item.progresso
  const pasta = item.opcoes.pasta ?? pastaPadrao(item.opcoes.modo)
  const estimado = estimarTamanho(info, item.opcoes)
  const ativo = item.status === 'baixando' || item.status === 'processando'

  const esquerda = () => {
    switch (item.status) {
      case 'buscando':
        return 'Lendo o link…'
      case 'pronto':
        return `Na fila${estimado ? ` · ${estimado.aproximado ? '~' : ''}${bytes(estimado.bytes)}` : ''}`
      case 'pausado':
        return `Pausado · ${Math.round(p.porcentagem)}%`
      case 'aguardando-nova-tentativa':
        return `Tentativa ${item.tentativa} em ${Math.max(0, Math.round(((item.proximaTentativaEm ?? 0) - Date.now()) / 1000))}s`
      case 'processando':
        return p.etapa ?? 'Processando'
      case 'erro':
        return 'Erro'
      default: {
        const partes: string[] = []
        if (p.itemAtual && p.itensTotal) partes.push(`vídeo ${p.itemAtual} de ${p.itensTotal}`)
        if (p.total) partes.push(`${bytes(p.baixado)} de ${bytes(p.total)}`)
        else if (p.etapa) partes.push(p.etapa)
        return partes.join(' · ')
      }
    }
  }

  const classeBarra = item.status === 'processando' ? 'processando' : item.status === 'pausado' ? 'pausado' : item.status === 'buscando' ? 'indeterminado' : ''

  return (
    <div className="cartao tarefa">
      <div className="topo">
        <div className="miniatura" style={info?.miniatura ? { backgroundImage: `url("${info.miniatura}")` } : undefined}>
          {!info?.miniatura && <div className="vazia">{item.status === 'buscando' ? <Loader2 className="girando" /> : item.opcoes.modo === 'audio' ? <Music /> : <FilePlay />}</div>}
          {info?.playlist && <span className="tipo-lista">{info.playlist.total} vídeos</span>}
          <span className="qualidade">{seloQualidade(item)}</span>
        </div>
        <div className="texto">
          <div className="nome">
            <strong className="selecionavel" title={info?.titulo ?? item.url}>
              {info?.titulo ?? item.url}
            </strong>
            <span className="selo-amarelo">{formato(item).toUpperCase()}</span>
          </div>
          <div className="origem">
            {info?.canal ?? '—'}
            {info?.site && (
              <>
                <span className="sep">•</span>
                {info.site}
              </>
            )}
          </div>
        </div>
        <div className="acoes">
          {(item.status === 'pronto' || item.status === 'pausado') && (
            <button className="icone-btn amarelo" title={item.status === 'pausado' ? 'Continuar' : 'Baixar agora'} onClick={() => (item.status === 'pausado' ? api.retomar(item.id) : api.baixarAgora(item.id))}>
              <Play />
            </button>
          )}
          {(ativo || item.status === 'aguardando-nova-tentativa') && (
            <button className="icone-btn" title="Pausar" onClick={() => api.pausar(item.id)}>
              <Pause />
            </button>
          )}
          {item.status === 'erro' && (
            <button className="icone-btn amarelo" title="Tentar de novo" onClick={() => api.tentarDeNovo(item.id)}>
              <RotateCw />
            </button>
          )}
          <button className="icone-btn" title="Abrir a pasta de destino" onClick={() => api.abrirPasta(pasta)}>
            <FolderOpen />
          </button>
          <button className="icone-btn" title="Remover da fila" onClick={() => api.remover([item.id])}>
            <X />
          </button>
          <MenuAcoes
            itens={[
              { icone: SlidersHorizontal, texto: 'Opções avançadas…', acao: () => setOpcoes(true) },
              podeEditar(item.status) && {
                icone: FolderInput,
                texto: 'Trocar a pasta deste item',
                acao: async () => {
                  const nova = await api.escolherPasta(pasta)
                  if (nova) await api.atualizarOpcoes(item.id, { pasta: nova })
                }
              },
              info?.playlist && podeEditar(item.status) && { icone: Split, texto: 'Separar em vídeos individuais', acao: () => api.dividirPlaylist(item.id) },
              'separador',
              {
                icone: Copy,
                texto: 'Copiar link',
                acao: async () => {
                  await api.copiar(info?.urlPagina || item.url)
                  avisar('Link copiado')
                }
              },
              { icone: ExternalLink, texto: 'Abrir no site', acao: () => api.abrirLink(info?.urlPagina || item.url) },
              { icone: ArrowUp, texto: 'Mover para cima', acao: () => api.mover(item.id, 'cima') },
              { icone: ArrowDown, texto: 'Mover para baixo', acao: () => api.mover(item.id, 'baixo') },
              'separador',
              { icone: Trash2, texto: 'Remover da fila', acao: () => api.remover([item.id]), perigo: true }
            ]}
          />
        </div>
      </div>

      {item.status !== 'erro' && (
        <>
          <div className={`barra-progresso ${classeBarra}`}>
            <div style={{ width: `${item.status === 'buscando' ? 30 : p.porcentagem}%` }} />
          </div>
          <div className="numeros">
            <span className="pct">{item.status === 'buscando' || item.status === 'pronto' ? '' : `${p.porcentagem.toFixed(0)}%`}</span>
            <span>{esquerda()}</span>
            {ativo && p.velocidade != null && <span className="vel">{velocidade(p.velocidade)}</span>}
            {ativo && p.eta != null && <span style={p.velocidade == null ? { marginLeft: 'auto' } : undefined}>{duracao(p.eta)} restantes</span>}
          </div>
        </>
      )}

      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : 'estado-texto aviso'}>{item.erro}</div>
          {item.dicaErro && (
            <div className="dica">
              <AlertTriangle width={13} height={13} style={{ verticalAlign: -2 }} /> {item.dicaErro}
            </div>
          )}
        </div>
      )}

      {opcoes && (
        <OpcoesAvancadas
          titulo={info?.titulo ?? 'Opções avançadas'}
          info={info}
          opcoes={item.opcoes}
          mudar={(parcial) => api.atualizarOpcoes(item.id, parcial)}
          aoFechar={() => setOpcoes(false)}
          bloqueado={podeEditar(item.status) ? null : 'As opções não podem mudar enquanto baixa. Pause para editar.'}
          aoSepararPlaylist={() => {
            setOpcoes(false)
            void api.dividirPlaylist(item.id)
          }}
        />
      )}
    </div>
  )
}

/** Arquivo do histórico (Downloads → Concluídos e Histórico Recente). */
export function ItemConcluido({ entrada: h }: { entrada: EntradaHistorico }) {
  const api = window.api
  const existe = h.arquivoExiste !== false
  return (
    <div className="cartao feito">
      <div className={`miniatura pequena${!h.miniatura ? ' quadrada' : ''}`} style={h.miniatura ? { backgroundImage: `url("${h.miniatura}")` } : undefined}>
        {!h.miniatura && <div className="vazia">{h.modo === 'audio' ? <Music /> : <FilePlay />}</div>}
      </div>
      <div className="texto">
        <strong>
          <span className="t selecionavel" title={h.titulo}>
            {h.titulo}
          </span>
          <span className="selo-amarelo">{h.formato.toUpperCase()}</span>
          {h.qualidade && <span className="selo-azul">{h.qualidade}</span>}
        </strong>
        <small>
          {bytes(h.tamanho)}
          <span className="sep">•</span>
          {existe ? `Concluído ${tempoRelativo(h.baixadoEm)}` : <span className="erro-texto">Arquivo não encontrado</span>}
          {h.canal && (
            <>
              <span className="sep">•</span>
              {h.canal}
            </>
          )}
        </small>
      </div>
      {existe ? (
        <>
          <button className="btn primario" onClick={() => api.abrirArquivo(h.arquivo)}>
            <Play /> Reproduzir
          </button>
          <button className="btn" onClick={() => api.mostrarNaPasta(h.arquivo)}>
            <FolderOpen /> Abrir na Pasta
          </button>
        </>
      ) : (
        <button className="btn primario" onClick={() => adicionarLinks([h.url], true)}>
          <Download /> Baixar de novo
        </button>
      )}
      <MenuAcoes
        itens={[
          { icone: Download, texto: 'Baixar de novo', acao: async () => (await adicionarLinks([h.url], true)) && avisar('Adicionado à fila') },
          {
            icone: Copy,
            texto: 'Copiar link',
            acao: async () => {
              await api.copiar(h.url)
              avisar('Link copiado')
            }
          },
          { icone: ExternalLink, texto: 'Abrir no site', acao: () => api.abrirLink(h.url) },
          'separador',
          { icone: Trash2, texto: 'Tirar da lista', acao: () => api.removerDoHistorico([h.id]), perigo: true }
        ]}
      />
    </div>
  )
}
