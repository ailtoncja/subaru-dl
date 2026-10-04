// Escolha de legenda por vídeo: junta as legendas reais do vídeo e as automáticas numa lista só.
import { nomeIdioma } from './formatar'
import type { OpcoesLegendas } from './tipos'

export interface OpcaoLegenda {
  /** "m:pt" = legenda do vídeo, "a:pt" = automática */
  valor: string
  nome: string
}

const nome = (codigo: string) => nomeIdioma(codigo).split(' · ')[0]

/** Português primeiro, o resto em ordem alfabética. */
function ordenar(codigos: string[]): string[] {
  const peso = (c: string) => (c.endsWith('-orig') ? 0 : /^pt(-|$)/.test(c) ? 1 : c === 'en' ? 2 : 3)
  return [...codigos].sort((a, b) => peso(a) - peso(b) || nome(a).localeCompare(nome(b), 'pt-BR'))
}

export function opcoesLegenda(manuais: string[], automaticas: string[]): { manuais: OpcaoLegenda[]; automaticas: OpcaoLegenda[] } {
  return {
    manuais: ordenar(manuais).map((c) => ({ valor: `m:${c}`, nome: nome(c) })),
    automaticas: ordenar(automaticas).map((c) => ({ valor: `a:${c}`, nome: nome(c) }))
  }
}

/** O que está escolhido agora: '' (nenhuma), "m:xx", "a:xx" ou 'padrao' (várias, vindas das configurações). */
export function valorLegenda(l: OpcoesLegendas): string {
  if (!l.ativas) return ''
  if (!l.todas && l.idiomas.length === 1) return `${l.automaticas ? 'a' : 'm'}:${l.idiomas[0]}`
  return 'padrao'
}

export function aplicarLegenda(l: OpcoesLegendas, valor: string): OpcoesLegendas {
  if (valor === '') return { ...l, ativas: false }
  if (valor === 'padrao') return l
  return { ...l, ativas: true, todas: false, automaticas: valor[0] === 'a', idiomas: [valor.slice(2)] }
}
