import { AlertCircle, CheckCircle2, Copy, Loader2, Minus, Settings, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import icone from '../../../resources/icone.png'
import { DialogoDuplicados } from './componentes/DialogoDuplicados'
import { abrirNoInicio, avisar, extrairLinks, useEstado } from './estado'
import Principal from './paginas/Principal'

/** Cola o link da área de transferência e abre no campo. */
async function colarUrl() {
  const link = extrairLinks(await window.api.lerClipboard())[0]
  if (link) abrirNoInicio(link)
  else avisar('Nenhum link na área de transferência', 'erro')
}

export default function App() {
  const { config, toasts, ferramentas, ajustesAberto, abaAjustes, irAjustes, fecharAjustes } = useEstado()
  const [maximizada, setMaximizada] = useState(false)

  useEffect(() => window.api.aoMaximizar(setMaximizada), [])

  // Ctrl+V fora de um campo de texto cola o link direto no campo
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
        <div className="titulo-direita">
          <button className="saude" onClick={() => irAjustes('ferramentas')} title="Ferramentas embutidas: yt-dlp, ffmpeg, gallery-dl…">
            {atualizando ? <Loader2 className="girando" /> : <span className={`ponto${faltando ? ' erro' : ''}`} />}
            {atualizando ? 'Atualizando ferramentas…' : faltando ? 'Falta uma ferramenta' : 'Ferramentas em dia'}
          </button>
          <button className={`btn-titulo${ajustesAberto ? ' ativo' : ''}`} aria-expanded={ajustesAberto} onClick={() => (ajustesAberto ? fecharAjustes() : irAjustes(abaAjustes))}>
            <Settings /> Ajustes
          </button>
        </div>
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

      <Principal />

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
