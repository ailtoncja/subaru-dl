// Onde salvar cada download e como organizar em subpastas.
import { FolderOpen } from 'lucide-react'
import type { Modo, OpcoesDownload, OrganizarGaleria, PresetSubpasta } from '@shared/tipos'
import { useEstado } from '../estado'

export const OPCOES_ORGANIZAR: Array<{ valor: PresetSubpasta; nome: string; exemplo: string }> = [
  { valor: 'nenhuma', nome: 'Sem subpastas', exemplo: '' },
  { valor: 'playlist', nome: 'Por playlist', exemplo: 'Minha Playlist\\' },
  { valor: 'canal', nome: 'Por canal', exemplo: 'Canal\\' },
  { valor: 'canal-playlist', nome: 'Canal → playlist', exemplo: 'Canal\\Minha Playlist\\' },
  { valor: 'ano-mes', nome: 'Ano / mês', exemplo: '2025\\03\\' },
  { valor: 'artista-album', nome: 'Artista → álbum', exemplo: 'Artista\\Álbum\\' },
  { valor: 'personalizado', nome: 'Personalizado…', exemplo: '' }
]

/** "C:\Users\fulano\Videos\Subaru DL" → "Videos\Subaru DL" */
export function pastaCurta(caminho: string): string {
  return caminho.split(/[\\/]/).filter(Boolean).slice(-2).join('\\')
}

export function pastaPadrao(modo: Modo): string {
  const c = useEstado.getState().config!
  return modo === 'audio' ? c.pastaAudio : c.pastaVideo
}

/** "Salvar em: Videos\Subaru DL  Alterar" — cada download pode ir para uma pasta diferente. */
export function CampoPasta({ pasta, modo, aoMudar, semRotulo }: { pasta: string | null; modo: Modo; aoMudar: (pasta: string | null) => void; semRotulo?: boolean }) {
  const config = useEstado((s) => s.config)!
  const atual = pasta ?? (modo === 'audio' ? config.pastaAudio : config.pastaVideo)
  return (
    <span className="flex mono pequeno" style={{ gap: 8 }} title={atual}>
      <FolderOpen width={16} className="muted" />
      {!semRotulo && <span className="muted">Salvar em:</span>}
      <span className="truncar" style={{ maxWidth: 260 }}>
        {pastaCurta(atual)}
      </span>
      <button
        className="link-amarelo mono pequeno"
        onClick={async () => {
          const nova = await window.api.escolherPasta(atual)
          if (nova) aoMudar(nova)
        }}
      >
        Alterar
      </button>
      {pasta && (
        <button className="link-amarelo mono pequeno" style={{ color: 'var(--muted)' }} onClick={() => aoMudar(null)} title="Voltar para a pasta das configurações">
          Padrão
        </button>
      )}
    </span>
  )
}

/** Organizar em subpastas por playlist, canal, data… (o exemplo dos apps de referência). */
export function SelecaoOrganizar({ o, mudar, compacto }: { o: OpcoesDownload; mudar: (p: Partial<OpcoesDownload>) => void; compacto?: boolean }) {
  return (
    <span className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
      <select value={o.subpasta} onChange={(e) => mudar({ subpasta: e.target.value as PresetSubpasta })} className={compacto ? 'mono' : undefined}>
        {OPCOES_ORGANIZAR.map((op) => (
          <option key={op.valor} value={op.valor}>
            {compacto ? `Organizar: ${op.nome}` : op.nome}
          </option>
        ))}
      </select>
      {o.subpasta === 'personalizado' && (
        <input
          className="campo mono"
          style={{ width: 240, fontSize: 12.5 }}
          value={o.subpastaPersonalizada}
          onChange={(e) => mudar({ subpastaPersonalizada: e.target.value })}
          title="Modelo de pasta do yt-dlp, ex.: %(uploader)s/%(upload_date>%Y)s"
        />
      )}
    </span>
  )
}

export const OPCOES_ORGANIZAR_GALERIA: Array<{ valor: OrganizarGaleria; nome: string }> = [
  { valor: 'plana', nome: 'Sem subpastas' },
  { valor: 'site', nome: 'Por site' },
  { valor: 'perfil', nome: 'Só o perfil' },
  { valor: 'padrao', nome: 'Por site → perfil' },
  { valor: 'personalizado', nome: 'Personalizado…' }
]

/** Organizar os arquivos da galeria em subpastas (ou não). */
export function SelecaoOrganizarGaleria({
  valor,
  formato,
  aoMudar,
  compacto
}: {
  valor: OrganizarGaleria
  formato: string
  aoMudar: (valor: OrganizarGaleria, formato: string) => void
  compacto?: boolean
}) {
  return (
    <span className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
      <select
        className={compacto ? 'mono' : undefined}
        style={compacto ? { padding: '4px 30px 4px 8px', fontSize: 12.5 } : undefined}
        value={valor}
        onChange={(e) => aoMudar(e.target.value as OrganizarGaleria, formato)}
      >
        {OPCOES_ORGANIZAR_GALERIA.map((op) => (
          <option key={op.valor} value={op.valor}>
            {compacto ? `Organizar: ${op.nome}` : op.nome}
          </option>
        ))}
      </select>
      {valor === 'personalizado' && (
        <input
          className="campo mono"
          style={{ width: 200, fontSize: 12.5, padding: '4px 8px' }}
          value={formato}
          onChange={(e) => aoMudar(valor, e.target.value)}
          title="Pastas separadas por /. Ex.: {category}/{user} (site/perfil) ou {user}"
        />
      )}
    </span>
  )
}
