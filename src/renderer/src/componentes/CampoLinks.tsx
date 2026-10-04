// Campo de links: Enter envia; Shift+Enter manda o link para a lista e deixa o campo livre para o próximo.
import { useEffect, useLayoutEffect, useRef, type ClipboardEvent } from 'react'

export function CampoLinks({
  valor,
  aoMudar,
  aoEnviar,
  aoAcrescentar,
  aoColar,
  placeholder,
  autoFocus
}: {
  valor: string
  aoMudar: (texto: string) => void
  aoEnviar: () => void
  /** Shift+Enter: guarda o que está no campo na lista */
  aoAcrescentar: () => void
  aoColar?: (e: ClipboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Cresce junto com as linhas (até o limite do CSS, depois rola)
  const ajustar = () => {
    const t = ref.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${t.scrollHeight}px`
  }
  useLayoutEffect(ajustar, [valor])

  // A largura muda com a janela (e no primeiro desenho): links longos quebram em mais ou menos linhas
  useEffect(() => {
    const t = ref.current
    if (!t) return
    let largura = t.offsetWidth
    const obs = new ResizeObserver(() => {
      if (t.offsetWidth === largura) return
      largura = t.offsetWidth
      ajustar()
    })
    obs.observe(t)
    ajustar()
    return () => obs.disconnect()
  }, [])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      autoFocus={autoFocus}
      spellCheck={false}
      placeholder={placeholder}
      onChange={(e) => aoMudar(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
        e.preventDefault()
        if (e.shiftKey) aoAcrescentar()
        else aoEnviar()
      }}
      onPaste={aoColar}
    />
  )
}
