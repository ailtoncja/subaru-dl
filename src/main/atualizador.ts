// Atualização do próprio programa: procura versões novas nas versões publicadas no GitHub (ailtoncja/subaru-dl),
// baixa em segundo plano e avisa quando estiver pronta. Instala ao clicar em "Reiniciar" ou ao fechar o programa.
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { EstadoAtualizacao } from '@shared/tipos'
import * as logs from './logs'

/** De quanto em quanto tempo procurar de novo (o programa pode ficar dias aberto na bandeja). */
const INTERVALO_MS = 6 * 60 * 60 * 1000

let estado: EstadoAtualizacao = { fase: 'parado', versao: null, pct: 0, mensagem: '' }
let avisar: (e: EstadoAtualizacao) => void = () => {}

function mudar(parcial: Partial<EstadoAtualizacao>) {
  estado = { ...estado, ...parcial }
  avisar(estado)
}

export const estadoAtualizacao = (): EstadoAtualizacao => estado

/** Teste em desenvolvimento: com SUBARU_TESTAR_ATUALIZACAO=1 e um dev-app-update.yml na pasta do projeto. */
const testeEmDesenvolvimento = () => !app.isPackaged && process.env.SUBARU_TESTAR_ATUALIZACAO === '1'

/** Só o programa instalado (com o app-update.yml que o instalador traz) sabe de onde vêm as versões. */
function semOndeProcurar(): string | null {
  if (testeEmDesenvolvimento()) return null
  if (!app.isPackaged) return 'A atualização automática só funciona no programa instalado.'
  if (!existsSync(join(process.resourcesPath, 'app-update.yml'))) return 'Esta cópia do programa não sabe de onde vêm as versões novas.'
  return null
}

/** Erros em português simples; o detalhe técnico vai para o Registro. */
function explicarErro(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e)
  if (/ERR_INTERNET_DISCONNECTED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ERR_NETWORK|ERR_NAME_NOT_RESOLVED/i.test(texto)) return 'Sem conexão com a internet agora. Tenta de novo mais tarde.'
  if (/\b404\b|Cannot find latest|No published versions/i.test(texto)) return 'Ainda não há versões publicadas.'
  return 'Não foi possível verificar agora. O motivo está no Registro.'
}

export function prepararAtualizador(ligado: () => boolean, aoMudar: (e: EstadoAtualizacao) => void): void {
  avisar = aoMudar
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  if (testeEmDesenvolvimento()) autoUpdater.forceDevUpdateConfig = true
  autoUpdater.logger = {
    info: (m: unknown) => logs.logar('info', `Atualização: ${String(m)}`),
    warn: (m: unknown) => logs.logar('aviso', `Atualização: ${String(m)}`),
    error: (m: unknown) => logs.logar('erro', `Atualização: ${String(m)}`),
    debug: () => {}
  }

  autoUpdater.on('checking-for-update', () => mudar({ fase: 'verificando', mensagem: 'Procurando versão nova…' }))
  autoUpdater.on('update-not-available', () => mudar({ fase: 'em-dia', versao: null, pct: 0, mensagem: 'Você já está na versão mais recente.' }))
  autoUpdater.on('update-available', (info) => mudar({ fase: 'baixando', versao: info.version, pct: 0, mensagem: `Baixando a versão ${info.version}…` }))
  autoUpdater.on('download-progress', (p) => mudar({ pct: p.percent, mensagem: `Baixando a versão ${estado.versao ?? ''}… ${Math.floor(p.percent)}%` }))
  autoUpdater.on('update-downloaded', (info) =>
    mudar({ fase: 'pronta', versao: info.version, pct: 100, mensagem: `Versão ${info.version} pronta. Ela entra quando você reiniciar ou sair do programa.` })
  )
  autoUpdater.on('error', (e) => {
    // Uma versão já baixada continua pronta mesmo se uma verificação depois falhar
    if (estado.fase !== 'pronta') mudar({ fase: 'erro', mensagem: explicarErro(e) })
  })

  if (semOndeProcurar()) return
  const procurar = () => {
    if (!ligado() || estado.fase === 'baixando' || estado.fase === 'pronta') return
    autoUpdater.checkForUpdates().catch(() => {})
  }
  setTimeout(procurar, 4000)
  setInterval(procurar, INTERVALO_MS)
}

/** "Verificar agora" nos Ajustes: procura na hora (e já começa a baixar se houver versão nova). */
export async function verificarAgora(): Promise<{ disponivel: boolean; versao?: string; mensagem: string }> {
  const motivo = semOndeProcurar()
  if (motivo) return { disponivel: false, mensagem: motivo }
  if (estado.fase === 'pronta' || estado.fase === 'baixando') return { disponivel: true, versao: estado.versao ?? undefined, mensagem: estado.mensagem }
  try {
    const r = await autoUpdater.checkForUpdates()
    const versao = r?.updateInfo.version
    if (r?.isUpdateAvailable && versao) return { disponivel: true, versao, mensagem: `Baixando a versão ${versao}…` }
    return { disponivel: false, mensagem: 'Você já está na versão mais recente.' }
  } catch (e) {
    return { disponivel: false, mensagem: explicarErro(e) }
  }
}

/** "Reiniciar": fecha, instala a versão baixada em silêncio e abre o programa de novo. */
export function instalarAgora(): void {
  if (estado.fase !== 'pronta') return
  setImmediate(() => autoUpdater.quitAndInstall(true, true))
}
