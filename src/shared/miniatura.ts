/** Endereço interno que mostra uma imagem do disco (servido pelo motor; só aceita imagens). */
export const ESQUEMA_MINIATURA = 'miniatura'

export const EXTENSOES_IMAGEM = /\.(jpe?g|png|gif|webp|avif|bmp|jfif)$/i

export function urlArquivoLocal(caminho: string): string {
  return `${ESQUEMA_MINIATURA}://arquivo/?c=${encodeURIComponent(caminho)}`
}
