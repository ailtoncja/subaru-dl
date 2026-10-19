import { MoreHorizontal, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ItemMenu = { icone: LucideIcon; texto: string; acao: () => unknown; perigo?: boolean } | 'separador' | null | undefined | false

/**
 * Botão "⋯" com menu. O menu é desenhado direto no <body> com posição fixa,
 * então não é cortado pelo cartão nem empurra o layout.
 */
export function MenuAcoes({ itens, titulo = 'Mais ações', leve }: { itens: ItemMenu[]; titulo?: string; leve?: boolean }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pos) return
    const fechar = (e: Event) => {
      if (e.type === 'mousedown' && (menu.current?.contains(e.target as Node) || botao.current?.contains(e.target as Node))) return
      setPos(null)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    window.addEventListener('mousedown', fechar)
    window.addEventListener('resize', fechar)
    document.addEventListener('scroll', fechar, true)
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('mousedown', fechar)
      window.removeEventListener('resize', fechar)
      document.removeEventListener('scroll', fechar, true)
      window.removeEventListener('keydown', tecla)
    }
  }, [pos])

  // Se não couber embaixo, abre para cima
  useEffect(() => {
    if (!pos || !menu.current) return
    const r = menu.current.getBoundingClientRect()
    if (r.bottom > window.innerHeight - 8) {
      const b = botao.current!.getBoundingClientRect()
      setPos({ ...pos, top: Math.max(8, b.top - r.height - 6) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.right])

  const abrir = () => {
    if (pos) return setPos(null)
    const r = botao.current!.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  return (
    <>
      <button ref={botao} className={`icone-btn${leve ? ' leve' : ''}`} title={titulo} onClick={abrir}>
        <MoreHorizontal />
      </button>
      {pos &&
        createPortal(
          <div ref={menu} className="menu" style={{ top: pos.top, right: pos.right }}>
            {itens.filter(Boolean).map((item, i) =>
              item === 'separador' ? (
                <hr key={i} />
              ) : (
                item && (
                  <button
                    key={i}
                    className={item.perigo ? 'perigo' : ''}
                    onClick={() => {
                      setPos(null)
                      void item.acao()
                    }}
                  >
                    <item.icone /> {item.texto}
                  </button>
                )
              )
            )}
          </div>,
          document.body
        )}
    </>
  )
}

export function Interruptor({ ligado, aoMudar, desativado }: { ligado: boolean; aoMudar: (v: boolean) => void; desativado?: boolean }) {
  return (
    <span className="switch">
      <input type="checkbox" checked={ligado} disabled={desativado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="trilho" />
    </span>
  )
}

/** Linha com rótulo à esquerda e controle à direita (igual às listas das extensões). */
export function Linha({
  rotulo,
  dica,
  children,
  desativada,
  coluna
}: {
  rotulo: ReactNode
  dica?: ReactNode
  children?: ReactNode
  desativada?: boolean
  coluna?: boolean
}) {
  return (
    <div className={`linha${desativada ? ' desativada' : ''}${coluna ? ' coluna' : ''}`}>
      <div className="rotulo">
        {rotulo}
        {dica && <small>{dica}</small>}
      </div>
      {children}
    </div>
  )
}

/** Linha inteira clicável com um interruptor. */
export function LinhaInterruptor({
  rotulo,
  dica,
  ligado,
  aoMudar,
  desativado
}: {
  rotulo: ReactNode
  dica?: ReactNode
  ligado: boolean
  aoMudar: (v: boolean) => void
  desativado?: boolean
}) {
  return (
    <label className={`linha${desativado ? ' desativada' : ''}`}>
      <div className="rotulo">
        {rotulo}
        {dica && <small>{dica}</small>}
      </div>
      <Interruptor ligado={ligado} aoMudar={aoMudar} desativado={desativado} />
    </label>
  )
}

export function Secao({ titulo, children, id }: { titulo: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="secao" id={id}>
      <h3 className="rotulo-secao">{titulo}</h3>
      <div className="cartao">{children}</div>
    </section>
  )
}

export function Selecao<T extends string | number>({
  valor,
  opcoes,
  aoMudar,
  largura,
  desativado
}: {
  valor: T
  opcoes: ReadonlyArray<{ valor: T; nome: string }>
  aoMudar: (v: T) => void
  largura?: number
  desativado?: boolean
}) {
  return (
    <select
      value={String(valor)}
      disabled={desativado}
      style={largura ? { width: largura } : undefined}
      onChange={(e) => {
        const escolhida = opcoes.find((o) => String(o.valor) === e.target.value)
        if (escolhida) aoMudar(escolhida.valor)
      }}
    >
      {opcoes.map((o) => (
        <option key={String(o.valor)} value={String(o.valor)}>
          {o.nome}
        </option>
      ))}
    </select>
  )
}

export function Chips<T extends string | number>({
  valor,
  opcoes,
  aoMudar
}: {
  valor: T
  opcoes: ReadonlyArray<{ valor: T; nome: string; desativado?: boolean }>
  aoMudar: (v: T) => void
}) {
  return (
    <div className="chips">
      {opcoes.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          disabled={o.desativado}
          className={`chip${o.valor === valor ? ' ativo' : ''}`}
          onClick={() => aoMudar(o.valor)}
        >
          {o.nome}
        </button>
      ))}
    </div>
  )
}

export function Segmentado<T extends string>({
  valor,
  opcoes,
  aoMudar
}: {
  valor: T
  opcoes: ReadonlyArray<{ valor: T; nome: ReactNode }>
  aoMudar: (v: T) => void
}) {
  return (
    <div className="segmentado">
      {opcoes.map((o) => (
        <button key={o.valor} type="button" className={o.valor === valor ? 'ativo' : ''} onClick={() => aoMudar(o.valor)}>
          {o.nome}
        </button>
      ))}
    </div>
  )
}

export function Dialogo({
  titulo,
  aoFechar,
  children,
  rodape,
  largo
}: {
  titulo: ReactNode
  aoFechar: () => void
  children: ReactNode
  rodape?: ReactNode
  largo?: boolean
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  // Desenhado direto no <body>: nada em volta (célula de tabela, painel com rolagem) corta ou muda o texto do diálogo
  return createPortal(
    <div className="fundo-dialogo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`dialogo${largo ? ' largo' : ''}`} role="dialog">
        <header>
          <h2>{titulo}</h2>
          <button className="icone-btn leve" onClick={aoFechar} title="Fechar">
            <X />
          </button>
        </header>
        <div className="corpo-dialogo">{children}</div>
        {rodape && <footer>{rodape}</footer>}
      </div>
    </div>,
    document.body
  )
}

/** Lista editável de textos curtos (ex.: sites sem cookies, idiomas). */
export function Etiquetas({
  valores,
  aoMudar,
  placeholder
}: {
  valores: string[]
  aoMudar: (v: string[]) => void
  placeholder: string
}) {
  return (
    <div className="flex" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="etiquetas">
        {valores.map((v) => (
          <span className="etiqueta" key={v}>
            {v}
            <button title={`Remover ${v}`} onClick={() => aoMudar(valores.filter((x) => x !== v))}>
              <X />
            </button>
          </span>
        ))}
      </div>
      <input
        className="campo"
        style={{ width: 200 }}
        placeholder={placeholder}
        onKeyDown={(e) => {
          const alvo = e.currentTarget
          const valor = alvo.value.trim()
          if ((e.key === 'Enter' || e.key === ',') && valor) {
            e.preventDefault()
            if (!valores.includes(valor)) aoMudar([...valores, valor])
            alvo.value = ''
          }
        }}
      />
    </div>
  )
}
