// A pista: cada download é um carro de rali — placa de número, faixa amarela que avança e chegada em dourado.
// Usado na tela Baixar (o que está andando agora) e em Downloads (a fila inteira e o histórico).
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
  FileX,
  Images,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCw,
  SlidersHorizontal,
  Split,
  Trash2
} from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { bytes, duracao, tempoRelativo, velocidade } from '@shared/formatar'
import { estimarTamanho, QUALIDADES } from '@shared/formatos'
import { urlArquivoLocal } from '@shared/miniatura'
import type { EntradaHistorico, ItemFila as TItem, ItemGaleria, StatusItem } from '@shared/tipos'
import { pastaCurta, pastaPadrao } from '../componentes/Destino'
import OpcoesAvancadas from '../componentes/OpcoesAvancadas'
import { MenuAcoes } from '../componentes/ui'
import { adicionarLinks, avisar } from '../estado'

export type EstadoFaixa = 'andando' | 'parada' | 'correndo' | 'entregue' | 'erro'

/** A faixa da pintura: o progresso como uma faixa inclinada na base da linha. */
export function Faixa({ estado, pct = 0, chegando, rotulo = 'Progresso' }: { estado: EstadoFaixa; pct?: number; chegando?: boolean; rotulo?: string }) {
  return (
    <div
      className={`faixa ${estado}${chegando ? ' chegando' : ''}`}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={estado === 'correndo' ? undefined : estado === 'entregue' ? 100 : Math.round(pct)}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/** Placa de número: a posição na fila, como o número de porta do carro. */
export function Placa({ children, tipo }: { children: ReactNode; tipo?: 'ouro' | 'erro' | 'parada' | 'ouro sigla' }) {
  return (
    <div className={`placa${tipo ? ` ${tipo}` : ''}`} aria-hidden="true">
      {children}
    </div>
  )
}

const numeroPlaca = (n: number) => String(n).padStart(2, '0')

/**
 * Capa pequena das linhas. No YouTube, a capa em resolução máxima às vezes não existe e o site devolve uma imagem
 * cinza no lugar; a versão média (320×180, já em 16:9) sempre existe e basta para uma miniatura.
 */
export function miniaturaLinha(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/^https?:\/\/i\d?\.ytimg\.com\/vi(?:_webp)?\/([\w-]{11})\//)
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : url
}

/** "Canal · YouTube · MP4 1080p" com separadores. */
function Meta({ partes }: { partes: Array<ReactNode | null | false | undefined> }) {
  const visiveis = partes.filter(Boolean)
  return (
    <small>
      {visiveis.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">·</span>}
          {p}
        </Fragment>
      ))}
    </small>
  )
}

/** Itens que já começaram não podem mudar de opções. */
const podeEditar = (s: StatusItem) => ['buscando', 'pronto', 'pausado', 'erro', 'aguardando-nova-tentativa'].includes(s)

function seloQualidade(item: TItem): string {
  const o = item.opcoes
  if (o.modo === 'audio') return o.bitrateAudio && !o.manterOriginal ? `${o.bitrateAudio} kbps` : ''
  if (o.formatoId) return `#${o.formatoId}`
  return QUALIDADES.find((q) => q.valor === o.qualidade)?.curto ?? o.qualidade
}

function formato(item: TItem): string {
  const o = item.opcoes
  if (o.manterOriginal) return 'original'
  return o.modo === 'audio' ? o.formatoAudio : o.container
}

/** Um download da fila (vídeo ou áudio), com o progresso como faixa. */
export default function ItemFila({ item, posicao = 1 }: { item: TItem; posicao?: number }) {
  const [opcoes, setOpcoes] = useState(false)
  const api = window.api
  const info = item.info
  const p = item.progresso
  const pasta = item.opcoes.pasta ?? pastaPadrao(item.opcoes.modo)
  const estimado = estimarTamanho(info, item.opcoes)
  const ativo = item.status === 'baixando' || item.status === 'processando'
  const pct = Math.round(p.porcentagem)

  const placa = (() => {
    switch (item.status) {
      case 'erro':
        return (
          <Placa tipo="erro">
            <AlertTriangle />
          </Placa>
        )
      case 'pausado':
        return (
          <Placa tipo="parada">
            <Pause />
          </Placa>
        )
      case 'buscando':
        return (
          <Placa tipo="parada">
            <Loader2 className="girando" />
          </Placa>
        )
      case 'aguardando-nova-tentativa':
        return (
          <Placa tipo="parada">
            <RotateCw />
          </Placa>
        )
      default:
        return <Placa>{numeroPlaca(posicao)}</Placa>
    }
  })()

  const leitura = (() => {
    switch (item.status) {
      case 'baixando':
        return (
          <>
            <span className="num-rali">{pct}%</span>
            <small>{[p.velocidade != null ? velocidade(p.velocidade) : null, p.eta != null ? `faltam ${duracao(p.eta)}` : null].filter(Boolean).join(' · ') || 'começando'}</small>
          </>
        )
      case 'processando':
        return (
          <>
            <span className="estado">{p.etapa ?? 'Convertendo'}</span>
            <small>quase lá</small>
          </>
        )
      case 'pronto':
        return (
          <>
            <span className="estado">Na fila</span>
            {estimado && (
              <small>
                {estimado.aproximado ? '~' : ''}
                {bytes(estimado.bytes)}
              </small>
            )}
          </>
        )
      case 'buscando':
        return <span className="estado">Lendo o link</span>
      case 'pausado':
        return (
          <>
            <span className="estado">Pausado</span>
            <small>{pct}% baixado</small>
          </>
        )
      case 'aguardando-nova-tentativa':
        return (
          <>
            <span className="estado">Nova tentativa</span>
            <small>em {Math.max(0, Math.round(((item.proximaTentativaEm ?? 0) - Date.now()) / 1000))} s</small>
          </>
        )
      default:
        return <span className="estado">Falhou</span>
    }
  })()

  const faixa: EstadoFaixa =
    item.status === 'erro' ? 'erro' : item.status === 'buscando' ? 'correndo' : ['pausado', 'aguardando-nova-tentativa', 'pronto'].includes(item.status) ? 'parada' : 'andando'

  return (
    <div className={`carro${item.status === 'erro' ? ' erro' : ''}${item.erro ? ' com-erro' : ''}`}>
      {placa}
      <div className="miniatura pequena" style={info?.miniatura ? { backgroundImage: `url("${miniaturaLinha(info.miniatura)}")` } : undefined}>
        {!info?.miniatura && <div className="vazia">{item.opcoes.modo === 'audio' ? <Music /> : <FilePlay />}</div>}
        {info?.playlist && <span className="tipo-lista">{info.playlist.total} vídeos</span>}
      </div>
      <div className="texto">
        <strong className="selecionavel" title={info?.titulo ?? item.url}>
          {info?.titulo ?? item.url}
        </strong>
        <Meta
          partes={[
            info?.canal,
            info?.site,
            `${formato(item).toUpperCase()} ${seloQualidade(item)}`.trim(),
            p.itemAtual && p.itensTotal ? `vídeo ${p.itemAtual} de ${p.itensTotal}` : null,
            item.status === 'baixando' && p.total ? `${bytes(p.baixado)} de ${bytes(p.total)}` : null
          ]}
        />
      </div>
      <div className="leitura">{leitura}</div>
      <div className="acoes">
        {(item.status === 'pronto' || item.status === 'pausado') && (
          <button className="icone-btn leve amarelo" title={item.status === 'pausado' ? 'Continuar' : 'Baixar agora'} onClick={() => (item.status === 'pausado' ? api.retomar(item.id) : api.baixarAgora(item.id))}>
            <Play />
          </button>
        )}
        {(ativo || item.status === 'aguardando-nova-tentativa') && (
          <button className="icone-btn leve" title="Pausar" onClick={() => api.pausar(item.id)}>
            <Pause />
          </button>
        )}
        {item.status === 'erro' && (
          <button className="icone-btn leve amarelo" title="Tentar de novo" onClick={() => api.tentarDeNovo(item.id)}>
            <RotateCw />
          </button>
        )}
        <button className="icone-btn leve" title="Abrir a pasta de destino" onClick={() => api.abrirPasta(pasta)}>
          <FolderOpen />
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

      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : 'estado-texto aviso'}>{item.erro}</div>
          {item.dicaErro && <div className="dica">{item.dicaErro}</div>}
        </div>
      )}

      <Faixa estado={faixa} pct={item.status === 'processando' ? 100 : pct} />

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

/** Arquivo que já chegou (histórico). Com `recente`, a faixa dourada passa uma vez, como uma chegada. */
export function ItemConcluido({ entrada: h, recente }: { entrada: EntradaHistorico; recente?: boolean }) {
  const api = window.api
  const existe = h.arquivoExiste !== false
  return (
    <div className={`carro feito${existe ? ' entregue' : ''}`}>
      {existe ? (
        <Placa tipo="ouro sigla">{h.formato.toUpperCase().slice(0, 4)}</Placa>
      ) : (
        <Placa tipo="parada">
          <FileX />
        </Placa>
      )}
      <div className={`miniatura pequena${!h.miniatura ? ' quadrada' : ''}`} style={h.miniatura ? { backgroundImage: `url("${miniaturaLinha(h.miniatura)}")` } : undefined}>
        {!h.miniatura && <div className="vazia">{h.modo === 'audio' ? <Music /> : <FilePlay />}</div>}
      </div>
      <div className="texto">
        <strong className="selecionavel" title={h.titulo}>
          {h.titulo}
        </strong>
        <Meta partes={[h.canal, h.qualidade, bytes(h.tamanho), !existe && <span className="erro-texto">arquivo não encontrado</span>]} />
      </div>
      <div className="leitura">
        <span className="estado">{existe ? 'Entregue' : 'Sumiu'}</span>
        <small>{tempoRelativo(h.baixadoEm)}</small>
      </div>
      <div className="acoes">
        {existe ? (
          <>
            <button className="btn pequeno" onClick={() => api.abrirArquivo(h.arquivo)}>
              <Play /> Abrir
            </button>
            <button className="icone-btn leve" title="Mostrar na pasta" onClick={() => api.mostrarNaPasta(h.arquivo)}>
              <FolderOpen />
            </button>
          </>
        ) : (
          <button className="btn pequeno" onClick={() => adicionarLinks([h.url], true)}>
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
      {existe && <Faixa estado="entregue" chegando={recente} />}
    </div>
  )
}

/** "https://www.instagram.com/nasa/" → "instagram.com/nasa" */
export function nomeGaleria(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return url
  }
}

/** Um download da galeria (gallery-dl). O total de arquivos não é conhecido antes, então a faixa corre enquanto baixa. */
export function ItemDaGaleria({ item, posicao = 1, recente }: { item: ItemGaleria; posicao?: number; recente?: boolean }) {
  const api = window.api
  const organizacao =
    item.organizar === 'plana' ? 'sem subpastas' : item.organizar === 'site' ? 'por site' : item.organizar === 'perfil' ? 'por perfil' : item.organizar === 'personalizado' ? item.formatoPasta : 'por site → perfil'

  const placa =
    item.status === 'concluido' ? (
      <Placa tipo="ouro sigla">IMG</Placa>
    ) : item.status === 'erro' ? (
      <Placa tipo="erro">
        <AlertTriangle />
      </Placa>
    ) : item.status === 'pausado' ? (
      <Placa tipo="parada">
        <Pause />
      </Placa>
    ) : (
      <Placa>{numeroPlaca(posicao)}</Placa>
    )

  const leitura =
    item.status === 'baixando' ? (
      <>
        <span className="num-rali">{item.arquivos}</span>
        <small>{item.arquivos === 1 ? 'arquivo baixado' : 'arquivos baixados'}</small>
      </>
    ) : item.status === 'concluido' ? (
      <>
        <span className="estado">Entregue</span>
        <small>{item.concluidoEm ? tempoRelativo(item.concluidoEm) : ''}</small>
      </>
    ) : item.status === 'erro' ? (
      <span className="estado">Falhou</span>
    ) : item.status === 'pausado' ? (
      <>
        <span className="estado">Pausado</span>
        <small>{item.arquivos} baixados</small>
      </>
    ) : (
      <span className="estado">Na fila</span>
    )

  const faixa: EstadoFaixa =
    item.status === 'baixando' ? 'correndo' : item.status === 'erro' ? 'erro' : item.status === 'concluido' ? 'entregue' : 'parada'

  return (
    <div className={`carro${item.status === 'concluido' ? ' entregue' : ''}${item.status === 'erro' ? ' erro' : ''}${item.erro ? ' com-erro' : ''}`}>
      {placa}
      <Mosaico amostras={item.amostras} />
      <div className="texto">
        <strong className="selecionavel" title={item.url}>
          {nomeGaleria(item.url)}
        </strong>
        <Meta
          partes={[
            'Imagens',
            item.status !== 'baixando' && `${item.arquivos} ${item.arquivos === 1 ? 'arquivo' : 'arquivos'}`,
            item.pulados > 0 && `${item.pulados} já existiam`,
            item.falhas > 0 && <span className="erro-texto">{item.falhas} falharam</span>,
            `${pastaCurta(item.pasta)} (${organizacao})`,
            item.intervalo && `arquivos ${item.intervalo}`
          ]}
        />
      </div>
      <div className="leitura">{leitura}</div>
      <div className="acoes">
        {item.status === 'baixando' || item.status === 'aguardando' ? (
          <button className="icone-btn leve" title="Pausar" onClick={() => api.pausarGaleria(item.id)}>
            <Pause />
          </button>
        ) : (
          <button className="icone-btn leve amarelo" title={item.status === 'pausado' ? 'Continuar' : 'Baixar de novo (pula o que já existe)'} onClick={() => api.retomarGaleria(item.id)}>
            {item.status === 'pausado' ? <Play /> : <RotateCw />}
          </button>
        )}
        <button className="icone-btn leve" title="Abrir a pasta" onClick={() => (item.ultimoArquivo ? api.mostrarNaPasta(item.ultimoArquivo) : api.abrirPasta(item.pasta))}>
          <FolderOpen />
        </button>
        <MenuAcoes
          itens={[
            {
              icone: Copy,
              texto: 'Copiar link',
              acao: async () => {
                await api.copiar(item.url)
                avisar('Link copiado')
              }
            },
            { icone: ExternalLink, texto: 'Abrir no site', acao: () => api.abrirLink(item.url) },
            'separador',
            { icone: Trash2, texto: 'Tirar da lista', acao: () => api.removerGaleria([item.id]), perigo: true }
          ]}
        />
      </div>
      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : 'estado-texto aviso'}>{item.erro}</div>
          {item.dicaErro && <div className="dica">{item.dicaErro}</div>}
        </div>
      )}
      <Faixa estado={faixa} chegando={item.status === 'concluido' && recente} />
    </div>
  )
}

/** Mosaico com as últimas imagens baixadas: 1 inteira, 2 lado a lado, 3–4 em grade. */
function Mosaico({ amostras }: { amostras: string[] }) {
  const [quebradas, setQuebradas] = useState<string[]>([])
  const visiveis = amostras.filter((a) => !quebradas.includes(a)).slice(-4)
  if (!visiveis.length) {
    return (
      <div className="miniatura pequena">
        <div className="vazia">
          <Images />
        </div>
      </div>
    )
  }
  return (
    <div className={`miniatura pequena mosaico qtd-${visiveis.length}`}>
      {visiveis.map((a) => (
        <img key={a} src={urlArquivoLocal(a)} alt="" loading="lazy" onError={() => setQuebradas((q) => [...q, a])} />
      ))}
    </div>
  )
}
