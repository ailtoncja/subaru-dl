/** Endereço interno que mostra uma imagem do disco (servido pelo motor; só aceita imagens). */
export const ESQUEMA_MINIATURA = 'miniatura'

export const EXTENSOES_IMAGEM = /\.(jpe?g|png|gif|webp|avif|bmp|jfif)$/i

export function urlArquivoLocal(caminho: string): string {
  return `${ESQUEMA_MINIATURA}://arquivo/?c=${encodeURIComponent(caminho)}`
}

/** Miniatura reduzida de uma imagem da internet (prévia da galeria). `pagina` vira o Referer. */
export function urlMiniaturaRemota(url: string, pagina?: string): string {
  let referer = ''
  try {
    if (pagina) referer = new URL(pagina).origin + '/'
  } catch {
    /* link inválido: sem referer */
  }
  return `${ESQUEMA_MINIATURA}://remota/?u=${encodeURIComponent(url)}${referer ? `&r=${encodeURIComponent(referer)}` : ''}`
}
