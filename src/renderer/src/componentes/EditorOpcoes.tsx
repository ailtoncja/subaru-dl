// Editores das opções de download, usados nos padrões (Configurações) e nas preferências de cada item.
import { Music, Video } from 'lucide-react'
import { BITRATES, FORMATOS_AUDIO, QUALIDADES } from '@shared/formatos'
import { nomeIdioma } from '@shared/formatar'
import type { InfoMidia, OpcoesDownload } from '@shared/tipos'
import { Chips, Etiquetas, Linha, LinhaInterruptor, Segmentado, Selecao } from './ui'

type Mudar = (parcial: Partial<OpcoesDownload>) => void

export const OPCOES_MODO = [
  {
    valor: 'video' as const,
    nome: (
      <>
        <Video /> Vídeo
      </>
    )
  },
  {
    valor: 'audio' as const,
    nome: (
      <>
        <Music /> Áudio
      </>
    )
  }
]

export const OPCOES_QUALIDADE = QUALIDADES.map((q) => ({ valor: q.valor, nome: q.nome }))
export const OPCOES_CONTAINER = [
  { valor: 'mp4' as const, nome: 'MP4' },
  { valor: 'mkv' as const, nome: 'MKV' },
  { valor: 'webm' as const, nome: 'WebM' }
]
export const OPCOES_FORMATO_AUDIO = FORMATOS_AUDIO.map((f) => ({ valor: f.valor, nome: f.nome }))
export const OPCOES_BITRATE = BITRATES.map((b) => ({ valor: b, nome: b ? `${b} kbps` : 'Melhor' }))

const OPCOES_CODEC_VIDEO = [
  { valor: 'auto' as const, nome: 'Automático' },
  { valor: 'h264' as const, nome: 'H.264 (mais compatível)' },
  { valor: 'vp9' as const, nome: 'VP9' },
  { valor: 'av1' as const, nome: 'AV1 (menor arquivo)' }
]
const OPCOES_CODEC_AUDIO = [
  { valor: 'auto' as const, nome: 'Automático' },
  { valor: 'aac' as const, nome: 'AAC' },
  { valor: 'opus' as const, nome: 'Opus' }
]

export function EditorQualidade({ o, mudar, info }: { o: OpcoesDownload; mudar: Mudar; info?: InfoMidia | null }) {
  // Com a informação do vídeo, mostra só as qualidades que existem de verdade
  const alturas = new Set(info?.formatos.map((f) => f.altura ?? 0))
  const maior = Math.max(0, ...alturas)
  const qualidades = OPCOES_QUALIDADE.map((q) =>
    q.valor === 'melhor' || !info?.formatos.length || maior >= Number(q.valor) * 0.9 ? q : { ...q, nome: `${q.nome} (indisponível)` }
  )
  const idiomas = info?.idiomasAudio ?? []
  const semPerda = o.formatoAudio === 'wav' || o.formatoAudio === 'flac'

  return (
    <>
      <Linha rotulo="Tipo">
        <Segmentado valor={o.modo} opcoes={OPCOES_MODO} aoMudar={(modo) => mudar({ modo, formatoId: null })} />
      </Linha>
      {o.modo === 'video' ? (
        <>
          <Linha rotulo="Qualidade" dica="Se não existir, usa a mais próxima abaixo">
            <Selecao valor={o.qualidade} opcoes={qualidades} aoMudar={(qualidade) => mudar({ qualidade, formatoId: null })} largura={200} />
          </Linha>
          <Linha rotulo="Formato do arquivo" desativada={o.manterOriginal}>
            <Chips valor={o.container} opcoes={OPCOES_CONTAINER} aoMudar={(container) => mudar({ container })} />
          </Linha>
          <Linha
            rotulo="Codec de vídeo"
            dica={o.container === 'webm' && o.codecVideo === 'h264' ? 'WebM não aceita H.264: será usado VP9' : 'Preferência; usado quando existir'}
          >
            <Selecao valor={o.codecVideo} opcoes={OPCOES_CODEC_VIDEO} aoMudar={(codecVideo) => mudar({ codecVideo })} largura={200} />
          </Linha>
          <Linha rotulo="Codec de áudio">
            <Selecao valor={o.codecAudio} opcoes={OPCOES_CODEC_AUDIO} aoMudar={(codecAudio) => mudar({ codecAudio })} largura={200} />
          </Linha>
          <LinhaInterruptor
            rotulo="Limitar a 30 FPS"
            dica="Economiza espaço; alguns vídeos só têm 30 FPS em qualidade menor"
            ligado={o.ate30fps}
            aoMudar={(ate30fps) => mudar({ ate30fps })}
          />
        </>
      ) : (
        <>
          <Linha rotulo="Formato do áudio" desativada={o.manterOriginal}>
            <Chips valor={o.formatoAudio} opcoes={OPCOES_FORMATO_AUDIO} aoMudar={(formatoAudio) => mudar({ formatoAudio })} />
          </Linha>
          <Linha rotulo="Qualidade do áudio" dica={semPerda ? 'WAV e FLAC são sem perda' : undefined} desativada={o.manterOriginal || semPerda}>
            <Selecao valor={o.bitrateAudio} opcoes={OPCOES_BITRATE} aoMudar={(bitrateAudio) => mudar({ bitrateAudio })} largura={140} />
          </Linha>
          <Linha rotulo="Codec de origem preferido">
            <Selecao valor={o.codecAudio} opcoes={OPCOES_CODEC_AUDIO} aoMudar={(codecAudio) => mudar({ codecAudio })} largura={200} />
          </Linha>
        </>
      )}
      {(idiomas.length > 1 || !info) && (
        <Linha rotulo="Faixa de áudio" dica={info ? 'Vídeos dublados têm mais de uma faixa' : 'Código do idioma (ex.: pt, en). Vazio = padrão do vídeo'}>
          {info ? (
            <Selecao
              valor={o.idiomaAudio ?? ''}
              opcoes={[{ valor: '', nome: 'Padrão do vídeo' }, ...idiomas.map((i) => ({ valor: i, nome: nomeIdioma(i) }))]}
              aoMudar={(v) => mudar({ idiomaAudio: v || null })}
              largura={240}
            />
          ) : (
            <input
              className="campo"
              style={{ width: 120 }}
              value={o.idiomaAudio ?? ''}
              placeholder="padrão"
              onChange={(e) => mudar({ idiomaAudio: e.target.value.trim() || null })}
            />
          )}
        </Linha>
      )}
      <LinhaInterruptor
        rotulo="Manter os streams originais"
        dica="Não converte nem muda o formato: o arquivo sai como veio do site"
        ligado={o.manterOriginal}
        aoMudar={(manterOriginal) => mudar({ manterOriginal })}
      />
      {(!info || info.aoVivo) && (
        <LinhaInterruptor
          rotulo="Baixar lives desde o começo"
          dica="Em vez de começar do momento atual da transmissão"
          ligado={o.liveDoInicio}
          aoMudar={(liveDoInicio) => mudar({ liveDoInicio })}
        />
      )}
    </>
  )
}

const OPCOES_FORMATO_LEGENDA = [
  { valor: 'srt' as const, nome: 'SRT' },
  { valor: 'vtt' as const, nome: 'VTT' },
  { valor: 'ass' as const, nome: 'ASS' },
  { valor: 'ttml' as const, nome: 'TTML' },
  { valor: 'json3' as const, nome: 'JSON' }
]

export function EditorLegendas({ o, mudar, info }: { o: OpcoesDownload; mudar: Mudar; info?: InfoMidia | null }) {
  const l = o.legendas
  const mudarL = (parcial: Partial<OpcoesDownload['legendas']>) => mudar({ legendas: { ...l, ...parcial } })
  const disponiveis = info ? [...new Set([...info.legendas, ...(l.automaticas ? info.legendasAuto : [])])] : []

  if (o.modo === 'audio') {
    return <Linha rotulo={<span className="muted">Legendas não se aplicam a downloads só de áudio.</span>} />
  }

  return (
    <>
      <LinhaInterruptor rotulo="Baixar legendas" ligado={l.ativas} aoMudar={(ativas) => mudarL({ ativas })} />
      <LinhaInterruptor
        rotulo="Incluir legendas automáticas"
        dica="Geradas pelo site (ex.: YouTube) quando não há legenda do criador"
        ligado={l.automaticas}
        aoMudar={(automaticas) => mudarL({ automaticas })}
        desativado={!l.ativas}
      />
      <LinhaInterruptor rotulo="Todas as legendas disponíveis" ligado={l.todas} aoMudar={(todas) => mudarL({ todas })} desativado={!l.ativas} />
      {!l.todas && (
        <Linha rotulo="Idiomas" dica={info ? undefined : 'Códigos como pt, pt-BR, en. Enter para adicionar'} desativada={!l.ativas} coluna>
          {info ? (
            disponiveis.length ? (
              <div className="chips">
                {disponiveis.map((codigo) => {
                  const marcado = l.idiomas.includes(codigo)
                  return (
                    <button
                      key={codigo}
                      className={`chip${marcado ? ' ativo' : ''}`}
                      onClick={() => mudarL({ idiomas: marcado ? l.idiomas.filter((x) => x !== codigo) : [...l.idiomas, codigo] })}
                    >
                      {nomeIdioma(codigo)}
                      {!info.legendas.includes(codigo) && ' (auto)'}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className="muted pequeno">Esse vídeo não tem legendas{l.automaticas ? '' : ' do criador (tente ativar as automáticas)'}.</span>
            )
          ) : (
            <Etiquetas valores={l.idiomas} aoMudar={(idiomas) => mudarL({ idiomas })} placeholder="Adicionar idioma…" />
          )}
        </Linha>
      )}
      <Linha rotulo="Formato da legenda" desativada={!l.ativas}>
        <Chips valor={l.formato} opcoes={OPCOES_FORMATO_LEGENDA} aoMudar={(formato) => mudarL({ formato })} />
      </Linha>
      <LinhaInterruptor
        rotulo="Embutir no vídeo"
        dica="A legenda vira uma faixa dentro do MP4/MKV/WebM, em vez de arquivo separado"
        ligado={l.embutir}
        aoMudar={(embutir) => mudarL({ embutir })}
        desativado={!l.ativas}
      />
    </>
  )
}

const OPCOES_POS = [
  { valor: 'nenhum' as const, nome: 'Nenhum' },
  { valor: 'fps30' as const, nome: 'Recodificar para 30 FPS' },
  { valor: 'mp42' as const, nome: 'Marcar MP4 como mp42' },
  { valor: 'personalizado' as const, nome: 'Argumentos do ffmpeg…' }
]

export function EditorPosProcesso({ o, mudar }: { o: OpcoesDownload; mudar: Mudar }) {
  const recodifica = o.posProcesso === 'fps30' || (o.posProcesso === 'personalizado' && o.posProcessoModo === 'recodificar')
  return (
    <>
      <LinhaInterruptor
        rotulo="Embutir metadados"
        dica="Título, artista/canal e descrição dentro do arquivo"
        ligado={o.embutirMetadados}
        aoMudar={(embutirMetadados) => mudar({ embutirMetadados })}
      />
      <LinhaInterruptor
        rotulo="Embutir a capa"
        dica="Os players mostram a miniatura como capa (não funciona em WebM e WAV)"
        ligado={o.embutirCapa}
        aoMudar={(embutirCapa) => mudar({ embutirCapa })}
      />
      <LinhaInterruptor
        rotulo="Salvar a miniatura como arquivo"
        dica="Grava um .jpg ao lado do vídeo"
        ligado={o.salvarMiniatura}
        aoMudar={(salvarMiniatura) => mudar({ salvarMiniatura })}
      />
      {o.modo === 'video' && (
        <>
          <Linha
            rotulo="Pós-processamento do vídeo"
            dica={recodifica ? 'Recodificar é pesado e pode demorar bastante' : o.posProcesso === 'mp42' && o.container !== 'mp4' ? 'Só vale para MP4' : undefined}
            desativada={o.manterOriginal}
          >
            <Selecao valor={o.posProcesso} opcoes={OPCOES_POS} aoMudar={(posProcesso) => mudar({ posProcesso })} largura={230} />
          </Linha>
          {o.posProcesso === 'personalizado' && !o.manterOriginal && (
            <Linha rotulo="Argumentos do ffmpeg" dica="Só para quem sabe o que está fazendo. Ex.: -c:v libx264 -crf 23" coluna>
              <div className="flex">
                <Selecao
                  valor={o.posProcessoModo}
                  opcoes={[
                    { valor: 'remux', nome: 'Ao converter o contêiner' },
                    { valor: 'recodificar', nome: 'Ao recodificar' }
                  ]}
                  aoMudar={(posProcessoModo) => mudar({ posProcessoModo })}
                  largura={220}
                />
                <input className="campo mono flex-1" value={o.posProcessoArgs} onChange={(e) => mudar({ posProcessoArgs: e.target.value })} />
              </div>
            </Linha>
          )}
        </>
      )}
    </>
  )
}
