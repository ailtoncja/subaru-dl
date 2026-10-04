import { ClipboardPaste, Download, FileText, FolderOpen, Inbox, Link2, ListPlus, Lightbulb, Pause, Play, Trash2, X, Zap } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import type { ItemFila as TItem, StatusItem } from '@shared/tipos'
import { OPCOES_BITRATE, OPCOES_CONTAINER, OPCOES_FORMATO_AUDIO, OPCOES_MODO, OPCOES_QUALIDADE } from '../componentes/EditorOpcoes'
import { Dialogo, Segmentado, Selecao } from '../componentes/ui'
import { adicionarLinks, avisar, salvarConfig, useEstado } from '../estado'
import ItemFila from './ItemFila'

type Filtro = 'todos' | 'ativos' | 'concluidos' | 'erros'

const FILTROS: Record<Filtro, (s: StatusItem) => boolean> = {
  todos: () => true,
  ativos: (s) => ['buscando', 'pronto', 'baixando', 'processando', 'pausado', 'aguardando-nova-tentativa'].includes(s),
  concluidos: (s) => s === 'concluido',
  erros: (s) => s === 'erro'
}

const extrairLinks = (texto: string): string[] => texto.match(/https?:\/\/[^\s"'<>]+/gi) ?? []

export default function Downloads() {
  const { fila, config } = useEstado()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [guia, setGuia] = useState(!config!.guiaVisto)
  const visiveis = useMemo(() => fila.filter((i) => FILTROS[filtro](i.status)), [fila, filtro])

  const contagem = (f: Filtro) => fila.filter((i) => FILTROS[f](i.status)).length
  const rodando = fila.some((i) => i.status === 'baixando' || i.status === 'processando')
  const temPendentes = fila.some((i) => ['pronto', 'pausado'].includes(i.status))

  const fecharGuia = () => {
    setGuia(false)
    if (!config!.guiaVisto) void salvarConfig({ guiaVisto: true })
  }

  return (
    <>
      <div className="cabecalho">
        <h1>Downloads</h1>
        <button className="btn fantasma" onClick={() => setGuia(true)}>
          <Lightbulb /> Dicas
        </button>
      </div>
      <div className="pagina">
        <EntradaLinks />

        <div className="barra-fila">
          <h2>Fila</h2>
          <Segmentado
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'todos', nome: `Todos ${contagem('todos')}` },
              { valor: 'ativos', nome: `Ativos ${contagem('ativos')}` },
              { valor: 'concluidos', nome: `Concluídos ${contagem('concluidos')}` },
              { valor: 'erros', nome: `Com erro ${contagem('erros')}` }
            ]}
          />
          <div className="flex-1" />
          {contagem('concluidos') > 0 && (
            <button className="btn fantasma" onClick={() => window.api.limparConcluidos()}>
              <Trash2 /> Limpar concluídos
            </button>
          )}
          {rodando && (
            <button className="btn" onClick={() => window.api.pausarTodos()}>
              <Pause /> Pausar tudo
            </button>
          )}
          <button className="btn amarelo" disabled={!temPendentes} onClick={() => window.api.iniciarFila()}>
            <Play /> Baixar tudo
          </button>
        </div>

        {visiveis.length ? (
          <div className="lista-fila">
            {visiveis.map((item: TItem) => (
              <ItemFila key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="vazio">
            <Inbox />
            <strong>{fila.length ? 'Nada nesse filtro' : 'A fila está vazia'}</strong>
            <span>{fila.length ? '' : 'Cole um link acima, arraste um .txt com links ou copie um link no navegador.'}</span>
          </div>
        )}
      </div>
      {guia && <GuiaRapido aoFechar={fecharGuia} />}
    </>
  )
}

function EntradaLinks() {
  const { config, linkCopiado } = useEstado()
  const [multiplos, setMultiplos] = useState(false)
  const [texto, setTexto] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const c = config!
  const p = c.padrao
  const links = extrairLinks(texto)

  const enviar = async (iniciar: boolean, lista = links) => {
    if (!lista.length) return avisar('Cole pelo menos um link (começando com http)', 'erro')
    const n = await adicionarLinks(lista, iniciar)
    if (n) {
      setTexto('')
      avisar(n === 1 ? 'Adicionado à fila' : `${n} links adicionados à fila`)
    }
  }

  const colar = async () => {
    const conteudo = await navigator.clipboard.readText()
    const encontrados = extrairLinks(conteudo)
    if (encontrados.length > 1) setMultiplos(true)
    setTexto((t) => (multiplos || encontrados.length > 1 ? [t, ...encontrados].filter(Boolean).join('\n') : encontrados[0] ?? conteudo))
  }

  const importar = async () => {
    const linhas = await window.api.lerArquivoLinks()
    const encontrados = linhas.flatMap(extrairLinks)
    if (!encontrados.length) return linhas.length && avisar('Nenhum link encontrado no arquivo', 'erro')
    setMultiplos(true)
    setTexto(encontrados.join('\n'))
  }

  // Arrastar e soltar: links (do navegador) ou arquivos .txt (item 3)
  const soltar = async (e: DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const encontrados: string[] = []
    for (const arquivo of Array.from(e.dataTransfer.files)) {
      if (/\.(txt|csv|list)$/i.test(arquivo.name)) encontrados.push(...extrairLinks(await arquivo.text()))
    }
    encontrados.push(...extrairLinks(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')))
    if (!encontrados.length) return avisar('Nada para adicionar no que foi solto', 'erro')
    await enviar(false, [...new Set(encontrados)])
  }

  const mudarPadrao = (parcial: Partial<typeof p>) => salvarConfig({ padrao: { ...p, ...parcial } })

  return (
    <div
      className={`entrada${arrastando ? ' arrastando' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={soltar}
    >
      <div className="topo">
        <Segmentado
          valor={multiplos ? 'varios' : 'um'}
          aoMudar={(v) => setMultiplos(v === 'varios')}
          opcoes={[
            { valor: 'um', nome: 'Um link' },
            { valor: 'varios', nome: 'Vários links' }
          ]}
        />
        <div className="flex-1" />
        <button className="btn fantasma pequeno" onClick={colar}>
          <ClipboardPaste /> Colar
        </button>
        <button className="btn fantasma pequeno" onClick={importar}>
          <FileText /> Importar .txt
        </button>
      </div>

      {multiplos ? (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={'Um link por linha\nhttps://www.youtube.com/watch?v=…\nhttps://www.tiktok.com/…'}
        />
      ) : (
        <div className="caixa-link">
          <Link2 />
          <input
            value={texto}
            autoFocus
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void enviar(e.ctrlKey)}
            placeholder="Cole o link do vídeo, playlist ou canal (YouTube, TikTok, Instagram, Twitch…)"
          />
          {texto && (
            <button className="icone-btn" title="Limpar" onClick={() => setTexto('')}>
              <X />
            </button>
          )}
        </div>
      )}

      <div className="rapidas">
        <div className="grupo">
          <Segmentado valor={p.modo} opcoes={OPCOES_MODO} aoMudar={(modo) => mudarPadrao({ modo })} />
        </div>
        {p.modo === 'video' ? (
          <>
            <div className="grupo">
              Qualidade
              <Selecao valor={p.qualidade} opcoes={OPCOES_QUALIDADE} aoMudar={(qualidade) => mudarPadrao({ qualidade })} />
            </div>
            <div className="grupo">
              Formato
              <Selecao valor={p.container} opcoes={OPCOES_CONTAINER} aoMudar={(container) => mudarPadrao({ container })} />
            </div>
          </>
        ) : (
          <>
            <div className="grupo">
              Formato
              <Selecao valor={p.formatoAudio} opcoes={OPCOES_FORMATO_AUDIO} aoMudar={(formatoAudio) => mudarPadrao({ formatoAudio })} />
            </div>
            <div className="grupo">
              Qualidade
              <Selecao valor={p.bitrateAudio} opcoes={OPCOES_BITRATE} aoMudar={(bitrateAudio) => mudarPadrao({ bitrateAudio })} />
            </div>
          </>
        )}
        <button
          className="btn fantasma pequeno"
          title={p.modo === 'audio' ? c.pastaAudio : c.pastaVideo}
          onClick={async () => {
            const atual = p.modo === 'audio' ? c.pastaAudio : c.pastaVideo
            const pasta = await window.api.escolherPasta(atual)
            if (pasta) void salvarConfig(p.modo === 'audio' ? { pastaAudio: pasta } : { pastaVideo: pasta })
          }}
        >
          <FolderOpen />
          <span className="truncar" style={{ maxWidth: 220 }}>
            {(p.modo === 'audio' ? c.pastaAudio : c.pastaVideo).split(/[\\/]/).slice(-2).join('\\')}
          </span>
        </button>
        <div className="flex-1" />
        <button className="btn" onClick={() => enviar(false)} title="Adiciona e espera você clicar em Baixar tudo">
          <ListPlus /> Adicionar à fila
        </button>
        <button className="btn primario" onClick={() => enviar(true)} title="Ctrl+Enter">
          <Download /> Baixar agora
        </button>
      </div>

      {linkCopiado && (
        <div className="copiado">
          <ClipboardPaste />
          <span className="flex-1 truncar">
            Link copiado: <span className="muted">{linkCopiado}</span>
          </span>
          <button
            className="btn pequeno"
            onClick={() => {
              void enviar(false, [linkCopiado])
              useEstado.setState({ linkCopiado: null })
            }}
          >
            Adicionar
          </button>
          <button
            className="btn primario pequeno"
            onClick={() => {
              void enviar(true, [linkCopiado])
              useEstado.setState({ linkCopiado: null })
            }}
          >
            <Zap /> Baixar
          </button>
          <button className="icone-btn" title="Ignorar" onClick={() => useEstado.setState({ linkCopiado: null })}>
            <X />
          </button>
        </div>
      )}
    </div>
  )
}

/** Guia rápido de dicas (item 9). */
function GuiaRapido({ aoFechar }: { aoFechar: () => void }) {
  const dicas: Array<[string, string]> = [
    ['Copie e pronto', 'Com o monitor da área de transferência ligado, é só copiar um link no navegador: o Subaru DL oferece para baixar.'],
    ['Cada item tem as suas opções', 'Clique na engrenagem de um item da fila para mudar qualidade, legendas, trecho ou escolher os vídeos de uma playlist só para ele.'],
    ['4K e 8K', 'Muitos sites só oferecem H.264 até 1080p. Para 2K/4K/8K, deixe o codec em Automático (ou VP9/AV1).'],
    ['FPS muda a qualidade', 'Limitar a 30 FPS economiza espaço, mas alguns vídeos só têm 30 FPS em resoluções menores.'],
    ['Vídeos com login', 'Para vídeos com restrição de idade, privados ou de membros, ative os cookies do navegador em Configurações → Rede e login.'],
    ['Deu erro?', 'Abra Dependências e atualize o yt-dlp: os sites mudam o tempo todo. A página de Logs mostra o motivo de cada falha.'],
    ['Atalhos', 'Ctrl+Enter no campo de link já adiciona e começa a baixar. Atalhos globais podem ser ligados nas configurações.']
  ]
  return (
    <Dialogo titulo="Dicas rápidas" aoFechar={aoFechar} rodape={<button className="btn primario" onClick={aoFechar}>Entendi</button>}>
      <div className="cartao">
        {dicas.map(([titulo, texto]) => (
          <div className="linha" key={titulo}>
            <Lightbulb className="amarelo" width={18} />
            <div className="rotulo">
              <strong>{titulo}</strong>
              <small>{texto}</small>
            </div>
          </div>
        ))}
      </div>
    </Dialogo>
  )
}
