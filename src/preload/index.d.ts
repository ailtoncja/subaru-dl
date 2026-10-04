import type { ApiSubaru } from '../shared/api'

declare global {
  interface Window {
    api: ApiSubaru
    caminhoDoArquivo: (arquivo: File) => string
  }
}

export {}
