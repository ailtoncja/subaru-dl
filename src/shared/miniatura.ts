/** Endereço interno que mostra uma imagem do disco (servido pelo motor; só aceita imagens). */
export const ESQUEMA_MINIATURA = 'miniatura'

export const EXTENSOES_IMAGEM = /\.(jpe?g|png|gif|webp|avif|bmp|jfif)$/i

export function urlArquivoLocal(caminho: string): string {
  return `${ESQUEMA_MINIATURA}://arquivo/?c=${encodeURIComponent(caminho)}`
}

/**
 * Miniatura reduzida de uma imagem da internet (capas e prévia da galeria). `pagina` vira o Referer; `largura`
 * 480 serve às capas grandes. A interface nunca carrega imagens de sites direto: tudo passa pelo motor, que
 * só busca endereços públicos, com limite de tamanho.
 */
export function urlMiniaturaRemota(url: string, pagina?: string, largura: 240 | 480 = 240): string {
  let referer = ''
  try {
    if (pagina) referer = new URL(pagina).origin + '/'
  } catch {
    /* link inválido: sem referer */
  }
  return `${ESQUEMA_MINIATURA}://remota/?u=${encodeURIComponent(url)}${referer ? `&r=${encodeURIComponent(referer)}` : ''}${largura !== 240 ? `&w=${largura}` : ''}`
}

/** Capa de um vídeo para usar em CSS (background-image): só http(s), sempre pelo motor. */
export function capaRemota(url: string | null | undefined, largura: 240 | 480 = 240): string | null {
  return url && /^https?:\/\//i.test(url) ? urlMiniaturaRemota(url, undefined, largura) : null
}
