// A grade compartilhada do placar e da tabela: as mesmas colunas, nos mesmos lugares. A janela estreita perde colunas
// inteiras (a informação delas desce para a linha de baixo), nunca aperta. Os cortes batem com os do estilos.css.
import { useEffect, useMemo, useState } from 'react'

/** Colunas que podem sair: Tipo primeiro, depois Tamanho (com a velocidade do placar), depois Tempo. */
export interface Colunas {
  tipo: boolean
  tamanho: boolean
  tempo: boolean
}

export const CORTES = { tipo: 1400, tamanho: 1180, tempo: 1060 } as const

export function useColunas(): Colunas {
  const [largura, setLargura] = useState(() => window.innerWidth)
  useEffect(() => {
    const mudar = () => setLargura(window.innerWidth)
    window.addEventListener('resize', mudar)
    return () => window.removeEventListener('resize', mudar)
  }, [])
  return useMemo(() => ({ tipo: largura >= CORTES.tipo, tamanho: largura >= CORTES.tamanho, tempo: largura >= CORTES.tempo }), [largura])
}

/** Quantas colunas a tabela tem agora: #, capa, título, situação e ações, mais as opcionais que cabem. */
export const nColunas = (c: Colunas) => 5 + Number(c.tipo) + Number(c.tamanho) + Number(c.tempo)
