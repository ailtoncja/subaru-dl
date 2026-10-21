// Lista de vários links: cada linha com a sua pasta, um "Ver" (prévia) e remover.
// Usada logo abaixo do campo, no modo vídeo/áudio e no modo imagens.
import { ChevronDown, ChevronUp, ClipboardPaste, FileText, FolderOpen, Loader2, X } from 'lucide-react'
import { type ReactNode } from 'react'
import { capaRemota, ESQUEMA_MINIATURA } from '@shared/miniatura'
import { avisar, extrairLinks } from '../estado'
import { pastaCurta } from './Destino'

/** A capa da linha: a da galeria já vem pelo motor; a de um vídeo passa por ele agora. */
const miniatura = (url: string | null | undefined) => (url?.startsWith(`${ESQUEMA_MINIATURA}:`) ? url : capaRemota(url))

export interface LinhaLink {
  url: string
  /** Pasta só deste link. null = a pasta comum da lista. */
  pasta: string | null
  aberto: boolean
}

/** Junta links novos aos que já estão na lista (sem repetir). */
export function juntarLinks<T extends LinhaLink>(atuais: T[], urls: string[], nova: (url: string) => T): T[] {
  const existentes = new Set(atuais.map((l) => l.url))
  return [...atuais, ...[...new Set(urls)].filter((u) => !existentes.has(u)).map(nova)]
}

export function ListaLinks<T extends LinhaLink>({
  linhas,
  mudarLinha,
  remover,
  acrescentar,
  limpar,
  pastaComum,
  info,
  aoAbrir,
  previa
}: {
  linhas: T[]
  mudarLinha: (i: number, parcial: Partial<T>) => void
  remover: (i: number) => void
  acrescentar: (urls: string[]) => void
  limpar: () => void
  /** Pasta usada pelas linhas sem pasta própria */
  pastaComum: string
  /** Título, miniatura e resumo de uma linha (depois que a prévia foi lida) */
  info: (l: T) => { titulo?: string | null; miniatura?: string | null; resumo?: ReactNode; carregando?: boolean; erro?: string | null }
  /** Chamado ao abrir o "Ver" de uma linha (para ler a prévia) */
  aoAbrir: (i: number) => void
  /** Conteúdo da prévia aberta */
  previa: (l: T, i: number) => ReactNode
}) {
  const colar = async () => {
    const achados = extrairLinks(await window.api.lerClipboard())
    if (achados.length) acrescentar(achados)
    else avisar('Nenhum link na área de transferência', 'erro')
  }
  const importar = async () => {
    const achados = (await window.api.lerArquivoLinks()).flatMap(extrairLinks)
    if (achados.length) acrescentar(achados)
  }

  return (
    <div className="lista-links">
      <div className="flex">
        <strong className="flex-1">
          {linhas.length} {linhas.length === 1 ? 'link' : 'links'} <span className="muted pequeno">· cada um pode ir para uma pasta diferente</span>
        </strong>
        <button className="btn fantasma pequeno" onClick={colar}>
          <ClipboardPaste /> Colar mais
        </button>
        <button className="btn fantasma pequeno" onClick={importar}>
          <FileText /> Importar .txt
        </button>
        <button className="icone-btn leve" title="Limpar a lista" onClick={limpar}>
          <X />
        </button>
      </div>

      <div className="linhas">
        {linhas.map((l, i) => {
          const d = info(l)
          const pasta = l.pasta ?? pastaComum
          return (
            <div key={l.url} className={`linha-link${l.aberto ? ' aberta' : ''}`}>
              <div className="cabeca-link">
                <span className="num">{i + 1}</span>
                <div className="mini" style={miniatura(d.miniatura) ? { backgroundImage: `url("${miniatura(d.miniatura)}")` } : undefined}>
                  {d.carregando && <Loader2 className="girando" />}
                </div>
                <div className="texto">
                  <strong className="truncar" title={d.titulo ?? l.url}>
                    {d.titulo ?? l.url}
                  </strong>
                  <small className="truncar">
                    {d.erro ? <span className="erro-texto">{d.erro}</span> : d.titulo ? l.url : 'Clique em Ver para conferir antes de baixar'}
                  </small>
                </div>
                {d.resumo && <span className="selo-amarelo">{d.resumo}</span>}
                <span className="pasta" title={pasta}>
                  <FolderOpen width={14} />
                  <span className={l.pasta ? '' : 'muted'}>{pastaCurta(pasta)}</span>
                  <button
                    className="link-amarelo mono pequeno"
                    onClick={async () => {
                      const nova = await window.api.escolherPasta(pasta)
                      if (nova) mudarLinha(i, { pasta: nova } as Partial<T>)
                    }}
                  >
                    Alterar
                  </button>
                  {l.pasta && (
                    <button className="link-amarelo mono pequeno" style={{ color: 'var(--muted)' }} title="Voltar para a pasta comum" onClick={() => mudarLinha(i, { pasta: null } as Partial<T>)}>
                      ×
                    </button>
                  )}
                </span>
                <button
                  className="btn pequeno"
                  onClick={() => {
                    if (!l.aberto) aoAbrir(i)
                    mudarLinha(i, { aberto: !l.aberto } as Partial<T>)
                  }}
                >
                  {l.aberto ? <ChevronUp /> : <ChevronDown />} Ver
                </button>
                <button className="icone-btn leve" title="Tirar da lista" onClick={() => remover(i)}>
                  <X />
                </button>
              </div>
              {l.aberto && <div className="corpo-link">{previa(l, i)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
