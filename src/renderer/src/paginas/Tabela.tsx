// A tabela de downloads, como a tabela do campeonato: o que está ao vivo, o que espera na fila, o que falhou e o que
// já chegou, numa lista só. A cor do número diz a situação; as cinco marcas mostram o progresso em quintos.
// Usa a mesma grade do placar: porcentagem sobre Situação, tempo sobre Tempo, velocidade sobre Tamanho.
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  FolderOpen,
  Inbox,
  ListChecks,
  Pause,
  Play,
  RotateCw,
  Search,
  SlidersHorizontal,
  Split,
  Trash2,
  X
} from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { bytes, duracao, tempoRelativo, tempoTotal, velocidade } from '@shared/formatar'
import { estimarTamanho } from '@shared/formatos'
import type { EntradaHistorico, ItemFila, ItemGaleria, StatusItem } from '@shared/tipos'
import { Capa, Mosaico, nomeGaleria, tipoDoItem } from '../componentes/Capa'
import { nColunas, useColunas, type Colunas } from '../componentes/colunas'
import { pastaCurta, pastaPadrao } from '../componentes/Destino'
import OpcoesAvancadas from '../componentes/OpcoesAvancadas'
import { MenuAcoes } from '../componentes/ui'
import { adicionarLinks, avisar, useEstado, type AbaTabela } from '../estado'

type Zona = 'vivo' | 'fila' | 'erro' | 'ok' | 'sumiu'
type Tipo = 'todos' | 'video' | 'audio' | 'imagens'
type Ordem = 'recentes' | 'antigos' | 'nome' | 'maiores'

type Registro =
  | { chave: string; zona: Zona; de: 'fila'; item: ItemFila }
  | { chave: string; zona: Zona; de: 'galeria'; item: ItemGaleria }
  | { chave: string; zona: Zona; de: 'historico'; item: EntradaHistorico }

const ABAS: Array<{ id: AbaTabela; nome: string }> = [
  { id: 'todos', nome: 'Todos' },
  { id: 'vivo', nome: 'Ao vivo' },
  { id: 'fila', nome: 'Na fila' },
  { id: 'concluidos', nome: 'Concluídos' },
  { id: 'falhas', nome: 'Falhas' }
]

const ZONAS_DA_ABA: Record<AbaTabela, Zona[]> = {
  todos: ['vivo', 'fila', 'erro', 'ok', 'sumiu'],
  vivo: ['vivo'],
  fila: ['fila'],
  concluidos: ['ok', 'sumiu'],
  falhas: ['erro']
}

/** Quantos concluídos desenhar de uma vez (o histórico pode ter milhares). */
const POR_PAGINA = 300

const ContextoColunas = createContext<Colunas>({ tipo: true, tamanho: true, tempo: true })

function zonaDaFila(s: StatusItem): Zona | null {
  if (s === 'baixando' || s === 'processando' || s === 'buscando') return 'vivo'
  if (s === 'pronto' || s === 'pausado' || s === 'aguardando-nova-tentativa') return 'fila'
  if (s === 'erro') return 'erro'
  return null // concluído: já está no histórico
}

function zonaDaGaleria(s: ItemGaleria['status']): Zona {
  return s === 'baixando' ? 'vivo' : s === 'concluido' ? 'ok' : s === 'erro' ? 'erro' : 'fila'
}

function textoDe(r: Registro): string {
  if (r.de === 'fila') return `${r.item.info?.titulo ?? r.item.url} ${r.item.info?.canal ?? ''} ${r.item.info?.site ?? ''}`
  if (r.de === 'galeria') return nomeGaleria(r.item.url)
  return `${r.item.titulo} ${r.item.canal ?? ''} ${r.item.site}`
}

function tipoDe(r: Registro): Tipo {
  if (r.de === 'galeria') return 'imagens'
  return r.de === 'fila' ? r.item.opcoes.modo : r.item.modo
}

function quandoChegou(r: Registro): number {
  return r.de === 'historico' ? r.item.baixadoEm : r.de === 'galeria' ? (r.item.concluidoEm ?? r.item.criadoEm) : r.item.criadoEm
}

function tamanhoDe(r: Registro): number {
  if (r.de === 'historico') return r.item.tamanho
  if (r.de === 'fila') return r.item.progresso.total ?? estimarTamanho(r.item.info, r.item.opcoes)?.bytes ?? 0
  return 0
}

function duracaoDe(r: Registro): number {
  if (r.de === 'historico') return r.item.duracao ?? 0
  if (r.de === 'fila' && !r.item.info?.playlist) return r.item.info?.duracao ?? 0
  return 0
}

/** "Convertendo para MP3" → "convertendo para MP3" (no meio da frase). */
const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/** Chegou há pouco: a linha entra com a chegada em dourado (uma vez). */
const chegouAgora = (quando: number | null | undefined) => !!quando && Date.now() - quando < 10_000

/** Cinco marcas de progresso, cada uma um quinto. */
function Marcas({ zona, pct, correndo }: { zona: Zona; pct?: number; correndo?: boolean }) {
  const cheias = Math.max(0, Math.min(5, Math.floor((pct ?? 0) / 20)))
  return (
    <span className={`marcas${correndo ? ' correndo' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        let classe = ''
        if (zona === 'ok') classe = 'ouro'
        else if (zona === 'erro') classe = i < cheias ? 'parada' : i === cheias ? 'erro' : ''
        else if (zona === 'vivo') classe = i < cheias ? 'cheia' : ''
        else if (zona === 'fila') classe = i < cheias ? 'parada' : ''
        return <i key={i} className={classe} style={correndo ? { animationDelay: `${i * 0.16}s` } : undefined} />
      })}
    </span>
  )
}

/** O número na cor da zona, como a posição na tabela do campeonato. */
function NumeroZona({ zona, n }: { zona: Zona; n: number }) {
  const nomes: Record<Zona, string> = { vivo: 'ao vivo', fila: 'na fila', erro: 'falhou', ok: 'entregue', sumiu: 'arquivo não encontrado' }
  return (
    <span className={`zona num n-tabela ${zona}`} title={nomes[zona]}>
      {String(n).padStart(2, '0')}
    </span>
  )
}

/**
 * Linha de baixo do título; o que estava numa coluna que saiu (janela estreita) desce para cá. Cada parte aparece
 * inteira ou sai inteira (nenhum número cortado ao meio); só a primeira encolhe com reticências, se precisar.
 */
function Meta({ base, tipo, tamanho, ritmo }: { base: ReactNode[]; tipo?: ReactNode; tamanho?: ReactNode; ritmo?: ReactNode }) {
  const c = useContext(ContextoColunas)
  const partes = [...base, !c.tipo && tipo, !c.tempo && ritmo, !c.tamanho && tamanho].filter(Boolean)
  return (
    <small className="partes">
      {partes.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </small>
  )
}

/** A coluna Tipo (antes da Situação), quando cabe. */
function CelulaTipo({ tipo }: { tipo: ReactNode }) {
  const c = useContext(ContextoColunas)
  return c.tipo ? <td className="c-tipo">{tipo}</td> : null
}

/** As colunas Tempo e Tamanho (depois da Situação, embaixo do relógio e da velocidade do placar), quando cabem. */
function CelulasTempoTamanho({ ritmo, tamanho }: { ritmo: ReactNode; tamanho: ReactNode }) {
  const c = useContext(ContextoColunas)
  const vazio = <span className="dim">—</span>
  return (
    <>
      {c.tempo && <td className="c-tempo">{ritmo ?? vazio}</td>}
      {c.tamanho && <td className="c-tamanho">{tamanho ?? vazio}</td>}
    </>
  )
}

/** O motivo de um erro (e o que fazer) numa linha de texto embaixo do título, sem caixa. */
function LinhaDetalhe({ erro, dica, falhou }: { erro: string; dica: string | null; falhou: boolean }) {
  const c = useContext(ContextoColunas)
  return (
    <tr className="detalhe">
      <td colSpan={2} />
      <td colSpan={nColunas(c) - 2} className="selecionavel">
        <span className={falhou ? 'erro-texto' : 'muted'}>{erro.trim()}</span>
        {dica && <span className="dica"> — {dica.trim()}</span>}
      </td>
    </tr>
  )
}

/** Itens que já começaram não podem mudar de opções. */
const podeEditar = (s: StatusItem) => ['buscando', 'pronto', 'pausado', 'erro', 'aguardando-nova-tentativa'].includes(s)

function LinhaFila({ item, n, zona }: { item: ItemFila; n: number; zona: Zona }) {
  const [opcoes, setOpcoes] = useState(false)
  const api = window.api
  const info = item.info
  const p = item.progresso
  const pct = Math.floor(p.porcentagem)
  const pasta = item.opcoes.pasta ?? pastaPadrao(item.opcoes.modo)
  const estimado = estimarTamanho(info, item.opcoes)
  const tipo = tipoDoItem(item)
  const lista = info?.playlist ? `playlist de ${info.playlist.total} ${item.opcoes.modo === 'audio' ? 'faixas' : 'vídeos'}` : null

  const tamanho =
    item.status === 'baixando' && p.total ? `${bytes(p.baixado)} de ${bytes(p.total)}` : estimado ? `${estimado.aproximado ? '~' : ''}${bytes(estimado.bytes)}` : null

  const ritmo =
    item.status === 'baixando'
      ? [p.velocidade != null ? velocidade(p.velocidade) : null, p.eta != null ? `faltam ${duracao(p.eta)}` : null].filter(Boolean).join(' · ') || 'começando'
      : item.status === 'aguardando-nova-tentativa'
        ? `de novo em ${Math.max(0, Math.round(((item.proximaTentativaEm ?? 0) - Date.now()) / 1000))} s`
        : null

  const situacao =
    item.status === 'baixando' ? (
      <span className="num n-tabela st-vivo">{pct}%</span>
    ) : item.status === 'processando' ? (
      <span className="st-vivo">Finalizando…</span>
    ) : item.status === 'buscando' ? (
      <span className="st-fila">Lendo o link…</span>
    ) : item.status === 'pausado' ? (
      <span className="st-fila">Pausado · {pct}%</span>
    ) : item.status === 'aguardando-nova-tentativa' ? (
      <span className="st-fila">Nova tentativa</span>
    ) : item.status === 'erro' ? (
      <span className="st-erro">Falhou</span>
    ) : (
      <span className="st-fila">Na fila</span>
    )

  const ativo = item.status === 'baixando' || item.status === 'processando'

  return (
    <>
      <tr className={`${zona}${item.erro ? ' com-detalhe' : ''}`}>
        <td className="c-pos">
          <NumeroZona zona={zona} n={n} />
        </td>
        <td className="c-capa">
          <Capa url={info?.miniatura} audio={item.opcoes.modo === 'audio'} />
        </td>
        <td className="c-titulo">
          <b className="selecionavel" title={info?.titulo ?? item.url}>
            {info?.titulo ?? item.url}
          </b>
          <Meta
            base={[
              info?.site,
              info?.canal,
              lista,
              p.itemAtual && p.itensTotal ? `${item.opcoes.modo === 'audio' ? 'faixa' : 'vídeo'} ${p.itemAtual} de ${p.itensTotal}` : null,
              item.status === 'processando' && minuscula(p.etapa ?? 'Convertendo')
            ]}
            tipo={tipo}
            tamanho={tamanho}
            ritmo={ritmo}
          />
        </td>
        <CelulaTipo tipo={tipo} />
        <td className="c-situacao">
          <Marcas zona={zona} pct={item.status === 'processando' ? 100 : p.porcentagem} correndo={item.status === 'buscando' || item.status === 'processando'} />
          {situacao}
        </td>
        <CelulasTempoTamanho ritmo={ritmo} tamanho={tamanho} />
        <td className="c-acoes">
          <div className="acoes-linha">
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
              <button className="btn pequeno" onClick={() => api.tentarDeNovo(item.id)}>
                <RotateCw /> Tentar de novo
              </button>
            )}
            {item.status !== 'erro' && (
              <button className="icone-btn leve" title="Abrir a pasta de destino" onClick={() => api.abrirPasta(pasta)}>
                <FolderOpen />
              </button>
            )}
            <MenuAcoes
              leve
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
                item.status === 'erro' && { icone: FolderOpen, texto: 'Abrir a pasta de destino', acao: () => api.abrirPasta(pasta) },
                { icone: ArrowUp, texto: 'Mover para cima', acao: () => api.mover(item.id, 'cima') },
                { icone: ArrowDown, texto: 'Mover para baixo', acao: () => api.mover(item.id, 'baixo') },
                'separador',
                { icone: Trash2, texto: 'Remover da fila', acao: () => api.remover([item.id]), perigo: true }
              ]}
            />
          </div>
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
        </td>
      </tr>
      {item.erro && <LinhaDetalhe erro={item.erro} dica={item.dicaErro} falhou={item.status === 'erro'} />}
    </>
  )
}

function LinhaGaleria({ item, n, zona }: { item: ItemGaleria; n: number; zona: Zona }) {
  const api = window.api
  const organizacao =
    item.organizar === 'plana' ? 'sem subpastas' : item.organizar === 'site' ? 'por site' : item.organizar === 'perfil' ? 'por perfil' : item.organizar === 'personalizado' ? item.formatoPasta : 'por site e perfil'
  const tipo = item.intervalo ? `Imagens ${item.intervalo}` : 'Imagens'
  const tamanho = `${item.arquivos} ${item.arquivos === 1 ? 'arquivo' : 'arquivos'}`
  const ritmo = item.status === 'concluido' && item.concluidoEm ? tempoRelativo(item.concluidoEm) : null

  const situacao =
    item.status === 'baixando' ? (
      <span>
        <span className="num n-tabela st-vivo">{item.arquivos}</span>
        <span className="st-fila"> {item.arquivos === 1 ? 'baixada' : 'baixadas'}</span>
      </span>
    ) : item.status === 'concluido' ? (
      <span className="st-ok">Entregue</span>
    ) : item.status === 'erro' ? (
      <span className="st-erro">Falhou</span>
    ) : item.status === 'pausado' ? (
      <span className="st-fila">Pausado</span>
    ) : (
      <span className="st-fila">Na fila</span>
    )

  return (
    <>
      <tr className={`${zona}${item.erro ? ' com-detalhe' : ''}${chegouAgora(item.concluidoEm) ? ' chegou' : ''}`}>
        <td className="c-pos">
          <NumeroZona zona={zona} n={n} />
        </td>
        <td className="c-capa">
          <Mosaico amostras={item.amostras} />
        </td>
        <td className="c-titulo">
          <b className="selecionavel" title={item.url}>
            {nomeGaleria(item.url)}
          </b>
          <Meta
            base={[
              `${pastaCurta(item.pasta)} (${organizacao})`,
              item.pulados > 0 && `${item.pulados} já existiam`,
              item.falhas > 0 && <span className="erro-texto">{item.falhas} falharam</span>
            ]}
            tipo={tipo}
            tamanho={tamanho}
            ritmo={ritmo}
          />
        </td>
        <CelulaTipo tipo={tipo} />
        <td className="c-situacao">
          <Marcas zona={zona} correndo={item.status === 'baixando'} />
          {situacao}
        </td>
        <CelulasTempoTamanho ritmo={ritmo} tamanho={tamanho} />
        <td className="c-acoes">
          <div className="acoes-linha">
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
              leve
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
        </td>
      </tr>
      {item.erro && <LinhaDetalhe erro={item.erro} dica={item.dicaErro} falhou={item.status === 'erro'} />}
    </>
  )
}

function LinhaHistorico({ h, n, zona }: { h: EntradaHistorico; n: number; zona: Zona }) {
  const api = window.api
  const existe = zona === 'ok'
  const tipo = `${h.formato.toUpperCase()}${h.qualidade ? ` ${h.qualidade}` : ''}`
  return (
    <tr className={`${zona}${chegouAgora(h.baixadoEm) ? ' chegou' : ''}`}>
      <td className="c-pos">
        <NumeroZona zona={zona} n={n} />
      </td>
      <td className="c-capa">
        <Capa url={h.miniatura} audio={h.modo === 'audio'} />
      </td>
      <td className="c-titulo">
        <b className="selecionavel" title={h.titulo}>
          {h.titulo}
        </b>
        <Meta base={[h.site, h.canal, !existe && 'arquivo não encontrado']} tipo={tipo} tamanho={bytes(h.tamanho)} ritmo={tempoRelativo(h.baixadoEm)} />
      </td>
      <CelulaTipo tipo={tipo} />
      <td className="c-situacao">
        <Marcas zona={zona} />
        {existe ? <span className="st-ok">Entregue</span> : <span className="st-fila">Sumiu</span>}
      </td>
      <CelulasTempoTamanho ritmo={tempoRelativo(h.baixadoEm)} tamanho={bytes(h.tamanho)} />
      <td className="c-acoes">
        <div className="acoes-linha">
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
            leve
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
      </td>
    </tr>
  )
}

/** O cabeçalho das colunas, igual em todos os estados (também na primeira vez). */
function Cabecalho() {
  const c = useContext(ContextoColunas)
  return (
    <thead>
      <tr>
        <th className="c-pos">#</th>
        <th className="c-capa">
          <span className="so-leitor">Capa</span>
        </th>
        <th className="c-titulo">Título</th>
        {c.tipo && <th className="c-tipo">Tipo</th>}
        <th className="c-situacao">Situação</th>
        {c.tempo && <th className="c-tempo">Tempo</th>}
        {c.tamanho && <th className="c-tamanho">Tamanho</th>}
        <th className="c-acoes">
          <span className="so-leitor">Ações</span>
        </th>
      </tr>
    </thead>
  )
}

/** Primeira vez: a tabela já aparece, com o caminho em três passos como as primeiras linhas. */
function PrimeiraVez() {
  const c = useContext(ContextoColunas)
  const passos: Array<{ icone: typeof Copy; titulo: string; texto: string }> = [
    { icone: Copy, titulo: 'Copie o link', texto: 'do vídeo, da música, da playlist ou do perfil, no navegador.' },
    { icone: ClipboardPaste, titulo: 'Cole lá em cima', texto: 'ou aperte Ctrl+V em qualquer lugar do programa.' },
    { icone: ListChecks, titulo: 'Escolha e baixe', texto: 'o arquivo vai para a pasta Vídeos, Músicas ou Imagens e aparece aqui.' }
  ]
  return (
    <tbody className="primeira-vez">
      {passos.map(({ icone: Icone, titulo, texto }, i) => (
        <tr key={titulo}>
          <td className="c-pos">
            <span className="zona num n-tabela fila">{String(i + 1).padStart(2, '0')}</span>
          </td>
          <td className="c-capa">
            <span className="capa-linha passo" aria-hidden="true">
              <span className="vazia">
                <Icone />
              </span>
            </span>
          </td>
          <td className="c-titulo" colSpan={nColunas(c) - 2}>
            <b>{titulo}</b>
            <small>{texto}</small>
          </td>
        </tr>
      ))}
    </tbody>
  )
}

const VAZIOS: Record<AbaTabela, [string, string]> = {
  todos: ['Nada por aqui ainda', 'Cole um link lá em cima para começar.'],
  vivo: ['Nada baixando agora', 'O que estiver baixando aparece aqui e no placar.'],
  fila: ['Nada na fila', 'Use "Pôr na fila" na prévia para deixar um download esperando.'],
  concluidos: ['Nada baixado ainda', 'O que você baixar aparece aqui, com Abrir e Mostrar na pasta.'],
  falhas: ['Nenhuma falha', 'Quando um download der erro, ele aparece aqui com a dica do que fazer.']
}

export default function Tabela() {
  const { fila, historico, galeria, config, abaTabela: aba, verAba } = useEstado()
  const colunas = useColunas()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<Tipo>('todos')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [limite, setLimite] = useState(POR_PAGINA)
  const campoBusca = useRef<HTMLInputElement>(null)

  // "/" vai direto para a busca
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        campoBusca.current?.focus()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const registros = useMemo(() => {
    const ativos: Registro[] = []
    const erros: Registro[] = []
    for (const item of fila) {
      const zona = zonaDaFila(item.status)
      if (!zona) continue
      ;(zona === 'erro' ? erros : ativos).push({ chave: `f-${item.id}`, zona, de: 'fila', item })
    }
    const entregues: Registro[] = []
    for (const item of galeria) {
      const zona = zonaDaGaleria(item.status)
      const r: Registro = { chave: `g-${item.id}`, zona, de: 'galeria', item }
      if (zona === 'ok') entregues.push(r)
      else (zona === 'erro' ? erros : ativos).push(r)
    }
    for (const h of historico) entregues.push({ chave: `h-${h.id}`, zona: h.arquivoExiste === false ? 'sumiu' : 'ok', de: 'historico', item: h })
    // Ao vivo primeiro, depois a fila na ordem em que vai baixar
    ativos.sort((a, b) => (a.zona === b.zona ? 0 : a.zona === 'vivo' ? -1 : 1))
    return { ativos, erros, entregues }
  }, [fila, galeria, historico])

  const contagem = useMemo(() => {
    const todos = [...registros.ativos, ...registros.erros, ...registros.entregues]
    const n = (zonas: Zona[]) => todos.filter((r) => zonas.includes(r.zona)).length
    return Object.fromEntries(ABAS.map((a) => [a.id, n(ZONAS_DA_ABA[a.id])])) as Record<AbaTabela, number>
  }, [registros])

  const termo = busca.trim().toLowerCase()
  const bate = (r: Registro) => ZONAS_DA_ABA[aba].includes(r.zona) && (tipo === 'todos' || tipoDe(r) === tipo) && (!termo || textoDe(r).toLowerCase().includes(termo))

  const entreguesOrdenados = useMemo(() => {
    const lista = [...registros.entregues]
    if (ordem === 'recentes') lista.sort((a, b) => quandoChegou(b) - quandoChegou(a))
    else if (ordem === 'antigos') lista.sort((a, b) => quandoChegou(a) - quandoChegou(b))
    else if (ordem === 'nome') lista.sort((a, b) => textoDe(a).localeCompare(textoDe(b), 'pt-BR'))
    else lista.sort((a, b) => tamanhoDe(b) - tamanhoDe(a))
    return lista
  }, [registros.entregues, ordem])

  const visiveisAtivos = [...registros.ativos, ...registros.erros].filter(bate)
  const todosEntregues = entreguesOrdenados.filter(bate)
  const visiveisEntregues = todosEntregues.slice(0, limite)
  const visiveis = [...visiveisAtivos, ...visiveisEntregues]
  const totalFiltrado = visiveisAtivos.length + todosEntregues.length

  const baixando = fila.filter((i) => i.status === 'baixando' || i.status === 'processando').length + galeria.filter((g) => g.status === 'baixando').length
  const pendentes = fila.filter((i) => i.status === 'pronto' || i.status === 'pausado').length
  const primeiraVez = !fila.some((i) => zonaDaFila(i.status)) && !galeria.length && !historico.length

  const somaBytes = [...visiveisAtivos, ...todosEntregues].reduce((t, r) => t + tamanhoDe(r), 0)
  const somaSegundos = [...visiveisAtivos, ...todosEntregues].reduce((t, r) => t + duracaoDe(r), 0)
  const falhasFila = fila.filter((i) => i.status === 'erro').map((i) => i.id)
  const falhasGaleria = galeria.filter((g) => g.status === 'erro').map((g) => g.id)

  return (
    <ContextoColunas.Provider value={colunas}>
      <section className="secao-tabela" aria-label="Seus downloads">
        <div className="ferramentas-tabela">
          <div className="abas-tabela" role="tablist" aria-label="Situação">
            {ABAS.map((a) => (
              <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => (verAba(a.id), setLimite(POR_PAGINA))}>
                {a.nome}
                <em className={a.id === 'falhas' && contagem.falhas > 0 ? 'alerta' : ''}>{contagem[a.id]}</em>
              </button>
            ))}
          </div>
          {!primeiraVez && (
            <div className="ferramentas-direita">
              {!baixando && pendentes > 0 && (
                <button className="btn pequeno" title={`Baixar a fila (${pendentes})`} onClick={() => window.api.iniciarFila()}>
                  <Play className="amarelo" />
                  <span className="so-largo">Baixar a fila</span> ({pendentes})
                </button>
              )}
              {aba === 'concluidos' && contagem.concluidos > 0 && (
                <button className="btn pequeno fantasma" title="Só limpa a lista; os arquivos continuam no disco" onClick={() => (window.api.limparHistorico(), window.api.limparGaleriaConcluidos())}>
                  <Trash2 /> <span className="so-largo">Limpar a lista</span>
                </button>
              )}
              {aba === 'falhas' && contagem.falhas > 0 && (
                <button className="btn pequeno fantasma" title="Remover todas as falhas" onClick={() => (window.api.remover(falhasFila), window.api.removerGaleria(falhasGaleria))}>
                  <Trash2 /> <span className="so-largo">Remover todas</span>
                </button>
              )}
              <div className="busca recolhe">
                <Search />
                <input ref={campoBusca} placeholder="Buscar" aria-label="Buscar nos downloads (atalho: /)" title="Buscar nos downloads (atalho: /)" value={busca} onChange={(e) => (setBusca(e.target.value), setLimite(POR_PAGINA))} />
                {busca && (
                  <button className="icone-btn leve limpar" title="Limpar a busca" onClick={() => setBusca('')}>
                    <X />
                  </button>
                )}
              </div>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} aria-label="Tipo" title="Tipo">
                <option value="todos">Todos os tipos</option>
                <option value="video">Vídeos</option>
                <option value="audio">Áudios</option>
                <option value="imagens">Imagens</option>
              </select>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordem dos concluídos" title="Ordem dos concluídos (o que está na fila segue a ordem da fila)">
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="nome">Nome (A–Z)</option>
                <option value="maiores">Maiores</option>
              </select>
              <button className="icone-btn leve" title="Abrir a pasta de downloads" onClick={() => window.api.abrirPasta(config!.pastaVideo)}>
                <FolderOpen />
              </button>
            </div>
          )}
        </div>

        {primeiraVez ? (
          <>
            <table className="quadro">
              <Cabecalho />
              <PrimeiraVez />
            </table>
            <p className="nota-tabela">
              YouTube, TikTok, Instagram, X, Twitch, SoundCloud e mais de 1.800 sites. <b>Shift+Enter</b> no campo junta vários links de uma vez.
            </p>
          </>
        ) : visiveis.length ? (
          <>
            <table className="quadro">
              <Cabecalho />
              <tbody>
                {visiveis.map((r, i) =>
                  r.de === 'fila' ? (
                    <LinhaFila key={r.chave} item={r.item} n={i + 1} zona={r.zona} />
                  ) : r.de === 'galeria' ? (
                    <LinhaGaleria key={r.chave} item={r.item} n={i + 1} zona={r.zona} />
                  ) : (
                    <LinhaHistorico key={r.chave} h={r.item} n={i + 1} zona={r.zona} />
                  )
                )}
              </tbody>
            </table>
            {todosEntregues.length > visiveisEntregues.length && (
              <button className="btn pequeno mostrar-mais" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Mostrar mais {Math.min(POR_PAGINA, todosEntregues.length - visiveisEntregues.length)} de {todosEntregues.length - visiveisEntregues.length}
              </button>
            )}
            <div className="totais">
              <span>
                <b>{totalFiltrado}</b> {totalFiltrado === 1 ? 'download' : 'downloads'}
              </span>
              {somaSegundos > 0 && (
                <span>
                  <b>{tempoTotal(somaSegundos)}</b> de vídeo e áudio
                </span>
              )}
              {somaBytes > 0 && (
                <span>
                  <b>{bytes(somaBytes)}</b>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="vazio compacto">
            {termo || tipo !== 'todos' ? <Search /> : <Inbox />}
            <strong>{termo || tipo !== 'todos' ? 'Nada com esse filtro' : VAZIOS[aba][0]}</strong>
            <span>{termo || tipo !== 'todos' ? 'Mude a busca ou o tipo.' : VAZIOS[aba][1]}</span>
          </div>
        )}
      </section>
    </ContextoColunas.Provider>
  )
}
