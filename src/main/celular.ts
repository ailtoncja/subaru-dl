// Envia o cookies.txt para o Subaru DL do celular, pela rede local.
//
// O celular escuta numa porta enquanto a tela "Receber do PC" está aberta e mostra um código de 8 letras.
// Aqui o PC acha o celular na rede (GET /subaru), cifra os cookies com AES-256-GCM usando uma chave derivada
// desse código (PBKDF2 com o "sal" que o celular informou) e manda (POST /cookies). O mesmo cálculo está em
// CookieReceiver.kt, no app do celular. Sem o código certo, nada é aceito; os cookies nunca viajam em texto puro.
import { createCipheriv, pbkdf2, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { request } from 'node:http'
import { networkInterfaces } from 'node:os'
import { promisify } from 'node:util'
import type { CelularEncontrado, ResultadoEnvioCelular } from '@shared/tipos'
import * as cfg from './configuracoes'
import { arquivoCookies, exportarCookies } from './cookies'
import { logar } from './logs'

const PORTA = 38475
const deriva = promisify(pbkdf2)

interface Resposta {
  status: number
  json: Record<string, unknown> | null
}

function pedir(ip: string, porta: number, metodo: 'GET' | 'POST', caminho: string, corpo: string | null, timeout: number): Promise<Resposta> {
  return new Promise((resolve, reject) => {
    const headers = corpo ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) } : {}
    const req = request({ host: ip, port: porta, method: metodo, path: caminho, timeout, agent: false, headers }, (res) => {
      const partes: Buffer[] = []
      res.on('data', (d: Buffer) => partes.push(d))
      res.on('end', () => {
        let json: Record<string, unknown> | null = null
        try {
          json = JSON.parse(Buffer.concat(partes).toString('utf8')) as Record<string, unknown>
        } catch {
          /* resposta que não é do Subaru DL */
        }
        resolve({ status: res.statusCode ?? 0, json })
      })
    })
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')))
    req.on('error', reject)
    req.end(corpo ?? undefined)
  })
}

const ehPrivado = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)

/** Endereços a testar: os 254 vizinhos de cada rede local do PC, mais o próprio PC (útil com `adb forward`). */
function candidatos(): string[] {
  const redes = new Set<string>()
  const proprios = new Set<string>()
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family !== 'IPv4' || i.internal || !ehPrivado(i.address)) continue
      proprios.add(i.address)
      redes.add(i.address.split('.').slice(0, 3).join('.'))
    }
  }
  const ips: string[] = []
  for (const rede of [...redes].slice(0, 6)) {
    for (let n = 1; n < 255; n++) {
      const ip = `${rede}.${n}`
      if (!proprios.has(ip)) ips.push(ip)
    }
  }
  ips.push('127.0.0.1')
  return ips
}

export async function procurarCelulares(): Promise<CelularEncontrado[]> {
  const ips = candidatos()
  const achados: CelularEncontrado[] = []
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < ips.length) {
      const ip = ips[proximo++]
      try {
        const r = await pedir(ip, PORTA, 'GET', '/subaru', null, 700)
        if (r.status === 200 && r.json?.app === 'subaru-dl') achados.push({ ip, porta: PORTA, nome: String(r.json.nome ?? 'Celular') })
      } catch {
        /* ninguém escutando nesse endereço */
      }
    }
  }
  await Promise.all(Array.from({ length: 48 }, trabalhador))
  logar('info', `Procura de celulares: ${achados.length} encontrado(s)`)
  return achados
}

/** "192.168.0.20", "192.168.0.20:38475" ou "http://192.168.0.20:38475/" */
function lerEndereco(texto: string): { ip: string; porta: number } | null {
  const m = texto.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').match(/^([\w.-]+)(?::(\d{1,5}))?$/)
  if (!m) return null
  const porta = m[2] ? Number(m[2]) : PORTA
  return porta > 0 && porta < 65536 ? { ip: m[1], porta } : null
}

const falha = (erro: string): ResultadoEnvioCelular => ({ ok: false, cookies: 0, sites: 0, erro })

/** Qual cookies.txt vai para o celular: o que o programa está usando; se não houver nenhum, gera a partir do navegador. */
async function arquivoParaEnviar(): Promise<{ arquivo: string } | { erro: string }> {
  const c = cfg.configuracoes().cookies
  if (c.origem === 'arquivo' && c.arquivo && existsSync(c.arquivo)) return { arquivo: c.arquivo }
  if (existsSync(arquivoCookies())) return { arquivo: arquivoCookies() }
  const r = await exportarCookies(c.navegador, c.perfil, true)
  return r.ok ? { arquivo: r.arquivo } : { erro: r.erro ?? 'Não consegui gerar o cookies.txt.' }
}

export async function enviarCookiesAoCelular(endereco: string, codigoDigitado: string): Promise<ResultadoEnvioCelular> {
  const alvo = lerEndereco(endereco)
  if (!alvo) return falha('Endereço do celular inválido. Use algo como 192.168.0.20.')
  const codigo = codigoDigitado.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (codigo.length !== 8) return falha('O código tem 8 letras e números (aparece na tela do celular).')

  const origem = await arquivoParaEnviar()
  if ('erro' in origem) return falha(origem.erro)
  const texto = readFileSync(origem.arquivo, 'utf8')
  if (!texto.split(/\r?\n/).some((l) => l.trim() && !l.startsWith('# ') && l.split('\t').length >= 7)) {
    return falha('O cookies.txt está vazio. Entre nas suas contas no navegador e gere de novo.')
  }

  const naoAchei = `Não consegui falar com o celular em ${alvo.ip}. Confira se a tela "Receber do PC" está aberta no celular e se os dois estão no mesmo Wi-Fi.`
  try {
    const info = await pedir(alvo.ip, alvo.porta, 'GET', '/subaru', null, 4000)
    if (info.status !== 200 || info.json?.app !== 'subaru-dl' || typeof info.json.sal !== 'string') return falha('Esse endereço não é um Subaru DL no modo "Receber do PC".')
    const iteracoes = Math.min(Math.max(Number(info.json.iteracoes) || 120_000, 10_000), 1_000_000)
    const chave = await deriva(Buffer.from(codigo, 'utf8'), Buffer.from(info.json.sal, 'base64'), iteracoes, 32, 'sha256')

    const iv = randomBytes(12)
    const cifra = createCipheriv('aes-256-gcm', chave, iv)
    const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final(), cifra.getAuthTag()])
    const corpo = JSON.stringify({ iv: iv.toString('base64'), dados: dados.toString('base64') })

    const r = await pedir(alvo.ip, alvo.porta, 'POST', '/cookies', corpo, 15_000)
    if (r.status === 200 && r.json?.ok) {
      const cookies = Number(r.json.cookies) || 0
      const sites = Number(r.json.sites) || 0
      logar('info', `Cookies enviados ao celular (${cookies} cookies de ${sites} sites)`)
      return { ok: true, cookies, sites, erro: null }
    }
    if (r.status === 403) return falha('Código incorreto. Confira o código que aparece no celular.')
    if (r.status === 429) return falha('O celular fechou o recebimento por causa de tentativas erradas. Abra a tela de novo no celular para gerar outro código.')
    if (r.status === 413) return falha('O cookies.txt é grande demais para enviar. Gere de novo marcando "só os sites de vídeo".')
    return falha('O celular recusou os cookies.')
  } catch (e) {
    logar('erro', `Envio de cookies ao celular: ${e instanceof Error ? e.message : String(e)}`)
    return falha(naoAchei)
  }
}
