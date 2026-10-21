// A capa de cada download (o "escudo" da linha) e os textos curtos que descrevem um item.
import { FilePlay, Images, Music } from 'lucide-react'
import { useState } from 'react'
import { QUALIDADES } from '@shared/formatos'
import { capaRemota, urlArquivoLocal } from '@shared/miniatura'
import type { ItemFila } from '@shared/tipos'

/**
 * Capa pequena das linhas. No YouTube, a capa em resolução máxima às vezes não existe e o site devolve uma imagem
 * cinza no lugar; a versão média (320×180, já em 16:9) sempre existe e basta para uma miniatura.
 */
export function miniaturaLinha(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/^https?:\/\/i\d?\.ytimg\.com\/vi(?:_webp)?\/([\w-]{11})\//)
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : url
}

/** "https://www.instagram.com/nasa/" → "instagram.com/nasa" */
export function nomeGaleria(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return url
  }
}

/** "MP4 1080p", "MP3 320 kbps", "original" — o que o item vai virar. */
export function tipoDoItem(item: ItemFila): string {
  const o = item.opcoes
  if (o.manterOriginal) return 'Original'
  if (o.modo === 'audio') return `${o.formatoAudio.toUpperCase()}${o.bitrateAudio ? ` ${o.bitrateAudio}k` : ''}`
  const qualidade = o.formatoId ? `#${o.formatoId}` : (QUALIDADES.find((q) => q.valor === o.qualidade)?.curto ?? o.qualidade)
  return `${o.container.toUpperCase()} ${qualidade}`
}

/** A capa de um vídeo ou áudio; sem imagem, o ícone do tipo. */
export function Capa({ url, audio, classe = '' }: { url: string | null | undefined; audio?: boolean; classe?: string }) {
  const src = capaRemota(miniaturaLinha(url), classe === 'grande' ? 480 : 240)
  return (
    <span className={`capa-linha ${classe}`} style={src ? { backgroundImage: `url("${src}")` } : undefined} aria-hidden="true">
      {!src && <span className="vazia">{audio ? <Music /> : <FilePlay />}</span>}
    </span>
  )
}

/** Mosaico com as últimas imagens baixadas de uma galeria: 1 inteira, 2 lado a lado, 3–4 em grade. */
export function Mosaico({ amostras, classe = '' }: { amostras: string[]; classe?: string }) {
  const [quebradas, setQuebradas] = useState<string[]>([])
  const visiveis = amostras.filter((a) => !quebradas.includes(a)).slice(-4)
  if (!visiveis.length) {
    return (
      <span className={`capa-linha ${classe}`} aria-hidden="true">
        <span className="vazia">
          <Images />
        </span>
      </span>
    )
  }
  return (
    <span className={`capa-linha mosaico qtd-${visiveis.length} ${classe}`} aria-hidden="true">
      {visiveis.map((a) => (
        <img key={a} src={urlArquivoLocal(a)} alt="" loading="lazy" onError={() => setQuebradas((q) => [...q, a])} />
      ))}
    </span>
  )
}
