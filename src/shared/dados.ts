import { dataUpload, duracao } from './formatar'
import type { CampoDados, FonteDados, LinhaDados } from './tipos'

export const CAMPOS_DADOS: Record<CampoDados, { nome: string; grupo: 'Básico' | 'Engajamento' | 'Conteúdo' | 'Tempo' }> = {
  titulo: { nome: 'Título', grupo: 'Básico' },
  url: { nome: 'Link', grupo: 'Básico' },
  canal: { nome: 'Canal', grupo: 'Básico' },
  site: { nome: 'Site', grupo: 'Básico' },
  id: { nome: 'ID', grupo: 'Básico' },
  duracao: { nome: 'Duração', grupo: 'Tempo' },
  duracaoSegundos: { nome: 'Duração (segundos)', grupo: 'Tempo' },
  dataUpload: { nome: 'Data de envio', grupo: 'Tempo' },
  views: { nome: 'Visualizações', grupo: 'Engajamento' },
  likes: { nome: 'Curtidas', grupo: 'Engajamento' },
  comentarios: { nome: 'Comentários', grupo: 'Engajamento' },
  descricao: { nome: 'Descrição', grupo: 'Conteúdo' },
  tags: { nome: 'Tags', grupo: 'Conteúdo' },
  miniatura: { nome: 'Miniatura', grupo: 'Conteúdo' }
}

export const CAMPOS_PADRAO: CampoDados[] = ['titulo', 'url', 'canal', 'duracao', 'dataUpload', 'views']

/** Valor de um campo para exibir/exportar. `numerico` mantém números como números (Excel/JSON). */
export function valorCampo(l: LinhaDados, c: CampoDados, numerico = false): string | number {
  switch (c) {
    case 'duracao':
      return l.duracao == null ? '' : duracao(l.duracao)
    case 'duracaoSegundos':
      return l.duracao == null ? '' : numerico ? l.duracao : String(l.duracao)
    case 'dataUpload':
      return l.dataUpload ? dataUpload(l.dataUpload) : ''
    case 'views':
    case 'likes':
    case 'comentarios':
      return l[c] == null ? '' : numerico ? l[c]! : String(l[c])
    case 'tags':
      return l.tags.join(', ')
    default:
      return l[c] ?? ''
  }
}

/** Descobre o tipo de entrada: vários links, busca por palavra, playlist ou canal. */
export function detectarFonte(entrada: string): FonteDados {
  const t = entrada.trim()
  if (t.split(/\r?\n/).filter((l) => l.trim()).length > 1) return 'links'
  if (!/^https?:\/\//i.test(t)) return 'busca'
  if (/[?&]list=|\/playlist\b|\/sets\//i.test(t)) return 'playlist'
  if (/youtube\.com\/(@|channel\/|c\/|user\/)|\/videos\/?$|twitch\.tv\/[^/]+\/?$/i.test(t)) return 'canal'
  return 'links'
}
