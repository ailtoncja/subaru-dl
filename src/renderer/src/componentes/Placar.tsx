// O placar ao vivo: o download que está acontecendo agora, com porcentagem, tempo que falta e velocidade lidos como o
// relógio de uma partida. Fica preso embaixo do campo, à vista mesmo com Ajustes aberto, e usa a mesma grade da
// tabela: porcentagem sobre Situação, tempo sobre Tempo, velocidade sobre Tamanho, o outro jogo sobre Ações.
// Quando o último download chega, o placar fica dourado por alguns segundos ("Entregue") e depois sai.
import { Loader2, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bytes, duracao, velocidade } from '@shared/formatar'
import type { EntradaHistorico, ItemFila, ItemGaleria } from '@shared/tipos'
import { useEstado } from '../estado'
import { Capa, Mosaico, nomeGaleria, tipoDoItem } from './Capa'
import { useColunas, type Colunas } from './colunas'

type Jogo = { de: 'fila'; item: ItemFila } | { de: 'galeria'; item: ItemGaleria }

/** Quanto tempo o placar fica dourado depois que o último download chega. */
const APITO_MS = 4500

/** Ordem no placar: quem está baixando primeiro, depois quem junta/converte, depois quem ainda lê o link. */
const PRIORIDADE: Partial<Record<ItemFila['status'], number>> = { baixando: 0, processando: 1, buscando: 2 }

/** Os downloads ao vivo agora, na ordem do placar. */
export function jogosAoVivo(fila: ItemFila[], galeria: ItemGaleria[]): Jogo[] {
  return [
    ...fila
      .filter((i) => PRIORIDADE[i.status] !== undefined)
      .sort((a, b) => PRIORIDADE[a.status]! - PRIORIDADE[b.status]!)
      .map((item) => ({ de: 'fila' as const, item })),
    ...galeria.filter((g) => g.status === 'baixando').map((item) => ({ de: 'galeria' as const, item }))
  ]
}

/** Barra fina de progresso; sem porcentagem conhecida, um trecho corre de um lado ao outro. */
export function BarraTempo({ pct, correndo, rotulo, classe = '' }: { pct?: number; correndo?: boolean; rotulo: string; classe?: string }) {
  const valor = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <div
      className={`barra-tempo${correndo ? ' correndo' : ''} ${classe}`}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={correndo ? undefined : Math.round(valor)}
    >
      <i style={correndo ? undefined : { width: `${valor}%` }} />
    </div>
  )
}

function titulo(j: Jogo): string {
  return j.de === 'fila' ? (j.item.info?.titulo ?? j.item.url) : nomeGaleria(j.item.url)
}

/** As partes da linha de baixo, da mais importante para a menos: o que não cabe sai inteiro, nunca pela metade. */
function meta(j: Jogo): string[] {
  if (j.de === 'galeria') return ['Imagens', j.item.pulados > 0 ? `${j.item.pulados} já existiam` : null].filter((x): x is string => !!x)
  const { item } = j
  const p = item.progresso
  return [
    item.status === 'baixando' && p.total ? `${bytes(p.baixado)} de ${bytes(p.total)}` : null,
    p.itemAtual && p.itensTotal ? `${item.opcoes.modo === 'audio' ? 'faixa' : 'vídeo'} ${p.itemAtual} de ${p.itensTotal}` : null,
    tipoDoItem(item),
    item.info?.site ?? null
  ].filter((x): x is string => !!x)
}

/** Linha de partes que quebram inteiras: a que não cabe vai para uma segunda linha escondida. */
function Partes({ partes }: { partes: string[] }) {
  return (
    <p className="partes">
      {partes.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </p>
  )
}

/** "1,5 MB/s" → ["1,5", "MB por segundo"]: o número no tamanho do placar, a unidade escrita por extenso embaixo. */
function partesVelocidade(v: number): [string, string] {
  const m = velocidade(v).match(/^([\d.,]+)\s*([KMGT]?B)\/s$/i)
  return m ? [m[1], `${m[2]} por segundo`] : [velocidade(v), 'velocidade']
}

/** Uma célula de número do placar: o valor grande e o rótulo embaixo. */
function Celula({ classe, valor, rotulo, cor = '' }: { classe: string; valor: string; rotulo: string; cor?: string }) {
  return (
    <div className={`placar-celula ${classe}`}>
      <span className={`num n-placar ${cor}`}>{valor}</span>
      <small>{rotulo}</small>
    </div>
  )
}

/** As células de número para o download em foco, só as que cabem (as que saem descem para o rótulo da vizinha). */
function Numeros({ jogo, c }: { jogo: Jogo; c: Colunas }) {
  if (jogo.de === 'galeria' || jogo.item.status === 'buscando' || jogo.item.status === 'processando') {
    const texto = jogo.de === 'galeria' ? null : jogo.item.status === 'buscando' ? 'Lendo o link…' : `${jogo.item.progresso.etapa ?? 'Convertendo'}…`
    return (
      <>
        {jogo.de === 'galeria' ? (
          <Celula classe="c-pct" valor={String(jogo.item.arquivos)} rotulo={jogo.item.arquivos === 1 ? 'imagem baixada' : 'imagens baixadas'} cor="amarelo" />
        ) : (
          <div className="placar-celula c-pct etapa">
            <Loader2 className="girando" />
            <span>{texto}</span>
          </div>
        )}
        {c.tempo && <Celula classe="c-tempo" valor="–" rotulo="faltam" cor="dim" />}
        {c.tamanho && <Celula classe="c-vel" valor="–" rotulo="velocidade" cor="dim" />}
      </>
    )
  }
  const p = jogo.item.progresso
  const tempo = p.eta != null ? duracao(p.eta) : '–'
  const [vel, unidade] = p.velocidade != null ? partesVelocidade(p.velocidade) : ['–', 'velocidade']
  const velTexto = p.velocidade != null ? velocidade(p.velocidade) : null
  // O que sai de cena desce para o rótulo da célula vizinha
  const rotuloPct = ['baixado', !c.tempo && p.eta != null && `faltam ${tempo}`, !c.tamanho && !c.tempo && velTexto].filter(Boolean).join(' · ')
  const rotuloTempo = ['faltam', !c.tamanho && velTexto].filter(Boolean).join(' · ')
  return (
    <>
      <Celula classe="c-pct" valor={`${Math.floor(p.porcentagem)}%`} rotulo={rotuloPct} cor="amarelo" />
      {c.tempo && <Celula classe="c-tempo" valor={tempo} rotulo={rotuloTempo} />}
      {c.tamanho && <Celula classe="c-vel" valor={vel} rotulo={unidade} cor={p.velocidade == null ? 'dim' : ''} />}
    </>
  )
}

/** O outro jogo ao vivo, compacto, na coluna das ações. */
function OutroJogo({ jogo, restantes }: { jogo: Jogo | undefined; restantes: number }) {
  if (!jogo) {
    return (
      <div className="placar-outro vazio-outro">
        <small>Só este baixando</small>
      </div>
    )
  }
  const pct = jogo.de === 'fila' && jogo.item.status === 'baixando' ? `${Math.floor(jogo.item.progresso.porcentagem)}%` : jogo.de === 'galeria' ? String(jogo.item.arquivos) : null
  const estado =
    jogo.de === 'galeria'
      ? 'imagens'
      : jogo.item.status === 'baixando'
        ? jogo.item.progresso.eta != null
          ? `faltam ${duracao(jogo.item.progresso.eta)}`
          : 'baixando'
        : jogo.item.status === 'buscando'
          ? 'lendo o link'
          : 'finalizando'
  return (
    <div className="placar-outro">
      <div className="linha-outro">
        {pct && <span className="num n-detalhe amarelo">{pct}</span>}
        <small>{estado}</small>
      </div>
      <span className="titulo-outro" title={titulo(jogo)}>
        {titulo(jogo)}
      </span>
      {restantes > 0 && <small>e mais {restantes} ao vivo</small>}
    </div>
  )
}

/** "24,5 MB" → ["24,5", "MB no arquivo"] */
function partesTamanho(n: number): [string, string] {
  const m = bytes(n).match(/^([\d.,]+)\s*(\S+)$/)
  return m ? [m[1], `${m[2]} no arquivo`] : [bytes(n), 'no arquivo']
}

/** O apito final: o último que chegou, em dourado, por alguns segundos, com a duração e o tamanho do que chegou. */
function Apito({ h, c }: { h: EntradaHistorico; c: Colunas }) {
  const [tam, unidade] = partesTamanho(h.tamanho)
  const temDuracao = h.duracao != null && h.duracao > 0
  const deQue = h.modo === 'audio' ? 'de áudio' : 'de vídeo'
  // O que sai de cena desce para o rótulo da porcentagem, como no placar ao vivo
  const rotuloPct = ['chegou na pasta', !c.tempo && temDuracao && `${duracao(h.duracao)} ${deQue}`, !c.tamanho && bytes(h.tamanho)].filter(Boolean).join(' · ')
  return (
    <section className="placar final" aria-label="Entregue">
      <div className="placar-vivo">
        <span className="num n-detalhe">ENTREGUE</span>
        <small>{h.formato.toUpperCase()}</small>
      </div>
      <div className="placar-jogo">
        <Capa url={h.miniatura} audio={h.modo === 'audio'} classe="grande" />
        <div className="placar-texto">
          <strong title={h.titulo}>{h.titulo}</strong>
          <Partes partes={[h.site, h.canal].filter((x): x is string => !!x)} />
        </div>
      </div>
      <Celula classe="c-pct" valor="100%" rotulo={rotuloPct} cor="ouro" />
      {c.tempo && (temDuracao ? <Celula classe="c-tempo" valor={duracao(h.duracao)} rotulo={deQue} /> : <div className="placar-celula c-tempo" />)}
      {c.tamanho && <Celula classe="c-vel" valor={tam} rotulo={unidade} />}
      <div className="placar-outro acoes-final">
        <button className="btn pequeno" onClick={() => window.api.abrirArquivo(h.arquivo)}>
          <Play /> Abrir
        </button>
      </div>
      <BarraTempo pct={100} rotulo="Download entregue" classe="placar-tempo" />
    </section>
  )
}

export function Placar() {
  const fila = useEstado((s) => s.fila)
  const galeria = useEstado((s) => s.galeria)
  const historico = useEstado((s) => s.historico)
  const verAba = useEstado((s) => s.verAba)
  const c = useColunas()
  const [, redesenhar] = useState(0)
  const jogos = jogosAoVivo(fila, galeria)
  const recente = !jogos.length ? historico.find((h) => Date.now() - h.baixadoEm < APITO_MS && h.arquivoExiste !== false) : undefined

  // O apito sai sozinho quando o tempo acaba
  useEffect(() => {
    if (!recente) return
    const t = setTimeout(() => redesenhar((n) => n + 1), APITO_MS - (Date.now() - recente.baixadoEm) + 50)
    return () => clearTimeout(t)
  }, [recente])

  if (!jogos.length) return recente ? <Apito h={recente} c={c} /> : null

  const [atual, outro] = jogos
  const correndo = atual.de === 'galeria' || atual.item.status !== 'baixando'
  const pct = atual.de === 'fila' ? atual.item.progresso.porcentagem : 0

  return (
    <section className="placar" aria-label="Ao vivo">
      <div className="placar-vivo">
        <span className="num n-detalhe">
          <i className="pulso" aria-hidden="true" />
          AO VIVO
        </span>
        <button
          className="placar-contagem"
          title="Ver na tabela só o que está ao vivo"
          onClick={() => {
            verAba('vivo')
            document.querySelector('.secao-tabela')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {jogos.length} baixando
        </button>
        <button className="placar-pausar" onClick={() => window.api.pausarTodos()}>
          <Pause /> Pausar tudo
        </button>
      </div>

      <div className="placar-jogo">
        {atual.de === 'fila' ? <Capa url={atual.item.info?.miniatura} audio={atual.item.opcoes.modo === 'audio'} classe="grande" /> : <Mosaico amostras={atual.item.amostras} classe="grande" />}
        <div className="placar-texto">
          <strong className="selecionavel" title={titulo(atual)}>
            {titulo(atual)}
          </strong>
          <Partes partes={meta(atual)} />
        </div>
      </div>

      <Numeros jogo={atual} c={c} />
      <OutroJogo jogo={outro} restantes={jogos.length - 2} />

      <BarraTempo pct={pct} correndo={correndo} rotulo="Progresso do download ao vivo" classe="placar-tempo" />
    </section>
  )
}
