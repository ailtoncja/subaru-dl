// Playlists & Lote: vários links (vídeos, playlists, canais) de uma vez, com as mesmas opções para todos.
import { ClipboardPaste, Download, FileText, Info, ListPlus, Music, SlidersHorizontal, Video } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { BITRATES, FORMATOS_AUDIO, QUALIDADES } from '@shared/formatos'
import type { OpcoesDownload } from '@shared/tipos'
import { CampoPasta, SelecaoOrganizar } from '../componentes/Destino'
import OpcoesAvancadas from '../componentes/OpcoesAvancadas'
import { Linha } from '../componentes/ui'
import { adicionarLinks, avisar, extrairLinks, useEstado } from '../estado'

export default function Playlists() {
  const config = useEstado((s) => s.config)!
  const [texto, setTexto] = useState('')
  const [arrastando, setArrastando] = useState(false)
  // Em lote, organizar por playlist costuma ser o mais útil
  const [opcoes, setOpcoes] = useState<OpcoesDownload>(() => ({
    ...structuredClone(config.padrao),
    subpasta: config.padrao.subpasta === 'nenhuma' ? 'playlist' : config.padrao.subpasta
  }))
  const [avancado, setAvancado] = useState(false)
  const links = [...new Set(extrairLinks(texto))]
  const mudar = (p: Partial<OpcoesDownload>) => setOpcoes((o) => ({ ...o, ...p }))

  const enviar = async (iniciar: boolean) => {
    if (!links.length) return avisar('Cole pelo menos um link', 'erro')
    const n = await adicionarLinks(links, iniciar, opcoes)
    if (n) {
      setTexto('')
      avisar(`${n} link(s) na fila`)
      useEstado.getState().ir('downloads')
    }
  }

  const soltar = async (e: DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const achados: string[] = []
    for (const arquivo of Array.from(e.dataTransfer.files)) {
      if (/\.(txt|csv|list)$/i.test(arquivo.name)) achados.push(...extrairLinks(await arquivo.text()))
    }
    achados.push(...extrairLinks(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')))
    if (achados.length) setTexto((t) => [t.trim(), ...achados].filter(Boolean).join('\n'))
  }

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>
          Playlists & Lote <span className="sub">vários links de uma vez, com as mesmas opções</span>
        </h1>
      </div>

      <div
        className="cartao recheado"
        style={arrastando ? { borderColor: 'var(--amarelo)' } : undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        <div className="flex" style={{ marginBottom: 10 }}>
          <span className="muted pequeno flex-1">Um link por linha: vídeos, playlists ou canais. Também dá para arrastar um .txt aqui.</span>
          <button
            className="btn fantasma pequeno"
            onClick={async () => {
              const achados = extrairLinks(await window.api.lerClipboard())
              if (achados.length) setTexto((t) => [t.trim(), ...achados].filter(Boolean).join('\n'))
              else avisar('Nenhum link na área de transferência', 'erro')
            }}
          >
            <ClipboardPaste /> Colar
          </button>
          <button
            className="btn fantasma pequeno"
            onClick={async () => {
              const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
              if (achados.length) setTexto((t) => [t.trim(), ...achados].filter(Boolean).join('\n'))
            }}
          >
            <FileText /> Importar .txt
          </button>
        </div>
        <textarea className="mono" style={{ minHeight: 170 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'https://www.youtube.com/playlist?list=…\nhttps://www.youtube.com/@canal/videos\nhttps://www.tiktok.com/@perfil/video/…'} />
      </div>

      <div className="secao">
        <h3 className="rotulo-secao">Opções para todos</h3>
        <div className="cartao">
          <Linha rotulo="Tipo">
            <div className="segmentado">
              <button className={opcoes.modo === 'video' ? 'ativo' : ''} onClick={() => mudar({ modo: 'video' })}>
                <Video /> Vídeo
              </button>
              <button className={opcoes.modo === 'audio' ? 'ativo' : ''} onClick={() => mudar({ modo: 'audio' })}>
                <Music /> Áudio
              </button>
            </div>
          </Linha>
          {opcoes.modo === 'video' ? (
            <Linha rotulo="Qualidade" dica="Se não existir, usa a mais próxima abaixo">
              <select value={opcoes.qualidade} onChange={(e) => mudar({ qualidade: e.target.value as OpcoesDownload['qualidade'] })}>
                {QUALIDADES.map((q) => (
                  <option key={q.valor} value={q.valor}>
                    {q.nome}
                  </option>
                ))}
              </select>
              <select value={opcoes.container} onChange={(e) => mudar({ container: e.target.value as OpcoesDownload['container'] })}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </Linha>
          ) : (
            <Linha rotulo="Qualidade">
              <select value={opcoes.bitrateAudio} onChange={(e) => mudar({ bitrateAudio: Number(e.target.value) })}>
                {BITRATES.map((b) => (
                  <option key={b} value={b}>
                    {b ? `${b} kbps` : 'Melhor qualidade'}
                  </option>
                ))}
              </select>
              <select value={opcoes.formatoAudio} onChange={(e) => mudar({ formatoAudio: e.target.value as OpcoesDownload['formatoAudio'] })}>
                {FORMATOS_AUDIO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Linha>
          )}
          <Linha rotulo="Salvar em">
            <CampoPasta pasta={opcoes.pasta} modo={opcoes.modo} aoMudar={(pasta) => mudar({ pasta })} semRotulo />
          </Linha>
          <Linha rotulo="Organizar em subpastas" dica="Cada playlist ou canal na sua própria pasta" coluna={opcoes.subpasta === 'personalizado'}>
            <SelecaoOrganizar o={opcoes} mudar={mudar} />
          </Linha>
          {opcoes.modo === 'video' && (
            <label className="linha">
              <div className="rotulo">
                Baixar legendas
                <small>Idiomas: {config.padrao.legendas.idiomas.join(', ') || 'todos'} (mude em Configurações)</small>
              </div>
              <input type="checkbox" checked={opcoes.legendas.ativas} onChange={(e) => mudar({ legendas: { ...opcoes.legendas, ativas: e.target.checked } })} />
            </label>
          )}
          <Linha rotulo="Mais opções" dica="Codec, FPS, pós-processamento…">
            <button className="btn pequeno" onClick={() => setAvancado(true)}>
              <SlidersHorizontal /> Opções avançadas
            </button>
          </Linha>
        </div>
      </div>

      <div className="aviso-azul">
        <Info />
        <span className="flex-1">
          Para escolher só alguns vídeos de uma playlist, cole o link dela na tela <b>Início</b>.
        </span>
      </div>

      <div className="flex" style={{ justifyContent: 'flex-end' }}>
        <span className="muted mono pequeno flex-1">{links.length ? `${links.length} link(s)` : ''}</span>
        <button className="btn" disabled={!links.length} onClick={() => enviar(false)}>
          <ListPlus /> Adicionar à fila
        </button>
        <button className="btn primario grande" disabled={!links.length} onClick={() => enviar(true)}>
          <Download /> Baixar tudo
        </button>
      </div>

      {avancado && <OpcoesAvancadas titulo="Opções avançadas (para todos)" info={null} opcoes={opcoes} mudar={mudar} aoFechar={() => setAvancado(false)} />}
    </div>
  )
}
