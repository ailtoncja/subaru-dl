import { AlertCircle, CheckCircle2, Copy, Download, History, Loader2, Minus, Settings, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { velocidade } from '@shared/formatar'
import icone from '../../../resources/icone.png'
import { DialogoDuplicados } from './componentes/DialogoDuplicados'
import { abrirNoInicio, avisar, extrairLinks, useEstado, type Pagina } from './estado'
import Ajustes from './paginas/Ajustes'
import Baixar from './paginas/Baixar'
import Downloads from './paginas/Downloads'
import { Faixa } from './paginas/ItemFila'

const PAGINAS: Array<{ id: Pagina; nome: string; icone: typeof Download }> = [
  { id: 'baixar', nome: 'Baixar', icone: Download },
  { id: 'downloads', nome: 'Downloads', icone: History },
  { id: 'ajustes', nome: 'Ajustes', icone: Settings }
]

/** Cola o link da área de transferência e abre na tela Baixar. */
async function colarUrl() {
  const link = extrairLinks(await window.api.lerClipboard())[0]
  if (link) abrirNoInicio(link)
  else avisar('Nenhum link na área de transferência', 'erro')
}

export default function App() {
  const { pagina, ir, irAjustes, fila, galeria, config, toasts, ferramentas } = useEstado()
  const [versao, setVersao] = useState('')
  const [maximizada, setMaximizada] = useState(false)

  useEffect(() => void window.api.versaoApp().then(setVersao), [])
  useEffect(() => window.api.aoMaximizar(setMaximizada), [])

  // Ctrl+V fora de um campo de texto cola o link direto na tela Baixar
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (!(e.ctrlKey && e.key.toLowerCase() === 'v') || /INPUT|TEXTAREA/.test(alvo.tagName)) return
      e.preventDefault()
      void colarUrl()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const ativos = fila.filter((i) => i.status === 'baixando' || i.status === 'processando')
  const galeriaAtivos = galeria.filter((i) => i.status === 'baixando')
  const falhas = fila.filter((i) => i.status === 'erro').length + galeria.filter((i) => i.status === 'erro').length
  const velocidadeTotal = ativos.reduce((t, i) => t + (i.progresso.velocidade ?? 0), 0)
  const rodando = ativos.length + galeriaAtivos.length
  // Progresso geral (só dos que já sabem o tamanho): a faixa no pé da barra de título
  const comTotal = ativos.filter((i) => i.progresso.total)
  const somaTotal = comTotal.reduce((t, i) => t + (i.progresso.total ?? 0), 0)
  const somaFeita = comTotal.reduce((t, i) => t + (i.progresso.baixado ?? 0), 0)
  const pctGeral = somaTotal ? (somaFeita / somaTotal) * 100 : 0
  const atualizando = ferramentas.some((f) => f.atualizando)
  const faltando = ferramentas.length > 0 && ferramentas.some((f) => !f.versao)

  if (!config) return null

  return (
    <div className="app">
      <header className="titulo-janela">
        <div className="logo">
          <img src={icone} alt="" />
          Subaru DL
        </div>
        {rodando > 0 && (
          <span className="estado-topo">
            <span className="ponto" />
            Baixando {rodando}
            {velocidadeTotal > 0 && ` · ${velocidade(velocidadeTotal)}`}
          </span>
        )}
        {rodando > 0 && <Faixa estado={pctGeral ? 'andando' : 'correndo'} pct={pctGeral} rotulo="Progresso geral dos downloads" />}
        <div className="controles-janela">
          <button title="Minimizar" onClick={() => window.api.janelaMinimizar()}>
            <Minus />
          </button>
          <button title={maximizada ? 'Restaurar' : 'Maximizar'} onClick={() => window.api.janelaMaximizar()}>
            {maximizada ? <Copy /> : <Square />}
          </button>
          <button className="fechar" title="Fechar" onClick={() => window.api.janelaFechar()}>
            <X />
          </button>
        </div>
      </header>

      <div className="corpo-app">
        <aside className="lateral">
          <nav className="nav" aria-label="Páginas">
            {PAGINAS.map(({ id, nome, icone: Icone }) => (
              <button key={id} className={pagina === id ? 'ativo' : ''} aria-current={pagina === id ? 'page' : undefined} onClick={() => ir(id)}>
                <Icone />
                {nome}
                {id === 'downloads' && rodando > 0 && <span className="contador">{rodando}</span>}
                {id === 'downloads' && !rodando && falhas > 0 && <span className="contador vermelho">{falhas}</span>}
              </button>
            ))}
          </nav>

          <div className="pe-lateral">
            <button onClick={() => irAjustes('ferramentas')} title="Ferramentas embutidas: yt-dlp, ffmpeg, gallery-dl…">
              {atualizando ? <Loader2 className="girando" /> : <span className={`ponto${faltando ? ' erro' : ''}`} />}
              {atualizando ? 'Atualizando ferramentas…' : faltando ? 'Falta uma ferramenta' : 'Ferramentas em dia'}
            </button>
            <span className="versao">Versão {versao}</span>
          </div>
        </aside>

        <main className="conteudo">
          {pagina === 'baixar' && <Baixar />}
          {pagina === 'downloads' && <Downloads />}
          {pagina === 'ajustes' && <Ajustes />}
        </main>
      </div>

      <DialogoDuplicados />

      <div className="toasts" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'erro' ? <AlertCircle /> : <CheckCircle2 />}
            {t.texto}
          </div>
        ))}
      </div>
    </div>
  )
}
