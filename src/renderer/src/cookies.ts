// Os dois caminhos dos cookies, usados nos Ajustes e no assistente de primeiro uso:
// ler direto do navegador (o Firefox deixa) ou importar o cookies.txt que uma extensão exportou (Chrome, Edge e afins).
import { useState } from 'react'
import type { Navegador } from '@shared/tipos'
import { salvarConfig, useEstado } from './estado'

export type ResultadoTexto = { ok: boolean; texto: string } | null

/** Chrome, Edge e afins travam a leitura automática dos cookies; só o Firefox funciona por esse caminho. */
export const ehChromium = (navegador: Navegador) => navegador !== 'firefox' && navegador !== 'nenhum'

/** Onde achar uma extensão que exporta cookies.txt para esse navegador. */
export const lojaExtensao = (navegador: Navegador) =>
  navegador === 'edge' ? 'https://microsoftedge.microsoft.com/addons/search/cookies.txt' : 'https://chromewebstore.google.com/search/get%20cookies.txt'

export function useCookies() {
  const [gerando, setGerando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoTexto>(null)

  /**
   * Lê os cookies do navegador e grava o cookies.txt. Com usar = 'arquivo' o programa passa a usar esse arquivo;
   * com 'navegador' a leitura serve de teste e o programa passa a ler o navegador a cada download (nunca expira).
   */
  const gerar = async (navegador: Navegador, perfil: string, soSites: boolean, usar: 'arquivo' | 'navegador' = 'arquivo') => {
    setGerando(true)
    setResultado(null)
    const r = await window.api.exportarCookies(navegador, perfil, soSites)
    setGerando(false)
    if (r.ok) {
      const cookies = useEstado.getState().config!.cookies
      await salvarConfig({
        cookies: usar === 'navegador' ? { ...cookies, origem: 'navegador', navegador, perfil } : { ...cookies, origem: 'arquivo', arquivo: r.arquivo }
      })
      setResultado({
        ok: true,
        texto:
          usar === 'navegador'
            ? `${r.salvos} cookies de ${r.sites} sites encontrados. O programa vai ler o navegador a cada download.`
            : `${r.salvos} cookies de ${r.sites} sites salvos. O programa já está usando esse arquivo.`
      })
    } else {
      setResultado({ ok: false, texto: r.erro ?? 'Não consegui ler os cookies do navegador.' })
    }
    return r.ok
  }

  /** Importa o cookies.txt que a extensão exportou (acha sozinho na pasta Downloads, ou pergunta). */
  const importar = async (soSites: boolean) => {
    setImportando(true)
    setResultado(null)
    let caminho = await window.api.acharCookiesBaixado()
    const achadoSozinho = !!caminho
    if (!caminho) caminho = await window.api.escolherArquivo([{ name: 'Cookies (cookies.txt)', extensions: ['txt'] }])
    if (!caminho) {
      setImportando(false)
      return false
    }
    const r = await window.api.importarCookies(caminho, soSites)
    setImportando(false)
    if (r.ok) {
      await salvarConfig({ cookies: { ...useEstado.getState().config!.cookies, origem: 'arquivo', arquivo: r.arquivo } })
      const nome = caminho.split(/[\\/]/).pop()
      setResultado({
        ok: true,
        texto:
          `${r.salvos} cookies de ${r.sites} sites importados${achadoSozinho ? ` (achei "${nome}" na pasta Downloads)` : ''}. O programa já está usando, guardados cifrados.` +
          (r.paraLixeira ? ' O arquivo exportado foi para a Lixeira, porque tinha os logins em texto puro.' : '')
      })
    } else {
      setResultado({ ok: false, texto: r.erro ?? 'Não consegui importar o cookies.txt.' })
    }
    return r.ok
  }

  return { gerando, importando, resultado, setResultado, gerar, importar }
}
